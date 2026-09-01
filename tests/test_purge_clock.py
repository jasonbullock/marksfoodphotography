import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import routes  # noqa: E402
from config import Config as C  # noqa: E402


NOW = datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)


def card(workstream, shot_at=None, released=True):
    return {"id": "rec" + workstream, "fields": {
        C.F_WORKSTREAM_CARD_TYPE: workstream,
        C.F_WORKSTREAM_CARD_RELEASED: released,
        **({C.F_WORKSTREAM_CARD_SHOT_AT: shot_at} if shot_at else {}),
    }}


def days_ago(days):
    return (NOW - timedelta(days=days)).isoformat()


class ShootDateFromEventsTests(unittest.TestCase):
    def test_the_photography_step_supplies_the_shoot_date(self):
        steps = {
            "4": {"name": "Photography", "reportedAt": "2026-06-01T10:00:00+00:00"},
            "7": {"name": "Final Selection", "reportedAt": "2026-06-05T10:00:00+00:00"},
        }
        self.assertEqual(routes._creative_force_shot_at(steps), "2026-06-01T10:00:00+00:00")

    def test_a_reshoot_restarts_the_clock(self):
        # The studio has to be able to put the box back in front of a camera, so the
        # latest shoot wins rather than the first.
        steps = {
            "4": {"name": "Photography", "reportedAt": "2026-06-01T10:00:00+00:00"},
            "9": {"name": "Photography", "reportedAt": "2026-08-20T10:00:00+00:00"},
        }
        self.assertEqual(routes._creative_force_shot_at(steps), "2026-08-20T10:00:00+00:00")

    def test_an_item_that_has_not_been_shot_has_no_date(self):
        steps = {"7": {"name": "Final Selection", "reportedAt": "2026-06-05T10:00:00+00:00"}}
        self.assertEqual(routes._creative_force_shot_at(steps), "")

    def test_the_step_name_is_matched_regardless_of_case(self):
        steps = {"4": {"name": "photography", "reportedAt": "2026-06-01T10:00:00+00:00"}}
        self.assertEqual(routes._creative_force_shot_at(steps), "2026-06-01T10:00:00+00:00")

    def test_no_steps_at_all_is_not_an_error(self):
        self.assertEqual(routes._creative_force_shot_at(None), "")
        self.assertEqual(routes._creative_force_shot_at({}), "")


