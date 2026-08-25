import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import routes  # noqa: E402
from config import Config as C  # noqa: E402


class NormalizedIdentifierTests(unittest.TestCase):
    """The spreadsheet stores UPCs as numbers and strips leading zeros, so the
    comparable form drops them. Nothing else is relaxed."""

    def test_leading_zeros_do_not_distinguish(self):
        self.assertEqual(routes.normalized_identifier("036800120457"),
                         routes.normalized_identifier("36800120457"))

    def test_punctuation_and_spacing_are_ignored(self):
        self.assertEqual(routes.normalized_identifier(" 0368-0012 0457 "),
                         routes.normalized_identifier("036800120457"))

    def test_the_trailing_digit_still_distinguishes(self):
        # Five CT cheeses differ in this digit alone.
        self.assertNotEqual(routes.normalized_identifier("1122500489"),
                            routes.normalized_identifier("1122500490"))

    def test_nothing_useful_yields_nothing(self):
        for value in ("", None, "NO UPC?", "0000"):
            self.assertEqual(routes.normalized_identifier(value), "")


class MergeProductTests(unittest.TestCase):
    """One way a Product comes to exist, so a SKU cannot end up with two records."""

    def _record(self, rid="recP", upc="036800120457", **fields):
        base = {C.F_ITEM_CLIENT: ["recC"], C.F_ITEM_UPC: upc}
        base.update(fields)
        return {"id": rid, "fields": base}

    def test_an_unknown_identifier_creates_a_product(self):
        with patch.object(routes.airtable, "create_record", return_value=self._record()) as create:
            record, outcome, filled = routes.merge_product(
                "recC", "036800120457", {"name": "Vinegar"}, records=[])
        self.assertEqual(outcome, "created")
        self.assertIn("name", filled)
        self.assertEqual(create.call_args.args[1][C.F_ITEM_CLIENT], ["recC"])

    def test_a_known_identifier_is_never_duplicated(self):
        existing = [self._record(**{C.F_ITEM_NAME: "Vinegar"})]
        with patch.object(routes.airtable, "create_record") as create:
            _record, outcome, _filled = routes.merge_product(
                "recC", "036800120457", {"name": "Vinegar"}, records=existing)
        create.assert_not_called()
        self.assertEqual(outcome, "unchanged")

    def test_leading_zeros_still_find_the_existing_product(self):
        existing = [self._record(upc="036800120457", **{C.F_ITEM_NAME: "Vinegar"})]
        with patch.object(routes.airtable, "create_record") as create:
            _r, outcome, _f = routes.merge_product("recC", "36800120457", {"name": "Vinegar"},
                                                   records=existing)
        create.assert_not_called()
        self.assertEqual(outcome, "unchanged")

    def test_a_contribution_fills_gaps_only(self):
        existing = [self._record(**{C.F_ITEM_NAME: "Observed at receiving"})]
        with patch.object(routes.airtable, "update_record",
                          return_value=self._record()) as update:
            _r, outcome, filled = routes.merge_product(
                "recC", "036800120457",
                {"name": "From a form", "wkftJobNumber": "26012199"}, records=existing)

        self.assertEqual(outcome, "filled")
        self.assertEqual(filled, ["wkftJobNumber"])
        written = update.call_args.args[2]
        # The name receiving observed is not rewritten by a form arriving later.
        self.assertNotIn(C.F_ITEM_NAME, written)
        self.assertEqual(written[C.F_ITEM_WKFT_JOB_NUMBER], "26012199")

    def test_blank_contributions_are_not_gaps_to_fill(self):
        existing = [self._record()]
        with patch.object(routes.airtable, "update_record") as update:
            _r, outcome, _f = routes.merge_product("recC", "036800120457",
                                                   {"name": "", "wkftJobNumber": "   "},
                                                   records=existing)
        update.assert_not_called()
        self.assertEqual(outcome, "unchanged")

    def test_another_client_is_a_different_product(self):
        theirs = [self._record()]
        theirs[0]["fields"][C.F_ITEM_CLIENT] = ["recOther"]
        with patch.object(routes.airtable, "create_record", return_value=self._record()) as create:
            _r, outcome, _f = routes.merge_product("recC", "036800120457", {"name": "V"},
                                                   records=theirs)
        create.assert_called_once()
        self.assertEqual(outcome, "created")

    def test_no_identifier_is_refused(self):
        with self.assertRaises(ValueError):
            routes.merge_product("recC", "NO UPC?", {"name": "Mystery"}, records=[])


if __name__ == "__main__":
    unittest.main()


class MergeProvenanceTests(unittest.TestCase):
    """Provenance rides along in the same write. Recording it is not worth a second
    API call, and never worth failing a merge over."""

    def test_provenance_is_written_with_the_record_not_after_it(self):
        with patch.object(routes.airtable, "create_record",
                          return_value={"id": "recP", "fields": {}}) as create:
            routes.merge_product("recC", "036800120457", {"name": "V"},
                                 source="structureForm:a.pdf", records=[])
        written = create.call_args.args[1]
        self.assertIn(C.F_ITEM_REFERENCE_DATA, written)
        self.assertIn("structureForm:a.pdf", written[C.F_ITEM_REFERENCE_DATA])

    def test_each_field_records_which_source_answered_it(self):
        import json
        payload = routes._product_reference_data({}, "structureForm:a.pdf",
                                                 ["name", "wkftJobNumber"], created=True)
        contributions = json.loads(payload)["_contributions"]
        self.assertEqual(set(contributions), {"name", "wkftJobNumber"})
        self.assertEqual(contributions["name"]["source"], "structureForm:a.pdf")

    def test_the_first_source_to_answer_a_field_keeps_the_credit(self):
        import json
        first = json.loads(routes._product_reference_data({}, "receiving", ["name"], created=True))
        second = json.loads(routes._product_reference_data(first, "structureForm:a.pdf",
                                                           ["name"], created=False))
        self.assertEqual(second["_contributions"]["name"]["source"], "receiving")

    def test_caller_reference_data_is_preserved(self):
        import json
        payload = routes._product_reference_data(
            {}, "structureForm:a.pdf", ["name"], created=True,
            reference={"_structureForm": {"fileName": "a.pdf"}})
        self.assertEqual(json.loads(payload)["_structureForm"]["fileName"], "a.pdf")

    def test_no_source_and_no_reference_writes_nothing(self):
        self.assertEqual(routes._product_reference_data({}, "", ["name"], created=True), "")


