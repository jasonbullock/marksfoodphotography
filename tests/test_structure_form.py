import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from structure_form import (  # noqa: E402
    answered,
    parse_sku_lines,
    parse_structure_form,
    propose_request_type,
)


# Shapes taken from real Topco forms. The values matter; the PDFs are client documents
# and are not kept in the repository.
PACKAGING_ONLY = {
    "Project": "26007267 | CF Ice Cream Scrounds DFA - MI002048",
    "Supplier": " DAIRY FARMERS OF AMERICA",
    "Scope": "Packaging & Photography",
    "Studio": "Walnut",
    "Ingredients": "Select",
    "SKU Information": ("ICE CREAM TRIPLE VANILLA SCR 48 OZ 036800031524\r"
                        "ICE CREAM BROWN COW SCR 48 OZ 036800031531"),
}

PACKAGING_AND_THR3D = {
    "Project": "  FC RD Pasta WLF - MI002240 ",
    "Supplier": " Winland Foods",
    "Scope": "Packaging, Photo, eComm Image Bundles",
    "Studio": "Walnut",
    "Sample Type": "In final packaging only; include product fill",
    "SKU Information": ("PASTA CAVATAPPI BOX 16 oz 036800032866\r"
                        "PASTA ORZO BOX 16 OZ 036800032859\r\r"
                        "Please send two samples to Th3rd for CGI renders.\r\r"
                        "Address: \rThr3d - SGS & Co\rAttn: James Puckett\r"
                        "7435 Empire Drive\rFlorence, KY 41042"),
}

# The short template: fifteen fields, no Scope, and Studio typed as free text.
CGI_ONLY = {
    "Project": "\xa0S6 Holiday Shortbread Cookies BVF - MI002048\n\n",
    "Supplier": "BAY VALLEY FOODS LLC\n",
    "Studio": "CGI",
    "SKU Information": "COOKIES SNL HOLIDAY SHORTBREAD 15CT 9.5 OZ 011225016035",
}


class StructureFormParsingTests(unittest.TestCase):
    def test_sku_lines_are_separated_from_the_prose_beside_them(self):
        skus = parse_sku_lines(PACKAGING_AND_THR3D["SKU Information"])
        self.assertEqual([s["upc"] for s in skus], ["036800032866", "036800032859"])
        self.assertEqual(skus[0]["name"], "PASTA CAVATAPPI BOX 16 oz")
        # The seven lines of shipping instructions carry no code and are not products.
        self.assertEqual(len(skus), 2)

    def test_placeholder_values_are_not_answers(self):
        # These are real dropdown options, and which one appears varies by template.
        for placeholder in ("Select", "Marks to complete", "Supplier to complete", "  "):
            self.assertFalse(answered(placeholder))
        self.assertTrue(answered("Walnut"))

    def test_identifiers_are_pulled_out_of_the_project_string(self):
        plan = parse_structure_form(PACKAGING_ONLY)
        self.assertEqual(plan["header"]["mboxNumber"], "MI002048")
        self.assertEqual(plan["header"]["wkftJobNumber"], "26007267")

    def test_one_row_per_sku_carrying_the_form_header(self):
        plan = parse_structure_form(PACKAGING_ONLY)
        self.assertEqual(len(plan["rows"]), 2)
        self.assertTrue(all(row["mboxNumber"] == "MI002048" for row in plan["rows"]))
        self.assertEqual(plan["header"]["supplier"], "DAIRY FARMERS OF AMERICA")

    def test_unanswered_fields_do_not_become_data(self):
        plan = parse_structure_form({**PACKAGING_ONLY, "Supplier": "Supplier to complete"})
        self.assertEqual(plan["header"]["supplier"], "")


class StructureFormProposalTests(unittest.TestCase):
    """The form never states who produces the eComm bundles, so this is a proposal."""

    def test_packaging_only_scope(self):
        plan = parse_structure_form(PACKAGING_ONLY)
        self.assertEqual(plan["requestTypeProposed"], "Pack only")
        self.assertEqual(plan["thr3dEvidence"], [])

    def test_ecomm_with_a_thr3d_note_proposes_a_split(self):
        plan = parse_structure_form(PACKAGING_AND_THR3D)
        self.assertEqual(plan["requestTypeProposed"], "Pack & Thr3d")
        quoted = [item["text"] for item in plan["thr3dEvidence"]]
        self.assertIn("Please send two samples to Th3rd for CGI renders.", quoted)

    def test_ecomm_without_a_thr3d_note_stays_with_walnut(self):
        fields = {**PACKAGING_AND_THR3D,
                  "SKU Information": "PASTA ORZO BOX 16 OZ 036800032859"}
        self.assertEqual(parse_structure_form(fields)["requestTypeProposed"], "Ecomm & Pack")

    def test_the_short_template_falls_back_to_studio(self):
        plan = parse_structure_form(CGI_ONLY)
        self.assertEqual(plan["requestTypeProposed"], "Thr3d only")

    def test_nothing_is_proposed_without_usable_evidence(self):
        proposal, reason = propose_request_type({"Scope": "Marks to complete"}, False)
        self.assertEqual(proposal, "")
        self.assertIn("no usable scope", reason)


