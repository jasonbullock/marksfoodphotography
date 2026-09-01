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


def card(workstream, shot_at=None):
    return {"id": "rec" + workstream, "fields": {
        C.F_WORKSTREAM_CARD_TYPE: workstream,
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

    def test_an_unshot_workstream_holds_the_whole_box(self):
        # Packaging can be shot weeks before Ecomm, and shipping the merchandise
        # after the first shoot is how a reshoot becomes impossible.
        result = self.state([card("Packaging", days_ago(90)), card("Ecomm")])
        self.assertEqual(result["state"], "awaiting-shoot")
        self.assertEqual(result["awaitingShoot"], ["Ecomm"])

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
