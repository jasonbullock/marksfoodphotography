import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import Config as C  # noqa: E402


class IntakeStatusUtilityTests(unittest.TestCase):
    def setUp(self):
        self.utility = importlib.import_module("ensure_intake_status_field")

    def table(self, fields=None):
        return {"id": "tblMerch", "name": C.MERCHANDISE_TABLE, "fields": fields or []}

    def field(self, name, choices, field_id=None):
        return {
            "id": field_id or f"fld{name.replace(' ', '')}",
            "name": name,
            "type": "singleSelect",
            "options": {"choices": [{"name": choice} for choice in choices]},
        }

    def test_reuses_existing_intake_status_field_when_safe(self):
        table = self.table([self.field(C.F_RECEIPT_ENTRY_INTAKE_STATUS, C.INTAKE_STATUS_OPTIONS)])

        result = self.utility.ensure_intake_status_schema(table, dry_run=True)

        self.assertEqual(result["result"], "unchanged")
        self.assertEqual(result["field"], C.F_RECEIPT_ENTRY_INTAKE_STATUS)
        self.assertEqual(result["missingOptions"], [])

    @patch("ensure_intake_status_field.create_field", return_value={"id": "fldIntakeStatus"})
    def test_creates_new_field_when_merch_status_is_not_safe(self, create_field):
        table = self.table([
            self.field(C.F_RECEIPT_ENTRY_MERCH_STATUS, ["Received", "Issue", "Ready to Ship", "Shipped", "Disposed"]),
        ])

        result = self.utility.ensure_intake_status_schema(table, dry_run=False)

        self.assertEqual(result["result"], "created")
        self.assertFalse(result["reusedMerchStatus"])
        payload = create_field.call_args.args[1]
        self.assertEqual(payload["name"], C.F_RECEIPT_ENTRY_INTAKE_STATUS)
        self.assertEqual([choice["name"] for choice in payload["options"]["choices"]], C.INTAKE_STATUS_OPTIONS)

    @patch("ensure_intake_status_field.update_field")
    def test_adds_missing_required_options(self, update_field):
        field = self.field(C.F_RECEIPT_ENTRY_INTAKE_STATUS, ["Needs Review"], field_id="fldIntakeStatus")
        table = self.table([field])

        result = self.utility.ensure_intake_status_schema(table, dry_run=False)

        self.assertEqual(result["result"], "updated")
        payload = update_field.call_args.args[2]
        self.assertEqual([choice["name"] for choice in payload["options"]["choices"]], C.INTAKE_STATUS_OPTIONS)

    def test_marker_migrates_to_waiting_and_preserves_other_notes(self):
        record = {
            "id": "rec1",
            "fields": {
                C.F_RECEIPT_ENTRY_NOTES: "Receiver note\n[Waiting for Product Data] Import missing",
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            },
        }

        update, reason = self.utility.planned_record_update(record)

        self.assertEqual(reason, "migrated_marker")
        self.assertEqual(update[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Waiting on Information")
        self.assertEqual(update[C.F_RECEIPT_ENTRY_NOTES], "Receiver note\n Import missing")

    def test_existing_valid_status_is_not_overwritten(self):
        record = {
            "id": "rec1",
            "fields": {
                C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Ready for Photo",
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            },
        }

        update, reason = self.utility.planned_record_update(record)

        self.assertEqual(update, {})
        self.assertEqual(reason, "skipped_existing_status")

    def test_active_blank_defaults_to_needs_review(self):
        update, reason = self.utility.planned_record_update({
            "id": "rec1",
            "fields": {C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received"},
        })

        self.assertEqual(reason, "defaulted_needs_review")
        self.assertEqual(update[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Needs Review")

    def test_legacy_validated_blank_defaults_to_needs_review(self):
        update, reason = self.utility.planned_record_update({
            "id": "rec1",
            "fields": {C.F_RECEIPT_ENTRY_MERCH_STATUS: "Validated"},
        })

        self.assertEqual(reason, "defaulted_needs_review")
        self.assertEqual(update[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Needs Review")

    def test_closed_records_are_not_reopened(self):
        update, reason = self.utility.planned_record_update({
            "id": "rec1",
            "fields": {
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Removed",
            },
        })

        self.assertEqual(update, {})
        self.assertEqual(reason, "skipped_historical")

    def test_second_migration_run_is_idempotent_after_updates(self):
        original = {"id": "rec1", "fields": {C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received"}}
        update, reason = self.utility.planned_record_update(original)
        self.assertEqual(reason, "defaulted_needs_review")

        rerun = {"id": "rec1", "fields": {**original["fields"], **update}}
        second_update, second_reason = self.utility.planned_record_update(rerun)

        self.assertEqual(second_update, {})
        self.assertEqual(second_reason, "skipped_existing_status")


if __name__ == "__main__":
    unittest.main()
