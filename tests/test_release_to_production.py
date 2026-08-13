import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from routes import AUTH_SESSION_KEY, _evaluate_required_to_shoot_from_fields  # noqa: E402


class ReleaseToProductionTests(unittest.TestCase):
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
            C.F_RECEIPT_ENTRY_SKU_ID: "000123",
            C.F_RECEIPT_ENTRY_RECEIPT: ["recShipment"],
            C.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Ready for Photo",
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Ecomm"],
            C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True,
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

    @staticmethod
    def product(fields=None):
        base = {
            C.F_ITEM_NAME: "Frozen Pizza",
            C.F_ITEM_IDENTIFIER: "000123",
            C.F_ITEM_CLIENT: ["recClient"],
            C.F_ITEM_ARTWORK_RECEIVED: True,
            C.F_ITEM_REFERENCE_DATA: '{"Activation": "Summer 2026"}',
        }
        base.update(fields or {})
        return {"id": "recProduct", "fields": base}

    def test_readiness_evaluation_requires_each_baseline_field(self):
        ready = _evaluate_required_to_shoot_from_fields(self.entry()["fields"], self.product()["fields"])
        self.assertTrue(ready["ready"])
        self.assertEqual(ready["summary"], "6 of 6 Complete")

        missing_verification = _evaluate_required_to_shoot_from_fields({
            **self.entry()["fields"],
            C.F_RECEIPT_ENTRY_MERCH_VERIFIED: False,
        }, self.product()["fields"])
        self.assertIn("Merchandise Verified", missing_verification["missing"])
        self.assertFalse(missing_verification["ready"])

        missing_product = _evaluate_required_to_shoot_from_fields({
            **self.entry()["fields"],
            C.F_RECEIPT_ENTRY_ITEM: [],
        }, {})
        self.assertIn("Product Linked", missing_product["missing"])
        self.assertIn("Product Name", missing_product["missing"])
        self.assertIn("Primary Match Key", missing_product["missing"])

        missing_decisions = _evaluate_required_to_shoot_from_fields({
            **self.entry()["fields"],
            C.F_RECEIPT_ENTRY_DELIVERABLES: "",
        }, self.product()["fields"])
        self.assertIn("Deliverables", missing_decisions["missing"])

        missing_artwork = _evaluate_required_to_shoot_from_fields(self.entry()["fields"], self.product({
            C.F_ITEM_ARTWORK_RECEIVED: False,
        })["fields"])
        self.assertIn("Artwork", missing_artwork["missing"])

        without_reference_data = _evaluate_required_to_shoot_from_fields(self.entry()["fields"], self.product({
            C.F_ITEM_REFERENCE_DATA: "",
        })["fields"])
        self.assertTrue(without_reference_data["ready"])
        self.assertNotIn("Activation Information", without_reference_data["missing"])

        thr3d_ready = _evaluate_required_to_shoot_from_fields({
            **self.entry()["fields"],
            C.F_RECEIPT_ENTRY_ITEM: [],
            C.F_RECEIPT_CLIENT: ["recClient"],
            C.F_RECEIPT_ENTRY_QUANTITY: 1,
            C.F_RECEIPT_ENTRY_PHOTO_METADATA: [{"object_key": "receiving/recShipment/recMerch-1.jpg"}],
            C.F_RECEIPT_ENTRY_DELIVERABLES: ["Thr3d"],
        }, {})
        self.assertTrue(thr3d_ready["ready"])
        self.assertEqual(thr3d_ready["summary"], "4 of 4 Complete")

    @patch("routes._clients_by_id", return_value={})
    @patch("routes._now_iso", return_value="2026-07-20T12:00:00Z")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_successful_release_persists_release_audit_and_completes_intake(self, get_record, update_record, _now, _clients):
        get_record.side_effect = [self.entry(), self.receipt(), self.product()]
        update_record.return_value = self.entry({
            C.F_RECEIPT_ENTRY_RELEASED: True,
            C.F_RECEIPT_ENTRY_RELEASED_AT: "2026-07-20T12:00:00Z",
            C.F_RECEIPT_ENTRY_RELEASED_BY: ["recTestUser"],
            C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Complete",
        })

        response = self.app.post("/api/merchandise/recMerch/release")

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertTrue(fields[C.F_RECEIPT_ENTRY_RELEASED])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_RELEASED_AT], "2026-07-20T12:00:00Z")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_RELEASED_BY], ["recTestUser"])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Complete")
        payload = response.get_json()
        self.assertTrue(payload["released"])
        self.assertTrue(payload["requiredToShoot"]["ready"])

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_release_rejects_missing_requirements(self, get_record, update_record):
        get_record.side_effect = [
            self.entry({
                C.F_RECEIPT_ENTRY_ITEM: [],
                C.F_RECEIPT_ENTRY_DELIVERABLES: [],
            }),
            self.receipt(),
        ]

        response = self.app.post("/api/merchandise/recMerch/release")

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertIn("Deliverables", payload["missing"])
        self.assertNotIn("Product Linked", payload["missing"])
        self.assertIn("Missing:", payload["error"])
        update_record.assert_not_called()

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_release_rejects_missing_product_after_photo_deliverable_selected(self, get_record, update_record):
        get_record.side_effect = [
            self.entry({
                C.F_RECEIPT_ENTRY_ITEM: [],
                C.F_RECEIPT_ENTRY_DELIVERABLES: ["Ecomm"],
            }),
            self.receipt(),
        ]

        response = self.app.post("/api/merchandise/recMerch/release")

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertIn("Product Linked", payload["missing"])
        self.assertIn("Product Name", payload["missing"])
        self.assertIn("Primary Match Key", payload["missing"])
        update_record.assert_not_called()

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_release_is_idempotent_for_already_released_merchandise(self, get_record, update_record, _clients):
        get_record.side_effect = [
            self.entry({
                C.F_RECEIPT_ENTRY_RELEASED: True,
                C.F_RECEIPT_ENTRY_RELEASED_AT: "2026-07-19T10:00:00Z",
                C.F_RECEIPT_ENTRY_RELEASED_BY: ["recOriginalUser"],
            }),
            self.receipt(),
            self.product(),
        ]

        response = self.app.post("/api/merchandise/recMerch/release")

        self.assertEqual(response.status_code, 200)
        update_record.assert_not_called()
        payload = response.get_json()
        self.assertEqual(payload["releasedAt"], "2026-07-19T10:00:00Z")
        self.assertEqual(payload["releasedByIds"], ["recOriginalUser"])


