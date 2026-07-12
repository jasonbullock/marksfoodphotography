import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from routes import _parse_spreadsheet  # noqa: E402


class SpreadsheetParsingTests(unittest.TestCase):
    def test_xls_extension_can_contain_xlsx_bytes(self):
        workbook = Path(__file__).resolve().parents[1] / "test-data" / "imports" / "Kroger Test.xlsx"

        parsed = _parse_spreadsheet(workbook.read_bytes(), ".xls")

        self.assertEqual(parsed["rowCount"], 18)
        self.assertEqual(parsed["columnHeaders"][:5], ["Job #", "Description", "UPC", "Brand", "Product Received"])

    def test_xls_extension_can_contain_tab_delimited_text(self):
        content = (
            "Job #\tDescription\tUPC\n"
            "8123456\tSummer Dairy Refresh\t036800123401\n"
            "8123457\tPlant Based Beverages\t036800223408\n"
        ).encode("utf-8")

        parsed = _parse_spreadsheet(content, ".xls")

        self.assertEqual(parsed["rowCount"], 2)
        self.assertEqual(parsed["columnHeaders"], ["Job #", "Description", "UPC"])
        self.assertEqual(parsed["rows"][0], ["8123456", "Summer Dairy Refresh", "036800123401"])


if __name__ == "__main__":
    unittest.main()
