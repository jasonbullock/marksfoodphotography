import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from routes import AUTH_SESSION_KEY  # noqa: E402


class DomainTableMappingTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()
        with self.app.session_transaction() as session:
            session[AUTH_SESSION_KEY] = {
                "id": "recTestUser",
                "name": "Test User",
                "email": "test@example.com",
                "role": "Admin",
                "active": True,
                "clientIds": [],
                "allClients": True,
                "hasPIN": True,
            }

    def test_canonical_tables_default_to_renamed_airtable_schema(self):
        self.assertEqual(C.PRODUCTS_TABLE, "Products")
        self.assertEqual(C.SHIPMENTS_TABLE, "Shipments")
        self.assertEqual(C.MERCHANDISE_TABLE, "Merchandise")
        self.assertEqual(C.ITEMS_TABLE, C.PRODUCTS_TABLE)
        self.assertEqual(C.RECEIPTS_TABLE, C.SHIPMENTS_TABLE)
        self.assertEqual(C.RECEIPT_ENTRIES_TABLE, C.MERCHANDISE_TABLE)

    @patch("routes.airtable.list_records")
    def test_settings_reports_canonical_and_legacy_table_keys(self, list_records):
        list_records.return_value = {"records": []}

        response = self.app.get("/api/settings")

        self.assertEqual(response.status_code, 200)
        tables = response.get_json()["settings"]["tables"]
        self.assertEqual(tables["products"], C.PRODUCTS_TABLE)
        self.assertEqual(tables["shipments"], C.SHIPMENTS_TABLE)
        self.assertEqual(tables["merchandise"], C.MERCHANDISE_TABLE)
        self.assertEqual(tables["items"], C.ITEMS_TABLE)
        self.assertEqual(tables["receipts"], C.RECEIPTS_TABLE)
        self.assertEqual(tables["receiptEntries"], C.RECEIPT_ENTRIES_TABLE)


if __name__ == "__main__":
    unittest.main()
