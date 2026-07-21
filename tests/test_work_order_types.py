import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import Config as C  # noqa: E402
from routes import _shape_work_order, _work_order_fields  # noqa: E402
from work_order_types import (  # noqa: E402
    DEFAULT_WORK_ORDER_TYPE_KEY,
    WorkOrderTypeService,
    WorkOrderTypeValidationError,
)
from workflow_templates import WorkflowTemplateService  # noqa: E402


class FakeAirtable:
    def __init__(self):
        self.tables = {
            C.WORKFLOW_TEMPLATES_TABLE: [],
            C.WORKFLOW_STAGES_TABLE: [],
            C.WORK_ORDER_TYPES_TABLE: [],
            C.WORK_ORDERS_TABLE: [],
        }
        self.counter = 1

    def _next_id(self):
        record_id = f"rec{self.counter}"
        self.counter += 1
        return record_id

    def list_records(self, table, params=None, by_field_id=False):
        return {"records": [self._copy(record) for record in self.tables.get(table, [])]}

    def get_record(self, table, record_id, by_field_id=False):
        for record in self.tables.get(table, []):
            if record["id"] == record_id:
                return self._copy(record)
        raise AssertionError(f"Missing fake record {table}/{record_id}")

    def create_record(self, table, fields, by_field_id=False, typecast=False):
        record = {"id": self._next_id(), "fields": dict(fields)}
        self.tables.setdefault(table, []).append(record)
        return self._copy(record)

    def update_record(self, table, record_id, fields, by_field_id=False, typecast=False):
        for record in self.tables.get(table, []):
            if record["id"] == record_id:
                record["fields"].update(fields)
                return self._copy(record)
        raise AssertionError(f"Missing fake record {table}/{record_id}")

    def _copy(self, record):
        return {
            "id": record["id"],
            "fields": {
                key: (list(value) if isinstance(value, list) else value)
                for key, value in record["fields"].items()
            },
        }


