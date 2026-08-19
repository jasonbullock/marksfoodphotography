import io
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from airtable import strip_airtable_image_attachments  # noqa: E402
from routes import AUTH_SESSION_KEY  # noqa: E402
from receiving_photo_storage import ReceivingPhotoStorage, ReceivingPhotoConfigError, ReceivingPhotoValidationError  # noqa: E402


SHIPMENT_PHOTO_METADATA_START = "[[MARKS_PHOTO_SHIPMENT_PHOTO_METADATA]]"
SHIPMENT_PHOTO_METADATA_END = "[[/MARKS_PHOTO_SHIPMENT_PHOTO_METADATA]]"


def shipment_photo_manifest_from_notes(notes):
    start = notes.index(SHIPMENT_PHOTO_METADATA_START) + len(SHIPMENT_PHOTO_METADATA_START)
    end = notes.index(SHIPMENT_PHOTO_METADATA_END)
    return json.loads(notes[start:end].strip())


def image_bytes(format_name):
    from PIL import Image

    output = io.BytesIO()
    Image.new("RGB", (1, 1), color=(255, 255, 255)).save(output, format=format_name)
    return output.getvalue()


JPEG_BYTES = image_bytes("JPEG")
PNG_BYTES = image_bytes("PNG")
WEBP_BYTES = image_bytes("WEBP")
HEIC_BYTES = b"\x00\x00\x00\x18ftypheic" + b"\x00" * 24


def upload_file(data, filename):
    return (io.BytesIO(data), filename)