class VerifyMerchandiseTests(unittest.TestCase):
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

    @patch("routes._clients_by_id", return_value={})
    @patch("routes._now_iso", return_value="2026-07-21T09:00:00Z")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_verify_persists_stamp_and_user(self, get_record, update_record, _now, _clients):
        get_record.side_effect = [
            ReleaseToProductionTests.entry({C.F_RECEIPT_ENTRY_MERCH_VERIFIED: False}),
            ReleaseToProductionTests.receipt(),
            ReleaseToProductionTests.product(),
        ]
        update_record.return_value = ReleaseToProductionTests.entry({
            C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True,
            C.F_RECEIPT_ENTRY_MERCH_VERIFIED_AT: "2026-07-21T09:00:00Z",
            C.F_RECEIPT_ENTRY_MERCH_VERIFIED_BY: ["recTestUser"],
        })

        response = self.app.post("/api/merchandise/recMerch/verify")

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertTrue(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED_AT], "2026-07-21T09:00:00Z")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED_BY], ["recTestUser"])
        payload = response.get_json()
        self.assertTrue(payload["merchandiseVerified"])

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_verify_rejects_when_identity_missing(self, get_record, update_record):
        get_record.side_effect = [
            ReleaseToProductionTests.entry({
                C.F_RECEIPT_ENTRY_NAME: "",
                C.F_RECEIPT_ENTRY_SKU_ID: "",
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: False,
            }),
            ReleaseToProductionTests.receipt(),
        ]

        response = self.app.post("/api/merchandise/recMerch/verify")

        self.assertEqual(response.status_code, 400)
        self.assertIn("Product Name on Package", response.get_json()["error"])
        update_record.assert_not_called()

    @patch("routes._clients_by_id", return_value={})
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_unverify_clears_stamp(self, get_record, update_record, _clients):
        get_record.side_effect = [
            ReleaseToProductionTests.entry({C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True}),
            ReleaseToProductionTests.receipt(),
            ReleaseToProductionTests.product(),
        ]
        update_record.return_value = ReleaseToProductionTests.entry({C.F_RECEIPT_ENTRY_MERCH_VERIFIED: False})

        response = self.app.post("/api/merchandise/recMerch/unverify")

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertFalse(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED_BY], [])


class ReleaseSchemaUtilityTests(unittest.TestCase):
    def setUp(self):
        self.utility = importlib.import_module("ensure_release_to_production_fields")

    def table(self, name, table_id, fields=None):
        return {"id": table_id, "name": name, "fields": fields or []}

    def test_release_schema_utility_creates_missing_fields(self):
        merchandise = self.table(C.MERCHANDISE_TABLE, "tblMerch")
        users = self.table(C.USERS_TABLE, "tblUsers")

        results = self.utility.ensure_release_fields(merchandise, users, dry_run=True)

        self.assertEqual([result["field"] for result in results], [
            C.F_RECEIPT_ENTRY_RELEASED,
            C.F_RECEIPT_ENTRY_RELEASED_AT,
            C.F_RECEIPT_ENTRY_RELEASED_BY,
        ])
        self.assertEqual([result["result"] for result in results], ["would_create", "would_create", "would_create"])


if __name__ == "__main__":
    unittest.main()
