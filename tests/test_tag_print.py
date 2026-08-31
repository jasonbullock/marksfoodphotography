import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import tag_print  # noqa: E402
from tag_print import build_merchandise_tag_zpl, clean  # noqa: E402


QR_URL = "https://food.walnutcontent.com/planning?item=recICWs1QZBsw2JiO"


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

    def test_nothing_overlaps_down_the_label(self):
        # The QR grows with its data, so every position below it is measured from
        # the code's real size rather than from an assumed one.
        layout = tag_print.tag_layout(QR_URL)
        self.assertLess(layout["qrTop"] + layout["qrReserved"], layout["codeTop"])
        self.assertLess(layout["codeTop"] + tag_print.CODE_TEXT, layout["upcTop"])
        self.assertLess(layout["upcTop"] + tag_print.UPC_TEXT, layout["barcodeTop"])
        self.assertLess(layout["barcodeTop"] + tag_print.BARCODE_HEIGHT, layout["footerTop"])

    def test_the_symbols_stay_apart(self):
        layout = tag_print.tag_layout(QR_URL)
        gap = layout["barcodeTop"] - (layout["qrTop"] + layout["qrReserved"])
        self.assertGreater(gap / 203, 0.75)

    def test_the_marks_code_is_no_longer_shouting(self):
        # It was 66pt, larger than the client name needed to be.
        zpl = tag()
        self.assertIn("^A0N,46,46^FDMP-00005", zpl)
        self.assertNotIn("^A0N,66,66", zpl)

    def test_a_missing_upc_leaves_no_gap(self):
        self.assertNotIn("^A0N,32,32", tag(upc=""))


class TagFitsTests(unittest.TestCase):
    def test_the_shot_line_does_not_land_on_the_footer(self):
        # Four footer rows plus a hand-written line is the tightest the foot gets.
        layout = tag_print.tag_layout(QR_URL)
        last_footer_bottom = (
            layout["footerTop"] + (3 * tag_print.FOOTER_LINE_HEIGHT) + tag_print.FOOTER_TEXT
        )
        self.assertLess(last_footer_bottom, layout["shotTop"])

    def test_everything_fits_on_the_label(self):
        self.assertLess(tag_print.tag_layout(QR_URL)["bottom"], tag_print.LABEL_HEIGHT_DOTS)

    def test_the_footer_is_labelled(self):
        zpl = tag(received="Aug 31, 3:16 PM CDT", storage="Rack B")
        self.assertIn("Received: Aug 31, 3:16 PM CDT", zpl)
        self.assertIn("Storage: Rack B", zpl)

    def test_there_is_somewhere_to_write_the_shot_date(self):
        # Only known once the shoot happens, and nobody reprints a tag for it.
        self.assertIn("^FDShot^FS", tag())


class TagSpacingTests(unittest.TestCase):
    def check_no_overlap(self, qr_url):
        t = tag_print
        layout = t.tag_layout(qr_url)
        blocks = [
            ("name", t.NAME_TOP, t.NAME_BOTTOM),
            ("qr", layout["qrTop"], layout["qrTop"] + layout["qrReserved"]),
            ("code", layout["codeTop"], layout["codeTop"] + t.CODE_TEXT),
            ("upc", layout["upcTop"], layout["upcTop"] + t.UPC_TEXT),
            ("barcode", layout["barcodeTop"], layout["barcodeTop"] + t.BARCODE_HEIGHT),
            ("footer", layout["footerTop"], layout["footerTop"] + t.FOOTER_LINES * t.FOOTER_LINE_HEIGHT),
            ("shot", layout["shotTop"], layout["bottom"]),
        ]
        for (above, _, above_bottom), (below, below_top, _) in zip(blocks, blocks[1:]):
            self.assertLessEqual(above_bottom, below_top, f"{above} runs into {below} for {qr_url!r}")
        self.assertLess(blocks[-1][2], t.LABEL_HEIGHT_DOTS, f"tag overflows for {qr_url!r}")

    def test_no_block_starts_before_the_one_above_it_ends(self):
        self.check_no_overlap(QR_URL)

    def test_a_longer_link_pushes_the_layout_down_rather_than_into_the_code(self):
        # A longer host or a longer record id makes the printer draw a bigger code.
        for length in range(20, 300, 17):
            self.check_no_overlap("https://example.com/planning?item=" + ("r" * length))

    def test_a_tag_with_no_link_closes_the_gap(self):
        layout = tag_print.tag_layout("")
        self.assertEqual(layout["qrReserved"], 0)
        self.assertEqual(layout["codeTop"], tag_print.QR_TOP)

    def test_the_two_symbols_stay_an_inch_apart(self):
        layout = tag_print.tag_layout(QR_URL)
        gap = layout["barcodeTop"] - (layout["qrTop"] + layout["qrReserved"])
        self.assertGreaterEqual(gap / 203, 0.85)


class QrSizeTests(unittest.TestCase):
    """The printer draws at high correction whatever the field data asks for."""

    def test_more_space_is_reserved_than_the_capacity_table_calls_for(self):
        # Two printed tags came back with codes larger than the table predicted, the
        # second still landing on the Marks number. The estimate is a floor now, with
        # two versions of headroom on top.
        self.assertEqual(tag_print.qr_modules_for(QR_URL), 45 + tag_print.QR_VERSION_HEADROOM_MODULES)

    def test_the_code_grows_in_steps_as_the_data_does(self):
        sizes = [tag_print.qr_modules_for("x" * length) for length in (10, 40, 90, 200)]
        self.assertEqual(sizes, sorted(sizes))
        self.assertLess(sizes[0], sizes[-1])

    def test_high_correction_is_asked_for_where_the_printer_will_read_it(self):
        # In the barcode parameters and in the field data, so what is drawn matches
        # what was reserved either way the firmware reads it.
        zpl = tag()
        self.assertIn("^BQN,2,5,H^FDHA,", zpl)

    def test_data_beyond_the_table_still_produces_a_layout(self):
        self.assertLess(tag_print.tag_layout("x" * 5000)["bottom"], tag_print.LABEL_HEIGHT_DOTS)

    def test_a_code_too_fine_to_scan_is_left_off_rather_than_printed(self):
        # A tag with no QR still prints; one carrying an unreadable code does not
        # help anyone and costs the space the rest of the tag needs.
        self.assertEqual(tag_print.tag_layout("x" * 100000)["magnification"], 0)
