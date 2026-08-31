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
        self.assertIn("1 item arrived at Walnut", text)
        # The generated shipment name repeated the Client and Received facts.
        self.assertNotIn("Topco - 2026", text)
        self.assertIn("Sauerkraut 14.5oz", text)
        urls = [action["url"] for action in card["actions"]]
        # Each item links at its own card, so the shipment record is not offered.
        self.assertEqual(urls, ["https://marks.example/planning"])

    def test_a_long_shipment_is_summarised_rather_than_dumped(self):
        items = [f"1 x Item {index}" for index in range(20)]
        text = str(self.card(items=items))
        self.assertIn("20 items arrived at Walnut", text)
        self.assertIn("and 8 more", text)
        self.assertNotIn("Item 19", text)

    def test_without_a_base_url_the_card_still_posts_without_links(self):
        notifier.C.APP_BASE_URL = ""
        card = self.card()
        self.assertNotIn("actions", card)
        self.assertIn("1 item arrived at Walnut", str(card))


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


class StudioTimeTests(unittest.TestCase):
    def test_stored_utc_is_shown_in_the_studio_clock(self):
        # Records are stored in UTC; everyone reading the card is in Chicago.
        self.assertEqual(notifier._studio_time("2026-08-31T18:11:00Z"), "Aug 31, 1:11 PM CDT")
        self.assertEqual(notifier._studio_time("2026-01-15T18:11:00Z"), "Jan 15, 12:11 PM CST")

    def test_an_unreadable_timestamp_is_passed_through(self):
        self.assertEqual(notifier._studio_time("sometime"), "sometime")
        self.assertEqual(notifier._studio_time(""), "")


class ArrivalImageTests(unittest.TestCase):
    def card(self, image_urls):
        return notifier.build_arrival_card(
            client_name="Topco", carrier="USPS", tracking="431241234", received="2026-08-31T18:11:00Z",
            items=["1 x cheese"], image_urls=image_urls,
        )["attachments"][0]["content"]

    def test_photos_are_shown_in_the_card(self):
        card = self.card(["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"])
        image_set = next(block for block in card["body"] if block["type"] == "ImageSet")
        self.assertEqual([image["url"] for image in image_set["images"]],
                         ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"])

    def test_a_long_photo_set_is_summarised(self):
        card = self.card([f"https://cdn.test/{index}.jpg" for index in range(10)])
        image_set = next(block for block in card["body"] if block["type"] == "ImageSet")
        self.assertEqual(len(image_set["images"]), 6)
        self.assertIn("and 4 more photos", str(card))

    def test_no_photos_means_no_image_block(self):
        card = self.card([])
        self.assertFalse([block for block in card["body"] if block["type"] == "ImageSet"])


class ArrivalNamingTests(unittest.TestCase):
    def test_the_matched_product_name_wins(self):
        # What the receiver read off the box finds the Product; it is not what to
        # call it once the Product is known.
        source = (Path(__file__).resolve().parents[1] / "backend" / "routes.py").read_text()
        start = source.index("def _notify_shipment_arrival(receipt, shaped_entries):")
        body = source[start:source.index("\n@api.", start)]
        self.assertIn('matched = entry.get("matchedProduct") or {}', body)
        self.assertLess(body.index('matched.get("name")'), body.index('entry.get("productName")'))
        self.assertIn('matched.get("primaryMatchKey")', body)


class ArrivalDeepLinkTests(unittest.TestCase):
    def setUp(self):
        self._base = notifier.C.APP_BASE_URL
        notifier.C.APP_BASE_URL = "https://marks.example"

    def tearDown(self):
        notifier.C.APP_BASE_URL = self._base

    def test_each_item_links_at_its_own_card(self):
        card = notifier.build_arrival_card(
            client_name="Topco", carrier="", tracking="", received="",
            items=[("1 x Raisin Bran", "recMerchA"), ("5 x Toasted Oats", "recMerchB")],
        )["attachments"][0]["content"]
        text = str(card)
        self.assertIn("[1 x Raisin Bran](https://marks.example/planning?item=recMerchA)", text)
        self.assertIn("[5 x Toasted Oats](https://marks.example/planning?item=recMerchB)", text)

    def test_a_plain_item_still_renders_without_a_link(self):
        notifier.C.APP_BASE_URL = ""
        card = notifier.build_arrival_card(
            client_name="Topco", carrier="", tracking="", received="", items=[("1 x Raisin Bran", "recMerchA")],
        )["attachments"][0]["content"]
        self.assertIn("- 1 x Raisin Bran", str(card))
        self.assertNotIn("](", str(card))

    def test_photos_are_shown_large(self):
        card = notifier.build_arrival_card(
            client_name="Topco", carrier="", tracking="", received="", items=[("1 x Raisin Bran", "recA")],
            image_urls=["https://cdn.test/a.jpg"],
        )["attachments"][0]["content"]
        image_set = next(block for block in card["body"] if block["type"] == "ImageSet")
        self.assertEqual(image_set["imageSize"], "large")
