import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import file_name_description as fnd  # noqa: E402


class SanitiseTests(unittest.TestCase):
    """The value lands inside a delivered file name and a URL."""

    def test_characters_that_break_a_path_are_removed(self):
        self.assertEqual(fnd.sanitise('Vegan/Mayo: "best"?'), "Vegan Mayo best")

    def test_characters_that_break_a_url_are_removed(self):
        self.assertEqual(fnd.sanitise("Salsa #1 & Chips 100%"), "Salsa 1 Chips 100")

    def test_accents_become_plain_letters_rather_than_disappearing(self):
        self.assertEqual(fnd.sanitise("Jalapeño Crème"), "Jalapeno Creme")

    def test_spaces_and_commas_survive(self):
        # The tracker is full of them and the delivered names already carry them.
        self.assertEqual(fnd.sanitise("California Blend Broc, Caul, Car"),
                         "California Blend Broc, Caul, Car")

    def test_a_leading_dot_cannot_make_a_hidden_file(self):
        self.assertEqual(fnd.sanitise(".hidden"), "hidden")
        self.assertEqual(fnd.sanitise("trailing."), "trailing")

    def test_it_is_capped_on_a_word_boundary(self):
        long_name = "Extremely Long Product Description That Simply Keeps Going And Going"
        result = fnd.sanitise(long_name)
        self.assertLessEqual(len(result), fnd.MAX_LENGTH)
        self.assertTrue(long_name.startswith(result))
        self.assertFalse(result.endswith(" "))

    def test_newlines_and_tabs_do_not_survive(self):
        self.assertEqual(fnd.sanitise("Vegan\tMayo\nSpread"), "Vegan Mayo Spread")


class SuggestTests(unittest.TestCase):
    """Measured against what people actually wrote in the tracker."""

    def test_it_drops_the_brand_and_the_size(self):
        self.assertEqual(
            fnd.suggest("Celtrade Vegan Mayo Spread 14.5oz", brands=["Celtrade"]),
            "Vegan Mayo Spread",
        )

    def test_it_drops_marketing_words(self):
        self.assertEqual(
            fnd.suggest("Mariner CRACKER FLATBREAD ROSEMARY ORGANIC 5 OZ", brands=["Mariner"]),
            "CRACKER FLATBREAD ROSEMARY",
        )

    def test_it_takes_the_half_after_a_dash(self):
        self.assertEqual(
            fnd.suggest("Food Club Dry Soup Mix - Beefy Onion Soup", brands=["FC - Food Club"]),
            "Beefy Onion Soup",
        )

    def test_it_drops_a_brand_code_as_well_as_a_brand_name(self):
        self.assertEqual(
            fnd.suggest("CF Ice Cream Pumpkin Scr 48oz", brands=["CF - Cravin Flavor"]),
            "Ice Cream Pumpkin",
        )

    def test_a_size_can_be_kept_when_it_is_the_differentiator(self):
        # Two products alike but for the size need it back to tell them apart.
        self.assertEqual(
            fnd.suggest("Cedar's Original Hummus 8oz", brands=["Cedar's"], keep_size=True),
            "Original Hummus 8oz",
        )

    def test_a_number_left_behind_by_a_stripped_size_goes_too(self):
        self.assertEqual(fnd.suggest("Waffles Homestyle 6 CT 7.4 OZ"), "Waffles Homestyle")

    def test_an_unknown_third_party_brand_stays_for_someone_to_remove(self):
        # Guessing which leading word is a brand would eat real product words.
        self.assertEqual(fnd.suggest("Capeachio's CRACKER WATER ORG 4.4 OZ"),
                         "Capeachio's CRACKER WATER")

    def test_an_empty_name_gives_nothing_rather_than_a_stray_separator(self):
        self.assertEqual(fnd.suggest(""), "")
        self.assertEqual(fnd.suggest(None), "")

    def test_a_name_that_is_all_brand_and_size_gives_nothing(self):
        # Better an empty field than a description of "16 oz".
        self.assertEqual(fnd.suggest("Food Club 16 oz", brands=["Food Club"]), "")

    def test_the_result_is_always_safe(self):
        self.assertNotIn("/", fnd.suggest("Half/Half Cream 16oz"))


if __name__ == "__main__":
    unittest.main()


