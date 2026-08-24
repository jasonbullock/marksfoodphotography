import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import Config as C  # noqa: E402
from routes import (  # noqa: E402
    _item_fields_from_row,
    _item_match_score,
    _parse_reference_data,
    _reference_data_json,
    build_source_snapshot,
    merge_product_source_snapshot,
)


class ReferenceDataTests(unittest.TestCase):
    def test_blank_reference_data_is_empty(self):
        self.assertEqual(_parse_reference_data(""), {})
        self.assertEqual(_parse_reference_data(None), {})

    def test_reference_data_preserves_string_values_and_skips_blanks(self):
        raw = '{"GAR": "10293847", "Brand Family": "Smithfield Premium", "Blank": ""}'
        self.assertEqual(_parse_reference_data(raw), {
            "GAR": "10293847",
            "Brand Family": "Smithfield Premium",
        })

    def test_reference_data_json_ignores_blank_values(self):
        self.assertEqual(
            _reference_data_json({"GAR": "10293847", "Blank": ""}),
            '{"GAR": "10293847"}',
        )

    def test_reference_data_json_preserves_source_snapshot_metadata(self):
        self.assertEqual(
            _reference_data_json({
                "_sourceSnapshot": {
                    "client": "Topco",
                    "sourceRowNumber": 12,
                    "sourceIdentity": {"productName": "Topcare Dental Guard", "upc": "36800410305"},
                }
            }),
            '{"_sourceSnapshot": {"client": "Topco", "sourceIdentity": {"productName": "Topcare Dental Guard", "upc": "36800410305"}, "sourceRowNumber": 12}}',
        )

    def test_malformed_reference_data_returns_safe_fallback(self):
        self.assertEqual(_parse_reference_data("not-json"), {"Raw": "not-json"})

    def test_item_search_matches_reference_data_values(self):
        item = {
            "identifier": "",
            "name": "",
            "product": "",
            "brand": "",
            "referenceData": {"GAR": "10293847"},
        }
        self.assertGreater(_item_match_score(item, "10293847"), 0)

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    def test_build_source_snapshot_uses_topco_source_identity(self, _now):
        snapshot = build_source_snapshot(
            {
                "client": "Topco",
                "sourceData": {"Product Name": "Topcare Dental Guard", "UPC": "36800410305"},
                "rowNumber": 12,
            },
            match_method="Import",
            actionable_reason="import_commit",
        )

        self.assertEqual(snapshot, {
            "client": "Topco",
            "source": "TOPCO (MARKS) PROJECTS",
            "sheetTab": "Master Tracker 2026",
            "sourceRowNumber": 12,
            "sourceCheckedAt": "2026-08-18T12:00:00Z",
            "matchMethod": "Import",
            "actionableReason": "import_commit",
            "sourceIdentity": {
                "productName": "Topcare Dental Guard",
                "upc": "36800410305",
            },
        })

    def test_merge_product_source_snapshot_preserves_existing_reference_data(self):
        merged = merge_product_source_snapshot(
            {"GAR": "10293847"},
            {
                "client": "Topco",
                "source": "TOPCO (MARKS) PROJECTS",
                "sheetTab": "Master Tracker 2026",
                "sourceRowNumber": 12,
                "sourceCheckedAt": "2026-08-18T12:00:00Z",
                "matchMethod": "Import",
                "actionableReason": "import_commit",
                "sourceIdentity": {"productName": "Topcare Dental Guard", "upc": "36800410305"},
            },
        )

        self.assertEqual(merged["GAR"], "10293847")
        self.assertEqual(merged["_sourceSnapshot"]["sourceRowNumber"], 12)
        self.assertEqual(merged["_sourceSnapshot"]["sourceIdentity"]["upc"], "36800410305")

    def test_item_fields_from_row_writes_source_snapshot_inside_reference_data(self):
        fields = _item_fields_from_row("recClient", {
            "itemName": "Topcare Dental Guard",
            "id": "36800410305",
            "referenceData": {"Product Name": "Topcare Dental Guard", "UPC": "36800410305"},
            "sourceSnapshot": {
                "client": "Topco",
                "source": "TOPCO (MARKS) PROJECTS",
                "sheetTab": "Master Tracker 2026",
                "sourceRowNumber": 12,
                "sourceCheckedAt": "2026-08-18T12:00:00Z",
                "matchMethod": "Import",
                "actionableReason": "import_commit",
                "sourceIdentity": {"productName": "Topcare Dental Guard", "upc": "36800410305"},
            },
        })

        reference_data = _parse_reference_data(fields[C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["Product Name"], "Topcare Dental Guard")
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceRowNumber"], 12)
        self.assertEqual(reference_data["_sourceSnapshot"]["actionableReason"], "import_commit")


if __name__ == "__main__":
    unittest.main()