class PurgeStateTests(unittest.TestCase):
    def state(self, cards, client=None):
        return routes._purge_state_for_cards(cards, client, now=NOW)

    def test_a_released_workstream_that_is_unshot_holds_the_whole_box(self):
        # Packaging can be shot weeks before Ecomm, and shipping the merchandise
        # after the first shoot is how a reshoot becomes impossible.
        result = self.state([card("Packaging", days_ago(90)), card("Ecomm")])
        self.assertEqual(result["state"], "awaiting-shoot")
        self.assertEqual(result["awaitingShoot"], ["Ecomm"])

    def test_a_workstream_that_was_never_released_does_not_hold_anything(self):
        # There is no Packaging shoot coming until someone releases it, so waiting
        # on one would keep the box on a shelf forever.
        result = self.state([
            card("Ecomm", days_ago(C.KEEP_AFTER_SHOOT_DAYS + 1)),
            card("Packaging", released=False),
        ])
        self.assertEqual(result["awaitingShoot"], [])
        self.assertEqual(result["state"], "due")

    def test_a_box_with_nothing_released_is_not_on_a_purge_clock(self):
        self.assertEqual(self.state([card("Ecomm", released=False)])["state"], "not-scheduled")

    def test_each_released_workstream_is_reported_separately(self):
        # They are shot weeks apart, so one shared date says nothing useful.
        result = self.state([card("Ecomm", days_ago(3)), card("Packaging")])
        self.assertEqual(
            [(shoot["workstream"], bool(shoot["shotAt"])) for shoot in result["shoots"]],
            [("Ecomm", True), ("Packaging", False)],
        )

    def test_an_unreleased_workstream_is_not_listed_at_all(self):
        result = self.state([card("Ecomm", days_ago(3)), card("Packaging", released=False)])
        self.assertEqual([shoot["workstream"] for shoot in result["shoots"]], ["Ecomm"])

    def test_the_clock_runs_from_the_last_shoot_not_the_first(self):
        result = self.state([card("Packaging", days_ago(90)), card("Ecomm", days_ago(10))])
        self.assertEqual(result["daysSinceShoot"], 10)

    def test_a_box_inside_the_window_is_still_held(self):
        result = self.state([card("Packaging", days_ago(5))])
        self.assertEqual(result["state"], "holding")

    def test_a_box_past_the_window_is_due(self):
        result = self.state([card("Packaging", days_ago(C.KEEP_AFTER_SHOOT_DAYS + 1))])
        self.assertEqual(result["state"], "due")

    def test_a_client_can_ask_for_longer_than_the_studio_default(self):
        cards = [card("Packaging", days_ago(C.KEEP_AFTER_SHOOT_DAYS + 1))]
        result = self.state(cards, {"keepAfterShootDays": C.KEEP_AFTER_SHOOT_DAYS + 60})
        self.assertEqual(result["state"], "holding")

    def test_a_client_setting_of_zero_means_purge_as_soon_as_it_is_shot(self):
        result = self.state([card("Packaging", days_ago(1))], {"keepAfterShootDays": 0})
        self.assertEqual(result["state"], "due")

    def test_a_blank_client_setting_falls_back_to_the_studio_default(self):
        for blank in (None, "", "not a number"):
            self.assertEqual(routes._keep_after_shoot_days({"keepAfterShootDays": blank}),
                             C.KEEP_AFTER_SHOOT_DAYS)

    def test_a_box_with_no_photo_work_is_not_being_held_for_a_shoot(self):
        # Nothing is waiting on a camera, so the purge clock does not apply.
        self.assertEqual(self.state([])["state"], "not-scheduled")
        self.assertEqual(self.state([card("Thr3d", None)])["state"], "not-scheduled")

    def test_an_unreadable_shoot_date_holds_rather_than_purges(self):
        # Guessing wrong in this direction throws away merchandise.
        result = self.state([card("Packaging", "sometime in June")])
        self.assertEqual(result["state"], "awaiting-shoot")

    def test_it_says_when_the_box_becomes_due(self):
        result = self.state([card("Packaging", days_ago(0))], {"keepAfterShootDays": 14})
        self.assertEqual(routes._parse_iso(result["purgeDueAt"]), NOW + timedelta(days=14))


class ClientSettingTests(unittest.TestCase):
    def apply(self, body):
        fields = {}
        routes._apply_client_fields(fields, body) if hasattr(routes, "_apply_client_fields") else None
        return fields

    def test_a_negative_hold_is_refused(self):
        source = (ROOT / "backend" / "routes.py").read_text()
        self.assertIn('raise ValueError("keepAfterShootDays cannot be negative.")', source)

    def test_clearing_it_falls_back_rather_than_purging_immediately(self):
        source = (ROOT / "backend" / "routes.py").read_text()
        block = source.split('if "keepAfterShootDays" in body:', 1)[1].split("\n\n", 1)[0]
        self.assertIn("C.F_CLIENT_KEEP_AFTER_SHOOT_DAYS] = None", block)


if __name__ == "__main__":
    unittest.main()


