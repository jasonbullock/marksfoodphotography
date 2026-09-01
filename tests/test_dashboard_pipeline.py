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


class ProductionUiTests(unittest.TestCase):
    """The tab answers "what exactly"; the dashboard answers "is anything stuck"."""

    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "frontend" / "src" / "App.jsx").read_text()
        cls.routes = (ROOT / "backend" / "routes.py").read_text()

    def test_the_page_reads_from_creative_force_rather_than_our_own_records(self):
        self.assertIn("api.listCreativeForceProduction()", self.source)
        self.assertIn('@api.get("/production/creative-force")', self.routes)

    def test_a_switched_off_production_is_not_counted_as_work(self):
        # Creative Force builds every production type its styleguide knows about.
        self.assertIn("!unit.isDisabled", self.source)

    def test_the_whole_workflow_is_shown_not_only_the_steps_reached(self):
        # Seeing what is left is the point; a trail of only-what-happened cannot
        # say whether a production is nearly done or barely started.
        self.assertIn("function ProductionTrack({ workflow = [], production }) {", self.source)
        self.assertIn('"workflow": [{"stepId": step_id, "step": step_name(step_id)}',
                      (ROOT / "backend" / "creative_force_api.py").read_text())

    def test_a_derived_workflow_is_not_shown_as_a_second_production(self):
        # It is a tail of the main work - a delivery spawned off Final Selection -
        # and beside it read as a duplicate that had never started.
        self.assertIn(".filter(unit => !unit.isDerived && !unit.isDisabled)", self.source)

    def test_finished_work_is_not_labelled_as_not_started(self):
        self.assertIn("isComplete", self.source)

    def test_durations_are_not_reported_to_the_second(self):
        # "worked 5s" is noise on a board about a week of production.
        block = self.source.split("function humanDuration(seconds) {", 1)[1].split("}", 1)[0]
        self.assertIn("'<1m'", block)

    def test_a_gateway_outage_shows_the_last_good_read_rather_than_nothing(self):
        self.assertIn('"staleError"', self.routes)
        self.assertIn("Showing the last good read", self.source)

    def test_the_snapshot_is_cached(self):
        # It is one gateway call per product plus one per production; every page
        # open would otherwise walk the whole job again.
        self.assertIn("CF_SNAPSHOT_CACHE_SECONDS", self.routes)

    def test_the_dashboard_names_the_longest_waiting_item(self):
        self.assertIn("Longest waiting:", self.source)
        self.assertIn("function CreativeForceStrip({ navigate }) {", self.source)

    def test_the_dashboard_strip_stays_out_of_the_way_when_there_is_nothing_to_say(self):
        self.assertIn("if (data.configured === false || production.error) return null;", self.source)