class IntakeLookupTests(unittest.TestCase):
    """The sheet import used to index Identifier alone, with exact string matching.
    A Product created from a Structure Form carries a UPC and no Identifier, so the
    import could not see it and made a second record for the same SKU."""

    def _index(self, records):
        with patch.object(routes, "_list_all_records", return_value=records), \
             patch.object(routes, "_filter_by_client_field", side_effect=lambda r, _f: r):
            return routes._existing_items_by_identifier("recC")

    def test_a_product_with_only_a_upc_is_found(self):
        form_made = [{"id": "recP", "fields": {C.F_ITEM_CLIENT: ["recC"],
                                               C.F_ITEM_UPC: "036800120457"}}]
        index = self._index(form_made)
        self.assertIsNotNone(routes._existing_item_for(index, "036800120457"))

    def test_a_stripped_leading_zero_still_finds_it(self):
        form_made = [{"id": "recP", "fields": {C.F_ITEM_CLIENT: ["recC"],
                                               C.F_ITEM_UPC: "036800120457"}}]
        index = self._index(form_made)
        # What the spreadsheet gives, having stored the code as a number.
        self.assertIsNotNone(routes._existing_item_for(index, "36800120457"))

    def test_a_product_with_only_an_identifier_is_still_found(self):
        older = [{"id": "recP", "fields": {C.F_ITEM_CLIENT: ["recC"],
                                           C.F_ITEM_IDENTIFIER: "036800120457"}}]
        index = self._index(older)
        self.assertIsNotNone(routes._existing_item_for(index, "036800120457"))

    def test_a_different_code_is_not_found(self):
        index = self._index([{"id": "recP", "fields": {C.F_ITEM_CLIENT: ["recC"],
                                                       C.F_ITEM_UPC: "036800120457"}}])
        # One digit apart, and a different product.
        self.assertIsNone(routes._existing_item_for(index, "036800120458"))

    def test_nothing_to_look_up_finds_nothing(self):
        self.assertIsNone(routes._existing_item_for({}, ""))
        self.assertIsNone(routes._existing_item_for({}, None))


class CreateItemEndpointTests(unittest.TestCase):
    """POST /api/items created without looking, which is how one SKU acquires two
    records. It goes through the merge like every other path now."""

    def setUp(self):
        from app import create_app
        from routes import AUTH_SESSION_KEY
        self.client = create_app().test_client()
        with self.client.session_transaction() as session:
            session[AUTH_SESSION_KEY] = {"id": "recU", "name": "P", "displayName": "P",
                                         "role": "Admin", "active": True,
                                         "clientIds": [], "allClients": True}

    def _post(self, body, existing=None):
        record = {"id": "recNew", "fields": {C.F_ITEM_IDENTIFIER: body.get("primaryMatchKey", "")}}
        with patch.object(routes, "_list_all_records", return_value=existing or []), \
             patch.object(routes, "_client_permitted", return_value=True), \
             patch.object(routes, "_client_config", return_value={}), \
             patch.object(routes, "_clients_by_id", return_value={}), \
             patch.object(routes, "_issues_by_item_id", return_value={}), \
             patch.object(routes, "_create_history_event"), \
             patch.object(routes.airtable, "create_record", return_value=record) as create, \
             patch.object(routes.airtable, "update_record", return_value=record) as update:
            response = self.client.post("/api/items", json=body)
        return response, create, update

    def test_a_new_identifier_creates_and_reports_201(self):
        response, create, _ = self._post({"clientId": "recC", "primaryMatchKey": "036800120457",
                                          "name": "Vinegar"})
        self.assertEqual(response.status_code, 201)
        create.assert_called_once()

    def test_both_identifier_fields_are_written(self):
        _response, create, _ = self._post({"clientId": "recC", "primaryMatchKey": "036800120457",
                                           "name": "Vinegar"})
        written = create.call_args.args[1]
        self.assertEqual(written[C.F_ITEM_UPC], "036800120457")
        self.assertEqual(written[C.F_ITEM_IDENTIFIER], "036800120457")

    def test_a_known_identifier_does_not_create_a_second_record(self):
        existing = [{"id": "recP", "fields": {C.F_ITEM_CLIENT: ["recC"],
                                              C.F_ITEM_UPC: "036800120457",
                                              C.F_ITEM_NAME: "Vinegar"}}]
        response, create, _ = self._post({"clientId": "recC", "primaryMatchKey": "036800120457",
                                          "name": "Vinegar"}, existing=existing)
        create.assert_not_called()
        self.assertEqual(response.status_code, 200)

    def test_a_stripped_leading_zero_finds_the_existing_product(self):
        existing = [{"id": "recP", "fields": {C.F_ITEM_CLIENT: ["recC"],
                                              C.F_ITEM_UPC: "036800120457",
                                              C.F_ITEM_NAME: "Vinegar"}}]
        response, create, _ = self._post({"clientId": "recC", "primaryMatchKey": "36800120457",
                                          "name": "Vinegar"}, existing=existing)
        create.assert_not_called()
        self.assertEqual(response.status_code, 200)
