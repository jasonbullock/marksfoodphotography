import sys
import unittest
import json
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

    @staticmethod
    def user(user_id="recTestUser", fields=None):
        base = {
            C.F_USER_NAME: "Jason Bullock",
            C.F_USER_FIRST_NAME: "Jason",
            C.F_USER_LAST_NAME: "Bullock",
            C.F_USER_DISPLAY_NAME: "Jason Bullock",
            C.F_USER_ROLE: "PM",
            C.F_USER_ACTIVE: True,
            C.F_USER_AVATAR: "JB",
        }
        base.update(fields or {})
        return {"id": user_id, "fields": base}

    @staticmethod
    def comment(comment_id="recComment", fields=None):
        base = {
            C.F_COMMENT_BODY: "Need artwork before release.",
            C.F_COMMENT_MERCHANDISE: ["recMerch"],
            C.F_COMMENT_USER: ["recTestUser"],
            C.F_COMMENT_CREATED_AT: "2026-07-22T12:30:00.000Z",
        }
        base.update(fields or {})
        return {"id": comment_id, "createdTime": "2026-07-22T12:30:00.000Z", "fields": base}

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.get_record")
    def test_authenticated_comment_creation_links_current_user(self, get_record, create_record):
        def get_side_effect(table, record_id, by_field_id=False):
            if table == C.MERCHANDISE_TABLE:
                return self.entry(record_id)
            if table == C.SHIPMENTS_TABLE:
                return self.receipt()
            if table == C.USERS_TABLE:
                return self.user(record_id)
            raise AssertionError(f"Unexpected table {table}")

        get_record.side_effect = get_side_effect
        create_record.return_value = self.comment()

        response = self.app.post("/api/merchandise/recMerch/comments", json={"comment": "  Need artwork before release.  "})

        self.assertEqual(response.status_code, 201)
        create_record.assert_called_once()
        table, fields = create_record.call_args.args[:2]
        self.assertEqual(table, C.COMMENTS_TABLE)
        self.assertEqual(fields[C.F_COMMENT_BODY], "Need artwork before release.")
        self.assertEqual(fields[C.F_COMMENT_MERCHANDISE], ["recMerch"])
        self.assertEqual(fields[C.F_COMMENT_USER], ["recTestUser"])
        payload = response.get_json()["comment"]
        self.assertEqual(payload["author"]["displayName"], "Jason Bullock")
        self.assertEqual(payload["author"]["role"], "PM")
        self.assertEqual(payload["author"]["initials"], "JB")
        self.assertEqual(payload["createdAt"], "2026-07-22T12:30:00.000Z")

    def test_anonymous_comment_creation_is_rejected(self):
        unauthenticated = create_app().test_client()

        response = unauthenticated.post("/api/merchandise/recMerch/comments", json={"comment": "Hello"})

        self.assertEqual(response.status_code, 401)

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.get_record")
    def test_empty_comment_creation_is_rejected(self, get_record, create_record):
        response = self.app.post("/api/merchandise/recMerch/comments", json={"comment": "   "})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Comment is required", response.get_json()["error"])
        get_record.assert_not_called()
        create_record.assert_not_called()

    @patch("routes.airtable.get_record")
    @patch("routes.airtable.list_records")
    def test_comments_return_author_name_role_and_timestamp(self, list_records, get_record):
        comments = [
            self.comment("recNewer", {C.F_COMMENT_BODY: "Second", C.F_COMMENT_CREATED_AT: "2026-07-22T12:35:00.000Z"}),
            self.comment("recOlder", {C.F_COMMENT_BODY: "First", C.F_COMMENT_CREATED_AT: "2026-07-22T12:30:00.000Z"}),
            self.comment("recOther", {C.F_COMMENT_BODY: "Other", C.F_COMMENT_MERCHANDISE: ["recOther"]}),
        ]

        def get_side_effect(table, record_id, by_field_id=False):
            if table == C.MERCHANDISE_TABLE:
                return self.entry(record_id)
            if table == C.SHIPMENTS_TABLE:
                return self.receipt()
            if table == C.USERS_TABLE:
                return self.user(record_id)
            raise AssertionError(f"Unexpected table {table}")

        get_record.side_effect = get_side_effect
        list_records.return_value = {"records": comments}

        response = self.app.get("/api/merchandise/recMerch/comments")

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        self.assertEqual([record["body"] for record in records], ["First", "Second"])
        self.assertEqual(records[0]["author"]["displayName"], "Jason Bullock")
        self.assertEqual(records[0]["author"]["role"], "PM")
        self.assertEqual(records[0]["createdAt"], "2026-07-22T12:30:00.000Z")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.list_records")
    def test_review_api_returns_three_queue_states_photos_and_unidentified_flag(self, list_records, get_record, _clients):
        entries = [
            self.entry("recNeedsReview", {
                C.F_RECEIPT_ENTRY_ITEM: ["recProductClean"],
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                C.F_RECEIPT_ENTRY_PHOTO_METADATA: '[{"object_key":"merchandise/recNeedsReview/image-1.jpg"}]',
            }),
            self.entry("recWaiting", {
                C.F_RECEIPT_ENTRY_NAME: "Imported later",
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Needs More Information",
            }),
            self.entry("recValidated", {
                C.F_RECEIPT_ENTRY_ITEM: ["recProductValidated"],
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Awaiting Photo Release",
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

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.list_records")
    def test_review_api_appends_shipment_photos_after_item_photos_without_duplication(self, list_records, get_record, _clients):
        entries = [
            self.entry("recItemOne", {
                C.F_RECEIPT_ENTRY_ITEM: ["recProductOne"],
                C.F_RECEIPT_ENTRY_PHOTO_METADATA: json.dumps([
                    {"object_key": "receiving/shipment/item-one.jpg", "sort_order": 1}
                ]),
            }),
            self.entry("recItemTwo", {
                C.F_RECEIPT_ENTRY_ITEM: ["recProductTwo"],
            }),
        ]
        shipment_photos = [
            {
                "photo_id": "pho_box_1",
                "shipment_id": "recShipment",
                "object_key": "shipments/recShipment/photos/pho_box_1/original.jpg",
                "sort_order": 1,
                "source": "shipment",
            },
            {
                "photo_id": "pho_box_2",
                "shipment_id": "recShipment",
                "object_key": "shipments/recShipment/photos/pho_box_2/original.jpg",
                "sort_order": 2,
                "source": "shipment",
            },
        ]
        receipt = self.receipt()
        receipt["fields"][C.F_RECEIPT_PHOTO_METADATA] = json.dumps(shipment_photos)

        def list_side_effect(table, params=None, by_field_id=False):
            if table == C.RECEIPT_ENTRIES_TABLE:
                return {"records": entries}
            if table == C.RECEIPTS_TABLE:
                return {"records": [receipt]}
            if table == C.ISSUES_TABLE:
                return {"records": []}
            return {"records": []}

        list_records.side_effect = list_side_effect
        get_record.side_effect = lambda table, record_id, by_field_id=False: self.product(record_id)

        response = self.app.get("/api/merchandise/review")

        self.assertEqual(response.status_code, 200)
        records = {record["id"]: record for record in response.get_json()["records"]}
        one = records["recItemOne"]
        two = records["recItemTwo"]
        self.assertEqual([photo["source"] for photo in one["photos"]], ["item", "shipment", "shipment"])
        self.assertEqual(one["photos"][0]["object_key"], "receiving/shipment/item-one.jpg")
        self.assertEqual(one["shipmentPhotos"][0]["photo_id"], "pho_box_1")
        self.assertEqual(two["photos"][0]["source"], "shipment")
        self.assertEqual([photo["photo_id"] for photo in two["shipmentPhotos"]], ["pho_box_1", "pho_box_2"])
        self.assertEqual([photo.get("source") for photo in one["photoMetadata"]], ["item"])
        self.assertEqual(one["itemPhotos"], one["photoMetadata"])

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
    def test_validate_success_marks_merchandise_ready_without_changing_physical_status(self, get_record, list_records, update_record, _clients):
        entry = self.entry("recEntry", {C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]})
        get_record.side_effect = [entry, self.receipt(), self.product()]
        list_records.return_value = {"records": []}
        update_record.return_value = self.entry("recEntry", {
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Awaiting Photo Release",
        })

        response = self.app.post("/api/merchandise/review/recEntry/validate", json={"status": "Validated"})

        self.assertEqual(response.status_code, 200)
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCH_STATUS, update_record.call_args.args[2])
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
    def test_waiting_for_product_data_uses_planning_status_and_preserves_notes(self, get_record, update_record):
        get_record.side_effect = [self.entry("recEntry", {C.F_RECEIPT_ENTRY_NOTES: "Receiver note"}), self.receipt()]
        update_record.return_value = self.entry("recEntry", {
            C.F_RECEIPT_ENTRY_NOTES: "Receiver note\nImport missing",
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Needs More Information",
        })

        response = self.app.post("/api/merchandise/review/recEntry/waiting-product-data", json={"note": "Import missing"})

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_ITEM], [])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_PLANNING_STATUS], "Needs More Information")
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