if __name__ == "__main__":
    unittest.main()


class StructureFormCommitTests(unittest.TestCase):
    """Committing creates Products only — a form is not a delivery."""

    def setUp(self):
        from app import create_app
        from routes import AUTH_SESSION_KEY
        self.app = create_app().test_client()
        with self.app.session_transaction() as session:
            session[AUTH_SESSION_KEY] = {"id": "recUser", "name": "Test", "displayName": "Test",
                                         "role": "Admin", "active": True, "clientIds": [],
                                         "allClients": True}

    ROW = {"productName": "VEG CAN SAUERKRAUT 14.5 OZ", "upc": "036800441897",
           "mboxNumber": "MI002238", "studio": "Walnut", "supplier": "Great Lakes Kraut, Co.",
           "requestType": "Pack & Thr3d", "fileName": "form.pdf"}

    def _post(self, rows, existing=None):
        from unittest.mock import patch
        with patch("routes._client_permitted", return_value=True), \
             patch("routes._list_all_records", return_value=existing or []), \
             patch("routes._create_history_event"), \
             patch("routes.airtable.create_record", side_effect=lambda t, f, **k: {"id": "recNew", "fields": f}) as create, \
             patch("routes.airtable.update_record", side_effect=lambda t, i, f, **k: {"id": i, "fields": f}) as update:
            response = self.app.post("/api/intake/structure-form/commit",
                                     json={"clientId": "recClient", "rows": rows})
        return response, create, update

    def test_a_new_product_is_created_with_its_form_provenance(self):
        from config import Config as C
        response, create, _ = self._post([self.ROW])
        self.assertEqual(response.status_code, 201)
        fields = create.call_args.args[1]
        self.assertEqual(fields[C.F_ITEM_NAME], "VEG CAN SAUERKRAUT 14.5 OZ")
        self.assertEqual(fields[C.F_ITEM_UPC], "036800441897")
        self.assertEqual(fields[C.F_ITEM_STUDIO_DESTINATION], "Walnut")
        self.assertEqual(fields[C.F_ITEM_VENDOR], "Great Lakes Kraut, Co.")
        # Origin is recorded, so a form-created Product is not merely one lacking a
        # source snapshot.
        self.assertIn("_structureForm", fields[C.F_ITEM_REFERENCE_DATA])

    def test_a_known_upc_is_updated_rather_than_duplicated(self):
        from config import Config as C
        existing = [{"id": "recExisting", "fields": {C.F_ITEM_CLIENT: ["recClient"],
                                                     C.F_ITEM_UPC: "036800441897"}}]
        response, create, update = self._post([self.ROW], existing=existing)
        self.assertEqual(response.status_code, 201)
        create.assert_not_called()
        self.assertEqual(update.call_args.args[1], "recExisting")

    def test_the_sheet_keeps_ownership_of_request_type(self):
        from config import Config as C
        from unittest.mock import patch
        existing = [{"id": "recExisting", "fields": {C.F_ITEM_CLIENT: ["recClient"],
                                                     C.F_ITEM_UPC: "036800441897"}}]
        with patch("routes._source_snapshot_for_topco_product", return_value={"row": 4}):
            response, _, update = self._post([self.ROW], existing=existing)
        self.assertEqual(response.status_code, 201)
        # The form's guess must not overwrite a source-linked Product.
        self.assertNotIn(C.F_ITEM_REQUEST_TYPE, update.call_args.args[2])

    def test_rows_without_both_a_name_and_a_upc_are_skipped(self):
        response, create, _ = self._post([{"productName": "No code", "upc": ""}])
        self.assertEqual(response.status_code, 201)
        create.assert_not_called()
        self.assertEqual(response.get_json()["summary"]["skipped"], 1)

    def test_a_client_is_required(self):
        response = self.app.post("/api/intake/structure-form/commit",
                                 json={"clientId": "", "rows": [self.ROW]})
        self.assertEqual(response.status_code, 400)


class StructureFormDuplicateTests(unittest.TestCase):
    def test_a_repeated_code_is_one_product(self):
        # Forms list a SKU twice when two samples are wanted. That is a quantity,
        # not a second product, and creating it twice would write then rewrite.
        skus = parse_sku_lines(
            "COTTON SWAB PAPER CLUB PK(4X500CT) 2000 CT 036800400153\r"
            "COTTON SWAB PAPER CLUB PK(4X500CT) 2000 CT 036800400153"
        )
        self.assertEqual(len(skus), 1)
        self.assertEqual(skus[0]["upc"], "036800400153")

    def test_distinct_codes_are_kept(self):
        skus = parse_sku_lines("A 036800032866\rB 036800032859")
        self.assertEqual([s["upc"] for s in skus], ["036800032866", "036800032859"])
