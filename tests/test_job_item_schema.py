import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import config as C  # noqa: E402
from routes import (  # noqa: E402
    WORKSTREAM_DEFINITIONS,
    _apply_item_fields,
    _work_order_fields,
    _build_intake_plan_from_source_rows,
    _item_fields_from_row,
    _item_match_score,
    _job_fields_from_plan,
    _mapping_from_ui_mapping,
    _normalize_description,
    _normalize_item_job_number,
    _normalize_master_or_variant,
    _shape_workstream,
    _shape_work_order,
    _shape_item,
    _shape_job,
)


class JobItemSchemaTests(unittest.TestCase):
    def test_workstream_registry_contains_only_initial_work_order_workstreams(self):
        self.assertEqual(
            [definition["label"] for definition in WORKSTREAM_DEFINITIONS],
            ["Ecomm Photo", "Packaging Photo", "Thr3d"],
        )
        self.assertEqual(
            [definition["id"] for definition in WORKSTREAM_DEFINITIONS],
            ["ecomm-photo", "packaging-photo", "thr3d"],
        )

    def test_work_order_config_uses_canonical_table_and_field_names(self):
        self.assertEqual(C.Config.WORK_ORDERS_TABLE, "Work Orders")
        self.assertEqual(C.Config.WORKSTREAM_ASSIGNMENTS_TABLE, C.Config.WORK_ORDERS_TABLE)
        self.assertEqual(C.Config.F_WORK_ORDER_NAME, "Work Order")
        self.assertEqual(C.Config.F_WORK_ORDER_TYPE, "Work Order Type")
        self.assertEqual(C.Config.F_WORK_ORDER_WORKFLOW_TEMPLATE, "Workflow Template")
        self.assertEqual(C.Config.F_WORK_ORDER_CURRENT_WORKFLOW_STAGE, "Current Workflow Stage")
        self.assertEqual(C.Config.F_WORK_ORDER_CURRENT_STAGE, "Current Stage")
        self.assertEqual(C.Config.F_WORK_ORDER_CURRENT_GATE, C.Config.F_WORK_ORDER_CURRENT_STAGE)

    def test_work_order_fields_attach_work_not_duplicate_merchandise(self):
        entry = {
            "id": "recMerch",
            "fields": {C.Config.F_RECEIPT_ENTRY_NAME: "Apple Fritter Donut Bites"},
        }
        fields = _work_order_fields(entry, {"id": "recWorkstream", "label": "Packaging Photo", "workflowTemplate": "packaging-review"})

        self.assertEqual(fields[C.Config.F_WORK_ORDER_MERCHANDISE], ["recMerch"])
        self.assertEqual(fields[C.Config.F_WORK_ORDER_WORKSTREAM], ["recWorkstream"])
        self.assertEqual(fields[C.Config.F_WORK_ORDER_WORKFLOW], "packaging-review")
        self.assertEqual(fields[C.Config.F_WORK_ORDER_CURRENT_GATE], "new-review")
        self.assertEqual(fields[C.Config.F_WORK_ORDER_CURRENT_OWNER], "Project Management")
        self.assertIn("Packaging Photo", fields[C.Config.F_WORK_ORDER_NAME])
        self.assertNotIn(C.Config.F_RECEIPT_ENTRY_NAME, fields)

    def test_work_order_shape_keeps_work_state_independent(self):
        workstream = _shape_workstream({
            "id": "recWorkstream",
            "fields": {
                C.Config.F_WORKSTREAM_NAME: "Ecomm Photo",
                C.Config.F_WORKSTREAM_WORKFLOW_TEMPLATE: "ecomm-review",
                C.Config.F_WORKSTREAM_CONFIGURATION: '{"id": "ecomm-photo", "requiredReviewData": ["product-information"]}',
            },
        })
        shaped = _shape_work_order({
            "id": "recWorkOrder",
            "fields": {
                C.Config.F_WORK_ORDER_NAME: "Donut Bites - Ecomm Photo",
                C.Config.F_WORK_ORDER_MERCHANDISE: ["recMerch"],
                C.Config.F_WORK_ORDER_WORKSTREAM: ["recWorkstream"],
                C.Config.F_WORK_ORDER_WORKFLOW: "ecomm-review",
                C.Config.F_WORK_ORDER_CURRENT_GATE: "ready-production",
                C.Config.F_WORK_ORDER_CURRENT_OWNER: "Project Management",
                C.Config.F_WORK_ORDER_CURRENT_STATUS: "ready",
                C.Config.F_WORK_ORDER_READINESS_METADATA: '[{"key": "product-information", "satisfied": true}]',
                C.Config.F_WORK_ORDER_BLOCKING_REQUIREMENTS: "[]",
            },
        }, workstreams_by_id={"recWorkstream": workstream})

        self.assertEqual(shaped["merchandiseIds"], ["recMerch"])
        self.assertEqual(shaped["workstreamKey"], "ecomm-photo")
        self.assertEqual(shaped["workstreamLabel"], "Ecomm Photo")
        self.assertEqual(shaped["workflowId"], "ecomm-review")
        self.assertEqual(shaped["currentStage"], "ready-production")
        self.assertEqual(shaped["currentGate"], "ready-production")
        self.assertEqual(shaped["currentStatus"], "ready")
        self.assertEqual(shaped["readiness"][0]["key"], "product-information")

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
                C.Config.F_ITEM_JOB_NUMBER: "00-ABC-123",
                C.Config.F_ITEM_DESCRIPTION: "Whole milk gallon",
                C.Config.F_ITEM_OUTPUT: "Photo Only",
                C.Config.F_ITEM_MASTER_VARIANT: "Variant",
                C.Config.F_ITEM_PICKUP_JOB_NUMBER: "OLD-001",
            },
        })

        self.assertEqual(shaped["itemJobNumber"], "00-ABC-123")
        self.assertEqual(shaped["description"], "Whole milk gallon")
        self.assertEqual(shaped["workstream"], "Photo Only")
        self.assertEqual(shaped["output"], "Photo Only")
        self.assertEqual(shaped["masterOrVariant"], "Variant")
        self.assertEqual(shaped["pickupJobNumber"], "OLD-001")

    def test_item_fields_preserve_item_metadata(self):
        fields = {}
        _apply_item_fields(fields, {
            "itemJobNumber": "  00-ABC-123  ",
            "description": "  Line one\r\nLine two  ",
            "output": "photo",
            "masterOrVariant": "v",
            "pickupJobNumber": "  OLD-001  ",
        })

        self.assertEqual(fields[C.Config.F_ITEM_JOB_NUMBER], "00-ABC-123")
        self.assertEqual(fields[C.Config.F_ITEM_DESCRIPTION], "Line one\nLine two")
        self.assertEqual(fields[C.Config.F_ITEM_OUTPUT], "Photo Only")
        self.assertEqual(fields[C.Config.F_ITEM_MASTER_VARIANT], "Variant")
        self.assertEqual(fields[C.Config.F_ITEM_PICKUP_JOB_NUMBER], "OLD-001")

    def test_item_fields_from_import_row_persist_new_fields(self):
        fields = _item_fields_from_row("recClient", "recJob", {
            "itemName": "Milk",
            "id": "012345678901",
            "product": "",
            "status": "New",
            "itemJobNumber": "000-ABC",
            "description": "Organic whole milk",
            "output": "Render Only",
            "masterOrVariant": "Master",
            "pickupJobNumber": "PICK-123",
        })

        self.assertEqual(fields[C.Config.F_ITEM_JOB_NUMBER], "000-ABC")
        self.assertEqual(fields[C.Config.F_ITEM_DESCRIPTION], "Organic whole milk")
        self.assertEqual(fields[C.Config.F_ITEM_OUTPUT], "Render Only")
        self.assertEqual(fields[C.Config.F_ITEM_MASTER_VARIANT], "Master")
        self.assertEqual(fields[C.Config.F_ITEM_PICKUP_JOB_NUMBER], "PICK-123")

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
                C.Config.F_CLIENT_REQUIRED_PHOTO_FIELDS: ["Identifier"],
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
                C.Config.F_CLIENT_REQUIRED_PHOTO_FIELDS: ["Identifier"],
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
                C.Config.F_CLIENT_REQUIRED_PHOTO_FIELDS: ["Identifier"],
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

    def test_normalizers_do_not_coerce_values(self):
        self.assertEqual(_normalize_item_job_number("  000-AB-12  "), "000-AB-12")
        self.assertEqual(_normalize_description("  A\rB\r\nC  "), "A\nB\nC")
        self.assertEqual(_normalize_master_or_variant("m"), "Master")
        self.assertEqual(_normalize_master_or_variant("Variant"), "Variant")


if __name__ == "__main__":
    unittest.main()
