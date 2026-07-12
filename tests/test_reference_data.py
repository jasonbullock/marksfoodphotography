import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from routes import _item_match_score, _parse_reference_data, _reference_data_json  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
