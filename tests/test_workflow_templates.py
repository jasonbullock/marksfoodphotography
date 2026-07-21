import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import Config as C  # noqa: E402
from routes import _shape_work_order  # noqa: E402
from workflow_templates import (  # noqa: E402
    DEFAULT_STAGE_DEFINITIONS,
    WorkflowTemplateService,
    WorkflowValidationError,
)


class FakeAirtable:
    def __init__(self):
        self.tables = {
            C.WORKFLOW_TEMPLATES_TABLE: [],
            C.WORKFLOW_STAGES_TABLE: [],
            C.WORK_ORDERS_TABLE: [],
        }
        self.counter = 1

    def _next_id(self):
        record_id = f"rec{self.counter}"
        self.counter += 1
        return record_id

    def list_records(self, table, params=None, by_field_id=False):
        return {"records": [self._copy_record(record) for record in self.tables.get(table, [])]}

    def get_record(self, table, record_id, by_field_id=False):
        for record in self.tables.get(table, []):
            if record["id"] == record_id:
                return self._copy_record(record)
        raise AssertionError(f"Missing fake record {table}/{record_id}")

    def create_record(self, table, fields, by_field_id=False, typecast=False):
        record = {"id": self._next_id(), "fields": dict(fields)}
        self.tables.setdefault(table, []).append(record)
        return self._copy_record(record)

    def update_record(self, table, record_id, fields, by_field_id=False, typecast=False):
        for record in self.tables.get(table, []):
            if record["id"] == record_id:
                record["fields"].update(fields)
                return self._copy_record(record)
        raise AssertionError(f"Missing fake record {table}/{record_id}")

    def _copy_record(self, record):
        return {"id": record["id"], "fields": {key: (list(value) if isinstance(value, list) else value) for key, value in record["fields"].items()}}


class WorkflowTemplateServiceTests(unittest.TestCase):
    def setUp(self):
        self.airtable = FakeAirtable()
        self.service = WorkflowTemplateService(self.airtable, C)

    def test_default_seed_is_idempotent_and_matches_current_stage_model(self):
        first = self.service.ensure_default_template()
        second = self.service.ensure_default_template()

        self.assertEqual(first["id"], second["id"])
        self.assertEqual(
            [stage["stageKey"] for stage in second["stages"]],
            [stage["stageKey"] for stage in DEFAULT_STAGE_DEFINITIONS],
        )
        self.assertEqual(len(self.airtable.tables[C.WORKFLOW_TEMPLATES_TABLE]), 1)
        self.assertEqual(len(self.airtable.tables[C.WORKFLOW_STAGES_TABLE]), 5)

    def test_template_validation_and_default_exclusivity(self):
        default = self.service.ensure_default_template()
        created = self.service.create_template({"name": "Client Review", "active": True, "default": True})

        refreshed_default = self.service.get_template(default["id"])
        self.assertFalse(refreshed_default["default"])
        self.assertTrue(created["default"])

        with self.assertRaisesRegex(WorkflowValidationError, "Default workflow template must be active"):
            self.service.create_template({"name": "Inactive Default", "active": False, "default": True})

    def test_stage_key_validation_and_uniqueness_is_template_scoped(self):
        template = self.service.ensure_default_template()
        with self.assertRaisesRegex(WorkflowValidationError, "unique"):
            self.service.create_stage(template["id"], {
                "name": "Duplicate Review",
                "stageKey": "new-review",
                "displayOrder": 60,
                "stageType": "active",
            })

        other = self.service.create_template({"name": "Other Template"})
        stage = self.service.create_stage(other["id"], {
            "name": "Review",
            "stageKey": "new-review",
            "displayOrder": 10,
            "stageType": "start",
        })
        self.assertEqual(stage["stageKey"], "new-review")

        with self.assertRaisesRegex(WorkflowValidationError, "lowercase"):
            self.service.create_stage(other["id"], {"name": "Bad", "stageKey": "Bad Key!"})

    def test_stage_type_and_completion_logic_are_validated(self):
        template = self.service.ensure_default_template()
        with self.assertRaisesRegex(WorkflowValidationError, "Invalid Stage Type"):
            self.service.create_stage(template["id"], {"name": "QA", "stageKey": "qa", "stageType": "not-a-type"})
        with self.assertRaisesRegex(WorkflowValidationError, "Complete stages"):
            self.service.create_stage(template["id"], {
                "name": "Done",
                "stageKey": "done",
                "stageType": "complete",
                "isComplete": False,
            })

    def test_duplicate_template_creates_independent_inactive_copy(self):
        source = self.service.ensure_default_template()
        duplicate = self.service.duplicate_template(source["id"])

        self.assertFalse(duplicate["active"])
        self.assertFalse(duplicate["default"])
        self.assertNotEqual(source["id"], duplicate["id"])
        self.assertEqual(
            [stage["stageKey"] for stage in duplicate["stages"]],
            [stage["stageKey"] for stage in source["stages"]],
        )
        self.assertTrue(set(stage["id"] for stage in source["stages"]).isdisjoint(stage["id"] for stage in duplicate["stages"]))

    def test_referenced_stage_cannot_be_deactivated(self):
        template = self.service.ensure_default_template()
        stage = next(item for item in template["stages"] if item["stageKey"] == "new-review")
        self.airtable.tables[C.WORK_ORDERS_TABLE].append({
            "id": "recWorkOrder",
            "fields": {
                C.F_WORK_ORDER_NAME: "Work",
                C.F_WORK_ORDER_CURRENT_STATUS: "not_started",
                C.F_WORK_ORDER_CURRENT_STAGE: "new-review",
            },
        })

        with self.assertRaisesRegex(WorkflowValidationError, "Cannot deactivate"):
            self.service.deactivate_stage(stage["id"])

    def test_work_order_shape_prefers_linked_stage_with_legacy_fallback(self):
        template = self.service.ensure_default_template()
        stage = next(item for item in template["stages"] if item["stageKey"] == "ready-production")
        shaped = _shape_work_order({
            "id": "recWorkOrder",
            "fields": {
                C.F_WORK_ORDER_NAME: "Work",
                C.F_WORK_ORDER_WORKFLOW: "legacy-workflow",
                C.F_WORK_ORDER_WORKFLOW_TEMPLATE: [template["id"]],
                C.F_WORK_ORDER_CURRENT_WORKFLOW_STAGE: [stage["id"]],
                C.F_WORK_ORDER_CURRENT_STAGE: "new-review",
            },
        }, workflow_stages_by_id={stage["id"]: stage}, workflow_templates_by_id={template["id"]: template})

        self.assertEqual(shaped["currentStage"], "ready-production")
        self.assertEqual(shaped["currentGate"], "ready-production")
        self.assertEqual(shaped["currentStageName"], "Ready for Production")
        self.assertEqual(shaped["workflowName"], "Merchandise Review")


if __name__ == "__main__":
    unittest.main()
