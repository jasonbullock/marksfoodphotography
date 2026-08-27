import unittest

import backend.config as C
from backend.routes import _intake_destination_field_map, _item_fields_from_row, _shape_item


class FileNameDescriptionTests(unittest.TestCase):
    def test_the_field_is_named_for_what_it_holds(self):
        self.assertEqual(C.Config.F_ITEM_FILE_NAME_DESCRIPTION, "File Name Description")
        self.assertFalse(hasattr(C.Config, "F_ITEM_PRODUCT_DESCRIPTION"))
        # Products has no Description field and never did, so nothing could use it.
        self.assertFalse(hasattr(C.Config, "F_ITEM_DESCRIPTION"))

    def test_old_sheet_headings_still_land_on_it(self):
        # Renaming must not orphan sheets already in circulation.
        destinations = _intake_destination_field_map()
        for heading in ("File Name Description", "Product Description", "Prod Descrip"):
            self.assertEqual(
                destinations[heading],
                (C.Config.PRODUCTS_TABLE, C.Config.F_ITEM_FILE_NAME_DESCRIPTION),
                heading,
            )
        self.assertNotIn("Description", destinations)

    def test_an_import_row_writes_the_renamed_field(self):
        fields = _item_fields_from_row("recClient", {
            "itemName": "Milk",
            "id": "012345678901",
            "fileNameDescription": "milk gallon",
        })
        self.assertEqual(fields[C.Config.F_ITEM_FILE_NAME_DESCRIPTION], "milk gallon")

    def test_the_shape_reports_it_once(self):
        shaped = _shape_item({
            "id": "recItem",
            "fields": {
                C.Config.F_ITEM_NAME: "Milk",
                C.Config.F_ITEM_FILE_NAME_DESCRIPTION: "milk gallon",
            },
        })
        self.assertEqual(shaped["fileNameDescription"], "milk gallon")
        self.assertNotIn("productDescription", shaped)
