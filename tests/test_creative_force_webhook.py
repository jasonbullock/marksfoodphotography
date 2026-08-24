import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from routes import _creative_force_sync_from_payload, _creative_force_status  # noqa: E402


WORK_UNIT_EVENT = {
    "Action": "WorkUnitStatusChanged",
    "ProductCode": "5656656565",
    "ProductionTypeName": "Tabletop",
    "WorkUnitId": "62a81d21",
    "WorkUnitStatusName": "InProgress",
    "PayloadId": "p1",
}

TASK_EVENT = {
    "Action": "Assigned",
    "EventGroupName": "task",
    "ProductCode": "5656656565",
    "ShootingTypeName": "Tabletop",
    "StepName": "Final Selection",
    "StepStatusName": "New",
    "WorkUnitId": "62a81d21",
    "TaskId": "t1",
    "StepId": 4,
    "PayloadId": "p2",
}


class CreativeForceWebhookTests(unittest.TestCase):
    def test_task_events_supply_the_production_type_under_a_different_name(self):
        # Work unit events say ProductionTypeName; task events say ShootingTypeName
        # for the same thing. Without the fallback a task event carries no type and
        # can never be correlated to a card.
        self.assertEqual(
            _creative_force_sync_from_payload(TASK_EVENT)["productionTypeName"], "Tabletop"
        )
        self.assertEqual(
            _creative_force_sync_from_payload(WORK_UNIT_EVENT)["productionTypeName"], "Tabletop"
        )

    def test_each_event_kind_carries_only_half_of_what_the_card_shows(self):
        work_unit = _creative_force_sync_from_payload(WORK_UNIT_EVENT)
        task = _creative_force_sync_from_payload(TASK_EVENT)

        self.assertEqual(work_unit["statusRaw"], "InProgress")
        self.assertEqual(work_unit["stepName"], "")
        self.assertEqual(task["stepName"], "Final Selection")
        self.assertEqual(task["statusRaw"], "")

    def test_a_later_event_does_not_erase_what_an_earlier_one_recorded(self):
        # Writing each event wholesale let a task event blank the status a work
        # unit event had just set, and vice versa.
        merged = {}
        for event in (WORK_UNIT_EVENT, TASK_EVENT):
            sync = _creative_force_sync_from_payload(event)
            merged = {**merged, **{k: v for k, v in sync.items() if v not in ("", None)}}

        self.assertEqual(merged["statusRaw"], "InProgress")
        self.assertEqual(merged["stepName"], "Final Selection")

    def test_in_progress_maps_to_in_production(self):
        self.assertEqual(_creative_force_status("WorkUnitStatusChanged", "InProgress"), "In Production")
        self.assertEqual(_creative_force_status("WorkUnitCompleted", "Done"), "Complete")
        self.assertEqual(_creative_force_status("Rejected", ""), "Blocked")


if __name__ == "__main__":
    unittest.main()


MAIN_TASK_EVENT = {
    "Action": "ReadyToWork", "EventGroupName": "task",
    "ProductCode": "5656656565", "ShootingTypeName": "Tabletop",
    "StepName": "Final Selection", "StepStatusName": "To Do",
    "WorkUnitId": "62a81d21", "WorkflowId": "00000000-0000-0000-0000-000000000000",
    "WorkflowName": "Basic Photo", "PayloadId": "p3",
}

DERIVED_TASK_EVENT = {
    "Action": "Completed", "EventGroupName": "task",
    "ProductCode": "5656656565", "ShootingTypeName": "Tabletop",
    "StepName": "Asset Delivery", "StepStatusName": "Done",
    "WorkUnitId": "45a0ff31", "WorkflowId": "00000000-0000-0000-0000-000000000000",
    "WorkflowName": "Derived Workflow 1", "PayloadId": "p4",
}


