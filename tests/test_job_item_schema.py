import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import config as C  # noqa: E402
from routes import (  # noqa: E402
    _apply_item_fields,
    _build_intake_plan_from_source_rows,
    _item_fields_from_row,
    _item_match_score,
    _job_fields_from_plan,
    _mapping_from_ui_mapping,
    _normalize_description,
    _normalize_item_job_number,
    _normalize_master_or_variant,
    _normalize_product_request_type,
    _shape_receipt_entry,
    _shape_item,
    _shape_job,
)


class JobItemSchemaTests(unittest.TestCase):
    def test_update_item_surfaces_airtable_errors(self):
        routes_source = (Path(__file__).resolve().parents[1] / "backend" / "routes.py").read_text()
        update_item_source = routes_source.split("def update_item(record_id):", 1)[1].split("@api.delete", 1)[0]

        self.assertIn("except requests.HTTPError as error:", update_item_source)
        self.assertIn("return airtable_err(error)", update_item_source)

    def test_update_item_typecasts_product_select_fields(self):
        routes_source = (Path(__file__).resolve().parents[1] / "backend" / "routes.py").read_text()
        update_item_source = routes_source.split("def update_item(record_id):", 1)[1].split("@api.delete", 1)[0]

        self.assertIn("PRODUCT_TYPECAST_FIELDS", routes_source)
        self.assertIn("typecast=any(field in PRODUCT_TYPECAST_FIELDS and fields[field] is not None for field in fields)", update_item_source)

    def test_update_item_exposes_products_patch_alias(self):
        routes_source = (Path(__file__).resolve().parents[1] / "backend" / "routes.py").read_text()
        update_item_source = routes_source.split("def update_item(record_id):", 1)[0].split("@api.delete", 1)[-1]

        self.assertIn('@api.patch("/products/<record_id>")', update_item_source)

    def test_legacy_work_order_config_is_not_exposed(self):
        legacy_attrs = [
            "WORK_ORDERS_TABLE",
            "WORKSTREAM_ASSIGNMENTS_TABLE",
            "WORKFLOW_TEMPLATES_TABLE",
            "WORKFLOW_STAGES_TABLE",
            "WORK_ORDER_TYPES_TABLE",
            "F_ITEM_WORKSTREAM",
            "F_ITEM_OUTPUT",
        ]
        for attr in legacy_attrs:
            self.assertFalse(hasattr(C.Config, attr), attr)

    def test_job_shape_returns_parent_job_number(self):
        shaped = _shape_job({
            "id": "recJob",
            "fields": {
                C.Config.F_JOB_NAME: "July Intake",
                C.Config.F_JOB_PARENT_NUMBER: "PARENT-001",
                C.Config.F_JOB_PERIOD: "Q1 2026",
            },
        })

        self.assertEqual(shaped["parentJobNumber"], "PARENT-001")
        self.assertEqual(shaped["period"], "Q1 2026")

    def test_job_fields_do_not_copy_group_key_to_parent_number(self):
        fields = _job_fields_from_plan("recClient", {
            "jobName": "July Intake",
            "extId": "GROUP-001",
        })

        self.assertNotIn(C.Config.F_JOB_PARENT_NUMBER, fields)
        self.assertNotIn("Output Type", fields)

    def test_job_fields_write_explicit_parent_number(self):
        fields = _job_fields_from_plan("recClient", {
            "jobName": "July Intake",
            "extId": "GROUP-001",
            "parentJobNumber": "PARENT-001",
        })

        self.assertEqual(fields[C.Config.F_JOB_PARENT_NUMBER], "PARENT-001")

    def test_item_shape_returns_item_job_number_and_description(self):
        shaped = _shape_item({
            "id": "recItem",
            "fields": {
                C.Config.F_ITEM_NAME: "Milk",
                C.Config.F_ITEM_IDENTIFIER: "012345678901",
                C.Config.F_ITEM_JOB_NUMBER: "00-ABC-123",
                C.Config.F_ITEM_DESCRIPTION: "Whole milk gallon",
                C.Config.F_ITEM_MASTER_VARIANT: "Variant",
                C.Config.F_ITEM_PICKUP_JOB_NUMBER: "OLD-001",
            },
        })

        self.assertEqual(shaped["itemJobNumber"], "00-ABC-123")
        self.assertEqual(shaped["primaryMatchKey"], "012345678901")
        self.assertEqual(shaped["identifier"], "012345678901")
        self.assertEqual(shaped["primaryMatchKeyLabel"], "Primary Match Key")
        self.assertEqual(shaped["description"], "Whole milk gallon")
        self.assertNotIn("workstream", shaped)
        self.assertNotIn("output", shaped)
        self.assertEqual(shaped["masterOrVariant"], "Variant")
        self.assertEqual(shaped["pickupJobNumber"], "OLD-001")

    def test_item_fields_preserve_item_metadata(self):
        fields = {}
        _apply_item_fields(fields, {
            "itemJobNumber": "  00-ABC-123  ",
            "description": "  Line one\r\nLine two  ",
            "masterOrVariant": "v",
            "pickupJobNumber": "  OLD-001  ",
        })

        self.assertEqual(fields[C.Config.F_ITEM_JOB_NUMBER], "00-ABC-123")
        self.assertEqual(fields[C.Config.F_ITEM_DESCRIPTION], "Line one\nLine two")
        self.assertEqual(fields[C.Config.F_ITEM_MASTER_VARIANT], "Variant")
        self.assertEqual(fields[C.Config.F_ITEM_PICKUP_JOB_NUMBER], "OLD-001")

    def test_blank_product_select_edits_do_not_write_fields(self):
        fields = {}
        _apply_item_fields(fields, {
            "requestType": "",
            "productType": "   ",
            "masterOrVariant": "",
        })

        self.assertNotIn(C.Config.F_ITEM_REQUEST_TYPE, fields)
        self.assertNotIn(C.Config.F_ITEM_PRODUCT_TYPE, fields)
        self.assertNotIn(C.Config.F_ITEM_MASTER_VARIANT, fields)

    def test_item_fields_from_import_row_persist_new_fields(self):
        fields = _item_fields_from_row("recClient", "recJob", {
            "itemName": "Milk",
            "id": "012345678901",
            "product": "",
            "status": "New",
            "itemJobNumber": "000-ABC",
            "description": "Organic whole milk",
            "masterOrVariant": "Master",
            "pickupJobNumber": "PICK-123",
        })

        self.assertEqual(fields[C.Config.F_ITEM_JOB_NUMBER], "000-ABC")
        self.assertEqual(fields[C.Config.F_ITEM_DESCRIPTION], "Organic whole milk")
        self.assertEqual(fields[C.Config.F_ITEM_MASTER_VARIANT], "Master")
        self.assertEqual(fields[C.Config.F_ITEM_PICKUP_JOB_NUMBER], "PICK-123")

    def test_product_type_normalizes_known_tracker_typo(self):
        fields = _item_fields_from_row("recClient", "", {
            "itemName": "Toothpaste",
            "productType": '"Refridgeration Req"',
        })

        self.assertEqual(fields[C.Config.F_ITEM_PRODUCT_TYPE], "Refridgeration Req")

    def test_request_type_normalizes_tracker_choices(self):
        self.assertEqual(_normalize_product_request_type("Ecomm only"), "Ecomm only")
        self.assertEqual(_normalize_product_request_type("Pack only"), "Pack only")
        self.assertEqual(_normalize_product_request_type("Thr3d only"), "Thr3d only")
        self.assertEqual(_normalize_product_request_type("Pack & Thr3d"), "Pack & Thr3d")
        self.assertEqual(_normalize_product_request_type("Ecomm & Pack"), "Ecomm & Pack")
        self.assertEqual(_normalize_product_request_type("Packaging and ThreeD"), "Pack & Thr3d")

    def test_item_fields_from_import_row_persist_request_type_choice(self):
        fields = _item_fields_from_row("recClient", "", {
            "itemName": "Toothpaste",
            "requestType": '"pack and thr3d"',
        })

        self.assertEqual(fields[C.Config.F_ITEM_REQUEST_TYPE], "Pack & Thr3d")

    def test_mapping_treats_spreadsheet_job_number_as_item_job_number(self):
        mapping = _mapping_from_ui_mapping({
            "__singleJobName": "July Intake",
            "__targetMapping": {
                "Identifier": "UPC",
                "Job Number": "Project Number",
                "Description": "Product Received",
            },
        })

        self.assertEqual(mapping["item_job_number"], "Project Number")
        self.assertNotIn("parent_job_number", mapping)

    def test_import_plan_keeps_row_job_number_on_item_not_parent_job(self):
        client_record = {
            "id": "recClient",
            "fields": {
                C.Config.F_CLIENT_NAME: "UNFI",
                C.Config.F_CLIENT_IDENTIFIER_TYPE: "UPC-12",
                C.Config.F_CLIENT_REQUIRED_TO_SHOOT: ["Identifier"],
            },
        }
        source_rows = [["PRJ-260701", "041900310012", "Organic Honey Oat Cereal"]]
        mapping = {
            "__singleJobName": "UNFI July Intake",
            "__targetMapping": {
                "Item Job Number": "Project Number",
                "Identifier": "UPC",
                "Description": "Description",
            },
        }

        with patch("routes._client_record", return_value=client_record), \
             patch("routes._client_permitted", return_value=True), \
             patch("routes._existing_jobs_by_lookup", return_value={}), \
             patch("routes._existing_items_by_identifier", return_value={}):
            plan = _build_intake_plan_from_source_rows(
                "recClient",
                "UNFI.csv",
                ["Project Number", "UPC", "Description"],
                source_rows,
                mapping,
            )

        self.assertEqual(plan["jobsDetected"], 1)
        self.assertEqual(plan["jobsPreview"][0].get("parentJobNumber"), "")
        self.assertEqual(plan["rows"][0]["itemJobNumber"], "PRJ-260701")
        self.assertEqual(plan["rows"][0]["description"], "Organic Honey Oat Cereal")

    def test_import_plan_uses_selected_existing_job_container(self):
        client_record = {
            "id": "recClient",
            "fields": {
                C.Config.F_CLIENT_NAME: "UNFI",
                C.Config.F_CLIENT_IDENTIFIER_TYPE: "UPC-12",
                C.Config.F_CLIENT_REQUIRED_TO_SHOOT: ["Identifier"],
            },
        }
        mapping = {
            "__existingJobId": "recExistingJob",
            "__existingJobName": "UNFI July Intake",
            "__targetMapping": {
                "Item Job Number": "Project Number",
                "Identifier": "UPC",
            },
        }

        with patch("routes._client_record", return_value=client_record), \
             patch("routes._client_permitted", return_value=True), \
             patch("routes._existing_jobs_by_lookup", return_value={}), \
             patch("routes._existing_items_by_identifier", return_value={}):
            plan = _build_intake_plan_from_source_rows(
                "recClient",
                "UNFI.csv",
                ["Project Number", "UPC"],
                [["PRJ-260701", "041900310012"]],
                mapping,
            )

        self.assertEqual(plan["jobsDetected"], 1)
        self.assertEqual(plan["jobsPreview"][0]["existingId"], "recExistingJob")
        self.assertEqual(plan["rows"][0]["existingJobId"], "recExistingJob")
        self.assertEqual(plan["rows"][0]["itemJobNumber"], "PRJ-260701")

    def test_import_plan_groups_items_by_selected_source_field(self):
        client_record = {
            "id": "recClient",
            "fields": {
                C.Config.F_CLIENT_NAME: "Kroger",
                C.Config.F_CLIENT_IDENTIFIER_TYPE: "UPC-12",
                C.Config.F_CLIENT_REQUIRED_TO_SHOOT: ["Identifier"],
            },
        }
        mapping = {
            "__jobGroupField": "Description",
            "__targetMapping": {
                "Item Job Number": "Job #",
                "Identifier": "UPC",
                "Description": "Description",
            },
        }

        with patch("routes._client_record", return_value=client_record), \
             patch("routes._client_permitted", return_value=True), \
             patch("routes._existing_jobs_by_lookup", return_value={}), \
             patch("routes._existing_items_by_identifier", return_value={}):
            plan = _build_intake_plan_from_source_rows(
                "recClient",
                "Kroger.csv",
                ["Job #", "Description", "UPC"],
                [
                    ["8123456", "Summer Dairy Refresh", "036800123401"],
                    ["8123457", "Plant Based Beverages", "036800223408"],
                    ["8123458", "Summer Dairy Refresh", "036800123418"],
                ],
                mapping,
            )

        self.assertEqual(plan["jobsDetected"], 2)
        self.assertEqual({job["extId"] for job in plan["jobsPreview"]}, {"Summer Dairy Refresh", "Plant Based Beverages"})
        self.assertEqual(plan["rows"][0]["extId"], "Summer Dairy Refresh")
        self.assertEqual(plan["rows"][0]["itemJobNumber"], "8123456")
        self.assertEqual(plan["rows"][0]["description"], "Summer Dairy Refresh")

    def test_item_search_matches_new_fields(self):
        self.assertGreater(_item_match_score({"itemJobNumber": "PRJ-260701"}, "prj-260701"), 0)
        self.assertGreater(_item_match_score({"description": "Organic honey cereal"}, "honey"), 0)

    def test_item_search_prefers_identifier_prefix_over_contains(self):
        prefix_score = _item_match_score({"identifier": "36800088719", "name": "Applesauce Cups Original"}, "368")
        contains_score = _item_match_score({"identifier": "036800030077", "name": "PAWS Strawberry Toy"}, "368")

        self.assertGreater(prefix_score, contains_score)

    def test_receipt_entry_shape_uses_linked_product_for_matched_product_name(self):
        product = {
            "id": "recProduct",
            "fields": {
                C.Config.F_ITEM_NAME: "Applesauce Cups Original 4oz 6pk",
                C.Config.F_ITEM_IDENTIFIER: "36800088719",
            },
        }
        shaped = _shape_receipt_entry({
            "id": "recMerch",
            "fields": {
                C.Config.F_RECEIPT_ENTRY_NAME: "applesauce",
                C.Config.F_RECEIPT_ENTRY_SKU_ID: "36800088719",
                C.Config.F_RECEIPT_ENTRY_ITEM: ["recProduct"],
            },
        }, products_by_id={"recProduct": product})

        self.assertEqual(shaped["productName"], "applesauce")
        self.assertEqual(shaped["matchedProduct"]["name"], "Applesauce Cups Original 4oz 6pk")
        self.assertEqual(shaped["matchedProduct"]["identifier"], "36800088719")

    def test_normalizers_do_not_coerce_values(self):
        self.assertEqual(_normalize_item_job_number("  000-AB-12  "), "000-AB-12")
        self.assertEqual(_normalize_description("  A\rB\r\nC  "), "A\nB\nC")
        self.assertEqual(_normalize_master_or_variant("m"), "Master")
        self.assertEqual(_normalize_master_or_variant("Variant"), "Variant")

    def test_product_photo_job_number_uses_live_wkft_field(self):
        self.assertEqual(C.Config.F_ITEM_JOB_NUMBER, C.Config.F_ITEM_WKFT_JOB_NUMBER)


if __name__ == "__main__":
    unittest.main()
