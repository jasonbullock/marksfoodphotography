import unittest
from pathlib import Path

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



class ProductEditDoesNotTouchCreativeForceTests(unittest.TestCase):
    def test_editing_does_not_sync_the_feed(self):
        # Releasing again is the deliberate act that reaches Creative Force, and the
        # only place the producer is warned. An edit must not do it quietly.
        source = (Path(__file__).resolve().parents[1] / "backend" / "routes.py").read_text()
        self.assertNotIn("_resync_released_cards", source)
        for handler in ("def update_workstream_card(record_id):", "def update_item(record_id):"):
            start = source.index(handler)
            body = source[start:source.index("@api.", start + 10)]
            self.assertNotIn("_populate_creative_force_feed", body, handler)
