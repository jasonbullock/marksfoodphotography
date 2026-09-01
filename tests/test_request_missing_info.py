import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import notifier  # noqa: E402


def card_text(card):
    body = card["attachments"][0]["content"]["body"]
    return "\n".join(str(block.get("text", "")) for block in body)


class MissingInfoCardTests(unittest.TestCase):
    def test_it_names_the_fields_rather_than_counting_them(self):
        # Nobody in a Teams channel knows what "3 required product fields" means.
        card = notifier.build_missing_info_card(
            client_name="Topco", item_label="CF Ice Cream Pumpkin Scr 48oz",
            missing=["Brand Prefix", "CVID"], merchandise_id="recX")
        text = card_text(card)
        self.assertIn("Brand Prefix", text)
        self.assertIn("CVID", text)
        self.assertNotIn("2 fields", text)

    def test_it_says_which_item_is_waiting(self):
        card = notifier.build_missing_info_card(
            client_name="Topco", item_label="CF Ice Cream Pumpkin Scr 48oz", missing=["CVID"])
        self.assertIn("CF Ice Cream Pumpkin Scr 48oz", card_text(card))

    def test_it_links_back_at_the_item(self):
        with patch.object(notifier.C, "APP_BASE_URL", "https://food.walnutcontent.com"):
            card = notifier.build_missing_info_card(
                client_name="Topco", item_label="Thing", missing=["CVID"], merchandise_id="recX")
        actions = card["attachments"][0]["content"]["actions"]
        self.assertEqual(actions[0]["url"], "https://food.walnutcontent.com/planning?item=recX")

    def test_a_card_without_a_link_still_posts(self):
        # APP_BASE_URL is not always set, and a card is still worth sending.
        with patch.object(notifier.C, "APP_BASE_URL", ""):
            card = notifier.build_missing_info_card(
                client_name="Topco", item_label="Thing", missing=["CVID"], merchandise_id="recX")
        self.assertNotIn("actions", card["attachments"][0]["content"])

    def test_blank_field_names_are_dropped(self):
        card = notifier.build_missing_info_card(
            client_name="Topco", item_label="Thing", missing=["CVID", "", None, "  "])
        self.assertNotIn("- \n", card_text(card))


class RequestEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "backend" / "routes.py").read_text()

    def test_the_server_decides_what_is_missing(self):
        # A caller that named its own fields could ask the client for something
        # already supplied, or quietly ask for nothing at all.
        block = cls_block(self.source)
        self.assertIn("_evaluate_required_to_shoot_from_fields(", block)
        self.assertNotIn('body.get("missing")', block)

    def test_an_item_missing_nothing_is_not_posted_about(self):
        self.assertIn('return err("Nothing is missing on this item.", 400)', self.source)

    def test_a_client_without_a_channel_is_told_so_rather_than_failing_silently(self):
        self.assertIn('return err("This client has no Teams channel configured.", 400)', self.source)

    def test_the_ask_is_recorded_on_the_item(self):
        self.assertIn('_record_merchandise_history(entry_id, f"Asked Teams for:', self.source)


def cls_block(source):
    start = source.index("def request_missing_information(entry_id):")
    return source[start:source.index("@api.post(\"/merchandise/<entry_id>/tag\")", start)]


class AskButtonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "frontend" / "src" / "App.jsx").read_text()
        cls.styles = (ROOT / "frontend" / "src" / "styles.css").read_text()

    def test_the_button_only_shows_while_something_is_missing(self):
        self.assertIn("{!photoProductionReady && (", self.source)
        self.assertIn("'Ask for Info in Teams'", self.source)

    def test_it_reports_what_it_asked_for(self):
        self.assertIn("Asked in Teams for ${(result?.missing || []).join(', ')}", self.source)

    def test_its_colours_are_ones_that_exist(self):
        used = set(re.findall(r"var\((--[a-z0-9-]+)\)", self.styles.split(".photo-production-ask")[1]))
        for token in used:
            self.assertIn(f"  {token}:", self.styles, f"{token} is used but never defined")


if __name__ == "__main__":
    unittest.main()


class DeliverableScopeTests(unittest.TestCase):
    """Which fields a client requires depends on the work the box raises."""

    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "backend" / "routes.py").read_text()

    def test_the_scope_comes_from_the_workstream_cards(self):
        # Evaluated without them the item looked as though it were missing its
        # Deliverables, and that is what the client was asked for.
        block = self.source.split("def _merchandise_deliverables_in_scope(", 1)[1].split("\n\n\n", 1)[0]
        self.assertIn("_workstream_cards_for_merchandise(entry_id)", block)

    def test_a_caller_cannot_invent_a_workstream_the_box_does_not_have(self):
        import routes
        with patch("routes._workstream_cards_for_merchandise", return_value=[
            {"fields": {routes.C.F_WORKSTREAM_CARD_TYPE: "Packaging"}},
        ]):
            scope = routes._merchandise_deliverables_in_scope("recX", {}, body={"deliverables": ["Ecomm"]})
        self.assertEqual(scope, ["Packaging"])

    def test_a_caller_may_narrow_to_the_card_it_is_looking_at(self):
        import routes
        with patch("routes._workstream_cards_for_merchandise", return_value=[
            {"fields": {routes.C.F_WORKSTREAM_CARD_TYPE: "Packaging"}},
            {"fields": {routes.C.F_WORKSTREAM_CARD_TYPE: "Ecomm"}},
        ]):
            scope = routes._merchandise_deliverables_in_scope("recX", {}, body={"deliverables": ["Ecomm"]})
        self.assertEqual(scope, ["Ecomm"])

    def test_asking_for_nothing_in_particular_covers_every_workstream(self):
        import routes
        with patch("routes._workstream_cards_for_merchandise", return_value=[
            {"fields": {routes.C.F_WORKSTREAM_CARD_TYPE: "Packaging"}},
            {"fields": {routes.C.F_WORKSTREAM_CARD_TYPE: "Ecomm"}},
        ]):
            scope = routes._merchandise_deliverables_in_scope("recX", {}, body={})
        self.assertEqual(sorted(scope), ["Ecomm", "Packaging"])


class AskButtonWordingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "frontend" / "src" / "App.jsx").read_text()

    def test_the_button_says_what_it_does(self):
        self.assertIn("'Ask for Info in Teams'", self.source)
        self.assertNotIn("Ask client in Teams", self.source)

    def test_it_names_the_fields_before_you_press_it(self):
        # The difference between sending a message and knowing what you just sent.
        self.assertIn("Asks this client's channel for {photoProductionMissingLabels.join(', ')}", self.source)

    def test_the_card_in_view_sets_the_scope(self):
        self.assertIn("api.requestMissingInformation(item.merchandiseId, wizardState.deliverables)", self.source)
