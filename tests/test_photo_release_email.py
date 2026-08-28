import os
import sys
import unittest
from pathlib import Path
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


class NothingIsSentFromHereTests(unittest.TestCase):
    def test_the_mailer_cannot_send(self):
        # Automated sending needed Microsoft Graph, and the tenant admin consent
        # that requires was declined. The release is handed to the person instead.
        self.assertFalse(hasattr(mailer, "send_photo_release_email"))
        self.assertFalse(hasattr(Config, "photo_release_email_ready"))
        for removed in ("MS_GRAPH_TENANT_ID", "MS_GRAPH_CLIENT_ID", "MS_GRAPH_CLIENT_SECRET"):
            self.assertFalse(hasattr(Config, removed), removed)
        source = Path(mailer.__file__).read_text(encoding="utf-8")
        for gone in ("graph.microsoft", "microsoftonline", "requests"):
            self.assertNotIn(gone, source, gone)


class MoveResponseTests(unittest.TestCase):
    def test_release_returns_the_email_even_when_it_is_not_sent(self):
        # The board needs subject, body and recipients to hand the release to
        # the user's own mail client.
        import routes
        source = open(routes.__file__, encoding="utf-8").read()
        self.assertIn('"emailSent": False,', source)
        self.assertIn('"email": {', source)
        self.assertIn('"recipients": recipients,', source)


if __name__ == "__main__":
    unittest.main()
