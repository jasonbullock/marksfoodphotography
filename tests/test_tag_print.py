import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import tag_print  # noqa: E402
from tag_print import build_merchandise_tag_zpl, clean  # noqa: E402


def tag(**overrides):
    base = {
        "client": "Topco",
        "productName": "CT Extra Aged Parmesan Cheese 8oz",
        "marksId": "MP-00005",
        "storage": "Rack B - Shelf 3",
        "arrival": "Aug 31 - FedEx ...666",
        "quantity": "Qty 7",
        "upc": "011225017728",
        "received": "Aug 31, 3:16 PM CDT",
        "qrUrl": "https://food.walnutcontent.com/planning?item=recABC",
    }
    base.update(overrides)
    return build_merchandise_tag_zpl(base)


class TagLayoutTests(unittest.TestCase):
    def test_the_tag_is_three_by_five_portrait(self):
        zpl = tag()
        self.assertIn("^PW609", zpl)
        self.assertIn("^LL1015", zpl)

    def test_it_carries_everything_the_shelf_needs(self):
        zpl = tag()
        self.assertIn("Topco", zpl)
        self.assertIn("CT Extra Aged Parmesan Cheese 8oz", zpl)
        self.assertIn("MP-00005", zpl)
        self.assertIn("Rack B - Shelf 3", zpl)
        self.assertIn("^BQN", zpl)   # QR to the planning card
        self.assertIn("^BCN", zpl)   # Code128 of the tag code

    def test_the_qr_opens_the_planning_card(self):
        self.assertIn("planning?item=recABC", tag())

    def test_a_tag_without_a_code_is_refused(self):
        # The code is the whole point; a tag without one identifies nothing.
        with self.assertRaises(ValueError):
            tag(marksId="")

    def test_a_missing_qr_still_prints(self):
        # A tag is useful without a scan target; it must not fail to print.
        zpl = tag(qrUrl="")
        self.assertNotIn("^BQN", zpl)
        self.assertIn("MP-00005", zpl)

    def test_a_non_http_qr_is_ignored_rather_than_encoded(self):
        self.assertNotIn("^BQN", tag(qrUrl="javascript:alert(1)"))

    def test_empty_lines_do_not_leave_gaps(self):
        zpl = tag(storage="", arrival="", quantity="", received="")
        self.assertEqual(zpl.count("^A0N,30,30"), 0)

    def test_an_unmatched_item_still_says_something(self):
        self.assertIn("Unidentified merchandise", tag(productName=""))
        self.assertIn("No client", tag(client=""))


class ZplSafetyTests(unittest.TestCase):
    def test_control_characters_cannot_break_the_format(self):
        # ZPL has no escaping worth the name, so ^ and ~ are removed outright.
        self.assertEqual(clean("Cheese ^FS ~ 8oz", 40), "Cheese FS 8oz")
        self.assertNotIn("^FS^FS", tag(productName="Cheese ^FS ~ 8oz"))

    def test_long_names_are_truncated_not_wrapped_off_the_label(self):
        long_name = "A" * 200
        zpl = tag(productName=long_name)
        self.assertIn("…", zpl)
        self.assertNotIn("A" * 100, zpl)

    def test_whitespace_is_collapsed(self):
        self.assertEqual(clean("  two   words \n here ", 40), "two words here")


class PrinterTests(unittest.TestCase):
    def test_no_host_is_reported_not_attempted(self):
        with self.assertRaises(tag_print.TagPrintError):
            tag_print.send_zpl("^XA^XZ", "")


class TagContentTests(unittest.TestCase):
    def test_the_upc_sits_under_the_code(self):
        # The number a client asks about, and often the only one on the box itself.
        zpl = tag(upc="011225017728")
        self.assertIn("011225017728", zpl)

    def test_the_received_date_is_on_the_tag(self):
        self.assertIn("Aug 31, 3:16 PM CDT", tag(received="Aug 31, 3:16 PM CDT"))

    def test_the_marks_code_is_no_longer_shouting(self):
        # It was 66pt, larger than the client name needed to be.
        zpl = tag()
        self.assertIn("^A0N,46,46^FDMP-00005", zpl)
        self.assertNotIn("^A0N,66,66", zpl)

    def test_a_missing_upc_leaves_no_gap(self):
        self.assertNotIn("^A0N,32,32", tag(upc=""))
