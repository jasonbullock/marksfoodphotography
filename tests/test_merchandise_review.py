import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from routes import AUTH_SESSION_KEY  # noqa: E402


class MerchandiseReviewTests(unittest.TestCase):
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
    def entry(entry_id, fields=None):
        base = {
            C.F_RECEIPT_ENTRY_NAME: "Honeydew Package",
            C.F_RECEIPT_ENTRY_RECEIPT: ["recShipment"],
            C.F_RECEIPT_ENTRY_SKU_ID: "000123",
            C.F_RECEIPT_ENTRY_QUANTITY: 2,
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
        }
        base.update(fields or {})
        return {"id": entry_id, "fields": base}

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

    @staticmethod
    def product(product_id="recProduct", fields=None):
        base = {
            C.F_ITEM_NAME: "Topco Honeydew Product",
            C.F_ITEM_CLIENT: ["recClient"],
            C.F_ITEM_IDENTIFIER: "000123",
            C.F_ITEM_JOB_NUMBER: "WF-100",
            C.F_ITEM_BRAND: "Topco",
            C.F_ITEM_DESCRIPTION: "Honeydew 3 lb",
            C.F_ITEM_STATUS: "Pending",
        }
        base.update(fields or {})
        return {"id": product_id, "fields": base}

    @staticmethod
    def issue(issue_id="recIssue", fields=None):
        base = {
            C.F_ISSUE_NAME: "Damaged package",
            C.F_ISSUE_ITEM: ["recProduct"],
            C.F_ISSUE_TYPE: "Damaged",
            C.F_ISSUE_STATUS: "Open",
            C.F_ISSUE_PRIORITY: "Normal",
        }
        base.update(fields or {})
        return {"id": issue_id, "fields": base}

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.list_records")
    def test_review_api_returns_four_queue_states_photos_and_unidentified_flag(self, list_records, get_record, _clients):
        entries = [
            self.entry("recNeedsReview", {
                C.F_RECEIPT_ENTRY_ITEM: ["recProductClean"],
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Matched",
                C.F_RECEIPT_ENTRY_PHOTO_METADATA: '[{"object_key":"merchandise/recNeedsReview/image-1.jpg"}]',
            }),
            self.entry("recWaiting", {
                C.F_RECEIPT_ENTRY_NAME: "Imported later",
                C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Waiting on Information",
            }),
            self.entry("recValidated", {
                C.F_RECEIPT_ENTRY_ITEM: ["recProductValidated"],
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Validated",
            }),
            self.entry("recIssueState", {
                C.F_RECEIPT_ENTRY_ITEM: ["recProductIssue"],
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Issue",
            }),
            self.entry("recUnidentified", {
                C.F_RECEIPT_ENTRY_NAME: "",
                C.F_RECEIPT_ENTRY_SKU_ID: "",
                C.F_RECEIPT_ENTRY_DESCRIPTION: "",
            }),
        ]

        def list_side_effect(table, params=None, by_field_id=False):
            if table == C.RECEIPT_ENTRIES_TABLE:
                return {"records": entries}
            if table == C.RECEIPTS_TABLE:
                return {"records": [self.receipt()]}
            if table == C.ISSUES_TABLE:
                return {"records": [self.issue(fields={C.F_ISSUE_ITEM: ["recProductIssue"]})]}
            return {"records": []}

        list_records.side_effect = list_side_effect
        get_record.side_effect = lambda table, record_id, by_field_id=False: self.product(record_id)

        response = self.app.get("/api/merchandise/review")

        self.assertEqual(response.status_code, 200)
        records = {record["id"]: record for record in response.get_json()["records"]}
        self.assertEqual(records["recNeedsReview"]["reviewState"], "Needs Review")
        self.assertEqual(records["recWaiting"]["reviewState"], "Waiting for Product Data")
        self.assertEqual(records["recValidated"]["reviewState"], "Validated")
        self.assertEqual(records["recIssueState"]["reviewState"], "Issue")
        self.assertTrue(records["recUnidentified"]["isUnidentified"])
        self.assertEqual(records["recNeedsReview"]["photos"][0]["object_key"], "merchandise/recNeedsReview/image-1.jpg")
        self.assertTrue(records["recNeedsReview"]["photos"][0]["url"].endswith("/merchandise/recNeedsReview/image-1.jpg"))
        self.assertEqual(records["recNeedsReview"]["linkedItem"]["identifier"], "000123")
        self.assertIn("Damaged package", [issue["name"] for issue in records["recIssueState"]["blockingIssues"]])

    @patch("routes.airtable.get_record")
    def test_validate_requires_linked_product(self, get_record):
        get_record.side_effect = [self.entry("recEntry"), self.receipt()]

        response = self.app.post("/api/merchandise/review/recEntry/validate", json={"status": "Validated"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Product must be linked", response.get_json()["error"])

    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_validate_blocks_unresolved_merchandise_issue(self, get_record, list_records):
        get_record.side_effect = [
            self.entry("recEntry", {C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]}),
            self.receipt(),
        ]
        list_records.return_value = {"records": [self.issue()]}

        response = self.app.post("/api/merchandise/review/recEntry/validate", json={"status": "Validated"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Resolve blocking Merchandise Issues", response.get_json()["error"])

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes.airtable.get_record")
    def test_validate_success_marks_merchandise_validated(self, get_record, list_records, update_record, _clients):
        entry = self.entry("recEntry", {C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]})
        get_record.side_effect = [entry, self.receipt(), self.product()]
        list_records.return_value = {"records": []}
        update_record.return_value = self.entry("recEntry", {
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Validated",
        })

        response = self.app.post("/api/merchandise/review/recEntry/validate", json={"status": "Validated"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(update_record.call_args.args[2][C.F_RECEIPT_ENTRY_MERCH_STATUS], "Validated")
        self.assertEqual(response.get_json()["reviewState"], "Validated")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_remove_match_clears_product_link(self, get_record, update_record):
        get_record.side_effect = [
            self.entry("recEntry", {C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]}),
            self.receipt(),
        ]
        update_record.return_value = self.entry("recEntry", {C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received"})

        response = self.app.post("/api/merchandise/review/recEntry/remove-match")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(update_record.call_args.args[2][C.F_RECEIPT_ENTRY_ITEM], [])
        self.assertEqual(update_record.call_args.args[2][C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_waiting_for_product_data_uses_intake_status_and_preserves_notes(self, get_record, update_record):
        get_record.side_effect = [self.entry("recEntry", {C.F_RECEIPT_ENTRY_NOTES: "Receiver note"}), self.receipt()]
        update_record.return_value = self.entry("recEntry", {
            C.F_RECEIPT_ENTRY_NOTES: "Receiver note\nImport missing",
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Waiting on Information",
        })

        response = self.app.post("/api/merchandise/review/recEntry/waiting-product-data", json={"note": "Import missing"})

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Waiting on Information")
        self.assertNotIn("[Waiting for Product Data]", fields[C.F_RECEIPT_ENTRY_NOTES])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")
        self.assertEqual(response.get_json()["reviewState"], "Waiting for Product Data")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.airtable.get_record")
    def test_raise_issue_uses_existing_issue_model_and_r2_image_references(self, get_record, create_record, update_record, _clients):
        entry = self.entry("recEntry", {
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_PHOTO_METADATA: '[{"object_key":"merchandise/recEntry/image-1.jpg"}]',
        })
        get_record.side_effect = [entry, self.receipt(), self.product(), self.product()]
        create_record.return_value = self.issue("recIssue", {
            C.F_ISSUE_NAME: "Crushed package",
            C.F_ISSUE_NOTES: "Corner is crushed\n\nR2 image references:\nmerchandise/recEntry/image-1.jpg",
        })
        update_record.return_value = self.entry("recEntry", {
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Issue",
            C.F_RECEIPT_ENTRY_PHOTO_METADATA: '[{"object_key":"merchandise/recEntry/image-1.jpg"}]',
        })

        response = self.app.post("/api/merchandise/review/recEntry/issue", json={
            "type": "Damaged",
            "description": "Crushed package",
            "notes": "Corner is crushed",
        })

        self.assertEqual(response.status_code, 201)
        issue_fields = create_record.call_args.args[1]
        self.assertEqual(issue_fields[C.F_ISSUE_ITEM], ["recProduct"])
        self.assertNotIn(C.F_ISSUE_PHOTOS, issue_fields)
        self.assertIn("merchandise/recEntry/image-1.jpg", issue_fields[C.F_ISSUE_NOTES])
        self.assertEqual(update_record.call_args.args[2][C.F_RECEIPT_ENTRY_MERCH_STATUS], "Issue")
        payload = response.get_json()
        self.assertEqual(payload["merchandise"]["reviewState"], "Issue")


if __name__ == "__main__":
    unittest.main()
