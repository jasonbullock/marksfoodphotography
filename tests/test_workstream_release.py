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
