import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import creative_force_api as cf  # noqa: E402
from config import Config as C  # noqa: E402


NOT_JSON = object()


class Response:
    def __init__(self, status_code=200, payload=None, text="body"):
        self.status_code = status_code
        self._payload = {} if payload is None else payload
        self.text = text

    def json(self):
        if self._payload is NOT_JSON:
            raise ValueError("no json")
        return self._payload


class ConfigurationTests(unittest.TestCase):
    def setUp(self):
        cf.reset_token()

    def test_without_credentials_it_says_so_rather_than_failing_obscurely(self):
        # Callers treat this as "fall back to what we already store".
        with patch.object(C, "CREATIVE_FORCE_CLIENT_ID", ""), \
                patch.object(C, "CREATIVE_FORCE_CLIENT_SECRET", ""):
            self.assertFalse(cf.configured())
            with self.assertRaises(cf.CreativeForceNotConfigured):
                cf.access_token()


class TokenTests(unittest.TestCase):
    def setUp(self):
        cf.reset_token()
        self.creds = [
            patch.object(C, "CREATIVE_FORCE_CLIENT_ID", "id"),
            patch.object(C, "CREATIVE_FORCE_CLIENT_SECRET", "secret"),
        ]
        for item in self.creds:
            item.start()
            self.addCleanup(item.stop)
        self.addCleanup(cf.reset_token)

    def test_it_asks_for_client_credentials_with_the_gateway_scope(self):
        with patch("creative_force_api.requests.post",
                   return_value=Response(payload={"access_token": "tok", "expires_in": 3600})) as post:
            self.assertEqual(cf.access_token(), "tok")
        body = post.call_args.kwargs["data"]
        self.assertEqual(body["grant_type"], "client_credentials")
        self.assertEqual(body["scope"], "cfgateway")

    def test_the_token_is_reused_rather_than_fetched_per_call(self):
        with patch("creative_force_api.requests.post",
                   return_value=Response(payload={"access_token": "tok", "expires_in": 3600})) as post:
            cf.access_token()
            cf.access_token()
        self.assertEqual(post.call_count, 1)

    def test_a_nearly_expired_token_is_renewed_early(self):
        # Renewing on the exact second loses races with calls already in flight.
        with patch("creative_force_api.requests.post",
                   return_value=Response(payload={"access_token": "tok", "expires_in": 30})) as post:
            cf.access_token()
            cf.access_token()
        self.assertEqual(post.call_count, 2)

    def test_a_refused_credential_does_not_echo_the_request_back(self):
        # A failed token response can quote the request, and the secret is in it.
        with patch("creative_force_api.requests.post",
                   return_value=Response(status_code=401, text="client_secret=hunter2")):
            with self.assertRaises(cf.CreativeForceError) as caught:
                cf.access_token()
        self.assertNotIn("hunter2", str(caught.exception))

    def test_a_response_with_no_token_is_an_error_not_an_empty_bearer(self):
        with patch("creative_force_api.requests.post", return_value=Response(payload={})):
            with self.assertRaises(cf.CreativeForceError):
                cf.access_token()


class GetTests(unittest.TestCase):
    def setUp(self):
        cf.reset_token()
        for item in [
            patch.object(C, "CREATIVE_FORCE_CLIENT_ID", "id"),
            patch.object(C, "CREATIVE_FORCE_CLIENT_SECRET", "secret"),
            patch("creative_force_api.requests.post",
                  return_value=Response(payload={"access_token": "tok", "expires_in": 3600})),
        ]:
            item.start()
            self.addCleanup(item.stop)
        self.addCleanup(cf.reset_token)

    def test_it_sends_the_token_as_a_bearer(self):
        with patch("creative_force_api.requests.get", return_value=Response(payload={"ok": True})) as get:
            cf.get("productions")
        self.assertEqual(get.call_args.kwargs["headers"]["Authorization"], "Bearer tok")

    def test_a_rejected_token_is_retried_once_with_a_fresh_one(self):
        # It may have been revoked, which is not the same as bad credentials.
        responses = [Response(status_code=401), Response(payload={"ok": True})]
        with patch("creative_force_api.requests.get", side_effect=responses) as get:
            self.assertEqual(cf.get("productions"), {"ok": True})
        self.assertEqual(get.call_count, 2)

    def test_it_does_not_retry_forever(self):
        with patch("creative_force_api.requests.get", return_value=Response(status_code=401)) as get:
            with self.assertRaises(cf.CreativeForceError):
                cf.get("productions")
        self.assertEqual(get.call_count, 2)

    def test_a_rate_limit_says_what_happened(self):
        with patch("creative_force_api.requests.get", return_value=Response(status_code=429)):
            with self.assertRaises(cf.CreativeForceError) as caught:
                cf.get("productions")
        self.assertIn("rate limit", str(caught.exception).lower())

    def test_a_non_json_body_is_an_error_not_a_crash(self):
        with patch("creative_force_api.requests.get", return_value=Response(payload=NOT_JSON)):
            with self.assertRaises(cf.CreativeForceError):
                cf.get("productions")


class TimestampTests(unittest.TestCase):
    """The gateway speaks Unix milliseconds; everything here speaks ISO."""

    def test_milliseconds_become_iso(self):
        self.assertEqual(cf.to_iso(1788275815000), "2026-09-01T15:16:55+00:00")

    def test_a_missing_or_junk_timestamp_is_empty_rather_than_1970(self):
        for value in (None, "", 0, -1, "soon"):
            self.assertEqual(cf.to_iso(value), "")

    def test_iso_becomes_milliseconds(self):
        self.assertEqual(cf.to_millis("2026-09-01T15:16:55+00:00"), 1788275815000)

    def test_a_naive_timestamp_is_read_as_utc(self):
        self.assertEqual(
            cf.to_millis(datetime(2026, 9, 1, 15, 16, 55)),
            cf.to_millis(datetime(2026, 9, 1, 15, 16, 55, tzinfo=timezone.utc)),
        )

    def test_an_unparseable_date_is_none_rather_than_now(self):
        self.assertIsNone(cf.to_millis("whenever"))


if __name__ == "__main__":
    unittest.main()