class RealTrackerTests(unittest.TestCase):
    """Measured against pairs people wrote by hand in the Topco tracker."""

    CASES = [
        ("Celtrade Vegan Mayo Spread 14.5oz", "Celtrade", "Vegan Mayo Spread", "Vegan Mayo"),
        ("CF Ice Cream Pumpkin Scr 48oz", "CF -CravinFlavor", "Ice Cream Pumpkin", "Pumpkin Ice Cream"),
        ("Food Club Dry Soup Mix - Beefy Onion Soup", "FC -FoodClub", "Beefy Onion Soup", "Beefy Onion Soup"),
        ("Food Club Dry Soup Mix - Noodle Soup", "FC -FoodClub", "Noodle Soup", "Noodle Soup"),
        ("Food Club New Tropical Fruit Blend 16oz", "FC -FoodClub", "Tropical Fruit Blend", "Tropical Fruit Blend"),
        ("Culinary Tours Bang Bang Sauce 12oz", "CT -CulinaryTours", "Bang Bang Sauce", None),
    ]

    def test_a_run_together_brand_still_matches_a_spelled_out_one(self):
        # The tracker writes "FC -FoodClub"; the product name says "Food Club".
        self.assertEqual(
            fnd.suggest("Food Club New Tropical Fruit Blend 16oz", brands=["FC -FoodClub"]),
            "Tropical Fruit Blend",
        )

    def test_the_suggestion_matches_what_a_person_wrote_where_no_reordering_was_needed(self):
        exact = [case for case in self.CASES if case[3] and case[2] == case[3]]
        self.assertGreaterEqual(len(exact), 3)
        for name, brand, suggestion, _ in exact:
            self.assertEqual(fnd.suggest(name, brands=[brand]), suggestion, name)

    def test_where_a_person_reordered_the_words_the_suggestion_holds_the_same_ones(self):
        # "Ice Cream Pumpkin" -> "Pumpkin Ice Cream". Reordering needs to know which
        # word is the noun, so the suggestion keeps source order and is edited.
        suggestion = fnd.suggest("CF Ice Cream Pumpkin Scr 48oz", brands=["CF -CravinFlavor"])
        self.assertEqual(sorted(suggestion.casefold().split()),
                         sorted("Pumpkin Ice Cream".casefold().split()))


class BrandPrefixConfigTests(unittest.TestCase):
    """One configured line gives the code, the label and the words to strip."""

    @classmethod
    def setUpClass(cls):
        import routes
        cls.routes = routes
        cls.source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "App.jsx").read_text()

    def test_a_line_yields_a_code_and_a_label(self):
        self.assertEqual(
            self.routes._parse_brand_prefixes("FC - Food Club"),
            [{"code": "FC", "name": "Food Club", "label": "FC - Food Club"}],
        )

    def test_a_prefix_with_no_spelled_out_name_is_still_choosable(self):
        # Dropping it for being half-configured would make it unpickable.
        self.assertEqual(self.routes._parse_brand_prefixes("GG")[0]["label"], "GG")

    def test_the_identical_line_twice_is_listed_once(self):
        self.assertEqual(len(self.routes._parse_brand_prefixes("FC - Food Club\nFC - Food Club")), 1)

    def test_but_one_code_against_two_brands_keeps_both(self):
        # Real in Topco's list, and dropping either makes that brand unpickable.
        self.assertEqual(len(self.routes._parse_brand_prefixes("PY - Pure Harmony\nPY - Pantry Fresh")), 2)

    def test_blank_lines_are_ignored(self):
        self.assertEqual(self.routes._parse_brand_prefixes("\n\nFC - Food Club\n\n")[0]["code"], "FC")

    def test_the_dropdown_shows_the_label_and_stores_the_code(self):
        # The code is what goes in the delivered file name.
        self.assertIn("<option key={entry.code} value={entry.code}>{entry.label}</option>", self.source)

    def test_other_clears_the_field_rather_than_storing_the_word_other(self):
        self.assertIn("event.target.value === OTHER_BRAND_PREFIX ? '' : event.target.value", self.source)

    def test_a_client_with_no_list_still_gets_a_plain_box(self):
        # Not every client has brand prefixes, and none should be blocked.
        self.assertIn("field === 'brandPrefix' && brandPrefixes.length ?", self.source)

    def test_the_suggestion_never_displaces_a_written_value(self):
        self.assertIn("if (field === 'fileNameDescription' && product.fileNameDescription) return product.fileNameDescription;",
                      self.source)
        self.assertIn("if (product.fileNameDescriptionSuggestion) return product.fileNameDescriptionSuggestion;",
                      self.source)


class BrandPrefixWarningTests(unittest.TestCase):
    """Problems in a client's brand list that only surface in a delivered file."""

    @classmethod
    def setUpClass(cls):
        import routes
        cls.routes = routes

    def warnings(self, raw):
        return self.routes._brand_prefix_warnings(self.routes._parse_brand_prefixes(raw))

    def test_two_brands_sharing_a_code_are_both_kept(self):
        # Topco's list has PY against Pure Harmony and Pantry Fresh. Dropping the
        # second would make that brand unpickable.
        prefixes = self.routes._parse_brand_prefixes("PY - Pure Harmony\nPY - Pantry Fresh")
        self.assertEqual([entry["name"] for entry in prefixes], ["Pure Harmony", "Pantry Fresh"])

    def test_and_the_clash_is_reported(self):
        # Guessing which brand owns the code would silently rename a delivery.
        warnings = self.warnings("PY - Pure Harmony\nPY - Pantry Fresh")
        self.assertEqual(len(warnings), 1)
        self.assertIn("Pure Harmony", warnings[0])
        self.assertIn("Pantry Fresh", warnings[0])

    def test_a_code_that_cannot_go_in_a_file_name_is_reported(self):
        self.assertTrue(any("file name" in w for w in self.warnings("No Brand/Branding")))

    def test_a_clean_list_reports_nothing(self):
        self.assertEqual(self.warnings("FC - Food Club\nFX - Full Circle Market"), [])

    def test_the_same_line_twice_is_not_a_clash(self):
        self.assertEqual(self.warnings("FC - Food Club\nFC - Food Club"), [])
