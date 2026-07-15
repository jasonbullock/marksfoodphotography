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


if __name__ == "__main__":
    unittest.main()
