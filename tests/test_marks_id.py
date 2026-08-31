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
    def test_each_workstream_gets_its_own_code(self):
        # Creative Force recovers a card by Product Code and needs exactly one
        # match, so two work units off one box cannot share a code.
        self.assertEqual(creative_force_product_code("MP-00412", "Ecomm"), "MP-00412-E")
        self.assertEqual(creative_force_product_code("MP-00412", "Packaging"), "MP-00412-P")
        self.assertNotEqual(
            creative_force_product_code("MP-00412", "Ecomm"),
            creative_force_product_code("MP-00412", "Packaging"),
        )

    def test_the_printed_code_is_the_bare_box_code(self):
        # One label serves the box however many workstreams come off it.
        self.assertEqual(marks_id_from_number(412), "MP-00412")

    def test_an_unknown_workstream_is_left_unsuffixed(self):
        self.assertEqual(creative_force_product_code("MP-00412", ""), "MP-00412")

    def test_no_code_means_no_product_code(self):
        self.assertEqual(creative_force_product_code("", "Ecomm"), "")
