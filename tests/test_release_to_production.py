import importlib
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import requests


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
            C.F_RECEIPT_ENTRY_PLANNING_STATUS: "Awaiting Photo Release",
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
        self.assertEqual(ready["summary"], "5 of 5 Complete")

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
        self.assertIn("UPC / Product ID", missing_product["missing"])

        missing_decisions = _evaluate_required_to_shoot_from_fields({
            **self.entry()["fields"],
            C.F_RECEIPT_ENTRY_DELIVERABLES: "",
        }, self.product()["fields"])
        self.assertIn("Deliverables", missing_decisions["missing"])

        # Artwork is not a baseline requirement; it appears only when the client
        # asks for the Valid Artwork Path on a selected deliverable.
        no_artwork_configured = _evaluate_required_to_shoot_from_fields(self.entry()["fields"], self.product({
            C.F_ITEM_ARTWORK_RECEIVED: False,
        })["fields"])
        self.assertNotIn("Valid Artwork Path", no_artwork_configured["missing"])
        self.assertTrue(no_artwork_configured["ready"])

        artwork_client = {"photoProductionRequirements": {"workstreams": {
            "Ecomm": {"requiredProductFields": ["pathToArt"]},
        }}}
        missing_artwork = _evaluate_required_to_shoot_from_fields(
            self.entry()["fields"], self.product({C.F_ITEM_ARTWORK_RECEIVED: False})["fields"],
            client_config=artwork_client,
        )
        self.assertIn("Valid Artwork Path", missing_artwork["missing"])

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
        })

        response = self.app.post("/api/merchandise/recMerch/release")

        self.assertEqual(response.status_code, 200)
        fields = update_record.call_args.args[2]
        self.assertTrue(fields[C.F_RECEIPT_ENTRY_RELEASED])
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_RELEASED_AT], "2026-07-20T12:00:00Z")
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_RELEASED_BY], ["recTestUser"])
        self.assertNotIn(C.F_RECEIPT_ENTRY_PLANNING_STATUS, fields)
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
        self.assertIn("UPC / Product ID", payload["missing"])
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

    @patch("routes._record_merchandise_history")
    @patch("routes._populate_creative_force_feed_for_ready_cards")
    @patch("routes._workstream_cards_for_merchandise")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_release_writes_the_creative_force_feed_before_marking_released(
        self, get_record, update_record, cards_for_merch, populate_feed, record_history
    ):
        entry = self.entry({C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]})
        get_record.side_effect = [entry, self.receipt(), self.product(), self.product()]
        update_record.return_value = entry
        card = {"id": "recCard", "fields": {C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"]}}
        released_card = {"id": "recCard", "fields": {
            C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
            C.F_WORKSTREAM_CARD_RELEASED: True,
        }}
        # Read once to choose what to release, and again to see whether the arrival
        # still has a workstream waiting.
        cards_for_merch.side_effect = [[card], [released_card]]
        populate_feed.return_value = [{"sourceKey": "topco:recCard", "action": "created"}]

        response = self.app.post("/api/merchandise/recMerch/release")

        self.assertEqual(response.status_code, 200)
        populate_feed.assert_called_once_with([card])
        self.assertEqual(response.get_json()["creativeForceFeed"],
                         [{"sourceKey": "topco:recCard", "action": "created"}])
        card_write = next(call for call in update_record.call_args_list if call.args[1] == "recCard")
        self.assertTrue(card_write.args[2][C.F_WORKSTREAM_CARD_RELEASED])
        self.assertTrue(update_record.call_args.args[2][C.F_RECEIPT_ENTRY_RELEASED])
        record_history.assert_called_once()
        self.assertEqual(record_history.call_args.args[1], "Released to photo")

    @patch("routes._record_merchandise_history")
    @patch("routes._populate_creative_force_feed_for_ready_cards")
    @patch("routes._workstream_cards_for_merchandise")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_releasing_one_workstream_leaves_the_other_alone(
        self, get_record, update_record, cards_for_merch, populate_feed, _history
    ):
        # Releasing Ecomm used to hand every ready card on the arrival to Creative
        # Force and mark the whole arrival released, so Packaging lit up too.
        entry = self.entry({C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]})
        get_record.side_effect = [entry, self.receipt(), self.product(), self.product()]
        update_record.return_value = entry
        ecomm = {"id": "recEcomm", "fields": {
            C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
            C.F_WORKSTREAM_CARD_TYPE: "Ecomm",
        }}
        packaging = {"id": "recPackaging", "fields": {
            C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
            C.F_WORKSTREAM_CARD_TYPE: "Packaging",
        }}
        cards_for_merch.side_effect = [
            [ecomm, packaging],
            [{"id": "recEcomm", "fields": {C.F_WORKSTREAM_CARD_RELEASED: True}}, packaging],
        ]
        populate_feed.return_value = []

        response = self.app.post("/api/merchandise/recMerch/release", json={"workstreamType": "Ecomm"})

        self.assertEqual(response.status_code, 200)
        populate_feed.assert_called_once_with([ecomm])
        written = {call.args[1] for call in update_record.call_args_list}
        self.assertIn("recEcomm", written)
        self.assertNotIn("recPackaging", written)
        # Packaging is still waiting, so the arrival is not released yet.
        self.assertNotIn(C.F_RECEIPT_ENTRY_RELEASED, update_record.call_args.args[2])

    @patch("routes._populate_creative_force_feed_for_ready_cards")
    @patch("routes._workstream_cards_for_merchandise")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_release_is_not_recorded_when_the_feed_write_fails(
        self, get_record, update_record, cards_for_merch, populate_feed
    ):
        # Otherwise an item reads as released to production but never arrives there.
        entry = self.entry({C.F_RECEIPT_ENTRY_ITEM: ["recProduct"]})
        get_record.side_effect = [entry, self.receipt(), self.product(), self.product()]
        cards_for_merch.return_value = [{"id": "recCard", "fields": {}}]
        error = requests.HTTPError("boom")
        error.response = SimpleNamespace(status_code=500, text="boom", json=lambda: {})
        populate_feed.side_effect = error

        response = self.app.post("/api/merchandise/recMerch/release")

        self.assertNotEqual(response.status_code, 200)
        update_record.assert_not_called()


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
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED_BY], "Test User")
        self.assertIsInstance(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED_BY], str)
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
        self.assertEqual(fields[C.F_RECEIPT_ENTRY_MERCH_VERIFIED_BY], "")


