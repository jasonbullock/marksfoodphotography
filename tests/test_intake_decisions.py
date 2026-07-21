import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from routes import AUTH_SESSION_KEY  # noqa: E402
from routes import WAITING_FOR_PRODUCT_DATA_MARKER  # noqa: E402


class IntakeDecisionTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()
        with self.app.session_transaction() as session:
            session[AUTH_SESSION_KEY] = {
                "id": "recTestUser",
                "name": "Test User",
                "role": "Admin",
                "active": True,
                "clientIds": [],
                "allClients": True,
            }

    @staticmethod
    def entry(fields=None):
        base = {
            C.F_RECEIPT_ENTRY_NAME: "Frozen Pizza Box",
            C.F_RECEIPT_ENTRY_RECEIPT: ["recShipment"],
            C.F_RECEIPT_ENTRY_SKU_ID: "000123",
            C.F_RECEIPT_ENTRY_QUANTITY: 1,
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
        }
        base.update(fields or {})
        return {"id": "recMerch", "fields": base}

    @staticmethod
    def receipt():
        return {
            "id": "recShipment",
            "fields": {
                C.F_RECEIPT_NAME: "Shipment 1",
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_RECEIVED: "2026-07-16T10:00:00Z",
            },
        }

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_valid_intake_decisions_save_and_serialize(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_PRODUCTION_TYPE: "Packaging",
            C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION: "Keep at Walnut",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "productionType": "Packaging",
            "merchandiseResolution": "Keep at Walnut",
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PRODUCTION_TYPE], "Packaging")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION], "Keep at Walnut")
        payload = response.get_json()
        self.assertEqual(payload["production_type"], "Packaging")
        self.assertEqual(payload["productionType"], "Packaging")
        self.assertEqual(payload["merchandise_resolution"], "Keep at Walnut")
        self.assertEqual(payload["merchandiseResolution"], "Keep at Walnut")

    @patch("routes.airtable.get_record")
    def test_invalid_production_type_rejected(self, get_record):
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "productionType": "Video",
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Production Type must be one of", response.get_json()["error"])

    @patch("routes.airtable.get_record")
    def test_invalid_merchandise_resolution_rejected(self, get_record):
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "merchandiseResolution": "Archive",
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Merchandise Resolution must be one of", response.get_json()["error"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_blank_values_are_allowed(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_PRODUCTION_TYPE: "",
            C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION: "",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "productionType": "",
            "merchandiseResolution": "",
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PRODUCTION_TYPE], "")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION], "")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_thr3d_defaults_resolution_when_blank(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_PRODUCTION_TYPE: "THR3D",
            C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION: "Ship to Kentucky",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "productionType": "THR3D",
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PRODUCTION_TYPE], "THR3D")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION], "Ship to Kentucky")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_thr3d_does_not_overwrite_existing_resolution(self, get_record, update_record, _clients):
        get_record.side_effect = [
            self.entry({C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION: "Hold"}),
            self.receipt(),
        ]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_PRODUCTION_TYPE: "THR3D",
            C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION: "Hold",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "productionType": "THR3D",
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PRODUCTION_TYPE], "THR3D")
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION, fields)

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_changing_away_from_thr3d_does_not_clear_resolution(self, get_record, update_record, _clients):
        get_record.side_effect = [
            self.entry({
                C.F_RECEIPT_ENTRY_PRODUCTION_TYPE: "THR3D",
                C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION: "Ship to Kentucky",
            }),
            self.receipt(),
        ]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_PRODUCTION_TYPE: "eCommerce",
            C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION: "Ship to Kentucky",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "productionType": "eCommerce",
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PRODUCTION_TYPE], "eCommerce")
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION, fields)

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_waiting_info_uses_merchandise_notes_and_status(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_NOTES: "Receiver note"}), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_NOTES: f"Receiver note\n{WAITING_FOR_PRODUCT_DATA_MARKER}",
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"stage": "waiting-info"})

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")
        self.assertIn(WAITING_FOR_PRODUCT_DATA_MARKER, fields[C.F_RECEIPT_ENTRY_NOTES])
        self.assertEqual(response.get_json()["reviewState"], "Waiting for Product Data")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_send_thr3d_updates_merchandise_decision_fields(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_PRODUCTION_TYPE: "THR3D",
            C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION: "Ship to Kentucky",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"stage": "send-thr3d"})

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PRODUCTION_TYPE], "THR3D")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION], "Ship to Kentucky")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_ready_production_validates_merchandise(self, get_record, update_record, _issues, _clients):
        get_record.side_effect = [
            self.entry({
                C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
                C.F_RECEIPT_ENTRY_NOTES: f"Receiver note\n{WAITING_FOR_PRODUCT_DATA_MARKER}",
            }),
            self.receipt(),
            {"id": "recProduct", "fields": {C.F_ITEM_NAME: "Frozen Pizza"}},
        ]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Validated",
            C.F_RECEIPT_ENTRY_NOTES: "Receiver note",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"stage": "ready-production"})

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Validated")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_NOTES], "Receiver note")

    @patch("routes.airtable.get_record")
    def test_intake_state_ready_production_requires_product(self, get_record):
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"stage": "ready-production"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Product Information", response.get_json()["error"])


