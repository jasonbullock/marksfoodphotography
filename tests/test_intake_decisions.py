import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from routes import AUTH_SESSION_KEY  # noqa: E402


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
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo", "Ecomm Photo"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": ["Packaging Photo", "Ecomm Photo"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging Photo", "Ecomm Photo"])
        payload = response.get_json()
        self.assertEqual(payload["deliverables"], ["Packaging Photo", "Ecomm Photo"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_single_deliverable_saves_as_multi_select_payload(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": "Packaging",
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging Photo"])
        payload = response.get_json()
        self.assertEqual(payload["deliverables"], ["Packaging Photo"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_legacy_and_airtable_multiselect_shapes_are_normalized(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo", "Ecomm Photo", "Thr3d"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": [{"name": "Packaging"}, {"name": "Ecomm"}, {"name": "THR3D"}],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging Photo", "Ecomm Photo", "Thr3d"])
        self.assertEqual(response.get_json()["deliverables"], ["Packaging Photo", "Ecomm Photo", "Thr3d"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_comma_separated_legacy_deliverables_are_normalized(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo", "Ecomm Photo"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": "Packaging, Ecomm",
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(update_record.call_args.args[2][C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging Photo", "Ecomm Photo"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_malformed_deliverable_shapes_are_normalized_before_airtable(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo", "Ecomm Photo", "Thr3d"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": [
                '["Packaging Photo"]',
                ['"Ecomm"'],
                {"name": '"THR3D"'},
                "",
                '"""',
                None,
                "Packaging",
            ],
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            update_record.call_args.args[2][C.F_RECEIPT_ENTRY_DELIVERABLES],
            ["Packaging Photo", "Ecomm Photo", "Thr3d"],
        )

    @patch("routes.airtable.get_record")
    def test_invalid_deliverable_rejected(self, get_record):
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": ["Video"],
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Deliverables must be one or more of", response.get_json()["error"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_blank_values_are_allowed(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: [],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": [],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], [])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_thr3d_deliverable_does_not_write_resolution(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Thr3d", "Ecomm Photo"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": ["Thr3d", "Ecomm Photo"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Thr3d", "Ecomm Photo"])
        self.assertTrue(all("Resolution" not in key for key in fields))

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_waiting_info_uses_intake_status(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_NOTES: "Receiver note"}), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo"],
            C.F_RECEIPT_ENTRY_NOTES: "Receiver note",
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Waiting on Information",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={
            "stage": "waiting-info",
            "deliverables": ["Packaging Photo"],
            "blockingRequirements": ["Product not identified"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging Photo"])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Waiting on Information")
        self.assertNotIn(C.F_RECEIPT_ENTRY_NOTES, fields)
        self.assertEqual(response.get_json()["reviewState"], "Waiting for Product Data")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_send_thr3d_updates_merchandise_decision_fields(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry({
            C.F_RECEIPT_ENTRY_PHOTO_METADATA: [{"object_key": "receiving/recShipment/recMerch-1.jpg"}],
        }), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Thr3d"],
            C.F_RECEIPT_ENTRY_PHOTO_METADATA: [{"object_key": "receiving/recShipment/recMerch-1.jpg"}],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={
            "stage": "send-thr3d",
            "deliverables": ["Thr3d"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Thr3d"])
        self.assertTrue(all("Resolution" not in key for key in fields))
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Ready to Release")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_send_thr3d_requires_merchandise_photo(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={
            "stage": "send-thr3d",
            "deliverables": ["Thr3d"],
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Merchandise Photo", response.get_json()["error"])
        update_record.assert_not_called()

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_send_thr3d_rejects_mixed_photo_deliverables(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry({
            C.F_RECEIPT_ENTRY_PHOTO_METADATA: [{"object_key": "receiving/recShipment/recMerch-1.jpg"}],
        }), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={
            "stage": "send-thr3d",
            "deliverables": ["Packaging Photo", "Thr3d"],
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("complete the photo path", response.get_json()["error"])
        update_record.assert_not_called()

    @patch("routes._clients_by_id", return_value={})
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_ready_production_validates_merchandise(self, get_record, update_record, _issues, _clients):
        get_record.side_effect = [
            self.entry({
                C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
                C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo"],
                C.F_RECEIPT_ENTRY_NOTES: "Receiver note",
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True,
            }),
            self.receipt(),
            {"id": "recProduct", "fields": {C.F_ITEM_NAME: "Frozen Pizza", C.F_ITEM_IDENTIFIER: "000123", C.F_ITEM_ARTWORK_RECEIVED: True}},
            {"id": "recProduct", "fields": {C.F_ITEM_NAME: "Frozen Pizza", C.F_ITEM_IDENTIFIER: "000123", C.F_ITEM_ARTWORK_RECEIVED: True}},
        ]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo"],
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Validated",
            C.F_RECEIPT_ENTRY_NOTES: "Receiver note",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={
            "stage": "ready-production",
            "deliverables": ["Packaging Photo"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging Photo"])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Validated")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Ready to Release")
        self.assertNotIn(C.F_RECEIPT_ENTRY_NOTES, fields)

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_explicit_invalid_intake_status_is_rejected(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"intakeStatus": "Blocked"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Intake Status must be one of", response.get_json()["error"])
        update_record.assert_not_called()

    @patch("routes.airtable.get_record")
    def test_intake_state_ready_production_requires_product(self, get_record):
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging Photo"]}), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"stage": "ready-production"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Product Linked", response.get_json()["error"])


class IntakeDecisionSchemaUtilityTests(unittest.TestCase):
    def setUp(self):
        self.utility = importlib.import_module("ensure_intake_decision_fields")

    def table(self, fields=None):
        return {"id": "tblMerch", "name": C.MERCHANDISE_TABLE, "fields": fields or []}

    def field(self, name, choices, field_type="singleSelect"):
        return {
            "id": f"fld{name.replace(' ', '')}",
            "name": name,
            "type": field_type,
            "options": {"choices": [{"name": choice} for choice in choices]},
        }

    @patch("ensure_intake_decision_fields.create_field")
    @patch("ensure_intake_decision_fields.get_tables")
    @patch("ensure_intake_decision_fields.load_env")
    def test_schema_utility_creates_missing_fields(self, _load_env, get_tables, create_field):
        get_tables.return_value = [self.table()]
        create_field.return_value = {"id": "fldDeliverables"}

        with patch.object(C, "airtable_ready", return_value=True):
            self.utility.main()

        create_field.assert_called_once()
        created_names = [call.args[1]["name"] for call in create_field.call_args_list]
        self.assertEqual(created_names, [C.F_RECEIPT_ENTRY_DELIVERABLES])
        self.assertEqual(
            [choice["name"] for choice in create_field.call_args_list[0].args[1]["options"]["choices"]],
            C.DELIVERABLE_OPTIONS,
        )
        self.assertEqual(create_field.call_args_list[0].args[1]["type"], "multipleSelects")

    @patch("ensure_intake_decision_fields.create_field")
    @patch("ensure_intake_decision_fields.get_tables")
    @patch("ensure_intake_decision_fields.load_env")
    def test_schema_utility_reuses_existing_equivalent_fields(self, _load_env, get_tables, create_field):
        existing = self.table([
            self.field(C.F_RECEIPT_ENTRY_DELIVERABLES, C.DELIVERABLE_OPTIONS, "multipleSelects"),
        ])
        get_tables.return_value = [existing]

        with patch.object(C, "airtable_ready", return_value=True):
            self.utility.main()

        create_field.assert_not_called()

    @patch("ensure_intake_decision_fields.update_field")
    @patch("ensure_intake_decision_fields.create_field")
    @patch("ensure_intake_decision_fields.get_tables")
    @patch("ensure_intake_decision_fields.load_env")
    def test_schema_utility_converts_existing_single_select(self, _load_env, get_tables, create_field, update_field):
        existing_single = self.table([
            self.field(C.F_RECEIPT_ENTRY_DELIVERABLES, C.DELIVERABLE_OPTIONS),
        ])
        converted = self.table([
            self.field(C.F_RECEIPT_ENTRY_DELIVERABLES, C.DELIVERABLE_OPTIONS, "multipleSelects"),
        ])
        get_tables.side_effect = [[existing_single], [converted]]
        update_field.return_value = {"id": "fldDeliverables"}

        with patch.object(C, "airtable_ready", return_value=True):
            self.utility.main()

        create_field.assert_not_called()
        update_field.assert_called_once()
        self.assertEqual(update_field.call_args.args[2]["type"], "multipleSelects")

    @patch("ensure_intake_decision_fields.get_tables")
    @patch("ensure_intake_decision_fields.load_env")
    def test_schema_utility_rejects_incomplete_existing_options(self, _load_env, get_tables):
        get_tables.return_value = [self.table([
            self.field(C.F_RECEIPT_ENTRY_DELIVERABLES, ["eCommerce"]),
        ])]

        with patch.object(C, "airtable_ready", return_value=True):
            with self.assertRaises(SystemExit):
                self.utility.main()


if __name__ == "__main__":
    unittest.main()
