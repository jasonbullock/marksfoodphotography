import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app
from config import Config as C
from routes import AUTH_SESSION_KEY, _fulfill_waiting_requests


class RequestTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()
        with self.app.session_transaction() as session:
            session[AUTH_SESSION_KEY] = {
                "id": "recAdmin",
                "name": "Admin",
                "displayName": "Admin",
                "email": "admin@example.com",
                "role": "Admin",
                "active": True,
                "clientIds": [],
                "allClients": True,
            }

    @patch("routes.airtable.create_record")
    @patch("routes._list_all_records", return_value=[])
    @patch("routes.airtable.get_record")
    def test_create_request_marks_product_as_actively_waiting(self, get_record, list_records, create_record):
        get_record.return_value = {
            "id": "recProduct",
            "fields": {C.F_ITEM_NAME: "Fresh Cherries", C.F_ITEM_CLIENT: ["recClient"]},
        }
        create_record.return_value = {
            "id": "recRequest",
            "fields": {
                C.F_REQUEST_NAME: "Waiting for Fresh Cherries",
                C.F_REQUEST_PRODUCT: ["recProduct"],
                C.F_REQUEST_STATUS: "Waiting",
            },
        }

        response = self.app.post("/api/requests", json={"productId": "recProduct"})

        self.assertEqual(response.status_code, 201)
        fields = create_record.call_args.args[1]
        self.assertEqual(fields[C.F_REQUEST_STATUS], "Waiting")
        self.assertEqual(fields[C.F_REQUEST_PRODUCT], ["recProduct"])
        self.assertEqual(response.get_json()["record"]["status"], "Waiting")

    @patch("routes.airtable.update_record")
    @patch("routes._list_all_records")
    def test_matching_merchandise_fulfills_waiting_request(self, list_records, update_record):
        list_records.return_value = [
            {
                "id": "recRequest",
                "fields": {
                    C.F_REQUEST_PRODUCT: ["recProduct"],
                    C.F_REQUEST_STATUS: "Waiting",
                },
            },
            {
                "id": "recCancelled",
                "fields": {
                    C.F_REQUEST_PRODUCT: ["recProduct"],
                    C.F_REQUEST_STATUS: "Cancelled",
                },
            },
        ]
        update_record.return_value = {"id": "recRequest", "fields": {}}

        fulfilled = _fulfill_waiting_requests("recProduct", "recMerch")

        self.assertEqual(len(fulfilled), 1)
        update_record.assert_called_once_with(
            C.REQUESTS_TABLE,
            "recRequest",
            {
                C.F_REQUEST_STATUS: "Fulfilled",
                C.F_REQUEST_MERCHANDISE: ["recMerch"],
            },
            by_field_id=False,
            typecast=True,
        )


if __name__ == "__main__":
    unittest.main()