class CreativeForceDerivedWorkflowTests(unittest.TestCase):
    def _is_derived(self, event, existing=None):
        from routes import _creative_force_event_is_derived
        return _creative_force_event_is_derived(
            _creative_force_sync_from_payload(event), existing or {}
        )

    def test_the_jobs_base_workflow_is_not_derived(self):
        self.assertFalse(self._is_derived(MAIN_TASK_EVENT))

    def test_workflow_id_cannot_separate_them(self):
        # Both workflows report an all-zero WorkflowId, so only the name works.
        self.assertEqual(MAIN_TASK_EVENT["WorkflowId"], DERIVED_TASK_EVENT["WorkflowId"])

    def test_a_named_derived_workflow_is_rejected(self):
        # Both workflows contain a step called "Asset Delivery", so the step name
        # cannot tell them apart — only the workflow identity can.
        self.assertTrue(self._is_derived(DERIVED_TASK_EVENT))

    def test_work_unit_events_are_judged_against_the_known_main_unit(self):
        # Work unit events carry no workflow fields at all.
        work_unit_of_main = {**WORK_UNIT_EVENT, "WorkUnitId": "62a81d21"}
        work_unit_of_derived = {**WORK_UNIT_EVENT, "WorkUnitId": "45a0ff31"}
        existing = {"mainWorkUnitId": "62a81d21"}

        self.assertFalse(self._is_derived(work_unit_of_main, existing))
        self.assertTrue(self._is_derived(work_unit_of_derived, existing))

    def test_nothing_is_rejected_before_the_main_unit_is_known(self):
        # Otherwise the card stays blank until a task event happens to arrive.
        self.assertFalse(self._is_derived(WORK_UNIT_EVENT, {}))


class CreativeForceMergeScopeTests(unittest.TestCase):
    """Carrying values forward is right within a work unit and wrong across them."""

    def _merge(self, existing, event):
        sync = _creative_force_sync_from_payload(event)
        same_unit = str(existing.get("workUnitId") or "") == str(sync.get("workUnitId") or "")
        carried = existing if same_unit else {}
        return {**carried, **{k: v for k, v in sync.items() if v not in ("", None)}}

    def test_status_and_step_combine_within_one_work_unit(self):
        merged = self._merge({}, WORK_UNIT_EVENT)
        merged = self._merge(merged, {**TASK_EVENT, "WorkUnitId": WORK_UNIT_EVENT["WorkUnitId"]})

        self.assertEqual(merged["statusRaw"], "InProgress")
        self.assertEqual(merged["stepName"], "Final Selection")

    def test_a_previous_work_units_status_is_not_carried_onto_another(self):
        # The derived unit finishing Asset Delivery left "Done" beside the main
        # unit's live step, so the card read as complete while work was ongoing.
        derived_done = {"workUnitId": "45a0ff31", "statusRaw": "Done", "stepName": "Asset Delivery"}
        merged = self._merge(derived_done, {**TASK_EVENT, "WorkUnitId": "62a81d21"})

        self.assertEqual(merged["stepName"], "Final Selection")
        self.assertEqual(merged.get("statusRaw", ""), "")


class CreativeForceDisplayedStatusTests(unittest.TestCase):
    """The card pairs a step with the step's own status, not the work unit's."""

    def _displayed(self, merged):
        return merged.get("stepStatusRaw") or merged.get("statusRaw", "")

    def test_step_status_is_preferred_over_the_work_unit_status(self):
        # WorkUnitStatusName sits at InProgress from Capture through Asset Delivery,
        # so pairing it with a step made the status look frozen.
        merged = {"statusRaw": "InProgress", "stepName": "Final Selection", "stepStatusRaw": "To Do"}
        self.assertEqual(self._displayed(merged), "To Do")

    def test_the_work_unit_status_still_shows_when_there_is_no_step_status(self):
        merged = {"statusRaw": "Done", "stepName": "Asset Delivery", "stepStatusRaw": ""}
        self.assertEqual(self._displayed(merged), "Done")


