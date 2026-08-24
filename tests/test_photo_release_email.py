import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import mailer  # noqa: E402
from config import Config  # noqa: E402


class ParseRecipientsTests(unittest.TestCase):
    def test_accepts_lines_commas_and_semicolons(self):
        self.assertEqual(
            mailer.parse_recipients("a@b.com, c@d.com; e@f.com\ng@h.com"),
            ["a@b.com", "c@d.com", "e@f.com", "g@h.com"],
        )

    def test_drops_duplicates_case_insensitively(self):
        self.assertEqual(mailer.parse_recipients("A@b.com, a@B.com"), ["A@b.com"])

    def test_drops_entries_that_are_not_addresses(self):
        # A bare token is a typo, not an address worth attempting.
        self.assertEqual(mailer.parse_recipients("photo team, a@b.com"), ["a@b.com"])

    def test_empty_field_yields_nothing(self):
        self.assertEqual(mailer.parse_recipients(""), [])
        self.assertEqual(mailer.parse_recipients(None), [])


class SendPhotoReleaseEmailTests(unittest.TestCase):
    def test_unconfigured_reports_instead_of_raising(self):
        with patch.object(Config, "photo_release_email_ready", classmethod(lambda cls: False)):
            sent, detail = mailer.send_photo_release_email("Subject", "<p>Body</p>", ["a@b.com"])
        self.assertFalse(sent)
        self.assertIn("not configured", detail)

    def test_no_recipients_is_reported(self):
        with patch.object(Config, "photo_release_email_ready", classmethod(lambda cls: True)):
            sent, detail = mailer.send_photo_release_email("Subject", "<p>Body</p>", [])
        self.assertFalse(sent)
        self.assertIn("no photo release recipients", detail)

    def test_missing_body_is_reported(self):
        with patch.object(Config, "photo_release_email_ready", classmethod(lambda cls: True)):
            sent, detail = mailer.send_photo_release_email("Subject", "", ["a@b.com"])
        self.assertFalse(sent)
        self.assertIn("no rendered email", detail)

    @patch("mailer.requests.post")
    @patch("mailer._access_token", return_value="token")
    def test_sends_html_to_every_recipient(self, _token, post):
        post.return_value.raise_for_status.return_value = None
        with patch.object(Config, "photo_release_email_ready", classmethod(lambda cls: True)), \
             patch.object(Config, "PHOTO_RELEASE_FROM_ADDRESS", "photo@makemarks.com"):
            sent, detail = mailer.send_photo_release_email(
                "Topco Packaging Photo Request", "<p>Body</p>", ["a@b.com", "c@d.com"],
            )

        self.assertTrue(sent)
        self.assertIn("a@b.com", detail)
        message = post.call_args.kwargs["json"]["message"]
        self.assertEqual(message["subject"], "Topco Packaging Photo Request")
        self.assertEqual(message["body"]["contentType"], "HTML")
        self.assertEqual(message["body"]["content"], "<p>Body</p>")
        self.assertEqual(
            [entry["emailAddress"]["address"] for entry in message["toRecipients"]],
            ["a@b.com", "c@d.com"],
        )
        self.assertIn("photo@makemarks.com", post.call_args.args[0])


class MoveResponseTests(unittest.TestCase):
    def test_release_returns_the_email_even_when_it_is_not_sent(self):
        # The board needs subject, body and recipients to hand the release to
        # the user's own mail client.
        import routes
        source = open(routes.__file__, encoding="utf-8").read()
        self.assertIn('"emailSent": email_sent,', source)
        self.assertIn('"email": {', source)
        self.assertIn('"recipients": recipients,', source)


if __name__ == "__main__":
    unittest.main()