class ActivationReleaseStampTests(unittest.TestCase):
    """Releasing through a photo release is a release, so it stamps like one.
    Without the stamp the board cannot tell a card released last week from one
    that was never released."""

    def test_release_stamp_is_written_when_the_card_moves(self):
        import routes
        source = open(routes.__file__, encoding="utf-8").read()
        move = source.split("def move_activation_to_photo", 1)[1].split("\ndef ", 1)[0]
        self.assertIn("update_fields[C.F_RECEIPT_ENTRY_RELEASED] = True", move)
        self.assertIn("update_fields[C.F_RECEIPT_ENTRY_RELEASED_AT] = _now_iso()", move)
        self.assertIn("update_fields[C.F_RECEIPT_ENTRY_RELEASED_BY] = [releaser_id]", move)

    def test_an_existing_stamp_is_not_overwritten(self):
        # Re-releasing an edited photo release must not move the original date.
        import routes
        source = open(routes.__file__, encoding="utf-8").read()
        move = source.split("def move_activation_to_photo", 1)[1].split("\ndef ", 1)[0]
        self.assertIn("if not fields.get(C.F_RECEIPT_ENTRY_RELEASED):", move)

    def test_stamp_waits_for_every_sibling_workstream(self):
        # Merchandise with a sibling card still unreleased is not released yet.
        import routes
        source = open(routes.__file__, encoding="utf-8").read()
        move = source.split("def move_activation_to_photo", 1)[1].split("\ndef ", 1)[0]
        stamped = move.split("if not unreleased_siblings:", 1)[1]
        self.assertIn("C.F_RECEIPT_ENTRY_RELEASED", stamped)


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



class ReleaseGuardTests(unittest.TestCase):
    def test_the_guard_reads_the_card_not_the_arrival(self):
        source = (Path(__file__).resolve().parents[1] / "backend" / "routes.py").read_text()
        start = source.index("def release_merchandise_to_production(entry_id):")
        body = source[start:start + 3000]
        # The arrival-level guard returned early once any release had happened, which
        # would have left Packaging unreleasable after Ecomm went out.
        self.assertIn("(cards and not pending)", body)
        # An arrival with no cards keeps its own guard, so a second release cannot
        # overwrite the original release time.
        self.assertIn("(not cards and fields.get(C.F_RECEIPT_ENTRY_RELEASED))", body)
