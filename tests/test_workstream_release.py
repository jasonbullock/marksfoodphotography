import unittest

import backend.config as C


class WorkstreamReleaseFieldTests(unittest.TestCase):
    def test_the_card_carries_its_own_release(self):
        # Release is per workstream: an Ecomm card can go to photo while Packaging
        # for the same box is still waiting on data.
        self.assertEqual(C.Config.F_WORKSTREAM_CARD_RELEASED, "Released")
        self.assertEqual(C.Config.F_WORKSTREAM_CARD_RELEASED_AT, "Released At")
        self.assertEqual(C.Config.F_WORKSTREAM_CARD_RELEASED_BY, "Released By")

    def test_the_shape_exposes_the_card_release(self):
        from backend.routes import _shape_workstream_card

        shaped = _shape_workstream_card({
            "id": "recCard",
            "fields": {
                C.Config.F_WORKSTREAM_CARD_TYPE: "Ecomm",
                C.Config.F_WORKSTREAM_CARD_RELEASED: True,
                C.Config.F_WORKSTREAM_CARD_RELEASED_AT: "2026-08-27T21:46:38Z",
            },
        })
        self.assertTrue(shaped["released"])
        self.assertEqual(shaped["releasedAt"], "2026-08-27T21:46:38Z")

        unreleased = _shape_workstream_card({"id": "recOther", "fields": {C.Config.F_WORKSTREAM_CARD_TYPE: "Packaging"}})
        self.assertFalse(unreleased["released"])


class ReleasedCardResyncTests(unittest.TestCase):
    def test_only_released_cards_are_resynced(self):
        from unittest.mock import patch

        from backend.routes import _resync_released_cards

        released = {"id": "recReleased", "fields": {C.Config.F_WORKSTREAM_CARD_RELEASED: True}}
        never_released = {"id": "recPending", "fields": {}}

        with patch("backend.routes._populate_creative_force_feed_for_ready_cards") as populate:
            populate.return_value = [{"sourceKey": "topco:recReleased", "action": "updated"}]
            result = _resync_released_cards([released, never_released])

        populate.assert_called_once_with([released])
        self.assertEqual(result, [{"sourceKey": "topco:recReleased", "action": "updated"}])

    def test_nothing_released_means_no_feed_call(self):
        from unittest.mock import patch

        from backend.routes import _resync_released_cards

        with patch("backend.routes._populate_creative_force_feed_for_ready_cards") as populate:
            self.assertEqual(_resync_released_cards([{"id": "recPending", "fields": {}}]), [])
        populate.assert_not_called()

    def test_a_feed_failure_does_not_fail_the_edit(self):
        # The edit already succeeded. A feed that briefly lags beats refusing the save.
        import requests
        from unittest.mock import patch

        from backend.routes import _resync_released_cards

        released = {"id": "recReleased", "fields": {C.Config.F_WORKSTREAM_CARD_RELEASED: True}}
        with _app_context():
            with patch("backend.routes._populate_creative_force_feed_for_ready_cards", side_effect=requests.HTTPError()):
                self.assertEqual(_resync_released_cards([released]), [])

    def test_released_cards_are_found_by_product(self):
        from unittest.mock import patch

        from backend.routes import _released_cards_for_product

        cards = [
            {"id": "recA", "fields": {
                C.Config.F_WORKSTREAM_CARD_EXPECTED_PRODUCT: ["recProduct"],
                C.Config.F_WORKSTREAM_CARD_RELEASED: True,
            }},
            {"id": "recB", "fields": {C.Config.F_WORKSTREAM_CARD_EXPECTED_PRODUCT: ["recProduct"]}},
            {"id": "recC", "fields": {
                C.Config.F_WORKSTREAM_CARD_EXPECTED_PRODUCT: ["recOther"],
                C.Config.F_WORKSTREAM_CARD_RELEASED: True,
            }},
        ]
        with patch("backend.routes._list_all_records", return_value=cards):
            found = _released_cards_for_product("recProduct")
        self.assertEqual([card["id"] for card in found], ["recA"])
        self.assertEqual(_released_cards_for_product(""), [])


def _app_context():
    from backend.app import create_app

    return create_app().app_context()
