import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from routes import (  # noqa: E402
    _creative_force_feed_fields,
    _derive_product_production_summary,
)
from ensure_creative_force_product_feed import feed_field_definitions  # noqa: E402


def record(**fields):
    return {"fields": fields}


class ProductProductionSummaryTests(unittest.TestCase):
    def test_no_merchandise_is_distinct_from_unreviewed_merchandise(self):
        self.assertEqual(_derive_product_production_summary(merchandise=[], workstreams=[], thr3d=[])["status"], "No Merchandise")
        self.assertEqual(
            _derive_product_production_summary(
                merchandise=[record(**{"Merch Status": "Received", "Intake Status": "Needs Review"})],
                workstreams=[],
                thr3d=[],
            )["status"],
            "Needs Review",
        )

    def test_work_is_identified_and_ready_states_are_derived(self):
        merchandise = [record(**{"Merch Status": "Received", "Intake Status": "Waiting on Information"})]
        self.assertEqual(
            _derive_product_production_summary(merchandise=merchandise, workstreams=[], thr3d=[])["status"],
            "Waiting on Information",
        )
        ready = [record(**{"Workstream Type": "Ecomm", "Status": "Ready for Photo"})]
        self.assertEqual(
            _derive_product_production_summary(
                merchandise=[record(**{"Merch Status": "Received", "Intake Status": "Ready for Photo"})],
                workstreams=ready,
                thr3d=[],
            )["status"],
            "Ready for Photo",
        )

    def test_creative_force_status_is_reported_without_overwriting_planning_status(self):
        summary = _derive_product_production_summary(
            merchandise=[record(**{"Merch Status": "Received", "Intake Status": "Ready for Photo"})],
            workstreams=[record(**{"Status": "Ready for Photo", "Creative Force Sync": '{"status": "In Production"}'})],
            thr3d=[],
        )
        self.assertEqual(summary["status"], "In Production")
        self.assertEqual(summary["workstreamStatuses"], ["Ready for Photo"])
        self.assertEqual(summary["creativeForceStatuses"], ["In Production"])

    def test_physical_issue_wins_over_production_summary(self):
        summary = _derive_product_production_summary(
            merchandise=[record(**{"Merch Status": "Issue", "Intake Status": "Ready for Photo"})],
            workstreams=[record(**{"Status": "Ready for Photo"})],
            thr3d=[],
        )
        self.assertEqual(summary["status"], "Issue")

    def test_feed_fields_are_flat_and_use_the_workstream_card_as_source_key(self):
        fields = _creative_force_feed_fields(
            {"id": "recCard", "fields": {"Status": "Ready for Photo", "Creative Force Sync": ""}},
            {
                "ready": True,
                "payload": {
                    "product": {"name": "Soup"},
                    "client": {"name": "Topco"},
                    "creativeForce": {"productCode": "SKU-1", "category": "Topco", "productionType": "Ecomm"},
                },
            },
        )
        self.assertEqual(fields["Product"], "Soup")
        self.assertEqual(fields["Product Code"], "SKU-1")
        self.assertEqual(fields["Source Key"], "recCard")

    def test_feed_schema_is_union_of_client_required_fields(self):
        definitions = feed_field_definitions([
            {"fields": {"Photo Production Requirements": '{"workstreams":{"Ecomm":{"requiredProductFields":["cvid","upc"]}}}'}},
            {"fields": {"Photo Production Requirements": '{"workstreams":{"Packaging":{"requiredProductFields":["brandPrefix","upc"]}}}'}},
        ])
        names = [name for name, _ in definitions]
        self.assertIn("CVID", names)
        self.assertIn("UPC / Product ID", names)
        self.assertIn("Brand Prefix", names)
        self.assertEqual(names.count("UPC / Product ID"), 1)


if __name__ == "__main__":
    unittest.main()
