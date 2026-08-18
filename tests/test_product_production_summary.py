import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from routes import (  # noqa: E402
    _creative_force_feed_fields,
    _derive_product_production_summary,
    _planning_status_for_fields,
    _sync_creative_force_product_feed_cards,
)
import routes  # noqa: E402
from config import Config as C  # noqa: E402
from ensure_creative_force_product_feed import feed_field_definitions  # noqa: E402


def record(**fields):
    return {"fields": fields}


class ProductProductionSummaryTests(unittest.TestCase):
    def test_unreviewed_new_merch_stays_in_new_queue_with_raw_planning_values(self):
        self.assertEqual(
            _planning_status_for_fields({
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "New",
                C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
                C.F_RECEIPT_ENTRY_DELIVERABLES: ["Ecomm"],
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: False,
            }),
            "new",
        )

    def test_explicit_waiting_status_is_not_treated_as_new_merch(self):
        self.assertEqual(
            _planning_status_for_fields({
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Needs More Information",
                C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
                C.F_RECEIPT_ENTRY_DELIVERABLES: ["Ecomm"],
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: False,
            }),
            "needs-more-information",
        )

    def test_explicit_planning_status_is_authoritative(self):
        self.assertEqual(
            _planning_status_for_fields({
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "New",
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: False,
            }),
            "new",
        )

    def test_no_merchandise_is_distinct_from_unreviewed_merchandise(self):
        self.assertEqual(_derive_product_production_summary(merchandise=[], workstreams=[], thr3d=[])["status"], "No Merchandise")
        self.assertEqual(
            _derive_product_production_summary(
                merchandise=[record(**{"Merch Status": "Received", "Planning Status": "New"})],
                workstreams=[],
                thr3d=[],
            )["status"],
            "Needs Review",
        )

    def test_work_is_identified_and_ready_states_are_derived(self):
        merchandise = [record(**{"Merch Status": "Received", "Planning Status": "Needs More Information"})]
        self.assertEqual(
            _derive_product_production_summary(merchandise=merchandise, workstreams=[], thr3d=[])["status"],
            "Waiting on Information",
        )
        ready = [record(**{"Workstream Type": "Ecomm", C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Ready for Photo"})]
        self.assertEqual(
            _derive_product_production_summary(
                merchandise=[record(**{"Merch Status": "Received", "Planning Status": "Ready for Photo"})],
                workstreams=ready,
                thr3d=[],
            )["status"],
            "Ready for Photo",
        )

    def test_creative_force_status_is_reported_without_overwriting_planning_status(self):
        summary = _derive_product_production_summary(
            merchandise=[record(**{"Merch Status": "Received", "Planning Status": "Ready for Photo"})],
            workstreams=[record(**{C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Ready for Photo", "Creative Force Sync": '{"status": "In Production"}'})],
            thr3d=[],
        )
        self.assertEqual(summary["status"], "In Production")
        self.assertEqual(summary["workstreamStatuses"], ["Ready for Photo"])
        self.assertEqual(summary["creativeForceStatuses"], ["In Production"])

    def test_physical_issue_wins_over_production_summary(self):
        summary = _derive_product_production_summary(
            merchandise=[record(**{"Merch Status": "Issue", "Planning Status": "Ready for Photo"})],
            workstreams=[record(**{C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Ready for Photo"})],
            thr3d=[],
        )
        self.assertEqual(summary["status"], "Issue")

    def test_feed_fields_are_flat_and_use_the_workstream_card_as_source_key(self):
        fields = _creative_force_feed_fields(
            {"id": "recCard", "fields": {C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Ready for Photo", "Creative Force Sync": ""}},
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

    def test_product_type_is_not_projected_into_creative_force_feed(self):
        definitions = feed_field_definitions([
            {"fields": {"Photo Production Requirements": '{"workstreams":{"Ecomm":{"requiredProductFields":["productType"]}}}'}},
        ])
        names = [name for name, _ in definitions]
        self.assertNotIn("Product Type", names)

        fields = _creative_force_feed_fields(
            {"id": "recCard", "fields": {}},
            {
                "payload": {
                    "product": {"name": "Soup", "requiredFields": {"productType": "Shelf Stable"}},
                    "client": {"name": "Topco"},
                    "creativeForce": {"productCode": "SKU-1", "category": "Topco", "productionType": "Ecomm"},
                },
            },
        )
        self.assertNotIn("Product Type", fields)

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.list_records")
    @patch("routes._creative_force_handoff")
    def test_ready_card_is_written_without_a_second_handoff_gate(self, handoff, list_records, create_record):
        card = {
            "id": "recReadyCard",
            "fields": {
                "Workstream Type": "Ecomm",
                C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Ready for Photo",
            },
        }
        handoff.return_value = {
            "ready": False,
            "payload": {
                "product": {"name": "Soup"},
                "client": {"name": "Topco"},
                "creativeForce": {"productCode": "", "category": "Topco", "productionType": "Ecomm"},
            },
        }
        list_records.return_value = {"records": []}
        create_record.return_value = {"id": "recFeed", "fields": {}}

        synced = _sync_creative_force_product_feed_cards([card])

        self.assertEqual(synced[0]["action"], "created")
        self.assertEqual(create_record.call_args.args[0], routes.C.CREATIVE_FORCE_PRODUCT_FEED_TABLE)
        self.assertEqual(create_record.call_args.args[1]["Source Key"], "recReadyCard")


if __name__ == "__main__":
    unittest.main()
