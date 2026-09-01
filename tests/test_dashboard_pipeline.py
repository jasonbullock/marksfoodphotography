import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import routes  # noqa: E402
from config import Config as C  # noqa: E402


def ago(days):
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def card(card_id, step, days, *, released=True, workstream="Ecomm", status="InProgress", merch="recM1"):
    sync = {"stepName": step, "stepStatusRaw": "InProgress", "statusRaw": status,
            "stepReportedAt": ago(days)}
    import json
    return {"id": card_id, "fields": {
        C.F_WORKSTREAM_CARD_TYPE: workstream,
        C.F_WORKSTREAM_CARD_RELEASED: released,
        C.F_WORKSTREAM_CARD_RELEASED_AT: ago(days),
        C.F_WORKSTREAM_CARD_RECEIVED_MERCH: [merch],
        C.F_WORKSTREAM_CARD_CREATIVE_FORCE_STEP: step,
        C.F_WORKSTREAM_CARD_CREATIVE_FORCE_STATUS: status,
        C.F_WORKSTREAM_CARD_CREATIVE_FORCE_SYNC: json.dumps(sync),
    }}


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.client = __import__("app").app.test_client()

    def pipeline(self, cards, merchandise=None):
        merchandise = merchandise or [{"id": "recM1", "fields": {
            C.F_RECEIPT_ENTRY_NAME: "FX Tart Cherry Juice 46oz",
            C.F_RECEIPT_ENTRY_MARKS_NUMBER: 20,
        }}]

        def listing(table, *args, **kwargs):
            if table == C.WORKSTREAM_CARDS_TABLE:
                return cards
            if table == C.MERCHANDISE_TABLE:
                return merchandise
            return []

        with patch("routes._list_all_records", side_effect=listing), \
                patch("routes._client_records", return_value=[]), \
                patch("routes._receipt_client_permitted", return_value=True), \
                patch("routes._session_user", return_value={"id": "recU"}):
            response = self.client.get("/api/dashboard/creative-force")
        return response.get_json()

    def test_it_counts_only_what_was_released(self):
        # An unreleased card is not Creative Force's to be holding.
        body = self.pipeline([card("recA", "Photography", 2), card("recB", "Photography", 2, released=False)])
        self.assertEqual(body["total"], 1)

    def test_finished_work_leaves_the_pipeline(self):
        body = self.pipeline([card("recA", "Delivery", 1, status="Done")])
        self.assertEqual(body["total"], 0)

    def test_steps_come_back_in_workflow_order(self):
        body = self.pipeline([
            card("recA", "Delivery", 1),
            card("recB", "Photography", 1),
            card("recC", "Final Selection", 1),
        ])
        self.assertEqual([step["step"] for step in body["steps"]],
                         ["Photography", "Final Selection", "Delivery"])

    def test_each_step_names_its_longest_waiting_item(self):
        # A count says how much is in Post Production; the name is what someone
        # actually does something about.
        body = self.pipeline([card("recA", "Photography", 3), card("recB", "Photography", 40)])
        step = body["steps"][0]
        self.assertEqual(step["count"], 2)
        self.assertEqual(step["oldest"]["cardId"], "recB")
        self.assertGreaterEqual(step["oldest"]["days"], 40)

    def test_a_card_creative_force_never_reported_on_is_shown_not_dropped(self):
        # A card that stays here is a handoff that did not land.
        blank = card("recA", "", 5)
        blank["fields"][C.F_WORKSTREAM_CARD_CREATIVE_FORCE_STEP] = ""
        body = self.pipeline([blank])
        self.assertEqual(body["steps"][-1]["step"], "Not yet reported")
        self.assertEqual(body["steps"][-1]["count"], 1)

    def test_waiting_time_falls_back_to_the_release(self):
        # A card with no step report has still been waiting since it was handed over.
        blank = card("recA", "", 9)
        blank["fields"][C.F_WORKSTREAM_CARD_CREATIVE_FORCE_STEP] = ""
        blank["fields"][C.F_WORKSTREAM_CARD_CREATIVE_FORCE_SYNC] = "{}"
        body = self.pipeline([blank])
        self.assertGreaterEqual(body["steps"][-1]["oldest"]["days"], 9)

    def test_it_splits_by_workstream(self):
        body = self.pipeline([
            card("recA", "Photography", 1, workstream="Ecomm"),
            card("recB", "Photography", 1, workstream="Packaging"),
        ])
        self.assertEqual(body["byWorkstream"],
                         [{"workstream": "Ecomm", "count": 1}, {"workstream": "Packaging", "count": 1}])

    def test_an_empty_pipeline_is_not_an_error(self):
        body = self.pipeline([])
        self.assertEqual(body["total"], 0)
        self.assertEqual(body["steps"], [])


if __name__ == "__main__":
    unittest.main()
