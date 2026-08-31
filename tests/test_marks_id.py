import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from routes import creative_force_product_code, marks_id_from_number  # noqa: E402


class MarksIdTests(unittest.TestCase):
    def test_the_sequence_reads_as_a_tag_code(self):
        self.assertEqual(marks_id_from_number(412), "MP-00412")
        self.assertEqual(marks_id_from_number("7"), "MP-00007")
        self.assertEqual(marks_id_from_number(123456), "MP-123456")

    def test_no_sequence_yields_no_code(self):
        # A record predating the field has no tag and must not invent one.
        for empty in ("", None, 0, "abc"):
            self.assertEqual(marks_id_from_number(empty), "", repr(empty))


class CreativeForceProductCodeTests(unittest.TestCase):
    def test_the_code_creative_force_gets_is_the_code_on_the_tag(self):
        # Suffixes meant a scanned tag found nothing in Creative Force, and CF
        # already asks which workstream you mean when a code covers both.
        self.assertEqual(creative_force_product_code("MP-00412", "Ecomm"), "MP-00412")
        self.assertEqual(creative_force_product_code("MP-00412", "Packaging"), "MP-00412")
        self.assertEqual(creative_force_product_code("MP-00412"), "MP-00412")

    def test_no_code_means_no_product_code(self):
        self.assertEqual(creative_force_product_code("", "Ecomm"), "")


class WebhookAttributionTests(unittest.TestCase):
    def test_a_card_reports_the_code_it_was_handed_to_creative_force_under(self):
        # This read the client's productCodeField, which is what the feed carried
        # before the Marks code existed - so it compared a UPC against an MP code.
        from unittest.mock import patch

        import routes
        from config import Config as C

        card = {"id": "recCard", "fields": {
            C.F_WORKSTREAM_CARD_RECEIVED_MERCH: ["recMerch"],
            C.F_WORKSTREAM_CARD_TYPE: "Ecomm",
        }}
        merch = {"id": "recMerch", "fields": {C.F_RECEIPT_ENTRY_MARKS_NUMBER: 16}}
        with patch("routes.airtable.get_record", return_value=merch):
            self.assertEqual(routes._creative_force_product_code_for_card(card), "MP-00016")

    def test_two_cards_on_one_box_report_the_same_code(self):
        # Which is why the webhook has to tell them apart by production type.
        code = marks_id_from_number(16)
        self.assertEqual(
            creative_force_product_code(code, "Ecomm"),
            creative_force_product_code(code, "Packaging"),
        )