class IntakeDecisionSchemaUtilityTests(unittest.TestCase):
    def setUp(self):
        self.utility = importlib.import_module("ensure_intake_decision_fields")

    def table(self, fields=None):
        return {"id": "tblMerch", "name": C.MERCHANDISE_TABLE, "fields": fields or []}

    def field(self, name, choices):
        return {
            "id": f"fld{name.replace(' ', '')}",
            "name": name,
            "type": "singleSelect",
            "options": {"choices": [{"name": choice} for choice in choices]},
        }

    @patch("ensure_intake_decision_fields.create_field")
    @patch("ensure_intake_decision_fields.get_tables")
    @patch("ensure_intake_decision_fields.load_env")
    def test_schema_utility_creates_missing_fields(self, _load_env, get_tables, create_field):
        get_tables.side_effect = [
            [self.table()],
            [self.table([self.field(C.F_RECEIPT_ENTRY_PRODUCTION_TYPE, C.PRODUCTION_TYPE_OPTIONS)])],
        ]
        create_field.side_effect = [
            {"id": "fldProductionType"},
            {"id": "fldMerchandiseResolution"},
        ]

        with patch.object(C, "airtable_ready", return_value=True):
            self.utility.main()

        self.assertEqual(create_field.call_count, 2)
        created_names = [call.args[1]["name"] for call in create_field.call_args_list]
        self.assertEqual(created_names, [
            C.F_RECEIPT_ENTRY_PRODUCTION_TYPE,
            C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION,
        ])
        self.assertEqual(
            [choice["name"] for choice in create_field.call_args_list[0].args[1]["options"]["choices"]],
            C.PRODUCTION_TYPE_OPTIONS,
        )

    @patch("ensure_intake_decision_fields.create_field")
    @patch("ensure_intake_decision_fields.get_tables")
    @patch("ensure_intake_decision_fields.load_env")
    def test_schema_utility_reuses_existing_equivalent_fields(self, _load_env, get_tables, create_field):
        existing = self.table([
            self.field(C.F_RECEIPT_ENTRY_PRODUCTION_TYPE, C.PRODUCTION_TYPE_OPTIONS),
            self.field(C.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION, C.MERCHANDISE_RESOLUTION_OPTIONS),
        ])
        get_tables.side_effect = [[existing], [existing]]

        with patch.object(C, "airtable_ready", return_value=True):
            self.utility.main()

        create_field.assert_not_called()

    @patch("ensure_intake_decision_fields.get_tables")
    @patch("ensure_intake_decision_fields.load_env")
    def test_schema_utility_rejects_incomplete_existing_options(self, _load_env, get_tables):
        get_tables.return_value = [self.table([
            self.field(C.F_RECEIPT_ENTRY_PRODUCTION_TYPE, ["eCommerce"]),
        ])]

        with patch.object(C, "airtable_ready", return_value=True):
            with self.assertRaises(SystemExit):
                self.utility.main()


if __name__ == "__main__":
    unittest.main()
