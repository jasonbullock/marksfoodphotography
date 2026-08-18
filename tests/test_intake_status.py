import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import Config as C  # noqa: E402


class PlanningStatusMigrationTests(unittest.TestCase):
    def setUp(self):
        self.utility = importlib.import_module("ensure_intake_status_field")

    def table(self, fields=None):
        return {"id": "tblMerch", "name": C.MERCHANDISE_TABLE, "fields": fields or []}

    def field(self, name, field_id="fldField"):
        return {"id": field_id, "name": name, "type": "singleSelect"}

    def test_legacy_field_is_reported_for_retirement(self):
        result = self.utility.ensure_intake_status_schema(
            self.table([self.field("Intake Status", field_id="fldLegacy")]),
            dry_run=True,
        )

        self.assertEqual(result["result"], "would_delete")
        self.assertEqual(result["id"], "fldLegacy")
        self.assertEqual(result["reason"], "Intake Status is a retired field. Planning Status is canonical.")

    def test_missing_legacy_field_is_already_absent(self):
        result = self.utility.ensure_intake_status_schema(self.table(), dry_run=True)
        self.assertEqual(result["result"], "retired")
        self.assertEqual(result["id"], "")

    def test_marker_migrates_to_canonical_planning_status(self):
        record = {
            "id": "rec1",
            "fields": {
                C.F_RECEIPT_ENTRY_NOTES: "Receiver note\n[Waiting for Product Data] Import missing",
                "Intake Status": "Waiting on Information",
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            },
        }

        update, reason = self.utility.planned_record_update(record)

        self.assertEqual(reason, "migrated_marker")
        self.assertEqual(update[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Needs More Information")
        self.assertNotIn("Intake Status", update)
        self.assertEqual(update[C.F_RECEIPT_ENTRY_NOTES], "Receiver note\n Import missing")

    def test_existing_canonical_status_is_not_overwritten(self):
        update, reason = self.utility.planned_record_update({
            "id": "rec1",
            "fields": {
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Ready for Photo",
                "Intake Status": "Waiting on Information",
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            },
        })

        self.assertEqual(update, {})
        self.assertEqual(reason, "skipped_existing_status")

    def test_active_blank_defaults_to_canonical_new(self):
        update, reason = self.utility.planned_record_update({
            "id": "rec1",
            "fields": {C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received"},
        })

        self.assertEqual(reason, "defaulted_needs_review")
        self.assertEqual(update[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "New")

    @patch("ensure_intake_status_field.meta_request")
    def test_delete_legacy_field_uses_metadata_delete(self, meta_request):
        result = self.utility.delete_legacy_intake_status_field(
            self.table([self.field("Intake Status", field_id="fldLegacy")]),
        )

        self.assertEqual(result["result"], "deleted")
        meta_request.assert_called_once_with("DELETE", "/tables/tblMerch/fields/fldLegacy")


if __name__ == "__main__":
    unittest.main()