class MerchandiseViewTests(unittest.TestCase):
    """The shoot date belongs where people look at what is on the shelf."""

    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "frontend" / "src" / "App.jsx").read_text()
        cls.styles = (ROOT / "frontend" / "src" / "styles.css").read_text()
        cls.routes = (ROOT / "backend" / "routes.py").read_text()

    def test_the_rows_carry_the_purge_state(self):
        self.assertIn('"purge": _purge_state_for_cards(', self.routes)

    def test_the_cards_are_loaded_once_for_the_whole_list(self):
        # A lookup per row would be one Airtable call per box on the shelf.
        block = self.routes.split("def _list_merchandise_inventory_records():", 1)[1].split("\n\n\n", 1)[0]
        self.assertIn("cards_by_merchandise.setdefault", block)

    def test_the_card_names_each_workstream_and_its_date(self):
        self.assertIn("function shotLines(record) {", self.source)
        self.assertIn("`${shoot.workstream} shot ${formatInventoryDate(shoot.shotAt)}${since}`", self.source)

    def test_a_released_but_unshot_workstream_is_named_rather_than_left_blank(self):
        self.assertIn("`${shoot.workstream}: awaiting shoot`", self.source)

    def test_a_box_with_nothing_released_says_so(self):
        self.assertIn("'Not released for photo'", self.source)

    def test_the_list_view_has_both_columns(self):
        self.assertIn("header: 'Shot'", self.source)
        self.assertIn("header: 'Days Since Shot'", self.source)

    def test_sorting_by_days_compares_numbers(self):
        # As a string, "9" sorts after "30".
        self.assertIn("if (sortKey === 'daysSinceShoot') {", self.source)

    def test_never_shot_sorts_last_rather_than_as_today(self):
        block = self.source.split("if (sortKey === 'daysSinceShoot') {", 1)[1].split("}", 1)[0]
        self.assertIn("?? -1", block)

    def test_its_colours_are_ones_that_exist(self):
        import re
        block = self.styles.split(".merchandise-inventory-shot {", 1)[1]
        for token in set(re.findall(r"var\((--[a-z0-9-]+)\)", block[:900])):
            self.assertIn(f"  {token}:", self.styles, f"{token} is used but never defined")


class MerchandiseDrawerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "frontend" / "src" / "App.jsx").read_text()

    def test_the_flyout_shows_the_shoot_date(self):
        block = cls_drawer(self.source)
        self.assertIn("<span>Shot</span>", block)

    def test_it_names_the_hold_beside_the_count(self):
        # The number only means something against how long the box is kept.
        self.assertIn("of ${selectedInventoryRecord.purge.keepAfterShootDays} held", self.source)

    def test_the_flyout_lists_the_same_lines_as_the_card(self):
        self.assertIn("shotLines(selectedInventoryRecord).map(line =>", self.source)


def cls_drawer(source):
    start = source.index('<div className="merchandise-detail-body">')
    return source[start:source.index("</aside>", start)]


class MerchandiseDrawerLayoutTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "frontend" / "src" / "App.jsx").read_text()
        cls.styles = (ROOT / "frontend" / "src" / "styles.css").read_text()
        cls.block = cls_drawer(cls.source)

    def test_client_is_the_first_thing_read(self):
        self.assertLess(self.block.index("<span>Client</span>"), self.block.index("<span>Status</span>"))

    def test_the_shoot_lines_read_as_values_not_labels(self):
        # The body's blanket span rule dresses every span as a field name.
        self.assertIn('<div className="merchandise-detail-shot-line"', self.source)
        rule = self.styles.split(".merchandise-detail-body .merchandise-detail-shot-line {", 1)[1].split("}", 1)[0]
        self.assertIn("text-transform: none;", rule)

    def test_a_shoot_line_is_not_styled_differently_from_the_rows_around_it(self):
        # The body styles every div as a padded white box, which indented each
        # nested line; overriding the font made it lighter than its bold siblings.
        rule = self.styles.split(".merchandise-detail-body .merchandise-detail-shot-line {", 1)[1].split("}", 1)[0]
        self.assertIn("padding: 0;", rule)
        self.assertIn("background: none;", rule)
        self.assertIn("font: inherit;", rule)
        self.assertNotIn("font-size:", rule)
        self.assertNotIn("font-weight:", rule)

    def test_the_merchandise_review_button_is_gone(self):
        self.assertNotIn("Open Merchandise Review", self.source)

    def test_its_styling_went_with_it(self):
        self.assertNotIn(".merchandise-detail-actions {", self.styles)