class CreativeForceStepOrderTests(unittest.TestCase):
    """A reset fires every step at once, so arrival order cannot pick the current step."""

    def _apply(self, events):
        from routes import _creative_force_steps_after_event, _creative_force_current_step
        steps = {}
        for event in events:
            steps = _creative_force_steps_after_event(steps, _creative_force_sync_from_payload(event))
        return steps, _creative_force_current_step(steps)

    @staticmethod
    def _step(step_id, name, status):
        return {"Action": "StatusChanged", "EventGroupName": "task", "WorkUnitId": "wu-1",
                "WorkflowName": "Basic Photo", "StepId": step_id, "StepName": name,
                "StepStatusName": status, "EventDatetimeUtc": 1787283842059}

    def test_the_current_step_is_the_earliest_unfinished_one(self):
        _, current = self._apply([
            self._step(2, "Capture", "Done"),
            self._step(4, "Final Selection", "In Progress"),
            self._step(14, "Asset Delivery", "New"),
        ])
        self.assertEqual(current["name"], "Final Selection")

    def test_a_reset_burst_does_not_depend_on_arrival_order(self):
        # Creative Force resets every downstream step in one burst. Whichever event
        # arrived last used to become the displayed step.
        reset = [
            self._step(14, "Asset Delivery", "New"),
            self._step(4, "Final Selection", "New"),
            self._step(2, "Capture", "New"),
        ]
        _, current = self._apply(reset)
        self.assertEqual(current["name"], "Capture")

        _, reversed_current = self._apply(list(reversed(reset)))
        self.assertEqual(reversed_current["name"], "Capture")

    def test_a_finished_work_unit_shows_its_last_step(self):
        _, current = self._apply([
            self._step(2, "Capture", "Done"),
            self._step(14, "Asset Delivery", "Done"),
        ])
        self.assertEqual(current["name"], "Asset Delivery")

    def test_each_step_keeps_its_own_reported_time(self):
        steps, _ = self._apply([
            self._step(2, "Capture", "Done"),
            self._step(4, "Final Selection", "In Progress"),
        ])
        self.assertEqual(steps["2"]["status"], "Done")
        self.assertEqual(steps["4"]["status"], "In Progress")
        self.assertTrue(steps["2"]["reportedAt"])


class CreativeForceClientScopeTests(unittest.TestCase):
    """Creative Force posts every client's events to the same endpoint."""

    MEIJER = {"ClientId": "7efd9778-75eb-44c8-863a-df5fa5ac1a44", "ClientName": "Meijer",
              "WorkUnitId": "wu-meijer", "ProductCode": "719283588661"}
    OURS = {"ClientId": "ff5df83f-f822-41f1-99b1-501300b25f02", "ClientName": "Marks Food",
            "WorkUnitId": "wu-ours", "ProductCode": "5656656565"}

    def test_events_from_another_client_are_rejected(self):
        from unittest.mock import patch
        from routes import _creative_force_client_is_ours
        from config import Config as C

        with patch.object(C, "CREATIVE_FORCE_CLIENT_IDS", ["ff5df83f-f822-41f1-99b1-501300b25f02"]), \
             patch.object(C, "CREATIVE_FORCE_CLIENT_NAMES", []):
            ours, _ = _creative_force_client_is_ours(self.OURS)
            other, named = _creative_force_client_is_ours(self.MEIJER)

        self.assertTrue(ours)
        self.assertFalse(other)
        self.assertEqual(named, "Meijer")

    def test_matching_by_name_also_works(self):
        from unittest.mock import patch
        from routes import _creative_force_client_is_ours
        from config import Config as C

        with patch.object(C, "CREATIVE_FORCE_CLIENT_IDS", []), \
             patch.object(C, "CREATIVE_FORCE_CLIENT_NAMES", ["Marks Food"]):
            self.assertTrue(_creative_force_client_is_ours(self.OURS)[0])
            self.assertFalse(_creative_force_client_is_ours(self.MEIJER)[0])

    def test_nothing_is_filtered_until_it_is_configured(self):
        # An unconfigured install must not silently drop its own events.
        from unittest.mock import patch
        from routes import _creative_force_client_is_ours
        from config import Config as C

        with patch.object(C, "CREATIVE_FORCE_CLIENT_IDS", []), \
             patch.object(C, "CREATIVE_FORCE_CLIENT_NAMES", []):
            self.assertTrue(_creative_force_client_is_ours(self.MEIJER)[0])