class WorkOrderTypeServiceTests(unittest.TestCase):
    def setUp(self):
        self.airtable = FakeAirtable()
        self.workflow_service = WorkflowTemplateService(self.airtable, C)
        self.service = WorkOrderTypeService(self.airtable, C, self.workflow_service)

    def test_seed_record_is_idempotent_and_linked_to_default_template(self):
        first = self.service.ensure_default_type()
        second = self.service.ensure_default_type()

        self.assertEqual(first["id"], second["id"])
        self.assertEqual(second["key"], DEFAULT_WORK_ORDER_TYPE_KEY)
        self.assertEqual(second["name"], "Merchandise Review")
        self.assertTrue(second["active"])
        self.assertTrue(second["default"])
        self.assertTrue(second["autoCreate"])
        self.assertEqual(len(self.airtable.tables[C.WORK_ORDER_TYPES_TABLE]), 1)
        self.assertEqual(second["workflowTemplateId"], self.workflow_service.ensure_default_template()["id"])

    def test_required_unique_and_slug_safe_keys_are_enforced(self):
        self.service.ensure_default_type()
        with self.assertRaisesRegex(WorkOrderTypeValidationError, "Name is required"):
            self.service.create_type({"key": "x"})
        with self.assertRaisesRegex(WorkOrderTypeValidationError, "Key must use"):
            self.service.create_type({"name": "Bad", "key": "Bad Key!"})
        with self.assertRaisesRegex(WorkOrderTypeValidationError, "unique"):
            self.service.create_type({"name": "Again", "key": DEFAULT_WORK_ORDER_TYPE_KEY})

    def test_active_type_requires_active_workflow_template(self):
        template = self.workflow_service.create_template({"name": "Inactive Workflow", "active": False, "default": False})
        with self.assertRaisesRegex(WorkOrderTypeValidationError, "active Workflow Template"):
            self.service.create_type({
                "name": "Inactive Template Type",
                "key": "inactive-template-type",
                "workflowTemplateId": template["id"],
                "active": True,
            })

    def test_setting_new_default_unsets_previous_default(self):
        original = self.service.ensure_default_type()
        template = self.workflow_service.ensure_default_template()
        created = self.service.create_type({
            "name": "Other",
            "key": "other",
            "workflowTemplateId": template["id"],
            "active": True,
        })

        updated = self.service.set_default(created["id"])
        refreshed_original = self.service.get_type(original["id"])

        self.assertTrue(updated["default"])
        self.assertFalse(refreshed_original["default"])

    def test_default_and_referenced_type_deactivation_are_blocked(self):
        default = self.service.ensure_default_type()
        with self.assertRaisesRegex(WorkOrderTypeValidationError, "default"):
            self.service.deactivate(default["id"])

        template = self.workflow_service.ensure_default_template()
        other = self.service.create_type({
            "name": "Other",
            "key": "other",
            "workflowTemplateId": template["id"],
            "active": True,
        })
        self.airtable.tables[C.WORK_ORDERS_TABLE].append({
            "id": "recWorkOrder",
            "fields": {
                C.F_WORK_ORDER_TYPE: [other["id"]],
                C.F_WORK_ORDER_CURRENT_STATUS: "not_started",
            },
        })
        with self.assertRaisesRegex(WorkOrderTypeValidationError, "linked"):
            self.service.deactivate(other["id"])

    def test_duplicate_gets_unique_inactive_non_default_key(self):
        source = self.service.ensure_default_type()
        first = self.service.duplicate_type(source["id"])
        second = self.service.duplicate_type(source["id"])

        self.assertFalse(first["active"])
        self.assertFalse(first["default"])
        self.assertEqual(first["key"], "merchandise-review-copy")
        self.assertEqual(second["key"], "merchandise-review-copy-2")
        self.assertEqual(first["workflowTemplateId"], source["workflowTemplateId"])

    def test_new_work_order_fields_assign_type_template_stage_and_current_stage(self):
        default = self.service.ensure_default_type()
        fields = _work_order_fields(
            {"id": "recMerch", "fields": {C.F_RECEIPT_ENTRY_NAME: "Milk"}},
            {"id": "recWorkstream", "label": "Ecomm Photo", "workflowTemplate": "merchandise-review", "requiredReviewData": []},
            include_workflow_links=False,
        )
        fields.update(self.service.fields_for_new_work_order("new-review"))

        self.assertEqual(fields[C.F_WORK_ORDER_CURRENT_STAGE], "new-review")
        self.assertEqual(fields[C.F_WORK_ORDER_TYPE], [default["id"]])
        self.assertEqual(fields[C.F_WORK_ORDER_WORKFLOW_TEMPLATE], [default["workflowTemplateId"]])
        self.assertTrue(fields[C.F_WORK_ORDER_CURRENT_WORKFLOW_STAGE])

    def test_effective_workflow_fallback_order_and_shape_optional_fields(self):
        default = self.service.ensure_default_type()
        template = self.workflow_service.ensure_default_template()
        work_order_type, effective_template = self.service.effective_workflow_for_work_order({})
        self.assertEqual(work_order_type["id"], default["id"])
        self.assertEqual(effective_template["id"], template["id"])

        shaped = _shape_work_order({
            "id": "recWork",
            "fields": {
                C.F_WORK_ORDER_NAME: "Work",
                C.F_WORK_ORDER_TYPE: [default["id"]],
                C.F_WORK_ORDER_WORKFLOW_TEMPLATE: [template["id"]],
                C.F_WORK_ORDER_CURRENT_STAGE: "new-review",
            },
        }, work_order_types_by_id={default["id"]: default}, workflow_templates_by_id={template["id"]: template})

        self.assertEqual(shaped["work_order_type_id"], default["id"])
        self.assertEqual(shaped["work_order_type_key"], DEFAULT_WORK_ORDER_TYPE_KEY)
        self.assertEqual(shaped["workflow_template_id"], template["id"])
        self.assertEqual(shaped["currentStage"], "new-review")


if __name__ == "__main__":
    unittest.main()