def r2_config(**overrides):
    values = {
        "RECEIVING_PHOTO_STORAGE": "r2",
        "RECEIVING_PHOTO_MAX_BYTES": 1024,
        "RECEIVING_PHOTO_LOCAL_DIR": tempfile.gettempdir(),
        "R2_ACCOUNT_ID": "account123",
        "R2_ACCESS_KEY_ID": "access",
        "R2_SECRET_ACCESS_KEY": "secret",
        "R2_BUCKET_NAME": "marks-receiving",
        "R2_PUBLIC_BASE_URL": "https://assets.example.com",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def mock_s3_client():
    s3 = Mock()
    s3.head_object.side_effect = Exception("not found")
    s3.list_objects_v2.return_value = {"Contents": []}
    s3.get_paginator = None
    return s3


class ReceivingTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()
        with self.app.session_transaction() as session:
            session[AUTH_SESSION_KEY] = {
                "id": "recTestUser",
                "name": "Test User",
                "firstName": "Test",
                "lastName": "User",
                "displayName": "Test User",
                "email": "test@example.com",
                "role": "Admin",
                "active": True,
                "clientIds": [],
                "allClients": True,
                "avatar": "",
                "hasPIN": True,
            }

    @patch("routes._create_history_event")
    @patch("routes.airtable.create_record")
    def test_receiving_creates_session_and_multiple_entries(self, create_record, history):
        def create_side_effect(table, fields, by_field_id=False):
            if table == C.RECEIPTS_TABLE:
                return {"id": "recReceipt", "fields": fields}
            if table == C.RECEIPT_ENTRIES_TABLE:
                index = create_record.call_count - 1
                return {"id": f"recEntry{index}", "fields": fields}
            self.fail(f"Unexpected create table: {table}")

        create_record.side_effect = create_side_effect

        response = self.app.post("/api/receiving", json={
            "carrier": "UPS",
            "tracking": "1Z999",
            "boxQuantity": 3,
            "entries": [
                {
                    "productName": "Kroger Baking Powder",
                    "skuId": "036800000027",
                    "quantity": 4,
                    "locationId": "recLocA",
                    "condition": "Good",
                    "description": "Four cartons",
                    "notes": "No visible damage",
                },
                {
                    "productName": "",
                    "skuId": "036800000034",
                    "quantity": 1,
                    "locationId": "recLocB",
                    "condition": "Damaged",
                    "description": "Crushed corner",
                },
            ],
        })

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["clientIds"], [])
        self.assertEqual(len(payload["entries"]), 2)
        self.assertEqual(payload["entries"][0]["quantity"], 4)
        self.assertEqual(payload["entries"][0]["productName"], "Kroger Baking Powder")
        self.assertEqual(payload["entries"][0]["skuId"], "036800000027")
        self.assertEqual(payload["entries"][1]["productName"], "Unnamed Product")
        self.assertEqual(payload["entries"][0]["locationIds"], ["recLocA"])
        self.assertEqual(payload["entries"][1]["condition"], "Damaged")
        self.assertEqual(payload["entries"][1]["itemIds"], [])

        receipt_call = create_record.call_args_list[0]
        self.assertEqual(receipt_call.args[0], C.RECEIPTS_TABLE)
        self.assertNotIn(C.F_RECEIPT_ITEMS, receipt_call.args[1])
        self.assertEqual(receipt_call.args[1][C.F_RECEIPT_BOX_QUANTITY], 3)

        entry_tables = [call.args[0] for call in create_record.call_args_list[1:]]
        self.assertEqual(entry_tables, [C.RECEIPT_ENTRIES_TABLE, C.RECEIPT_ENTRIES_TABLE])
        for call in create_record.call_args_list[1:]:
            fields = call.args[1]
            self.assertEqual(fields[C.F_RECEIPT_ENTRY_RECEIPT], ["recReceipt"])
            self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")
            self.assertIn(fields[C.F_RECEIPT_ENTRY_NAME], {"Kroger Baking Powder", "Unnamed Product"})
            self.assertNotIn(C.F_RECEIPT_ENTRY_ITEM, fields)
            self.assertNotIn(C.F_RECEIPT_BOX_QUANTITY, fields)

        history.assert_called_once()

    @patch("routes.airtable.create_record")
    def test_receiving_requires_one_entry(self, create_record):
        response = self.app.post("/api/receiving", json={"entries": []})

        self.assertEqual(response.status_code, 400)
        create_record.assert_not_called()

    @patch("routes.airtable.create_record")
    def test_receiving_requires_quantity_at_least_one(self, create_record):
        response = self.app.post("/api/receiving", json={
            "entries": [{"observedIdentifier": "CASE-1", "quantity": 0}],
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("quantity", response.get_json()["error"])
        create_record.assert_not_called()

    @patch("routes.airtable.delete_record")
    @patch("routes._receipt_entries_by_receipt_id")
    @patch("routes.airtable.get_record")
    def test_delete_empty_shipment_deletes_record(self, get_record, entries_by_receipt, delete_record):
        get_record.return_value = {
            "id": "recShipment",
            "fields": {
                C.F_RECEIPT_CLIENT: [],
                C.F_RECEIPT_NOTES: "",
            },
        }
        entries_by_receipt.return_value = {"recShipment": []}

        response = self.app.delete("/api/shipments/recShipment")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["deleted"], True)
        delete_record.assert_called_once_with(C.SHIPMENTS_TABLE, "recShipment")

    @patch("routes.airtable.delete_record")
    @patch("routes._receipt_entries_by_receipt_id")
    @patch("routes.airtable.get_record")
    def test_delete_shipment_blocks_when_entries_exist(self, get_record, entries_by_receipt, delete_record):
        get_record.return_value = {
            "id": "recShipment",
            "fields": {
                C.F_RECEIPT_CLIENT: [],
                C.F_RECEIPT_NOTES: "",
            },
        }
        entries_by_receipt.return_value = {"recShipment": [{"id": "recEntry"}]}

        response = self.app.delete("/api/shipments/recShipment")

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertEqual(payload["entryCount"], 1)
        self.assertIn("Remove merchandise", payload["error"])
        delete_record.assert_not_called()

    @patch("routes._create_history_event")
    @patch("routes.airtable.create_record")
    def test_mobile_receiving_can_start_empty_session(self, create_record, history):
        create_record.return_value = {
            "id": "recReceipt",
            "fields": {
                C.F_RECEIPT_CARRIER: "FedEx",
                C.F_RECEIPT_TRACKING: "TRACK-1",
                C.F_RECEIPT_BOX_QUANTITY: 2,
            },
        }

        response = self.app.post("/api/receiving/sessions", json={
            "carrier": "FedEx",
            "tracking": "TRACK-1",
            "boxQuantity": 2,
        })

        self.assertEqual(response.status_code, 201)
        fields = create_record.call_args.args[1]
        self.assertEqual(create_record.call_args.args[0], C.RECEIPTS_TABLE)
        self.assertEqual(fields[C.F_RECEIPT_BOX_QUANTITY], 2)
        self.assertNotIn(C.F_RECEIPT_ITEMS, fields)
        self.assertEqual(response.get_json()["boxQuantity"], 2)
        self.assertEqual(response.get_json()["entries"], [])
        history.assert_called_once()

    @patch("routes.airtable.create_record")
    def test_mobile_receiving_requires_box_quantity(self, create_record):
        response = self.app.post("/api/receiving/sessions", json={
            "carrier": "FedEx",
            "tracking": "TRACK-1",
            "boxQuantity": 0,
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Box Quantity", response.get_json()["error"])
        create_record.assert_not_called()

    @patch("routes._create_history_event")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.create_record")
    def test_mobile_receiving_generates_human_readable_receipt_name(self, create_record, get_record, history):
        get_record.return_value = {
            "id": "recClient",
            "fields": {
                C.F_CLIENT_NAME: "Bimbo",
            },
        }

        def create_side_effect(table, fields, by_field_id=False):
            return {"id": "recReceipt", "fields": fields}

        create_record.side_effect = create_side_effect

        response = self.app.post("/api/receiving/sessions", json={
            "clientId": "recClient",
            "carrier": "UPS",
            "tracking": "TRACK-1",
            "boxQuantity": 1,
            "received": "2026-07-12T09:55:00",
        })

        self.assertEqual(response.status_code, 201)
        fields = create_record.call_args.args[1]
        self.assertEqual(fields[C.F_RECEIPT_NAME], "Bimbo - 2026-07-12 09:55")
        self.assertEqual(response.get_json()["receipt"], "Bimbo - 2026-07-12 09:55")
        history.assert_called_once()

    @patch("routes._create_history_event")
    @patch("routes.airtable.create_record")
    def test_mobile_receiving_normalizes_typed_carrier(self, create_record, history):
        create_record.return_value = {
            "id": "recReceipt",
            "fields": {
                C.F_RECEIPT_CARRIER: "UPS",
                C.F_RECEIPT_TRACKING: "TRACK-1",
            },
        }

        response = self.app.post("/api/receiving/sessions", json={
            "carrier": "ups",
            "tracking": "TRACK-1",
            "boxQuantity": 1,
        })

        self.assertEqual(response.status_code, 201)
        fields = create_record.call_args.args[1]
        self.assertEqual(fields[C.F_RECEIPT_CARRIER], "UPS")
        history.assert_called_once()

    @patch("routes.airtable.create_record")
    def test_mobile_receiving_rejects_unknown_carrier_before_airtable(self, create_record):
        response = self.app.post("/api/receiving/sessions", json={
            "carrier": "Roadrunner",
            "tracking": "TRACK-1",
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("Carrier must be one of", response.get_json()["error"])
        create_record.assert_not_called()

    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.create_record")
    def test_mobile_receiving_ignores_attachment_photos_on_entry_create(self, create_record, get_record, list_records):
        get_record.return_value = {
            "id": "recReceipt",
            "fields": {},
        }
        list_records.return_value = {"records": []}

        def create_side_effect(table, fields, by_field_id=False):
            self.assertEqual(table, C.RECEIPT_ENTRIES_TABLE)
            return {"id": "recEntry", "fields": fields}

        create_record.side_effect = create_side_effect

        response = self.app.post("/api/receiving/recReceipt/entries", json={
            "productName": "Ham Roast Unsliced",
            "skuId": "BOX-7",
            "quantity": 2,
            "locationId": "recLoc",
            "condition": "Good",
            "photos": [{"url": "https://example.com/photo.jpg"}],
        })

        self.assertEqual(response.status_code, 201)
        fields = create_record.call_args.args[1]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_RECEIPT], ["recReceipt"])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_NAME], "Ham Roast Unsliced")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_SKU_ID], "BOX-7")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_QUANTITY], 2)
        self.assertNotIn(C.F_RECEIPT_ENTRY_PHOTOS, fields)
        self.assertNotIn(C.F_RECEIPT_ENTRY_ITEM, fields)
        payload = response.get_json()
        self.assertEqual(payload["productName"], "Ham Roast Unsliced")
        self.assertEqual(payload["skuId"], "BOX-7")
        self.assertEqual(payload["photos"], [])
        self.assertEqual(payload["itemIds"], [])

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_mobile_receiving_can_link_obvious_item_match_without_validating_merchandise(self, get_record, list_records, create_record):
        receipt_record = {
            "id": "recReceipt",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
            },
        }
        item_record = {
            "id": "recItem",
            "fields": {
                C.F_ITEM_CLIENT: ["recClient"],
                C.F_ITEM_NAME: "Ham Roast Unsliced",
            },
        }
        get_record.side_effect = [receipt_record, item_record]
        list_records.return_value = {"records": []}
        create_record.side_effect = lambda table, fields, by_field_id=False: {"id": "recEntry", "fields": fields}

        response = self.app.post("/api/receiving/recReceipt/entries", json={
            "productName": "Ham Roast Unsliced",
            "skuId": "BOX-7",
            "quantity": 2,
            "itemId": "recItem",
            "matchStatus": "Matched",
        })

        self.assertEqual(response.status_code, 201)
        fields = create_record.call_args.args[1]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_ITEM], ["recItem"])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")
        payload = response.get_json()
        self.assertEqual(payload["itemIds"], ["recItem"])
        self.assertEqual(payload["merchStatus"], "Received")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_receiving_session_update_only_writes_editable_header_fields(self, get_record, list_records, update_record):
        receipt_record = {
            "id": "recReceipt",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
            },
        }
        get_record.return_value = receipt_record
        list_records.return_value = {"records": []}
        update_record.return_value = {
            "id": "recReceipt",
            "fields": {
                **receipt_record["fields"],
                C.F_RECEIPT_CARRIER: "UPS",
                C.F_RECEIPT_TRACKING: "TRACK-2",
                C.F_RECEIPT_BOX_QUANTITY: 4,
            },
        }

        response = self.app.patch("/api/receiving/recReceipt", json={
            "carrier": "UPS",
            "tracking": "TRACK-2",
            "boxQuantity": 4,
            "reviewStatus": "Verified",
            "itemIds": ["recItem"],
        })

        self.assertEqual(response.status_code, 200)
        update_fields = update_record.call_args.args[2]
        self.assertEqual(update_fields[C.F_RECEIPT_CARRIER], "UPS")
        self.assertEqual(update_fields[C.F_RECEIPT_TRACKING], "TRACK-2")
        self.assertEqual(update_fields[C.F_RECEIPT_BOX_QUANTITY], 4)
        self.assertNotIn(C.F_RECEIPT_ITEMS, update_fields)

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_receiving_entry_update_preserves_match_status_and_photo_metadata(self, get_record, update_record):
        receipt_record = {
            "id": "recReceipt",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
            },
        }
        entry_record = {
            "id": "recEntry",
            "fields": {
                C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
                C.F_RECEIPT_ENTRY_ITEM: ["recItem"],
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                C.F_RECEIPT_ENTRY_PHOTO_METADATA: json.dumps([{"object_key": "receiving/x/x-1.jpg"}]),
            },
        }
        get_record.side_effect = [receipt_record, entry_record]
        update_record.return_value = {
            "id": "recEntry",
            "fields": {
                **entry_record["fields"],
                C.F_RECEIPT_ENTRY_NAME: "New Product",
                C.F_RECEIPT_ENTRY_SKU_ID: "SKU-2",
                C.F_RECEIPT_ENTRY_QUANTITY: 3,
            },
        }

        response = self.app.patch("/api/receiving/recReceipt/entries/recEntry", json={
            "productName": "New Product",
            "skuId": "SKU-2",
            "quantity": 3,
            "itemIds": [],
            "verificationStatus": "Needs Review",
            "photoMetadata": [],
        })

        self.assertEqual(response.status_code, 200)
        update_fields = update_record.call_args.args[2]
        self.assertEqual(update_fields[C.F_RECEIPT_ENTRY_NAME], "New Product")
        self.assertEqual(update_fields[C.F_RECEIPT_ENTRY_SKU_ID], "SKU-2")
        self.assertEqual(update_fields[C.F_RECEIPT_ENTRY_QUANTITY], 3)
        self.assertNotIn(C.F_RECEIPT_ENTRY_ITEM, update_fields)
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCH_STATUS, update_fields)
        self.assertNotIn(C.F_RECEIPT_ENTRY_PHOTO_METADATA, update_fields)

    @patch("routes.airtable.list_records")
    def test_verification_lists_receipt_entries_with_mapped_status(self, list_records):
        def list_side_effect(table, params=None, by_field_id=False):
            if table == C.RECEIPT_ENTRIES_TABLE:
                return {"records": [{
                    "id": "recEntry",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Receipt 1 - 1",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
                        C.F_RECEIPT_ENTRY_SKU_ID: "UPC-1",
                        C.F_RECEIPT_ENTRY_QUANTITY: 2,
                        C.F_RECEIPT_ENTRY_DESCRIPTION: "Observed pasta",
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                    },
                }]}
            if table == C.RECEIPTS_TABLE:
                return {"records": [{
                    "id": "recReceipt",
                    "fields": {
                        C.F_RECEIPT_NAME: "Delivery 1",
                        C.F_RECEIPT_CLIENT: ["recClient"],
                        C.F_RECEIPT_RECEIVED: "2026-07-12T12:00:00Z",
                    },
                }]}
            return {"records": []}

        list_records.side_effect = list_side_effect

        response = self.app.get("/api/verification/entries")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(len(payload["records"]), 1)
        entry = payload["records"][0]
        self.assertEqual(entry["merchStatus"], "Received")
        self.assertEqual(entry["productName"], "Receipt 1 - 1")
        self.assertEqual(entry["skuId"], "UPC-1")
        self.assertEqual(entry["receipt"]["id"], "recReceipt")

    @patch("routes.airtable.list_records")
    def test_business_language_alias_routes_reuse_current_airtable_tables(self, list_records):
        def list_side_effect(table, params=None, by_field_id=False):
            if table == C.RECEIPT_ENTRIES_TABLE:
                return {"records": [{
                    "id": "recMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Package Name",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recShipment"],
                        C.F_RECEIPT_ENTRY_SKU_ID: "BARCODE-1",
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                    },
                }]}
            if table == C.RECEIPTS_TABLE:
                return {"records": [{
                    "id": "recShipment",
                    "fields": {
                        C.F_RECEIPT_NAME: "Shipment 1",
                        C.F_RECEIPT_CLIENT: ["recClient"],
                        C.F_RECEIPT_RECEIVED: "2026-07-12T12:00:00Z",
                    },
                }]}
            if table == C.ITEMS_TABLE:
                return {"records": [{
                    "id": "recProduct",
                    "fields": {
                        C.F_ITEM_NAME: "Imported Product",
                        C.F_ITEM_CLIENT: ["recClient"],
                        C.F_ITEM_IDENTIFIER: "BARCODE-1",
                    },
                }]}
            return {"records": []}

        list_records.side_effect = list_side_effect

        shipments_response = self.app.get("/api/shipments")
        merchandise_response = self.app.get("/api/merchandise/review")
        products_response = self.app.get("/api/products")

        self.assertEqual(shipments_response.status_code, 200)
        self.assertEqual(merchandise_response.status_code, 200)
        self.assertEqual(products_response.status_code, 200)
        self.assertEqual(shipments_response.get_json()["records"][0]["id"], "recShipment")
        self.assertEqual(merchandise_response.get_json()["records"][0]["id"], "recMerch")
        self.assertEqual(products_response.get_json()["records"][0]["id"], "recProduct")
        called_tables = [call.args[0] for call in list_records.call_args_list]
        self.assertIn(C.RECEIPTS_TABLE, called_tables)
        self.assertIn(C.RECEIPT_ENTRIES_TABLE, called_tables)
        self.assertIn(C.ITEMS_TABLE, called_tables)

    @patch("routes.airtable.delete_record")
    @patch("routes.airtable.get_record")
    def test_delete_product_deletes_product_reference(self, get_record, delete_record):
        get_record.return_value = {
            "id": "recProduct",
            "fields": {
                C.F_ITEM_NAME: "Imported Product",
                C.F_ITEM_CLIENT: ["recClient"],
            },
        }

        response = self.app.delete("/api/products/recProduct")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["deleted"], True)
        delete_record.assert_called_once_with(C.PRODUCTS_TABLE, "recProduct")


    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_verification_match_links_existing_item_only(self, get_record, update_record, clients_by_id):
        entry_record = {
            "id": "recEntry",
            "fields": {
                C.F_RECEIPT_ENTRY_NAME: "Receipt 1 - 1",
                C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            },
        }
        item_record = {
            "id": "recItem",
            "fields": {
                C.F_ITEM_NAME: "Imported item",
                C.F_ITEM_CLIENT: ["recClient"],
            },
        }
        receipt_record = {
            "id": "recReceipt",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
            },
        }
        get_record.side_effect = [entry_record, item_record, receipt_record]
        update_record.return_value = {
            "id": "recEntry",
            "fields": {
                **entry_record["fields"],
                C.F_RECEIPT_ENTRY_ITEM: ["recItem"],
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            },
        }

        response = self.app.post("/api/verification/entries/recEntry/match", json={"itemId": "recItem"})

        self.assertEqual(response.status_code, 200)
        update_record.assert_called_once_with(
            C.RECEIPT_ENTRIES_TABLE,
            "recEntry",
            {
                C.F_RECEIPT_ENTRY_ITEM: ["recItem"],
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "New",
            },
            by_field_id=False,
        )
        self.assertNotEqual(update_record.call_args.args[0], C.ITEMS_TABLE)
        self.assertEqual(response.get_json()["merchStatus"], "Received")

    def test_receiving_photo_storage_rejects_local_mode(self):
        storage = ReceivingPhotoStorage(r2_config(RECEIVING_PHOTO_STORAGE="local"), s3_client=mock_s3_client())

        with self.assertRaises(ReceivingPhotoConfigError):
            storage.upload_photo(Mock(filename="carton.jpg", read=Mock(return_value=JPEG_BYTES)), "recR", "recE")

    def test_receiving_photo_storage_uploads_jpeg_to_mocked_r2(self):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(
            r2_config(),
            s3_client=s3,
            now_func=lambda: datetime(2026, 7, 11, tzinfo=timezone.utc),
        )

        photo = storage.upload_photo(
            Mock(filename="../Carton Shot.JPG", read=Mock(return_value=JPEG_BYTES)),
            "recReceiptABC12345",
            "recEntry",
            delivery_folder="Bimbo-2026-07-12-09-55",
            sequence_number=1,
        )

        self.assertRegex(
            photo["object_key"],
            r"^receiving/Bimbo-2026-07-12-09-55/Bimbo-2026-07-12-09-55-1\.jpg$",
        )
        self.assertEqual(photo["public_url"], f"https://assets.example.com/{photo['object_key']}")
        self.assertEqual(photo["stored_filename"], "Bimbo-2026-07-12-09-55-1.jpg")
        self.assertEqual(photo["original_filename"], "../Carton Shot.JPG")
        self.assertEqual(photo["mime_type"], "image/jpeg")
        put_kwargs = s3.put_object.call_args.kwargs
        self.assertEqual(put_kwargs["Bucket"], "marks-receiving")
        self.assertEqual(put_kwargs["ContentType"], "image/jpeg")
        self.assertEqual(put_kwargs["Metadata"]["receipt-id"], "recReceiptABC12345")
        self.assertEqual(put_kwargs["IfNoneMatch"], "*")
        self.assertNotIn("secret", str(photo).lower())

    def test_receiving_photo_storage_supports_png_and_webp(self):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)

        png = storage.upload_photo(Mock(filename="one.png", read=Mock(return_value=PNG_BYTES)), "recR", "recE", delivery_folder="Unknown-2026-07-12-16-11", sequence_number=1)
        webp = storage.upload_photo(Mock(filename="two.webp", read=Mock(return_value=WEBP_BYTES)), "recR", "recE", delivery_folder="Unknown-2026-07-12-16-11", sequence_number=2)

        self.assertEqual(png["mime_type"], "image/png")
        self.assertEqual(png["stored_filename"], "Unknown-2026-07-12-16-11-1.png")
        self.assertEqual(webp["mime_type"], "image/webp")
        self.assertEqual(webp["stored_filename"], "Unknown-2026-07-12-16-11-2.webp")
        self.assertEqual(s3.put_object.call_count, 2)

    def test_receiving_photo_storage_converts_heic_to_jpeg(self):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)
        with patch("receiving_photo_storage._convert_heic_to_jpeg", return_value=JPEG_BYTES):
            photo = storage.upload_photo(Mock(filename="phone.heic", read=Mock(return_value=HEIC_BYTES)), "recR", "recE", delivery_folder="Unknown-2026-07-12-16-11", sequence_number=7)

        self.assertEqual(photo["mime_type"], "image/jpeg")
        self.assertEqual(photo["stored_filename"], "Unknown-2026-07-12-16-11-7.jpg")

    def test_receiving_photo_storage_skips_existing_numbers(self):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)

        photo = storage.upload_photo(
            Mock(filename="front.jpg", read=Mock(return_value=JPEG_BYTES)),
            "recR",
            "recE",
            delivery_folder="Kroger-2026-07-12-16-11",
            sequence_number=1,
            existing_keys={
                "receiving/Kroger-2026-07-12-16-11/Kroger-2026-07-12-16-11-1.jpg",
                "receiving/Kroger-2026-07-12-16-11/Kroger-2026-07-12-16-11-2.jpg",
            },
        )

        self.assertEqual(photo["object_key"], "receiving/Kroger-2026-07-12-16-11/Kroger-2026-07-12-16-11-3.jpg")
        self.assertEqual(photo["stored_filename"], "Kroger-2026-07-12-16-11-3.jpg")

    def test_receiving_photo_storage_falls_back_when_conditional_put_is_unsupported(self):
        class FakeClientError(Exception):
            response = {"Error": {"Code": "NotImplemented"}}

        s3 = mock_s3_client()
        s3.put_object.side_effect = [FakeClientError("unsupported"), {"ETag": "ok"}]
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)

        photo = storage.upload_photo(
            Mock(filename="front.jpg", read=Mock(return_value=JPEG_BYTES)),
            "recR",
            "recE",
            delivery_folder="Kroger-2026-07-12-16-11",
            sequence_number=1,
        )

        self.assertEqual(photo["object_key"], "receiving/Kroger-2026-07-12-16-11/Kroger-2026-07-12-16-11-1.jpg")
        self.assertEqual(s3.put_object.call_count, 2)
        self.assertIn("IfNoneMatch", s3.put_object.call_args_list[0].kwargs)
        self.assertNotIn("IfNoneMatch", s3.put_object.call_args_list[1].kwargs)

    def test_receiving_photo_storage_falls_back_when_botocore_rejects_if_none_match(self):
        ParamValidationError = type("ParamValidationError", (Exception,), {})
        s3 = mock_s3_client()
        s3.put_object.side_effect = [ParamValidationError("Unknown parameter in input: IfNoneMatch"), {"ETag": "ok"}]
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)

        photo = storage.upload_photo(
            Mock(filename="front.jpg", read=Mock(return_value=JPEG_BYTES)),
            "recR",
            "recE",
            delivery_folder="Kroger-2026-07-12-16-11",
            sequence_number=1,
        )

        self.assertEqual(photo["object_key"], "receiving/Kroger-2026-07-12-16-11/Kroger-2026-07-12-16-11-1.jpg")
        self.assertEqual(s3.put_object.call_count, 2)
        self.assertIn("IfNoneMatch", s3.put_object.call_args_list[0].kwargs)
        self.assertNotIn("IfNoneMatch", s3.put_object.call_args_list[1].kwargs)

    def test_receiving_delivery_folder_sanitizes_client_and_unknown(self):
        from routes import _delivery_folder_base

        self.assertEqual(
            _delivery_folder_base("Smithfield & Sons / Retail", "2026-07-12T16:11:00"),
            "Smithfield-Sons-Retail-2026-07-12-16-11",
        )
        self.assertEqual(
            _delivery_folder_base("", "2026-07-12T04:05:00"),
            "Unknown-2026-07-12-04-05",
        )

    def test_receiving_delivery_folder_adds_suffix_only_for_same_minute_collision(self):
        from routes import _delivery_folder_for_receipt

        first = {
            "id": "recFirst",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_RECEIVED: "2026-07-12T16:11:00",
            },
        }
        second = {
            "id": "recSecond",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_RECEIVED: "2026-07-12T16:11:25",
            },
        }
        later = {
            "id": "recLater",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_RECEIVED: "2026-07-12T16:12:00",
            },
        }

        with patch("routes._list_all_records", return_value=[first, second, later]), patch("routes._receipt_client_name", return_value="Smithfield"):
            self.assertEqual(_delivery_folder_for_receipt(first), "Smithfield-2026-07-12-16-11")
            self.assertEqual(_delivery_folder_for_receipt(second), "Smithfield-2026-07-12-16-11-2")
            self.assertEqual(_delivery_folder_for_receipt(later), "Smithfield-2026-07-12-16-12")

    def test_receiving_photo_storage_rejects_bad_files(self):
        storage = ReceivingPhotoStorage(r2_config(), s3_client=mock_s3_client())

        with self.assertRaises(ReceivingPhotoValidationError):
            storage.upload_photo(Mock(filename="empty.jpg", read=Mock(return_value=b"")), "recR", "recE")
        with self.assertRaises(ReceivingPhotoValidationError):
            storage.upload_photo(Mock(filename="too-big.jpg", read=Mock(return_value=JPEG_BYTES * 100)), "recR", "recE")
        with self.assertRaises(ReceivingPhotoValidationError):
            storage.upload_photo(Mock(filename="bad.gif", read=Mock(return_value=b"GIF89a")), "recR", "recE")

    def test_receiving_photo_storage_fails_clear_when_r2_config_missing(self):
        storage = ReceivingPhotoStorage(r2_config(R2_BUCKET_NAME=""), s3_client=mock_s3_client())

        with self.assertRaises(ReceivingPhotoConfigError):
            storage.upload_photo(Mock(filename="carton.jpg", read=Mock(return_value=JPEG_BYTES)), "recR", "recE")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_receiving_entry_photo_upload_updates_airtable_with_r2_metadata_only(self, get_record, list_records, update_record):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(
            r2_config(),
            s3_client=s3,
            now_func=lambda: datetime(2026, 7, 11, tzinfo=timezone.utc),
        )
        receipt_record = {
            "id": "recReceipt",
            "fields": {
                C.F_RECEIPT_NAME: "Kroger • 7/12/26 • 4:11 PM",
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_RECEIVED: "2026-07-12T16:11:00",
            },
        }
        entry_record = {
            "id": "recEntry",
            "fields": {
                C.F_RECEIPT_ENTRY_NAME: "Kroger Baking Powder",
                C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
            },
        }
        client_record = {"id": "recClient", "fields": {C.F_CLIENT_NAME: "Kroger"}}

        def get_record_side_effect(table, record_id, by_field_id=False):
            if table == C.RECEIPTS_TABLE:
                return receipt_record
            if table == C.RECEIPT_ENTRIES_TABLE:
                return entry_record
            if table == C.CLIENTS_TABLE:
                return client_record
            self.fail(f"Unexpected get table: {table}")

        get_record.side_effect = get_record_side_effect

        def list_records_side_effect(table, params=None, by_field_id=False):
            if table == C.RECEIPTS_TABLE:
                return {"records": [receipt_record]}
            if table == C.RECEIPT_ENTRIES_TABLE:
                return {"records": [entry_record]}
            if table == C.CLIENTS_TABLE:
                return {"records": []}
            self.fail(f"Unexpected list table: {table}")

        list_records.side_effect = list_records_side_effect

        def update_side_effect(table, record_id, fields, by_field_id=False):
            merged = {
                C.F_RECEIPT_ENTRY_NAME: "Kroger Baking Powder",
                C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
            }
            for call in update_record.call_args_list:
                merged.update(call.args[2])
            merged.update(fields)
            return {"id": record_id, "fields": merged}

        update_record.side_effect = update_side_effect
        with patch("routes._photo_storage", return_value=storage):
            response = self.app.post(
                "/api/receiving/recReceipt/entries/recEntry/photos",
                data={
                    "photos": [
                        upload_file(JPEG_BYTES, "front.jpg"),
                        upload_file(PNG_BYTES, "../../side.png"),
                    ],
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        update_record.assert_called_once()
        update_fields = update_record.call_args.args[2]
        metadata = update_fields[C.F_RECEIPT_ENTRY_PHOTO_METADATA]
        self.assertNotIn(C.F_RECEIPT_ENTRY_PHOTOS, update_fields)
        metadata_items = json.loads(metadata)
        self.assertEqual(len(metadata_items), 2)
        self.assertEqual(metadata_items[0]["stored_filename"], "Kroger-2026-07-12-16-11-1.jpg")
        self.assertEqual(metadata_items[0]["original_filename"], "front.jpg")
        self.assertEqual(metadata_items[0]["content_type"], "image/jpeg")
        self.assertEqual(metadata_items[0]["sort_order"], 1)
        self.assertNotIn("url", metadata_items[0])
        self.assertNotIn("public_url", metadata_items[0])
        self.assertNotIn("recReceipt", metadata_items[0]["object_key"])
        self.assertNotIn("recEntry", metadata_items[0]["object_key"])
        self.assertNotIn("Kroger-Baking-Powder", metadata_items[0]["object_key"])
        self.assertTrue(all(".." not in item["object_key"] for item in metadata_items))
        self.assertTrue(all("/" not in item["stored_filename"] for item in metadata_items))
        payload = response.get_json()
        self.assertEqual(len(payload["photos"]), 2)
        self.assertEqual(payload["entry"]["photoMetadata"][0]["object_key"], metadata_items[0]["object_key"])
        self.assertEqual(payload["entry"]["photoMetadata"][0]["public_url"], f"https://assets.example.com/{metadata_items[0]['object_key']}")

    def test_airtable_client_strips_image_attachment_fields(self):
        fields = strip_airtable_image_attachments({
            "Name": "Package",
            "Photos": [{"url": "https://airtable.example/photo.jpg"}],
            "Deprecated Airtable Photos - Do Not Use": [{"url": "https://airtable.example/deprecated.jpg"}],
            "fldtTr7eNQrT6iVrS": [{"url": "https://airtable.example/field-id.jpg"}],
            "Photo Metadata": json.dumps([{"object_key": "merchandise/rec1/image-1.jpg"}]),
        })

        self.assertEqual(fields["Name"], "Package")
        self.assertIn("Photo Metadata", fields)
        self.assertNotIn("Photos", fields)
        self.assertNotIn("Deprecated Airtable Photos - Do Not Use", fields)
        self.assertNotIn("fldtTr7eNQrT6iVrS", fields)

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_receiving_entry_photo_upload_continues_numbering_across_entries(self, get_record, list_records, update_record):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)
        receipt_record = {
            "id": "recReceipt",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_RECEIVED: "2026-07-12T16:11:00",
            },
        }
        current_entry = {
            "id": "recEntry2",
            "fields": {
                C.F_RECEIPT_ENTRY_NAME: "Current Product",
                C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
            },
        }
        prior_entry = {
            "id": "recEntry1",
            "fields": {
                C.F_RECEIPT_ENTRY_NAME: "Prior Product",
                C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
                C.F_RECEIPT_ENTRY_PHOTO_METADATA: json.dumps([
                    {
                        "object_key": "receiving/Smithfield-2026-07-12-16-11/Smithfield-2026-07-12-16-11-1.jpg",
                        "stored_filename": "Smithfield-2026-07-12-16-11-1.jpg",
                    },
                    {
                        "object_key": "receiving/Smithfield-2026-07-12-16-11/Smithfield-2026-07-12-16-11-2.jpg",
                        "stored_filename": "Smithfield-2026-07-12-16-11-2.jpg",
                    },
                ]),
            },
        }
        client_record = {"id": "recClient", "fields": {C.F_CLIENT_NAME: "Smithfield"}}

        def get_record_side_effect(table, record_id, by_field_id=False):
            if table == C.RECEIPTS_TABLE:
                return receipt_record
            if table == C.RECEIPT_ENTRIES_TABLE:
                return current_entry
            if table == C.CLIENTS_TABLE:
                return client_record
            self.fail(f"Unexpected get table: {table}")

        get_record.side_effect = get_record_side_effect
        list_records.side_effect = lambda table, params=None, by_field_id=False: {
            "records": [receipt_record] if table == C.RECEIPTS_TABLE else [prior_entry, current_entry]
        }

        def update_side_effect(table, record_id, fields, by_field_id=False):
            return {
                "id": "recEntry",
                "fields": {
                    C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
                    **fields,
                },
            }

        update_record.side_effect = update_side_effect
        with patch("routes._photo_storage", return_value=storage):
            response = self.app.post(
                "/api/receiving/recReceipt/entries/recEntry2/photos",
                data={"photos": upload_file(JPEG_BYTES, "front.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        metadata_fields = update_record.call_args.args[2]
        metadata_items = json.loads(metadata_fields[C.F_RECEIPT_ENTRY_PHOTO_METADATA])
        self.assertEqual(metadata_items[-1]["object_key"], "receiving/Smithfield-2026-07-12-16-11/Smithfield-2026-07-12-16-11-3.jpg")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_receiving_entry_photo_upload_reports_missing_metadata_field(self, get_record, list_records, update_record):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)
        receipt_record = {"id": "recReceipt", "fields": {C.F_RECEIPT_NAME: "Kroger • 7/12/26 • 9:55 AM"}}
        entry_record = {
            "id": "recEntry",
            "fields": {
                C.F_RECEIPT_ENTRY_NAME: "Kroger Baking Powder",
                C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
            },
        }
        get_record.side_effect = [receipt_record, entry_record]
        list_records.side_effect = lambda table, params=None, by_field_id=False: {
            "records": [receipt_record] if table == C.RECEIPTS_TABLE else [entry_record]
        }

        class FakeResponse:
            status_code = 422

            def json(self):
                return {"error": {"message": "Unknown field name: Photo Metadata"}}

        def update_side_effect(table, record_id, fields, by_field_id=False):
            if C.F_RECEIPT_ENTRY_PHOTO_METADATA in fields:
                error = requests.HTTPError("unknown field")
                error.response = FakeResponse()
                raise error
            return {
                "id": record_id,
                "fields": {
                    C.F_RECEIPT_ENTRY_NAME: "Kroger Baking Powder",
                    C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"],
                    **fields,
                },
            }

        update_record.side_effect = update_side_effect
        with patch("routes._photo_storage", return_value=storage):
            response = self.app.post(
                "/api/receiving/recReceipt/entries/recEntry/photos",
                data={"photos": upload_file(JPEG_BYTES, "front.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 422)
        self.assertIn("Photo Metadata", response.get_json()["error"])
        update_record.assert_called_once()

    @patch("routes._photo_storage")
    @patch("routes.airtable.get_record")
    def test_shipment_photo_upload_requires_client_access(self, get_record, photo_storage):
        with self.app.session_transaction() as session:
            session[AUTH_SESSION_KEY] = {
                **session[AUTH_SESSION_KEY],
                "allClients": False,
                "clientIds": ["recOtherClient"],
            }
        get_record.return_value = {
            "id": "recShipment",
            "fields": {C.F_RECEIPT_CLIENT: ["recClient"]},
        }

        response = self.app.post(
            "/api/shipments/recShipment/photos",
            data={"photos": upload_file(JPEG_BYTES, "box.jpg")},
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 403)
        photo_storage.assert_not_called()

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_shipment_photo_upload_validates_mime_type(self, get_record, list_records, update_record):
        storage = ReceivingPhotoStorage(r2_config(), s3_client=mock_s3_client())
        get_record.return_value = {"id": "recShipment", "fields": {C.F_RECEIPT_CLIENT: ["recClient"]}}
        list_records.return_value = {"records": []}

        with patch("routes._photo_storage", return_value=storage):
            response = self.app.post(
                "/api/shipments/recShipment/photos",
                data={"photos": upload_file(b"GIF89a", "box.gif")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported photo type", response.get_json()["error"])
        update_record.assert_not_called()

    @patch("routes._photo_storage")
    @patch("routes.airtable.get_record")
    def test_shipment_photo_list_returns_display_order(self, get_record, photo_storage):
        storage = ReceivingPhotoStorage(r2_config(), s3_client=mock_s3_client())
        photo_storage.return_value = storage
        get_record.return_value = {
            "id": "recShipment",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_PHOTO_METADATA: json.dumps([
                    {
                        "photo_id": "pho_second",
                        "shipment_id": "recShipment",
                        "object_key": "shipments/recShipment/photos/pho_second/original.jpg",
                        "sort_order": 2,
                    },
                    {
                        "photo_id": "pho_first",
                        "shipment_id": "recShipment",
                        "object_key": "shipments/recShipment/photos/pho_first/original.jpg",
                        "sort_order": 1,
                    },
                ]),
            },
        }

        response = self.app.get("/api/shipments/recShipment/photos")

        self.assertEqual(response.status_code, 200)
        photos = response.get_json()["photos"]
        self.assertEqual([photo["photo_id"] for photo in photos], ["pho_first", "pho_second"])
        self.assertEqual([photo["source"] for photo in photos], ["shipment", "shipment"])
        self.assertTrue(photos[0]["url"].endswith("/shipments/recShipment/photos/pho_first/original.jpg"))

    @patch("routes.airtable.get_record")
    def test_shipment_photo_list_handles_legacy_shipments_without_photos(self, get_record):
        get_record.return_value = {
            "id": "recShipment",
            "fields": {C.F_RECEIPT_CLIENT: ["recClient"]},
        }

        response = self.app.get("/api/shipments/recShipment/photos")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["photos"], [])

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_shipment_photo_upload_uses_shipment_id_key_and_stable_order(self, get_record, list_records, update_record):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)
        receipt_record = {
            "id": "recShipment",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_NOTES: (
                    "Box label was torn.\n\n"
                    f"{SHIPMENT_PHOTO_METADATA_START}\n"
                    '[{"photo_id":"pho_existing","shipment_id":"recShipment","object_key":"shipments/recShipment/photos/pho_existing/original.jpg","sort_order":1,"source":"shipment"}]\n'
                    f"{SHIPMENT_PHOTO_METADATA_END}"
                ),
            },
        }
        get_record.return_value = receipt_record
        list_records.return_value = {"records": []}

        def update_side_effect(table, record_id, fields, by_field_id=False):
            return {"id": record_id, "fields": {**receipt_record["fields"], **fields}}

        update_record.side_effect = update_side_effect
        with patch("routes._photo_storage", return_value=storage):
            response = self.app.post(
                "/api/shipments/recShipment/photos",
                data={
                    "photos": [
                        upload_file(JPEG_BYTES, "../../box-label.jpg"),
                        upload_file(PNG_BYTES, "damage.png"),
                    ],
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        update_fields = update_record.call_args.args[2]
        self.assertNotIn(C.F_RECEIPT_PHOTO_METADATA, update_fields)
        self.assertIn(C.F_RECEIPT_NOTES, update_fields)
        self.assertTrue(update_fields[C.F_RECEIPT_NOTES].startswith("Box label was torn."))
        metadata_items = shipment_photo_manifest_from_notes(update_fields[C.F_RECEIPT_NOTES])
        self.assertEqual([item["sort_order"] for item in metadata_items], [1, 2, 3])
        uploaded_items = metadata_items[1:]
        self.assertTrue(all(item["object_key"].startswith("shipments/recShipment/photos/pho_") for item in uploaded_items))
        self.assertTrue(all(item["object_key"].endswith(("/original.jpg", "/original.png")) for item in uploaded_items))
        self.assertTrue(all("../../" not in item["object_key"] for item in uploaded_items))
        self.assertEqual(uploaded_items[0]["source"], "shipment")
        self.assertEqual(uploaded_items[0]["shipment_id"], "recShipment")
        self.assertEqual(uploaded_items[0]["uploaded_by"], "recTestUser")
        payload = response.get_json()
        self.assertEqual(len(payload["photos"]), 2)
        self.assertEqual(payload["shipment"]["shipmentPhotos"][0]["photo_id"], "pho_existing")
        self.assertEqual(len(payload["shipment"]["shipmentPhotos"]), 3)
        self.assertEqual(payload["shipment"]["notes"], "Box label was torn.")
        self.assertEqual(payload["shipment"]["entries"], [])

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_shipment_photo_upload_uses_current_shipments_schema_without_photo_metadata_field(self, get_record, list_records, update_record):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)
        receipt_record = {"id": "recShipment", "fields": {C.F_RECEIPT_CLIENT: ["recClient"], C.F_RECEIPT_NOTES: "Receiving dock"}}
        get_record.return_value = receipt_record
        list_records.return_value = {"records": []}

        def update_side_effect(table, record_id, fields, by_field_id=False):
            if C.F_RECEIPT_PHOTO_METADATA in fields:
                raise AssertionError("Shipment photo upload must not write Photo Metadata.")
            return {"id": record_id, "fields": {**receipt_record["fields"], **fields}}

        update_record.side_effect = update_side_effect
        with patch("routes._photo_storage", return_value=storage):
            response = self.app.post(
                "/api/shipments/recShipment/photos",
                data={"photos": upload_file(JPEG_BYTES, "box.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        update_fields = update_record.call_args.args[2]
        self.assertEqual(set(update_fields.keys()), {C.F_RECEIPT_NOTES})
        self.assertEqual(response.get_json()["shipment"]["notes"], "Receiving dock")
        self.assertEqual(response.get_json()["shipment"]["entries"], [])
        self.assertFalse(s3.delete_object.called)

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_shipment_photo_delete_removes_metadata_and_r2_object(self, get_record, list_records, update_record):
        s3 = mock_s3_client()
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)
        receipt_record = {
            "id": "recShipment",
            "fields": {
                C.F_RECEIPT_CLIENT: ["recClient"],
                C.F_RECEIPT_NOTES: (
                    "Keep the pallet wrap.\n\n"
                    f"{SHIPMENT_PHOTO_METADATA_START}\n"
                    '[{"photo_id":"pho_keep","shipment_id":"recShipment","object_key":"shipments/recShipment/photos/pho_keep/original.jpg","sort_order":1},{"photo_id":"pho_delete","shipment_id":"recShipment","object_key":"shipments/recShipment/photos/pho_delete/original.jpg","sort_order":2}]\n'
                    f"{SHIPMENT_PHOTO_METADATA_END}"
                ),
            },
        }
        get_record.return_value = receipt_record
        list_records.return_value = {"records": []}

        def update_side_effect(table, record_id, fields, by_field_id=False):
            return {"id": record_id, "fields": {**receipt_record["fields"], **fields}}

        update_record.side_effect = update_side_effect
        with patch("routes._photo_storage", return_value=storage):
            response = self.app.delete("/api/shipments/recShipment/photos/pho_delete")

        self.assertEqual(response.status_code, 200)
        update_fields = update_record.call_args.args[2]
        self.assertNotIn(C.F_RECEIPT_PHOTO_METADATA, update_fields)
        metadata_items = shipment_photo_manifest_from_notes(update_fields[C.F_RECEIPT_NOTES])
        self.assertEqual([item["photo_id"] for item in metadata_items], ["pho_keep"])
        self.assertEqual(response.get_json()["shipment"]["notes"], "Keep the pallet wrap.")
        s3.delete_object.assert_called_once()
        self.assertEqual(s3.delete_object.call_args.kwargs["Key"], "shipments/recShipment/photos/pho_delete/original.jpg")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_r2_upload_failure_does_not_update_airtable(self, get_record, list_records, update_record):
        s3 = Mock()
        s3.get_paginator = None
        s3.head_object.side_effect = Exception("not found")
        s3.list_objects_v2.return_value = {"Contents": []}
        s3.put_object.side_effect = RuntimeError("boom")
        storage = ReceivingPhotoStorage(r2_config(), s3_client=s3)
        receipt_record = {"id": "recReceipt", "fields": {}}
        entry_record = {"id": "recEntry", "fields": {C.F_RECEIPT_ENTRY_RECEIPT: ["recReceipt"]}}
        get_record.side_effect = [receipt_record, entry_record]
        list_records.side_effect = lambda table, params=None, by_field_id=False: {
            "records": [receipt_record] if table == C.RECEIPTS_TABLE else [entry_record]
        }

        with patch("routes._photo_storage", return_value=storage):
            response = self.app.post(
                "/api/receiving/recReceipt/entries/recEntry/photos",
                data={"photos": upload_file(JPEG_BYTES, "carton.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 502)
        update_record.assert_not_called()


if __name__ == "__main__":
    unittest.main()
