import io
import sys
import unittest
import zipfile
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from routes import _parse_spreadsheet, _parse_xlsx_xml  # noqa: E402


def sparse_xlsx_with_row_four_header():
    files = {
        "xl/workbook.xml": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
        ),
        "xl/_rels/workbook.xml.rels": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Target="xl/worksheets/sheet1.xml" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>'
            '</Relationships>'
        ),
        "xl/worksheets/sheet1.xml": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
            '<row r="1"><c r="A1" t="inlineStr"><is><t>Setup</t></is></c></row>'
            '<row r="4"><c r="A4" t="inlineStr"><is><t>Product</t></is></c>'
            '<c r="B4" t="inlineStr"><is><t>UPC</t></is></c></row>'
            '<row r="5"><c r="A5" t="inlineStr"><is><t>Milk</t></is></c>'
            '<c r="B5" t="inlineStr"><is><t>123</t></is></c></row>'
            '</sheetData></worksheet>'
        ),
    }
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as workbook:
        for name, content in files.items():
            workbook.writestr(name, content)
    return output.getvalue()


class SpreadsheetParsingTests(unittest.TestCase):
    def test_xlsx_xml_preserves_physical_blank_rows_for_header_selection(self):
        content = sparse_xlsx_with_row_four_header()

        parsed = _parse_xlsx_xml(content, header_row="4")

        self.assertEqual(parsed["headerRow"], 4)
        self.assertEqual(parsed["columnHeaders"], ["Product", "UPC"])
        self.assertEqual(parsed["rows"], [["Milk", "123"]])

    def test_automatic_header_detection_skips_setup_rows(self):
        content = sparse_xlsx_with_row_four_header()

        parsed = _parse_xlsx_xml(content)

        self.assertEqual(parsed["headerRow"], 4)
        self.assertEqual(parsed["columnHeaders"], ["Product", "UPC"])
        self.assertEqual(parsed["rows"], [["Milk", "123"]])

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

    def test_xlsx_numeric_upc_format_preserves_leading_zero(self):
        from openpyxl import Workbook

        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["Product", "UPC"])
        sheet.append(["Cantaloupe", 36800029804])
        sheet["B2"].number_format = "000000000000"
        output = io.BytesIO()
        workbook.save(output)

        parsed = _parse_spreadsheet(output.getvalue(), ".xlsx")

        self.assertEqual(parsed["columnHeaders"], ["Product", "UPC"])
        self.assertEqual(parsed["rows"][0], ["Cantaloupe", "036800029804"])


if __name__ == "__main__":
    unittest.main()
