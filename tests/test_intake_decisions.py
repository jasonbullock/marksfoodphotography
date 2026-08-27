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
    @patch("routes._populate_creative_force_feed_for_ready_cards")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_valid_intake_decisions_save_and_serialize(self, get_record, update_record, _populate_feed, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging", "Ecomm"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": ["Packaging", "Ecomm"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging", "Ecomm"])
        payload = response.get_json()
        self.assertEqual(payload["deliverables"], ["Packaging", "Ecomm"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_decisions_can_update_observed_merchandise_identity(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_NAME: "Applesauce Cups Cinnamon 4oz 6pk",
            C.F_RECEIPT_ENTRY_SKU_ID: "36800143210",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "productName": "Applesauce Cups Cinnamon 4oz 6pk",
            "skuId": "36800143210",
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_NAME], "Applesauce Cups Cinnamon 4oz 6pk")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_SKU_ID], "36800143210")
        payload = response.get_json()
        self.assertEqual(payload["productName"], "Applesauce Cups Cinnamon 4oz 6pk")
        self.assertEqual(payload["skuId"], "36800143210")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_decisions_can_save_manual_product_info(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_MANUAL_PRODUCT_INFO: '{"productName":"Manual Toy","upc":"036800030107","cvid":"ManualCVID"}',
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "manualProductInfo": {
                "productName": "Manual Toy",
                "upc": "036800030107",
                "cvid": "ManualCVID",
            },
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(
            fields[C.F_RECEIPT_ENTRY_MANUAL_PRODUCT_INFO],
            '{"cvid": "ManualCVID", "productName": "Manual Toy", "upc": "036800030107"}',
        )
        payload = response.get_json()
        self.assertEqual(payload["manualProductInfo"], '{"productName":"Manual Toy","upc":"036800030107","cvid":"ManualCVID"}')

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_single_deliverable_saves_as_multi_select_payload(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": "Packaging",
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging"])
        payload = response.get_json()
        self.assertEqual(payload["deliverables"], ["Packaging"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_legacy_and_airtable_multiselect_shapes_are_normalized(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging", "Ecomm", "Thr3d"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": [{"name": "Packaging"}, {"name": "Ecomm"}, {"name": "THR3D"}],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging", "Ecomm", "Thr3d"])
        self.assertEqual(response.get_json()["deliverables"], ["Packaging", "Ecomm", "Thr3d"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_comma_separated_legacy_deliverables_are_normalized(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging", "Ecomm"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": "Packaging, Ecomm",
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(update_record.call_args.args[2][C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging", "Ecomm"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_malformed_deliverable_shapes_are_normalized_before_airtable(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging", "Ecomm", "Thr3d"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": [
                '["Packaging"]',
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
            ["Packaging", "Ecomm", "Thr3d"],
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
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Thr3d", "Ecomm"],
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-decisions", json={
            "deliverables": ["Thr3d", "Ecomm"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Thr3d", "Ecomm"])
        self.assertTrue(all("Resolution" not in key for key in fields))

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_waiting_info_uses_planning_status(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_NOTES: "Receiver note"}), self.receipt()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging"],
            C.F_RECEIPT_ENTRY_NOTES: "Receiver note",
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Needs More Information",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={
            "stage": "waiting-info",
            "deliverables": ["Packaging"],
            "blockingRequirements": ["Product not identified"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging"])
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCH_STATUS, fields)
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Needs More Information")
        self.assertNotIn(C.F_RECEIPT_ENTRY_NOTES, fields)
        self.assertEqual(response.get_json()["reviewState"], "Waiting for Product Data")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_intake_state_waiting_info_leaves_the_product_link_alone(self, get_record, update_record, _clients):
        # Moving to waiting-info says how far the review has got. It is not a claim
        # about which Product this is, so it does not touch the link.
        get_record.side_effect = [
            self.entry({C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]}),
            self.receipt(),
            # The link survives, so shaping the response now reads the Product.
            {"id": "recProduct", "fields": {C.F_ITEM_CLIENT: ["recClient"]}},
        ]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Needs More Information",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={
            "stage": "waiting-info",
            "deliverables": [],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertNotIn(C.F_RECEIPT_ENTRY_ITEM, fields)
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Needs More Information")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.create_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_confirm_assign_creates_ecomm_and_packaging_cards(self, get_record, update_record, create_record, _clients):
        product = {"id": "recProduct", "fields": {C.F_ITEM_CLIENT: ["recClient"], C.F_ITEM_NAME: "Frozen Pizza"}}
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_QUANTITY: 10}), self.receipt(), product]
        create_record.side_effect = [
            {
                "id": "recEcomm",
                "fields": {
                    C.F_WORKSTREAM_CARD_NAME: "Frozen Pizza Box - 000123 - Ecomm",
                    C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
                    C.F_WORKSTREAM_CARD_EXPECTED_PRODUCT: ["recProduct"],
                    C.F_WORKSTREAM_CARD_TYPE: "Ecomm",
                    C.F_WORKSTREAM_CARD_PLANNING_STATUS: "New",
                    C.F_WORKSTREAM_CARD_QUANTITY: 4,
                },
            },
            {
                "id": "recPackaging",
                "fields": {
                    C.F_WORKSTREAM_CARD_NAME: "Frozen Pizza Box - 000123 - Packaging",
                    C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
                    C.F_WORKSTREAM_CARD_EXPECTED_PRODUCT: ["recProduct"],
                    C.F_WORKSTREAM_CARD_TYPE: "Packaging",
                    C.F_WORKSTREAM_CARD_PLANNING_STATUS: "New",
                    C.F_WORKSTREAM_CARD_QUANTITY: 6,
                },
            },
        ]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_MANUAL_PRODUCT_INFO: '{"upc": "000123"}',
        })

        response = self.app.post("/api/merchandise/recMerch/confirm-assign", json={
            "expectedProductId": "recProduct",
            "manualProductInfo": {"upc": "000123"},
            "workstreams": [
                {"type": "Ecomm", "quantity": 4},
                {"type": "Packaging", "quantity": 6},
            ],
        })

        self.assertEqual(response.status_code, 201)
        self.assertEqual(create_record.call_count, 2)
        self.assertEqual(create_record.call_args_list[0].args[0], C.WORKSTREAM_CARDS_TABLE)
        self.assertEqual(create_record.call_args_list[1].args[0], C.WORKSTREAM_CARDS_TABLE)
        update_fields = update_record.call_args.args[2]
        # The parent leaves the board because child work exists, not via a status
        # flag, and it must not be sent back to New now that it has been accepted.
        self.assertEqual(update_fields[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Needs More Information")
        self.assertEqual(update_fields[C.F_RECEIPT_ENTRY_ITEM], ["recProduct"])
        self.assertEqual(update_fields[C.F_RECEIPT_ENTRY_MANUAL_PRODUCT_INFO], '{"upc": "000123"}')
        payload = response.get_json()
        self.assertEqual([card["type"] for card in payload["workstreamCards"]], ["Ecomm", "Packaging"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.create_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_confirm_assign_creates_packaging_card_and_thr3d_shipping_item(self, get_record, update_record, create_record, _clients):
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_QUANTITY: 10}), self.receipt()]
        create_record.side_effect = [
            {
                "id": "recPackaging",
                "fields": {
                    C.F_WORKSTREAM_CARD_NAME: "Frozen Pizza Box - 000123 - Packaging",
                    C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
                    C.F_WORKSTREAM_CARD_TYPE: "Packaging",
                    C.F_WORKSTREAM_CARD_PLANNING_STATUS: "New",
                    C.F_WORKSTREAM_CARD_QUANTITY: 6,
                },
            },
            {
                "id": "recThr3d",
                "fields": {
                    C.F_THR3D_SHIPPING_ITEM_NAME: "Frozen Pizza Box - 000123 - THR3D",
                    C.F_THR3D_SHIPPING_ITEM_RECEIVED_MERCH: ["recMerch"],
                    C.F_THR3D_SHIPPING_ITEM_QUANTITY: 4,
                    C.F_THR3D_SHIPPING_ITEM_STATUS: "Needs Shipment",
                },
            },
        ]
        update_record.return_value = self.entry()

        response = self.app.post("/api/merchandise/recMerch/confirm-assign", json={
            "workstreams": [{"type": "Packaging", "quantity": 6}],
            "thr3d": {"quantity": 4},
        })

        self.assertEqual(response.status_code, 201)
        self.assertEqual(create_record.call_args_list[0].args[0], C.WORKSTREAM_CARDS_TABLE)
        self.assertEqual(create_record.call_args_list[1].args[0], C.THR3D_SHIPPING_ITEMS_TABLE)
        payload = response.get_json()
        self.assertEqual(payload["workstreamCards"][0]["type"], "Packaging")
        self.assertEqual(payload["thr3dShippingItems"][0]["shippingStatus"], "Needs Shipment")

    @patch("routes.airtable.get_record")
    def test_confirm_assign_rejects_ecomm_and_thr3d_together(self, get_record):
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.post("/api/merchandise/recMerch/confirm-assign", json={
            "workstreams": [{"type": "Ecomm", "quantity": 5}],
            "thr3d": {"quantity": 5},
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Ecomm and THR3D are alternate GS1 paths", response.get_json()["error"])

    @patch("routes.airtable.get_record")
    def test_confirm_assign_rejects_packaging_thr3d_quantity_mismatch(self, get_record):
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_QUANTITY: 10}), self.receipt()]

        response = self.app.post("/api/merchandise/recMerch/confirm-assign", json={
            "workstreams": [{"type": "Packaging", "quantity": 5}],
            "thr3d": {"quantity": 4},
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Packaging and THR3D quantities must add up", response.get_json()["error"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.list_records")
    def test_workstream_cards_endpoint_enriches_parent_merchandise(self, list_records, get_record, _clients):
        list_records.return_value = {
            "records": [{
                "id": "recCard",
                "fields": {
                    C.F_WORKSTREAM_CARD_NAME: "Frozen Pizza - Ecomm",
                    C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
                    C.F_WORKSTREAM_CARD_EXPECTED_PRODUCT: ["recProduct"],
                    C.F_WORKSTREAM_CARD_TYPE: "Ecomm",
                    C.F_WORKSTREAM_CARD_PLANNING_STATUS: "New",
                    C.F_WORKSTREAM_CARD_QUANTITY: 4,
                },
            }]
        }
        product = {"id": "recProduct", "fields": {C.F_ITEM_CLIENT: ["recClient"], C.F_ITEM_NAME: "Frozen Pizza"}}
        get_record.side_effect = [self.entry(), self.receipt(), product]

        response = self.app.get("/api/workstream-cards")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["records"][0]["type"], "Ecomm")
        self.assertEqual(payload["records"][0]["receivedMerch"]["id"], "recMerch")
        self.assertEqual(payload["records"][0]["expectedProduct"]["id"], "recProduct")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    @patch("routes._populate_creative_force_feed_for_ready_cards")
    def test_update_workstream_card_status_updates_child_record_only(self, populate_feed, get_record, update_record):
        workstream_card = {
            "id": "recCard",
            "fields": {
                C.F_WORKSTREAM_CARD_NAME: "Frozen Pizza - Packaging",
                C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
                C.F_WORKSTREAM_CARD_TYPE: "Packaging",
                C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Planning",
                C.F_WORKSTREAM_CARD_QUANTITY: 6,
            },
        }
        get_record.side_effect = [workstream_card, self.entry(), self.receipt()]
        update_record.return_value = {
            "id": "recCard",
            "fields": {
                **workstream_card["fields"],
                C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Awaiting Photo Release",
            },
        }

        response = self.app.patch("/api/workstream-cards/recCard", json={"planningStatus": "Awaiting Photo Release"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(update_record.call_args.args[0], C.WORKSTREAM_CARDS_TABLE)
        self.assertEqual(update_record.call_args.args[1], "recCard")
        self.assertEqual(update_record.call_args.args[2], {
            C.F_WORKSTREAM_CARD_TYPE: "Packaging",
            C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Awaiting Photo Release",
        })
        self.assertTrue(update_record.call_args.kwargs["typecast"])
        self.assertEqual(response.get_json()["record"]["planningStatus"], "awaiting-photo-release")
        populate_feed.assert_not_called()

    @staticmethod
    def workstream_card(card_id, workstream_type):
        return {
            "id": card_id,
            "fields": {
                C.F_WORKSTREAM_CARD_NAME: f"Frozen Pizza - {workstream_type}",
                C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
                C.F_WORKSTREAM_CARD_TYPE: workstream_type,
                C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Needs More Information",
                C.F_WORKSTREAM_CARD_QUANTITY: 1,
            },
        }

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.delete_record")
    @patch("routes._list_all_records")
    @patch("routes.airtable.get_record")
    def test_deleting_one_of_two_cards_keeps_parent_planning_status(
        self, get_record, list_all_records, delete_record, update_record
    ):
        # Removing a sibling must not regress accepted merchandise back to New.
        # The parent stays off-board because the remaining card represents it.
        get_record.side_effect = [self.workstream_card("recPackaging", "Packaging"), self.receipt()]
        list_all_records.return_value = [
            self.workstream_card("recPackaging", "Packaging"),
            self.workstream_card("recEcomm", "Ecomm"),
        ]
        update_record.return_value = self.entry()

        with patch("routes._permitted_merchandise_or_error", return_value=(self.entry(), self.receipt(), None)):
            response = self.app.delete("/api/workstream-cards/recPackaging")

        self.assertEqual(response.status_code, 200)
        delete_record.assert_called_once_with(C.WORKSTREAM_CARDS_TABLE, "recPackaging")
        written = update_record.call_args.args[2]
        self.assertEqual(written[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Ecomm"])
        self.assertNotIn(C.F_RECEIPT_ENTRY_PLANNING_STATUS, written)
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCH_VERIFIED, written)

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.delete_record")
    @patch("routes._list_all_records")
    @patch("routes.airtable.get_record")
    def test_deleting_last_card_returns_parent_to_the_board(
        self, get_record, list_all_records, delete_record, update_record
    ):
        get_record.side_effect = [self.workstream_card("recPackaging", "Packaging"), self.receipt()]
        list_all_records.return_value = [self.workstream_card("recPackaging", "Packaging")]
        update_record.return_value = self.entry()

        with patch("routes._permitted_merchandise_or_error", return_value=(self.entry(), self.receipt(), None)):
            response = self.app.delete("/api/workstream-cards/recPackaging")

        self.assertEqual(response.status_code, 200)
        written = update_record.call_args.args[2]
        self.assertEqual(written[C.F_RECEIPT_ENTRY_DELIVERABLES], [])
        self.assertEqual(written[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Needs More Information")
        self.assertFalse(written[C.F_RECEIPT_ENTRY_MERCH_VERIFIED])

    # Auto-match exists so a receiver can scan a barcode and move on. It must never
    # guess: anything short or ambiguous stays unmatched for a PM to resolve.
    def _auto_match(self, upc):
        return self.app.post("/api/merchandise/recMerch/auto-match", json={"upc": upc})

    def test_auto_match_rejects_short_upc_without_touching_airtable(self):
        with patch("routes.airtable.get_record") as get_record:
            response = self._auto_match("1234")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"matched": False, "reason": "too-short"})
        get_record.assert_not_called()

    @patch("routes._link_merchandise_to_product")
    @patch("routes._list_all_records")
    @patch("routes._topco_client_record", return_value=None)
    @patch("routes._clients_by_id", return_value={})
    def test_auto_match_links_single_exact_product(self, _clients, _topco, list_all, link):
        list_all.return_value = [
            {"id": "recExact", "fields": {C.F_ITEM_UPC: "036800030107", C.F_ITEM_CLIENT: ["recClient"]}},
            {"id": "recOther", "fields": {C.F_ITEM_UPC: "036800030199", C.F_ITEM_CLIENT: ["recClient"]}},
        ]
        link.return_value = (self.entry(), self.receipt(), {"id": "recExact"}, None)
        with patch("routes._permitted_merchandise_or_error", return_value=(self.entry(), self.receipt(), None)):
            response = self._auto_match("036800030107")
        payload = response.get_json()
        self.assertTrue(payload["matched"])
        self.assertEqual(payload["via"], "product")
        self.assertEqual(link.call_args.args[1], "recExact")

    @patch("routes._link_merchandise_to_product")
    @patch("routes._list_all_records")
    @patch("routes._topco_client_record", return_value=None)
    @patch("routes._clients_by_id", return_value={})
    def test_auto_match_declines_when_two_products_share_a_upc(self, _clients, _topco, list_all, link):
        list_all.return_value = [
            {"id": "recA", "fields": {C.F_ITEM_UPC: "036800030107", C.F_ITEM_CLIENT: ["recClient"]}},
            {"id": "recB", "fields": {C.F_ITEM_UPC: "036800030107", C.F_ITEM_CLIENT: ["recClient"]}},
        ]
        with patch("routes._permitted_merchandise_or_error", return_value=(self.entry(), self.receipt(), None)):
            response = self._auto_match("036800030107")
        payload = response.get_json()
        self.assertFalse(payload["matched"])
        self.assertEqual(payload["reason"], "ambiguous")
        self.assertEqual(payload["candidateCount"], 2)
        link.assert_not_called()

    @patch("routes._link_merchandise_to_product")
    @patch("routes._list_all_records")
    @patch("routes._topco_client_record", return_value=None)
    @patch("routes._clients_by_id", return_value={})
    def test_auto_match_does_not_link_on_prefix_only(self, _clients, _topco, list_all, link):
        # A prefix is what makes the suggestion list ambiguous; it must not auto-link.
        list_all.return_value = [
            {"id": "recLonger", "fields": {C.F_ITEM_UPC: "0368000301079", C.F_ITEM_CLIENT: ["recClient"]}},
        ]
        with patch("routes._permitted_merchandise_or_error", return_value=(self.entry(), self.receipt(), None)):
            response = self._auto_match("036800030107")
        payload = response.get_json()
        self.assertFalse(payload["matched"])
        self.assertEqual(payload["reason"], "no-match")
        link.assert_not_called()

    # Receiving stages merchandise before it exists, so it resolves without linking.
    @patch("routes._clients_by_id", return_value={})
    @patch("routes._list_all_records")
    @patch("routes._topco_client_record", return_value=None)
    def test_resolve_upc_returns_single_product_without_linking(self, _topco, list_all, _clients):
        list_all.return_value = [
            {"id": "recExact", "fields": {C.F_ITEM_UPC: "036800030107", C.F_ITEM_NAME: "Pizza"}},
        ]
        with patch("routes.airtable.update_record") as update_record:
            response = self.app.get("/api/products/resolve-upc?upc=036800030107")
        payload = response.get_json()
        self.assertTrue(payload["resolved"])
        self.assertEqual(payload["via"], "product")
        update_record.assert_not_called()

    @patch("routes._clients_by_id", return_value={})
    @patch("routes._list_all_records")
    @patch("routes._topco_client_record", return_value=None)
    def test_resolve_upc_declines_ambiguous(self, _topco, list_all, _clients):
        list_all.return_value = [
            {"id": "recA", "fields": {C.F_ITEM_UPC: "036800030107"}},
            {"id": "recB", "fields": {C.F_ITEM_UPC: "036800030107"}},
        ]
        response = self.app.get("/api/products/resolve-upc?upc=036800030107")
        payload = response.get_json()
        self.assertFalse(payload["resolved"])
        self.assertEqual(payload["reason"], "ambiguous")

    def test_resolve_upc_rejects_short_scan_without_reading_airtable(self):
        with patch("routes._list_all_records") as list_all:
            response = self.app.get("/api/products/resolve-upc?upc=1234")
        self.assertEqual(response.get_json(), {"resolved": False, "reason": "too-short"})
        list_all.assert_not_called()

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_update_workstream_card_rejects_legacy_status(self, get_record, update_record):
        response = self.app.patch("/api/workstream-cards/recCard", json={"status": "In Production"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Status is no longer used", response.get_json()["error"])

    def test_update_workstream_card_planning_status_rejects_unknown_status(self):
        response = self.app.patch("/api/workstream-cards/recCard", json={"planningStatus": "Blocked"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("planningStatus must be one of", response.get_json()["error"])

    @patch("routes.airtable.get_record")
    @patch("routes.airtable.list_records")
    def test_thr3d_shipping_items_endpoint_enriches_parent_merchandise(self, list_records, get_record):
        list_records.return_value = {
            "records": [{
                "id": "recThr3dItem",
                "fields": {
                    C.F_THR3D_SHIPPING_ITEM_NAME: "Frozen Pizza - THR3D",
                    C.F_THR3D_SHIPPING_ITEM_RECEIVED_MERCH: ["recMerch"],
                    C.F_THR3D_SHIPPING_ITEM_QUANTITY: 4,
                    C.F_THR3D_SHIPPING_ITEM_STATUS: "Needs Shipment",
                },
            }, {
                "id": "recShippedThr3dItem",
                "fields": {
                    C.F_THR3D_SHIPPING_ITEM_NAME: "Shipped Pizza - THR3D",
                    C.F_THR3D_SHIPPING_ITEM_RECEIVED_MERCH: ["recMerch"],
                    C.F_THR3D_SHIPPING_ITEM_QUANTITY: 1,
                    C.F_THR3D_SHIPPING_ITEM_STATUS: "Shipped",
                },
            }]
        }
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.get("/api/thr3d-shipping-items")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(len(payload["records"]), 1)
        self.assertEqual(payload["records"][0]["quantityToShip"], 4)
        self.assertEqual(payload["records"][0]["receivedMerch"]["id"], "recMerch")
        self.assertEqual(len(payload["shipped"]), 1)
        self.assertEqual(payload["shipped"][0]["shippingStatus"], "Shipped")

    @patch("routes._now_iso", return_value="2026-08-05T14:30:00+00:00")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.airtable.get_record")
    def test_ship_thr3d_shipping_item_creates_outbound_shipment_and_marks_shipped(self, get_record, create_record, update_record, _now):
        shipping_item = {
            "id": "recThr3dItem",
            "fields": {
                C.F_THR3D_SHIPPING_ITEM_NAME: "Frozen Pizza - THR3D",
                C.F_THR3D_SHIPPING_ITEM_RECEIVED_MERCH: ["recMerch"],
                C.F_THR3D_SHIPPING_ITEM_QUANTITY: 4,
                C.F_THR3D_SHIPPING_ITEM_STATUS: "Needs Shipment",
            },
        }
        get_record.side_effect = [
            shipping_item,
            self.entry({C.F_RECEIPT_ENTRY_QUANTITY: 4}),
            self.receipt(),
        ]
        create_record.return_value = {
            "id": "recOutboundShipment",
            "fields": {
                C.F_RECEIPT_NAME: "THR3D outbound - Frozen Pizza - THR3D",
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_CARRIER: "UPS",
                C.F_RECEIPT_TRACKING: "1Z999",
                C.F_RECEIPT_BOX_QUANTITY: 1,
                C.F_RECEIPT_RECEIVED: "2026-08-05T14:30:00+00:00",
            },
        }
        update_record.side_effect = [
            {
                "id": "recThr3dItem",
                "fields": {
                    **shipping_item["fields"],
                    C.F_THR3D_SHIPPING_ITEM_STATUS: "Shipped",
                    C.F_THR3D_SHIPPING_ITEM_OUTBOUND_SHIPMENT: ["recOutboundShipment"],
                },
            },
            self.entry({
                C.F_RECEIPT_ENTRY_QUANTITY: 4,
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Shipped",
            }),
        ]

        response = self.app.post("/api/thr3d-shipping-items/recThr3dItem/ship", json={
            "carrier": "ups",
            "tracking": "1Z999",
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(create_record.call_args.args[0], C.SHIPMENTS_TABLE)
        shipment_fields = create_record.call_args.args[1]
        self.assertEqual(shipment_fields[C.F_RECEIPT_CARRIER], "UPS")
        self.assertEqual(shipment_fields[C.F_RECEIPT_TRACKING], "1Z999")
        self.assertEqual(shipment_fields[C.F_RECEIPT_CLIENT], ["recClient"])
        self.assertEqual(update_record.call_args_list[0].args[0], C.THR3D_SHIPPING_ITEMS_TABLE)
        self.assertEqual(update_record.call_args_list[0].args[2][C.F_THR3D_SHIPPING_ITEM_STATUS], "Shipped")
        self.assertEqual(update_record.call_args_list[0].args[2][C.F_THR3D_SHIPPING_ITEM_OUTBOUND_SHIPMENT], ["recOutboundShipment"])
        self.assertEqual(update_record.call_args_list[1].args[0], C.MERCHANDISE_TABLE)
        self.assertEqual(update_record.call_args_list[1].args[2][C.F_RECEIPT_ENTRY_MERCH_STATUS], "Shipped")
        payload = response.get_json()
        self.assertEqual(payload["record"]["shippingStatus"], "Shipped")
        self.assertEqual(payload["record"]["outboundShipment"]["tracking"], "1Z999")

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
        # THR3D work is never photographed, so it must not claim a photo-release
        # status; it leaves Planning via its shipping item and Merch Status.
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Needs More Information")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Ready to Ship")

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
            "deliverables": ["Packaging", "Thr3d"],
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
                C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging"],
                C.F_RECEIPT_ENTRY_NOTES: "Receiver note",
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True,
            }),
            self.receipt(),
            {"id": "recProduct", "fields": {C.F_ITEM_NAME: "Frozen Pizza", C.F_ITEM_IDENTIFIER: "000123", C.F_ITEM_ARTWORK_RECEIVED: True}},
            {"id": "recClient", "fields": {C.F_CLIENT_NAME: "Kroger"}},
            {"id": "recProduct", "fields": {C.F_ITEM_NAME: "Frozen Pizza", C.F_ITEM_IDENTIFIER: "000123", C.F_ITEM_ARTWORK_RECEIVED: True}},
        ]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging"],
            C.F_RECEIPT_ENTRY_NOTES: "Receiver note",
        })

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={
            "stage": "ready-production",
            "deliverables": ["Packaging"],
        })

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Packaging"])
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCH_STATUS, fields)
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Awaiting Photo Release")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Awaiting Photo Release")
        self.assertNotIn(C.F_RECEIPT_ENTRY_NOTES, fields)

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_explicit_invalid_planning_status_is_rejected(self, get_record, update_record, _clients):
        get_record.side_effect = [self.entry(), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"planningStatusLabel": "Blocked"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Planning status must be one of", response.get_json()["error"])
        update_record.assert_not_called()

    @patch("routes.airtable.get_record")
    def test_intake_state_ready_production_requires_product(self, get_record):
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_DELIVERABLES: ["Packaging"]}), self.receipt()]

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"stage": "ready-production"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Product Linked", response.get_json()["error"])

    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.create_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_confirm_assign_can_open_cards_in_awaiting_photo_release(self, get_record, update_record, create_record, _clients, _issues):
        product = {
            "id": "recProduct",
            "fields": {
                C.F_ITEM_CLIENT: ["recClient"],
                C.F_ITEM_NAME: "Frozen Pizza",
                C.F_ITEM_IDENTIFIER: "000123",
                C.F_ITEM_ARTWORK_RECEIVED: True,
            },
        }
        get_record.side_effect = [
            self.entry({C.F_RECEIPT_ENTRY_QUANTITY: 4, C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True}),
            self.receipt(),
            product,
        ]
        create_record.return_value = {
            "id": "recEcomm",
            "fields": {
                C.F_WORKSTREAM_CARD_NAME: "Frozen Pizza Box - 000123 - Ecomm",
                C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
                C.F_WORKSTREAM_CARD_TYPE: "Ecomm",
                C.F_WORKSTREAM_CARD_PLANNING_STATUS: "Awaiting Photo Release",
                C.F_WORKSTREAM_CARD_QUANTITY: 4,
            },
        }
        update_record.return_value = self.entry({C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]})

        response = self.app.post("/api/merchandise/recMerch/confirm-assign", json={
            "expectedProductId": "recProduct",
            "planningStatus": "Awaiting Photo Release",
            "workstreams": [{"type": "Ecomm", "quantity": 4}],
        })

        self.assertEqual(response.status_code, 201)
        card_fields = create_record.call_args.args[1]
        self.assertEqual(card_fields[C.F_WORKSTREAM_CARD_PLANNING_STATUS], "Awaiting Photo Release")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.create_record")
    @patch("routes.airtable.get_record")
    def test_confirm_assign_refuses_awaiting_photo_release_when_requirements_are_unmet(self, get_record, create_record, _clients):
        # Merchandise Verified is false, which is exactly what the intake-state
        # endpoint refuses on. Both paths must agree or the board can be skipped.
        product = {"id": "recProduct", "fields": {C.F_ITEM_CLIENT: ["recClient"], C.F_ITEM_NAME: "Frozen Pizza"}}
        get_record.side_effect = [self.entry({C.F_RECEIPT_ENTRY_QUANTITY: 4}), self.receipt(), product]

        response = self.app.post("/api/merchandise/recMerch/confirm-assign", json={
            "expectedProductId": "recProduct",
            "planningStatus": "Awaiting Photo Release",
            "workstreams": [{"type": "Ecomm", "quantity": 4}],
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Merchandise Verified", response.get_json()["error"])
        create_record.assert_not_called()

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_accepting_new_merchandise_records_it_as_verified(self, get_record, update_record, _clients):
        # Approving newly received merchandise is the verification; there is no
        # separate step, so nothing else in the app ever sets this flag.
        get_record.side_effect = [
            self.entry({C.F_RECEIPT_ENTRY_PLANNING_STATUS: "New"}),
            self.receipt(),
        ]
        update_record.return_value = self.entry({C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True})

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"stage": "waiting-info"})

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertTrue(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED])
        self.assertTrue(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED_AT])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_already_verified_merchandise_keeps_its_original_verification(self, get_record, update_record, _clients):
        get_record.side_effect = [
            self.entry({
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Needs More Information",
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True,
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED_AT: "2026-07-01T00:00:00Z",
            }),
            self.receipt(),
        ]
        update_record.return_value = self.entry({C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True})

        response = self.app.patch("/api/merchandise/recMerch/intake-state", json={"stage": "waiting-info"})

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCH_VERIFIED_AT, fields)



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
