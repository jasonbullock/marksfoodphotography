import sys
import unittest
from unittest.mock import patch
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import routes  # noqa: E402
from config import Config as C  # noqa: E402


AWAITING = routes.PLANNING_STATUS_LABELS["awaiting-photo-release"]


def card(card_id, workstream, merch_id, **extra):
    fields = {
        C.F_WORKSTREAM_CARD_TYPE: workstream,
        C.F_WORKSTREAM_CARD_RECEIVED_MERCH: [merch_id],
        C.F_WORKSTREAM_CARD_PLANNING_STATUS: AWAITING,
    }
    fields.update(extra)
    return {"id": card_id, "fields": fields}


class MergedProductionTypeTests(unittest.TestCase):
    def test_the_order_does_not_depend_on_which_card_was_released_first(self):
        # Creative Force reads this into Category Group. If it flipped between
        # releases the styleguide rules would see the group change under them.
        self.assertEqual(
            routes._merged_production_type("Packaging", "Ecomm"),
            routes._merged_production_type("Ecomm", "Packaging"),
        )
        self.assertEqual(
            routes._merged_production_type("Packaging", "Ecomm"), "Ecomm, Packaging"
        )

    def test_releasing_the_same_workstream_twice_does_not_repeat_it(self):
        self.assertEqual(routes._merged_production_type("Ecomm", "Ecomm"), "Ecomm")

    def test_one_workstream_still_reads_as_itself(self):
        # So a rule asking whether the group contains "packaging" behaves the same
        # on a box that only raises packaging work.
        self.assertEqual(routes._merged_production_type("Packaging", ""), "Packaging")


class FeedRowPerBoxTests(unittest.TestCase):
    def setUp(self):
        self.created = []
        self.updated = []

        def create(table, fields, **kwargs):
            record = {"id": "recFeed%d" % len(self.created), "fields": dict(fields)}
            self.created.append(dict(fields))
            return record

        def update(table, record_id, fields, **kwargs):
            self.updated.append((record_id, dict(fields)))
            return {"id": record_id, "fields": dict(fields)}

        patches = [
            patch("routes.airtable.create_record", side_effect=create),
            patch("routes.airtable.update_record", side_effect=update),
        ]
        for item in patches:
            item.start()
            self.addCleanup(item.stop)

    def sync(self, cards, existing=None, handoff=None):
        def handoff_for(record):
            return (handoff or {}).get(record["id"], {"productionType": record["fields"][C.F_WORKSTREAM_CARD_TYPE]})

        def fields_for(record, payload):
            return {
                C.F_CF_FEED_SOURCE_KEY: record["fields"][C.F_WORKSTREAM_CARD_RECEIVED_MERCH][0],
                C.F_CF_FEED_PRODUCTION_TYPE: payload.get("productionType", ""),
                **payload.get("extra", {}),
            }

        with patch("routes._list_all_records", return_value=existing or []), \
                patch("routes._creative_force_handoff", side_effect=handoff_for), \
                patch("routes._creative_force_feed_fields", side_effect=fields_for):
            return routes._sync_creative_force_product_feed_cards(cards)

    def test_two_workstreams_on_one_box_become_one_product(self):
        # Two rows made Creative Force import two products describing the same box,
        # which forced a suffixed code and stopped the tag scanning.
        synced = self.sync([
            card("recEcomm", "Ecomm", "recMerch"),
            card("recPack", "Packaging", "recMerch"),
        ])
        self.assertEqual(len(synced), 1)
        self.assertEqual(len(self.created), 1)
        self.assertEqual(self.created[0][C.F_CF_FEED_SOURCE_KEY], "recMerch")
        self.assertEqual(self.created[0][C.F_CF_FEED_PRODUCTION_TYPE], "Ecomm, Packaging")

    def test_the_row_is_keyed_to_the_box_rather_than_the_card(self):
        synced = self.sync([card("recEcomm", "Ecomm", "recMerch")])
        self.assertEqual(synced[0]["sourceKey"], "recMerch")

    def test_the_second_workstream_fills_gaps_without_overwriting_the_first(self):
        # Ecomm carries a CVID, Packaging a file name description. One product
        # carries both.
        handoff = {
            "recEcomm": {"productionType": "Ecomm", "extra": {"CVID": "123", "Brand": ""}},
            "recPack": {"productionType": "Packaging", "extra": {"CVID": "", "Brand": "Topco"}},
        }
        self.sync(
            [card("recEcomm", "Ecomm", "recMerch"), card("recPack", "Packaging", "recMerch")],
            handoff=handoff,
        )
        self.assertEqual(self.created[0]["CVID"], "123")
        self.assertEqual(self.created[0]["Brand"], "Topco")

    def test_releasing_the_second_workstream_later_updates_the_same_product(self):
        existing = [{"id": "recFeedRow", "fields": {C.F_CF_FEED_SOURCE_KEY: "recMerch"}}]
        self.sync([card("recPack", "Packaging", "recMerch")], existing=existing)
        self.assertEqual(self.created, [])
        self.assertEqual(self.updated[0][0], "recFeedRow")

    def test_an_already_released_card_still_contributes_its_production_type(self):
        # Otherwise releasing Packaging after Ecomm would rewrite the row as
        # packaging-only and drop Ecomm from Category Group.
        released = card("recEcomm", "Ecomm", "recMerch")
        released["fields"][C.F_WORKSTREAM_CARD_PLANNING_STATUS] = routes.PLANNING_STATUS_LABELS["released"]
        self.sync([released, card("recPack", "Packaging", "recMerch")])
        self.assertEqual(self.created[0][C.F_CF_FEED_PRODUCTION_TYPE], "Ecomm, Packaging")

    def test_separate_boxes_stay_separate_products(self):
        self.sync([
            card("recA", "Ecomm", "recMerchA"),
            card("recB", "Ecomm", "recMerchB"),
        ])
        self.assertEqual(len(self.created), 2)


if __name__ == "__main__":
    unittest.main()


class WebhookCorrelationTests(unittest.TestCase):
    """One product now raises both work units, so the event's type picks the card."""

    def cards(self):
        return [card("recEcomm", "Ecomm", "recMerch"), card("recPack", "Packaging", "recMerch")]

    def find(self, production_type):
        feed = [{"id": "recFeed", "fields": {
            C.F_CF_FEED_PRODUCT_CODE: "MP-00016",
            C.F_CF_FEED_SOURCE_KEY: "recMerch",
        }}]
        with patch("routes._list_all_records", return_value=feed):
            return routes._find_creative_force_card(
                self.cards(),
                {"productCode": "MP-00016", "productionTypeName": production_type},
            )

    def test_a_packaging_event_lands_on_the_packaging_card(self):
        self.assertEqual(self.find("Packaging")["id"], "recPack")

    def test_an_ecomm_event_lands_on_the_ecomm_card(self):
        self.assertEqual(self.find("Ecomm")["id"], "recEcomm")

    def test_an_unrecognised_production_type_does_not_guess_between_two_cards(self):
        self.assertIsNone(self.find("Tabletop"))
