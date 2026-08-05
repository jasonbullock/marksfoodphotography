import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from routes import AUTH_SESSION_KEY, _hash_pin  # noqa: E402


def user_record(user_id="recUser", role="Producer", active=True, all_clients=False, client_ids=None, pin="1234"):
    return {
        "id": user_id,
        "fields": {
            C.F_USER_NAME: "Test User",
            C.F_USER_FIRST_NAME: "Test",
            C.F_USER_LAST_NAME: "User",
            C.F_USER_DISPLAY_NAME: "Tester",
            C.F_USER_EMAIL: "test@example.com",
            C.F_USER_ROLE: role,
            C.F_USER_ACTIVE: active,
            C.F_USER_ALL_CLIENTS: all_clients,
            C.F_USER_CLIENTS: client_ids or [],
            C.F_USER_AVATAR: "T",
            C.F_USER_PIN_HASH: _hash_pin(user_id, pin),
        },
    }


def shaped_session_user(record):
    fields = record["fields"]
    return {
        "id": record["id"],
        "name": fields.get(C.F_USER_NAME, ""),
        "firstName": fields.get(C.F_USER_FIRST_NAME, ""),
        "lastName": fields.get(C.F_USER_LAST_NAME, ""),
        "displayName": fields.get(C.F_USER_DISPLAY_NAME, ""),
        "email": fields.get(C.F_USER_EMAIL, ""),
        "role": fields.get(C.F_USER_ROLE, ""),
        "active": fields.get(C.F_USER_ACTIVE, False),
        "clientIds": fields.get(C.F_USER_CLIENTS, []) or [],
        "allClients": fields.get(C.F_USER_ALL_CLIENTS, False),
        "avatar": fields.get(C.F_USER_AVATAR, ""),
        "hasPIN": bool(fields.get(C.F_USER_PIN_HASH, "")),
    }


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def authenticate(self, record=None):
        record = record or user_record(role="Admin", all_clients=True)
        with self.client.session_transaction() as session:
            session[AUTH_SESSION_KEY] = shaped_session_user(record)
        return record

    @patch("routes.airtable.get_record")
    def test_successful_login_creates_authenticated_session(self, get_record):
        get_record.return_value = user_record(pin="2468", all_clients=True)

        response = self.client.post("/api/auth/login", json={"userId": "recUser", "pin": "2468"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["id"], "recUser")
        self.assertNotIn("PIN Hash", response.get_json()["user"])
        with self.client.session_transaction() as session:
            self.assertEqual(session[AUTH_SESSION_KEY]["id"], "recUser")

    @patch("routes.airtable.get_record")
    def test_invalid_pin_returns_401(self, get_record):
        get_record.return_value = user_record(pin="2468")

        response = self.client.post("/api/auth/login", json={"userId": "recUser", "pin": "0000"})

        self.assertEqual(response.status_code, 401)

    @patch("routes.airtable.get_record")
    def test_inactive_user_cannot_log_in(self, get_record):
        get_record.return_value = user_record(active=False)

        response = self.client.post("/api/auth/login", json={"userId": "recUser", "pin": "1234"})

        self.assertEqual(response.status_code, 403)

    def test_auth_me_returns_401_without_session(self):
        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)

    @patch("routes.airtable.get_record")
    def test_auth_me_returns_safe_user_without_pin_hash(self, get_record):
        record = self.authenticate(user_record(role="Admin", all_clients=True))
        get_record.return_value = record

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()["user"]
        self.assertEqual(payload["id"], "recUser")
        self.assertNotIn("PIN Hash", payload)
        self.assertNotIn("pinHash", payload)

    @patch("routes.airtable.get_record")
    def test_auth_me_rejects_inactive_session_user(self, get_record):
        self.authenticate(user_record(active=True))
        get_record.return_value = user_record(active=False)

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)

    def test_logout_invalidates_session(self):
        self.authenticate()

        response = self.client.post("/api/auth/logout")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_unauthenticated_protected_api_request_returns_401(self):
        response = self.client.get("/api/clients")

        self.assertEqual(response.status_code, 401)

    @patch("routes.airtable.list_records")
    def test_non_admin_user_can_access_non_admin_users(self, list_records):
        self.authenticate(user_record(role="Producer"))
        list_records.return_value = {"records": [
            user_record(user_id="recAdmin", role="Admin"),
            user_record(user_id="recMerch", role="Merch"),
        ]}

        response = self.client.get("/api/users")

        self.assertEqual(response.status_code, 200)
        roles = [record["role"] for record in response.get_json()["records"]]
        self.assertEqual(roles, ["Merch"])

    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    def test_non_admin_user_cannot_assign_admin_role(self, update_record, get_record):
        self.authenticate(user_record(role="Producer"))

        response = self.client.put("/api/users/recUser", json={"role": "Admin", "allClients": True})

        self.assertEqual(response.status_code, 403)
        get_record.assert_not_called()
        update_record.assert_not_called()

    @patch("routes.airtable.update_record")
    def test_self_profile_update_cannot_change_admin_fields(self, update_record):
        record = user_record(role="Producer", all_clients=False, client_ids=["recClient"])
        self.authenticate(record)
        update_record.return_value = {
            "id": "recUser",
            "fields": {
                **record["fields"],
                C.F_USER_DISPLAY_NAME: "New Name",
                C.F_USER_AVATAR: "N",
            },
        }

        response = self.client.put("/api/auth/me", json={
            "displayName": "New Name",
            "avatar": "N",
            "role": "Admin",
            "active": False,
            "allClients": True,
            "clientIds": ["recOther"],
        })

        self.assertEqual(response.status_code, 200)
        update_fields = update_record.call_args.args[2]
        self.assertEqual(update_fields, {
            C.F_USER_DISPLAY_NAME: "New Name",
            C.F_USER_AVATAR: "N",
        })

    @patch("routes.airtable.list_records")
    def test_admin_user_can_access_users(self, list_records):
        self.authenticate(user_record(role="Admin", all_clients=True))
        list_records.return_value = {"records": [user_record(role="Admin")]}

        response = self.client.get("/api/users")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["records"][0]["role"], "Admin")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    def test_admin_user_can_create_user_with_typecast_role(self, create_record, update_record):
        self.authenticate(user_record(role="Admin", all_clients=True))
        create_record.return_value = user_record(user_id="recNew", role="Merch", pin="")
        update_record.return_value = user_record(user_id="recNew", role="Merch", pin="1234")

        response = self.client.post("/api/users", json={
            "name": "Merch User",
            "firstName": "Merch",
            "lastName": "User",
            "email": "merch@example.com",
            "role": "Merch",
            "pin": "1234",
            "allClients": False,
            "clientIds": [],
        })

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["role"], "Merch")
        self.assertTrue(create_record.call_args.kwargs["typecast"])

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    def test_non_admin_user_can_create_non_admin_user(self, create_record, update_record):
        self.authenticate(user_record(role="Producer"))
        create_record.return_value = user_record(user_id="recNew", role="Viewer", pin="")
        update_record.return_value = user_record(user_id="recNew", role="Viewer", pin="1234")

        response = self.client.post("/api/users", json={
            "name": "Viewer User",
            "firstName": "Viewer",
            "lastName": "User",
            "email": "viewer@example.com",
            "role": "Viewer",
            "pin": "1234",
            "allClients": False,
            "clientIds": [],
        })

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["role"], "Viewer")

    @patch("routes.airtable.create_record")
    def test_non_admin_user_cannot_create_admin_user(self, create_record):
        self.authenticate(user_record(role="Producer"))

        response = self.client.post("/api/users", json={
            "name": "Admin User",
            "role": "Admin",
            "pin": "1234",
        })

        self.assertEqual(response.status_code, 403)
        create_record.assert_not_called()

    @patch("routes.airtable.update_record")
    def test_admin_user_can_update_user_with_typecast_role(self, update_record):
        self.authenticate(user_record(role="Admin", all_clients=True))
        update_record.return_value = user_record(user_id="recExisting", role="User")

        response = self.client.put("/api/users/recExisting", json={
            "name": "Existing User",
            "firstName": "Existing",
            "lastName": "User",
            "email": "existing@example.com",
            "role": "User",
            "allClients": True,
            "clientIds": [],
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["role"], "User")
        self.assertTrue(update_record.call_args_list[0].kwargs["typecast"])

    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    def test_non_admin_user_can_update_non_admin_user(self, update_record, get_record):
        self.authenticate(user_record(role="Producer"))
        get_record.return_value = user_record(user_id="recExisting", role="Viewer")
        update_record.return_value = user_record(user_id="recExisting", role="User")

        response = self.client.put("/api/users/recExisting", json={
            "name": "Existing User",
            "role": "User",
            "allClients": False,
            "clientIds": [],
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["role"], "User")

    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    def test_non_admin_user_cannot_update_admin_user(self, update_record, get_record):
        self.authenticate(user_record(role="Producer"))
        get_record.return_value = user_record(user_id="recAdmin", role="Admin")

        response = self.client.put("/api/users/recAdmin", json={"name": "Changed"})

        self.assertEqual(response.status_code, 403)
        update_record.assert_not_called()

    def test_missing_authentication_no_longer_grants_all_client_access(self):
        response = self.client.get("/api/clients")

        self.assertEqual(response.status_code, 401)

    @patch("routes.airtable.list_records")
    def test_client_filtering_uses_authenticated_restricted_user(self, list_records):
        self.authenticate(user_record(all_clients=False, client_ids=["recAllowed"]))
        list_records.return_value = {
            "records": [
                {"id": "recAllowed", "fields": {C.F_CLIENT_NAME: "Allowed Client"}},
                {"id": "recDenied", "fields": {C.F_CLIENT_NAME: "Denied Client"}},
            ],
        }

        response = self.client.get("/api/clients")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([record["id"] for record in response.get_json()["records"]], ["recAllowed"])

    @patch("routes.airtable.list_records")
    def test_admin_can_request_all_clients_for_user_assignment(self, list_records):
        self.authenticate(user_record(role="Admin", all_clients=False, client_ids=["recAllowed"]))
        list_records.return_value = {
            "records": [
                {"id": "recAllowed", "fields": {C.F_CLIENT_NAME: "Allowed Client"}},
                {"id": "recOther", "fields": {C.F_CLIENT_NAME: "Other Client"}},
            ],
        }

        response = self.client.get("/api/clients?all=1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([record["id"] for record in response.get_json()["records"]], ["recAllowed", "recOther"])

    @patch("routes.airtable.list_records")
    def test_topco_client_includes_activation_readiness_profile(self, list_records):
        self.authenticate(user_record(role="Admin", all_clients=True))
        list_records.return_value = {
            "records": [
                {"id": "recTopco", "fields": {C.F_CLIENT_NAME: "Topco", C.F_CLIENT_ACTIVE: True}},
                {"id": "recOther", "fields": {C.F_CLIENT_NAME: "Other Client", C.F_CLIENT_ACTIVE: True}},
            ],
        }

        response = self.client.get("/api/clients")

        self.assertEqual(response.status_code, 200)
        records = {record["name"]: record for record in response.get_json()["records"]}
        profile = records["Topco"]["readinessProfile"]
        self.assertEqual(profile["mode"], "activation_driven")
        self.assertEqual(profile["matchingTarget"], "Activation row linked to received Merchandise")
        self.assertIn("Activation confirmed", profile["readyForPhotoRequires"])
        self.assertIn("Activation row linked", profile["readyForPhotoRequires"])
        self.assertEqual(profile["sources"][0]["label"], "Activation Package")
        self.assertEqual(profile["pathPrefixes"]["artwork"], "smb://gfs-marks/Topco/_CGI/03 PROJECTS/")
        self.assertEqual(profile["pathPrefixes"]["upload"], "smb://gfs-marks/Topco/")
        self.assertIn("CVID", profile["deliverables"]["Ecomm"]["requiredFields"])
        self.assertIn("Coordinator Description", profile["deliverables"]["Packaging"]["requiredFields"])
        self.assertIn("Quantity received", profile["notRequiredFromActivation"])
        self.assertIsNone(records["Other Client"]["readinessProfile"])

    @patch("routes.airtable.list_records")
    def test_list_activations_filters_by_client_access(self, list_records):
        self.authenticate(user_record(role="PM", all_clients=False, client_ids=["recTopco"]))
        list_records.return_value = {
            "records": [
                {"id": "recActivation1", "fields": {C.F_ACTIVATION_NAME: "Topco Melons", C.F_ACTIVATION_CLIENT: ["recTopco"]}},
                {"id": "recActivation2", "fields": {C.F_ACTIVATION_NAME: "Other", C.F_ACTIVATION_CLIENT: ["recOther"]}},
            ],
        }

        response = self.client.get("/api/activations")

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        self.assertEqual([record["id"] for record in records], ["recActivation1"])
        self.assertEqual(records[0]["status"], "Draft")

    @patch("routes.airtable.create_record")
    def test_create_activation_writes_topco_activation_fields(self, create_record):
        self.authenticate(user_record(role="PM", all_clients=False, client_ids=["recTopco"]))
        create_record.return_value = {
            "id": "recActivation",
            "fields": {
                C.F_ACTIVATION_NAME: "New Topco eComm Activation",
                C.F_ACTIVATION_CLIENT: ["recTopco"],
                C.F_ACTIVATION_STATUS: "Draft",
                C.F_ACTIVATION_PROJECT_REFERENCE: "26003302 / MI001868",
                C.F_ACTIVATION_PACKAGE: "Project readiness package",
                C.F_ACTIVATION_SKU_DETAILS_JSON: '[{"upc":"036800029804","cvid":"036800029804EGPA022600"}]',
                C.F_ACTIVATION_DELIVERABLES: ["Ecomm"],
            },
        }

        response = self.client.post("/api/activations", json={
            "clientId": "recTopco",
            "name": "New Topco eComm Activation",
            "projectReference": "26003302 / MI001868",
            "activationPackage": "eComm image bundles are needed",
            "dueUrgency": "ASAP upon receipt",
            "walnutScope": "Full set renders - WALNUT (PHOTO)",
            "numberOfSkus": 3,
            "imagesPerBundle": 9,
            "totalImages": 27,
            "artworkPath": "smb://gfs-marks/Topco/_CGI/03 PROJECTS/Fresh_Melons",
            "uploadLocation": "smb://gfs-marks/Topco/Fresh_Melons/3_IMAGES/3D",
            "skuDetails": [{"description": "Cantaloupe 1 Ea", "upc": "036800029804", "cvid": "036800029804EGPA022600"}],
            "deliverables": ["Ecomm"],
        })

        self.assertEqual(response.status_code, 201)
        create_record.assert_called_once()
        table, fields = create_record.call_args.args[:2]
        self.assertEqual(table, C.ACTIVATIONS_TABLE)
        self.assertEqual(fields[C.F_ACTIVATION_CLIENT], ["recTopco"])
        self.assertEqual(fields[C.F_ACTIVATION_DELIVERABLES], ["Ecomm"])
        self.assertEqual(fields[C.F_ACTIVATION_PROJECT_REFERENCE], "26003302 / MI001868")
        self.assertEqual(fields[C.F_ACTIVATION_PACKAGE], "eComm image bundles are needed")
        self.assertEqual(fields[C.F_ACTIVATION_NUMBER_OF_SKUS], 3)
        self.assertIn("036800029804EGPA022600", fields[C.F_ACTIVATION_SKU_DETAILS_JSON])
        self.assertEqual(response.get_json()["record"]["skuDetails"][0]["cvid"], "036800029804EGPA022600")
        self.assertEqual(response.get_json()["record"]["activationPackage"], "Project readiness package")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_update_activation_edits_activation_package(self, get_record, update_record):
        self.authenticate(user_record(role="PM", all_clients=False, client_ids=["recTopco"]))
        get_record.return_value = {
            "id": "recActivation",
            "fields": {
                C.F_ACTIVATION_NAME: "Topco Melons",
                C.F_ACTIVATION_CLIENT: ["recTopco"],
                C.F_ACTIVATION_MATCHED_MERCHANDISE: [],
                C.F_ACTIVATION_SKU_DETAILS_JSON: "[]",
            },
        }
        update_record.return_value = {
            "id": "recActivation",
            "fields": {
                C.F_ACTIVATION_NAME: "Topco Melons",
                C.F_ACTIVATION_CLIENT: ["recTopco"],
                C.F_ACTIVATION_STATUS: "Active",
                C.F_ACTIVATION_PROJECT_REFERENCE: "MI001868",
                C.F_ACTIVATION_PACKAGE: "Confirmed package",
                C.F_ACTIVATION_DELIVERABLES: ["Ecomm"],
            },
        }

        response = self.client.patch("/api/activations/recActivation", json={
            "clientId": "recTopco",
            "name": "Topco Melons",
            "status": "Active",
            "projectReference": "MI001868",
            "activationPackage": "Confirmed package",
            "deliverables": ["Ecomm"],
        })

        self.assertEqual(response.status_code, 200)
        update_record.assert_called_once()
        table, record_id, fields = update_record.call_args.args[:3]
        self.assertEqual(table, C.ACTIVATIONS_TABLE)
        self.assertEqual(record_id, "recActivation")
        self.assertEqual(fields[C.F_ACTIVATION_PACKAGE], "Confirmed package")

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_update_activation_removed_ready_merchandise_returns_to_waiting_activation(self, get_record, update_record):
        self.authenticate(user_record(role="PM", all_clients=False, client_ids=["recTopco"]))
        existing_activation = {
            "id": "recActivation",
            "fields": {
                C.F_ACTIVATION_NAME: "Topco Melons",
                C.F_ACTIVATION_CLIENT: ["recTopco"],
                C.F_ACTIVATION_STATUS: "Released",
                C.F_ACTIVATION_MATCHED_MERCHANDISE: ["recRemoved"],
                C.F_ACTIVATION_SKU_DETAILS_JSON: '[{"merchandiseId":"recRemoved","description":"Dress 1","upc":"123","cvid":"abc","structure":"Hang Tag / Label"}]',
            },
        }
        removed_merchandise = {
            "id": "recRemoved",
            "fields": {
                C.F_RECEIPT_ENTRY_NAME: "Dress 1",
                C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Ready for Photo",
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Validated",
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True,
            },
        }
        updated_activation = {
            "id": "recActivation",
            "fields": {
                **existing_activation["fields"],
                C.F_ACTIVATION_STATUS: "Draft",
                C.F_ACTIVATION_MATCHED_MERCHANDISE: [],
                C.F_ACTIVATION_SKU_DETAILS_JSON: "[]",
            },
        }
        updated_merchandise = {
            "id": "recRemoved",
            "fields": {
                **removed_merchandise["fields"],
                C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Needs Review",
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: False,
            },
        }
        get_record.side_effect = [existing_activation, removed_merchandise]
        update_record.side_effect = [updated_activation, updated_merchandise]

        response = self.client.patch("/api/activations/recActivation", json={
            "clientId": "recTopco",
            "name": "Topco Melons",
            "status": "Draft",
            "deliverables": ["Ecomm"],
            "skuDetails": [],
            "linkedMerchandiseIds": [],
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()["movedToWaiting"]), 1)
        activation_update = update_record.call_args_list[0].args[2]
        self.assertEqual(activation_update[C.F_ACTIVATION_MATCHED_MERCHANDISE], [])
        merchandise_update = update_record.call_args_list[1].args[2]
        self.assertEqual(merchandise_update[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Needs Review")
        self.assertEqual(merchandise_update[C.F_RECEIPT_ENTRY_MERCH_STATUS], "Received")
        self.assertFalse(merchandise_update[C.F_RECEIPT_ENTRY_MERCH_VERIFIED])

    @patch("routes.airtable.update_record")
    @patch("routes.airtable.get_record")
    def test_move_activation_to_photo_moves_linked_merchandise(self, get_record, update_record):
        self.authenticate(user_record(role="PM", all_clients=False, client_ids=["recTopco"]))
        activation = {
            "id": "recActivation",
            "fields": {
                C.F_ACTIVATION_NAME: "Topco Melons",
                C.F_ACTIVATION_CLIENT: ["recTopco"],
                C.F_ACTIVATION_STATUS: "Active",
                C.F_ACTIVATION_DUE_URGENCY: "ASAP upon receipt",
                C.F_ACTIVATION_WALNUT_SCOPE: "Full Set Renders - WALNUT (Photo)",
                C.F_ACTIVATION_ARTWORK_PATH: "Fresh_Melons",
                C.F_ACTIVATION_UPLOAD_LOCATION: "Fresh_Melons/3_IMAGES/3D",
                C.F_ACTIVATION_DELIVERABLES: ["Ecomm"],
                C.F_ACTIVATION_MATCHED_MERCHANDISE: ["recMerch"],
                C.F_ACTIVATION_SKU_DETAILS_JSON: '[{"merchandiseId":"recMerch","description":"Cantaloupe 1 Ea","upc":"036800029804","cvid":"036800029804EGPA022600","structure":"Hang Tag / Label"}]',
            },
        }
        merchandise = {
            "id": "recMerch",
            "fields": {
                C.F_RECEIPT_ENTRY_NAME: "Cantaloupe",
                C.F_RECEIPT_ENTRY_QUANTITY: 1,
                C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
            },
        }
        updated_merchandise = {
            "id": "recMerch",
            "fields": {
                **merchandise["fields"],
                C.F_RECEIPT_ENTRY_DELIVERABLES: ["Ecomm"],
                C.F_RECEIPT_ENTRY_INTAKE_STATUS: "Ready for Photo",
                C.F_RECEIPT_ENTRY_MERCH_VERIFIED: True,
            },
        }
        released_activation = {
            "id": "recActivation",
            "fields": {**activation["fields"], C.F_ACTIVATION_STATUS: "Released"},
        }
        get_record.side_effect = [activation, merchandise]
        update_record.side_effect = [updated_merchandise, released_activation]

        response = self.client.post("/api/activations/recActivation/move-to-photo")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["movedCount"], 1)
        merch_update = update_record.call_args_list[0].args[2]
        self.assertEqual(merch_update[C.F_RECEIPT_ENTRY_DELIVERABLES], ["Ecomm"])
        self.assertEqual(merch_update[C.F_RECEIPT_ENTRY_INTAKE_STATUS], "Ready for Photo")
        self.assertNotIn(C.F_RECEIPT_ENTRY_MERCH_STATUS, merch_update)


if __name__ == "__main__":
    unittest.main()
