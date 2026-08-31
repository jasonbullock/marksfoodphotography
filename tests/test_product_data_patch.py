import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import routes  # noqa: E402
from config import Config as C  # noqa: E402


class ProductDataPatchTests(unittest.TestCase):
    def test_the_primary_match_key_is_written_rather_than_dropped(self):
        # A UPC typed into Product data was accepted and silently discarded, then
        # reported missing when the item tried to move to photo release.
        fields = {}
        routes._apply_item_fields(fields, {"primaryMatchKey": "9090909090234"})
        self.assertEqual(fields[C.F_ITEM_IDENTIFIER], "9090909090234")

    def test_it_is_read_back_under_the_same_name(self):
        self.assertEqual(
            routes._shape_item({"id": "recX", "fields": {C.F_ITEM_IDENTIFIER: "909"}})["primaryMatchKey"],
            "909",
        )

    def test_clearing_it_is_honoured(self):
        fields = {}
        routes._apply_item_fields(fields, {"primaryMatchKey": ""})
        self.assertEqual(fields[C.F_ITEM_IDENTIFIER], "")

    def test_every_field_the_product_data_step_can_patch_is_handled(self):
        # The editor names its patch keys in the frontend. A key this mapping does
        # not know is accepted and thrown away, which is how the UPC went missing.
        source = (ROOT / "frontend" / "src" / "App.jsx").read_text()
        block = source.split("const PHOTO_PRODUCTION_EDITABLE_FIELDS = {", 1)[1].split("};", 1)[0]
        keys = re.findall(r"patch:\s*'([^']+)'", block)
        self.assertGreater(len(keys), 5)
        for key in keys:
            fields = {}
            routes._apply_item_fields(fields, {key: "value"})
            self.assertTrue(fields, f"{key} is patched by the editor but dropped here")


if __name__ == "__main__":
    unittest.main()
