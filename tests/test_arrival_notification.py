import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import requests


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import notifier  # noqa: E402
from config import Config as C  # noqa: E402


class ArrivalCardTests(unittest.TestCase):
    def setUp(self):
        self._base = C.APP_BASE_URL
        C.APP_BASE_URL = "https://marks.example"
        notifier.C.APP_BASE_URL = "https://marks.example"

    def tearDown(self):
        C.APP_BASE_URL = self._base
        notifier.C.APP_BASE_URL = self._base

    def card(self, **overrides):
        payload = {
            "client_name": "Topco",
            "shipment_name": "Topco - 2026-08-28",
            "shipment_id": "recShipment",
            "carrier": "UPS",
            "tracking": "1Z999",
            "received": "2026-08-28T10:00:00Z",
            "items": ["1 x Sauerkraut 14.5oz - 036800441897"],
        }
        payload.update(overrides)
        return notifier.build_arrival_card(**payload)["attachments"][0]["content"]

    def test_the_card_says_what_arrived_and_where_to_go(self):
        card = self.card()
        text = str(card)
        self.assertIn("1 item arrived", text)
        self.assertIn("Sauerkraut 14.5oz", text)
        urls = [action["url"] for action in card["actions"]]
        self.assertIn("https://marks.example/shipments?shipmentId=recShipment", urls)
        self.assertIn("https://marks.example/planning", urls)

    def test_a_long_shipment_is_summarised_rather_than_dumped(self):
        items = [f"1 x Item {index}" for index in range(20)]
        text = str(self.card(items=items))
        self.assertIn("20 items arrived", text)
        self.assertIn("and 8 more", text)
        self.assertNotIn("Item 19", text)

    def test_without_a_base_url_the_card_still_posts_without_links(self):
        notifier.C.APP_BASE_URL = ""
        card = self.card()
        self.assertNotIn("actions", card)
        self.assertIn("1 item arrived", str(card))


class ArrivalPostTests(unittest.TestCase):
    def test_no_webhook_is_not_an_error(self):
        posted, detail = notifier.post_arrival("", {})
        self.assertFalse(posted)
        self.assertIn("No Teams webhook", detail)

    def test_an_unreachable_channel_does_not_raise(self):
        # Receiving has already recorded the goods; Teams must not fail the request.
        with patch("notifier.requests.post", side_effect=requests.ConnectionError("down")):
            posted, detail = notifier.post_arrival("https://example.test/hook", {})
        self.assertFalse(posted)
        self.assertIn("Could not reach Teams", detail)

    def test_a_rejected_post_is_reported_not_raised(self):
        class Response:
            status_code = 403

        with patch("notifier.requests.post", return_value=Response()):
            posted, detail = notifier.post_arrival("https://example.test/hook", {})
        self.assertFalse(posted)
        self.assertIn("403", detail)

    def test_a_good_post_reports_success(self):
        class Response:
            status_code = 202

        with patch("notifier.requests.post", return_value=Response()) as post:
            posted, _ = notifier.post_arrival("https://example.test/hook", {"type": "message"})
        self.assertTrue(posted)
        self.assertEqual(post.call_args.kwargs["json"], {"type": "message"})


class WebhookIsNotExposedTests(unittest.TestCase):
    def test_the_client_shape_reports_only_whether_one_is_set(self):
        from routes import _shape_client

        shaped = _shape_client({"id": "recClient", "fields": {
            C.F_CLIENT_NAME: "Topco",
            C.F_CLIENT_TEAMS_WEBHOOK: "https://example.test/secret-hook",
        }})
        self.assertTrue(shaped["teamsWebhookConfigured"])
        # Holding the URL is enough to post to the channel, so it stays server-side.
        self.assertNotIn("secret-hook", str(shaped))


class FinishSessionTests(unittest.TestCase):
    def test_finishing_a_session_notifies(self):
        # Saving item by item leaves no moment the server can call the delivery
        # complete, so the phone says when it is done.
        source = (Path(__file__).resolve().parents[1] / "backend" / "routes.py").read_text()
        start = source.index("def finish_receiving_session(record_id):")
        body = source[start:source.index("@api.", start)]
        self.assertIn("_notify_shipment_arrival(record, shaped_entries)", body)
        self.assertIn("_receipt_client_permitted", body)
