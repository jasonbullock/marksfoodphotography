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


class StepNameTests(unittest.TestCase):
    def test_a_known_step_is_named(self):
        self.assertEqual(cf.step_name(3), "Photography")

    def test_an_unknown_step_shows_its_id_rather_than_a_guess(self):
        # A wrong word on a board is worse than a number nobody recognises.
        self.assertEqual(cf.step_name(999), "Step 999")

    def test_junk_does_not_raise(self):
        self.assertEqual(cf.step_name(None), "")


class ElapsedTests(unittest.TestCase):
    def test_it_measures_between_two_moments(self):
        self.assertEqual(
            cf._elapsed("2026-09-01T15:16:42+00:00", "2026-09-01T15:16:55+00:00"), 13)

    def test_a_step_that_has_not_finished_has_no_duration(self):
        # Rather than counting to now, which would read as work still being done
        # on something that was abandoned.
        self.assertIsNone(cf._elapsed("2026-09-01T15:16:42+00:00", ""))
        self.assertIsNone(cf._elapsed("", "2026-09-01T15:16:55+00:00"))

    def test_time_running_backwards_is_refused(self):
        self.assertIsNone(cf._elapsed("2026-09-01T15:16:55+00:00", "2026-09-01T15:16:42+00:00"))


class StepTimelineTests(unittest.TestCase):
    def timeline(self):
        return cf._step_timeline([
            {"taskId": "t1", "stepId": 3, "stepStatusId": 9000,
             "readyToStartDatetimeUtc": 1788275687000,
             "startedDatetimeUtc": 1788275802043,
             "finishedDatetimeUtc": 1788275815366},
            {"taskId": "t2", "stepId": 4, "stepStatusId": 2000,
             "readyToStartDatetimeUtc": 1788275815812},
        ])

    def test_waiting_and_working_are_kept_apart(self):
        # One is a queue and the other is the work; a single "time in step" hides
        # which of the two is the problem.
        first = self.timeline()[0]
        self.assertEqual(first["waitedSeconds"], 115)
        self.assertEqual(first["workedSeconds"], 13)

    def test_a_running_step_reports_no_duration_yet(self):
        second = self.timeline()[1]
        self.assertIsNone(second["workedSeconds"])
        self.assertEqual(second["finishedAt"], "")

    def test_steps_are_named(self):
        self.assertEqual([step["step"] for step in self.timeline()],
                         ["Photography", "Final Selection"])

    def test_no_steps_is_an_empty_timeline_not_a_crash(self):
        self.assertEqual(cf._step_timeline(None), [])


class PagingTests(unittest.TestCase):
    def test_it_stops_on_a_short_page(self):
        pages = [{"pageData": [1] * 100}, {"pageData": [1] * 7}]
        with patch("creative_force_api.get", side_effect=pages) as get:
            rows = cf._pages("products", page_size=100)
        self.assertEqual(len(rows), 107)
        self.assertEqual(get.call_count, 2)

    def test_it_stops_at_the_limit_rather_than_walking_the_studio(self):
        with patch("creative_force_api.get", return_value={"pageData": [1] * 100}):
            rows = cf._pages("products", page_size=100, limit=250)
        self.assertEqual(len(rows), 250)

    def test_an_empty_first_page_is_not_an_error(self):
        with patch("creative_force_api.get", return_value={"pageData": []}):
            self.assertEqual(cf._pages("products"), [])


class ProductionTypeCacheTests(unittest.TestCase):
    def setUp(self):
        cf._production_types.update({"at": 0.0, "value": {}})
        self.addCleanup(lambda: cf._production_types.update({"at": 0.0, "value": {}}))

    def test_it_maps_ids_to_names(self):
        page = {"pageData": [{"productionTypeId": 1031, "productionTypeName": "Packaging"},
                             {"productionTypeId": 1032, "productionTypeName": "Ecomm"}]}
        with patch("creative_force_api.get", return_value=page):
            self.assertEqual(cf.production_types(), {1031: "Packaging", 1032: "Ecomm"})

    def test_studio_configuration_is_not_fetched_on_every_read(self):
        page = {"pageData": [{"productionTypeId": 1032, "productionTypeName": "Ecomm"}]}
        with patch("creative_force_api.get", return_value=page) as get:
            cf.production_types()
            cf.production_types()
        self.assertEqual(get.call_count, 1)


class SnapshotTests(unittest.TestCase):
    def test_a_missing_job_is_reported_rather_than_guessed_at(self):
        with patch("creative_force_api.job", return_value=None):
            snapshot = cf.production_snapshot()
        self.assertIsNone(snapshot["job"])
        self.assertEqual(snapshot["products"], [])

    def test_the_shoot_date_comes_from_the_step_that_finished(self):
        with patch("creative_force_api.job", return_value={"jobId": "j1", "jobCode": "Marks Food Photography"}), \
                patch("creative_force_api.production_types", return_value={1032: "Ecomm"}), \
                patch("creative_force_api.products", return_value=[{"productId": "p1", "productCode": "MP-1"}]), \
                patch("creative_force_api.work_units_for_product",
                      return_value=[{"workUnitId": "w1", "productionTypeId": 1032, "isDisabled": False}]), \
                patch("creative_force_api.work_unit", return_value={"steps": [
                    {"stepId": 3, "finishedDatetimeUtc": 1788275815366},
                    {"stepId": 4, "readyToStartDatetimeUtc": 1788275815812},
                ]}):
            snapshot = cf.production_snapshot()
        production = snapshot["products"][0]["productions"][0]
        self.assertTrue(production["shotAt"].startswith("2026-09-01T15:16:55"))
        self.assertEqual(production["currentStep"], "Final Selection")


class DerivedWorkflowTests(unittest.TestCase):
    """Creative Force spawns a derived workflow off a step of the main one."""

    def test_a_production_missing_the_opening_step_is_derived(self):
        # The delivery-only work units showed up beside the real productions
        # looking like duplicates that had never started.
        self.assertTrue(cf._is_derived([{"stepId": 14}]))

    def test_a_production_that_starts_at_the_beginning_is_not(self):
        self.assertFalse(cf._is_derived([{"stepId": 3}, {"stepId": 4}]))

    def test_no_steps_is_not_derived(self):
        self.assertFalse(cf._is_derived([]))


class StepOrderTests(unittest.TestCase):
    def test_the_workflow_order_is_not_the_id_order(self):
        # Photo Review is step 15 and runs before External Post, which is step 7.
        self.assertLess(cf.step_position(15), cf.step_position(7))

    def test_every_workflow_step_is_named(self):
        for step_id in C.CREATIVE_FORCE_STEP_SEQUENCE:
            self.assertNotIn("Step ", cf.step_name(step_id), f"step {step_id} is unnamed")

    def test_an_unknown_step_sorts_last_rather_than_first(self):
        self.assertEqual(cf.step_position(999), len(C.CREATIVE_FORCE_STEP_SEQUENCE))
