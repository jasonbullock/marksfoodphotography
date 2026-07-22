import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from routes import AUTH_SESSION_KEY  # noqa: E402


class MerchandiseInventoryTests(unittest.TestCase):
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

    @staticmethod
    def records_for(table):
        if table == C.RECEIPT_ENTRIES_TABLE:
            return [
                {
                    "id": "recFreshMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Honeydew Melon",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recFreshShipment"],
                        C.F_RECEIPT_ENTRY_SKU_ID: "000123",
                        C.F_RECEIPT_ENTRY_QUANTITY: 3,
                        C.F_RECEIPT_ENTRY_LOCATION: ["recShelf"],
                        C.F_RECEIPT_ENTRY_ITEM: ["recReadyProduct"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Matched",
                    },
                },
                {
                    "id": "recOldMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Cereal Box",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recOldShipment"],
                        C.F_RECEIPT_ENTRY_SKU_ID: "BAR-44",
                        C.F_RECEIPT_ENTRY_QUANTITY: 1,
                        C.F_RECEIPT_ENTRY_LOCATION: ["recShelf"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                    },
                },
                {
                    "id": "recDisposedMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Disposed Package",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recOldShipment"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Disposed",
                    },
                },
                {
                    "id": "recCancelledProductMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Cancelled Product Package",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recFreshShipment"],
                        C.F_RECEIPT_ENTRY_ITEM: ["recCancelledProduct"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Matched",
                    },
                },
                {
                    "id": "recSixDayMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Six Day Package",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recSixDayShipment"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                    },
                },
                {
                    "id": "recEightDayMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Eight Day Package",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recEightDayShipment"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                    },
                },
                {
                    "id": "recFifteenDayMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Fifteen Day Package",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recFifteenDayShipment"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                    },
                },
                {
                    "id": "recInvalidDateMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Invalid Date Package",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recInvalidDateShipment"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Matched",
                    },
                },
                {
                    "id": "recCompletedMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Completed Package",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recFreshShipment"],
                        C.F_RECEIPT_ENTRY_ITEM: ["recCompleteProduct"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Validated",
                        C.F_RECEIPT_ENTRY_RELEASED: True,
                        C.F_RECEIPT_ENTRY_RELEASED_AT: "2026-07-20T12:00:00Z",
                    },
                },
                {
                    "id": "recOldCompleteMerch",
                    "fields": {
                        C.F_RECEIPT_ENTRY_NAME: "Old Complete Package",
                        C.F_RECEIPT_ENTRY_RECEIPT: ["recOldShipment"],
                        C.F_RECEIPT_ENTRY_ITEM: ["recCompleteProduct"],
                        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Validated",
                    },
                },
            ]
        if table == C.RECEIPTS_TABLE:
            return [
                {
                    "id": "recFreshShipment",
                    "fields": {
                        C.F_RECEIPT_NAME: "Shipment Fresh",
                        C.F_RECEIPT_CLIENT: ["recClient"],
                        C.F_RECEIPT_RECEIVED: "2026-07-16T10:00:00Z",
                        C.F_RECEIPT_CARRIER: "UPS",
                        C.F_RECEIPT_TRACKING: "1Z999",
                    },
                },
                {
                    "id": "recOldShipment",
                    "fields": {
                        C.F_RECEIPT_NAME: "Shipment Old",
                        C.F_RECEIPT_CLIENT: ["recClient"],
                        C.F_RECEIPT_RECEIVED: "2026-06-01T10:00:00Z",
                    },
                },
                {
                    "id": "recSixDayShipment",
                    "fields": {
                        C.F_RECEIPT_NAME: "Shipment Six",
                        C.F_RECEIPT_CLIENT: ["recClient"],
                        C.F_RECEIPT_RECEIVED: "2026-07-10T10:00:00Z",
                    },
                },
                {
                    "id": "recEightDayShipment",
                    "fields": {
                        C.F_RECEIPT_NAME: "Shipment Eight",
                        C.F_RECEIPT_CLIENT: ["recClient"],
                        C.F_RECEIPT_RECEIVED: "2026-07-08T10:00:00Z",
                    },
                },
                {
                    "id": "recFifteenDayShipment",
                    "fields": {
                        C.F_RECEIPT_NAME: "Shipment Fifteen",
                        C.F_RECEIPT_CLIENT: ["recClient"],
                        C.F_RECEIPT_RECEIVED: "2026-07-01T10:00:00Z",
                    },
                },
                {
                    "id": "recInvalidDateShipment",
                    "fields": {
                        C.F_RECEIPT_NAME: "Shipment Invalid",
                        C.F_RECEIPT_CLIENT: ["recClient"],
                        C.F_RECEIPT_RECEIVED: "not-a-date",
                    },
                },
            ]
        if table == C.ITEMS_TABLE:
            return [
                {
                    "id": "recReadyProduct",
                    "fields": {
                        C.F_ITEM_NAME: "Topco Honeydew Product",
                        C.F_ITEM_CLIENT: ["recClient"],
                        C.F_ITEM_IDENTIFIER: "000123",
                        C.F_ITEM_STATUS: "Pending",
                        C.F_ITEM_RECEIVED: True,
                    },
                },
                {
                    "id": "recCancelledProduct",
                    "fields": {
                        C.F_ITEM_NAME: "Cancelled Product",
                        C.F_ITEM_CLIENT: ["recClient"],
                        C.F_ITEM_STATUS: "Cancelled",
                    },
                },
                {
                    "id": "recCompleteProduct",
                    "fields": {
                        C.F_ITEM_NAME: "Complete Product",
                        C.F_ITEM_CLIENT: ["recClient"],
                        C.F_ITEM_STATUS: "Complete",
                    },
                },
            ]
        if table == C.CLIENTS_TABLE:
            return [{
                "id": "recClient",
                "fields": {
                    C.F_CLIENT_NAME: "Topco",
                    C.F_CLIENT_DISPO_DAYS: 30,
                    C.F_CLIENT_MERCHANDISE_REQUIRED: True,
                    C.F_CLIENT_ACTIVE: True,
                },
            }]
        if table == C.LOCATIONS_TABLE:
            return [{
                "id": "recShelf",
                "fields": {
                    C.F_LOCATION_NAME: "Shelf A",
                    C.F_LOCATION_ACTIVE: True,
                },
            }]
        return []

    @patch("routes._now_utc", return_value=datetime(2026, 7, 16, 12, 0, tzinfo=timezone.utc))
    @patch("routes.airtable.list_records")
    def test_inventory_api_enriches_merchandise_records(self, list_records, _now):
        list_records.side_effect = lambda table, params=None, by_field_id=False: {"records": self.records_for(table)}

        response = self.app.get("/api/merchandise")

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        ids = {record["id"] for record in records}
        self.assertIn("recFreshMerch", ids)
        fresh = next(record for record in records if record["id"] == "recFreshMerch")
        self.assertEqual(fresh["packageName"], "Honeydew Melon")
        self.assertEqual(fresh["barcodeOrIdNumber"], "000123")
        self.assertEqual(fresh["client"], "Topco")
        self.assertEqual(fresh["matchedProduct"]["name"], "Topco Honeydew Product")
        self.assertEqual(fresh["shipment"]["name"], "Shipment Fresh")
        self.assertEqual(fresh["storageLocation"], "Shelf A")
        self.assertEqual(fresh["timeHere"], "Today")
        self.assertEqual(fresh["ageGroup"], "0-7")
        self.assertEqual(fresh["status"], "Matched")

    @patch("routes._now_utc", return_value=datetime(2026, 7, 16, 12, 0, tzinfo=timezone.utc))
    @patch("routes.airtable.list_records")
    def test_inventory_status_age_and_exclusions(self, list_records, _now):
        list_records.side_effect = lambda table, params=None, by_field_id=False: {"records": self.records_for(table)}

        response = self.app.get("/api/merchandise")

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        ids = {record["id"] for record in records}
        self.assertNotIn("recDisposedMerch", ids)
        self.assertIn("recCancelledProductMerch", ids)
        old = next(record for record in records if record["id"] == "recOldMerch")
        self.assertEqual(old["daysHere"], 45)
        self.assertEqual(old["timeHere"], "45 days")
        self.assertEqual(old["ageGroup"], "30-plus")
        self.assertEqual(old["status"], "Disposition Due")

    @patch("routes._now_utc", return_value=datetime(2026, 7, 16, 12, 0, tzinfo=timezone.utc))
    @patch("routes.airtable.list_records")
    def test_age_boundaries_invalid_dates_and_oldest_first_sort(self, list_records, _now):
        list_records.side_effect = lambda table, params=None, by_field_id=False: {"records": self.records_for(table)}

        response = self.app.get("/api/merchandise")

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        by_id = {record["id"]: record for record in records}
        self.assertEqual(by_id["recFreshMerch"]["timeHere"], "Today")
        self.assertEqual(by_id["recSixDayMerch"]["timeHere"], "6 days")
        self.assertEqual(by_id["recSixDayMerch"]["ageGroup"], "0-7")
        self.assertEqual(by_id["recEightDayMerch"]["ageGroup"], "8-14")
        self.assertEqual(by_id["recFifteenDayMerch"]["timeHere"], "2 weeks")
        self.assertEqual(by_id["recFifteenDayMerch"]["ageGroup"], "15-30")
        self.assertIsNone(by_id["recInvalidDateMerch"]["daysHere"])
        self.assertEqual(by_id["recInvalidDateMerch"]["timeHere"], "Unknown")
        self.assertEqual(by_id["recInvalidDateMerch"]["ageGroup"], "unknown")
        known_day_counts = [record["daysHere"] for record in records if record["daysHere"] is not None]
        self.assertEqual(known_day_counts, sorted(known_day_counts, reverse=True))

    @patch("routes._now_utc", return_value=datetime(2026, 7, 16, 12, 0, tzinfo=timezone.utc))
    @patch("routes.airtable.list_records")
    def test_completed_merchandise_stays_visible_and_action_status_wins(self, list_records, _now):
        list_records.side_effect = lambda table, params=None, by_field_id=False: {"records": self.records_for(table)}

        response = self.app.get("/api/merchandise")

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        by_id = {record["id"]: record for record in records}
        self.assertIn("recCompletedMerch", by_id)
        self.assertEqual(by_id["recCompletedMerch"]["status"], "Validated")
        self.assertTrue(by_id["recCompletedMerch"]["released"])
        self.assertIn("recOldCompleteMerch", by_id)
        self.assertEqual(by_id["recOldCompleteMerch"]["status"], "Disposition Due")

    @patch("routes._now_utc", return_value=datetime(2026, 7, 16, 12, 0, tzinfo=timezone.utc))
    @patch("routes.airtable.list_records")
    def test_merchandise_review_endpoint_remains_separate(self, list_records, _now):
        list_records.side_effect = lambda table, params=None, by_field_id=False: {"records": self.records_for(table)}

        review_response = self.app.get("/api/merchandise/review")
        inventory_response = self.app.get("/api/merchandise")

        self.assertEqual(review_response.status_code, 200)
        self.assertEqual(inventory_response.status_code, 200)
        self.assertIn("status", inventory_response.get_json()["records"][0])
        self.assertIn("merchStatus", review_response.get_json()["records"][0])


if __name__ == "__main__":
    unittest.main()
