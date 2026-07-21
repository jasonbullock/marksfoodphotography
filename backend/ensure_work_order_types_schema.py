#!/usr/bin/env python3
import json

from config import Config
from ensure_workflow_schema import (
    CHECKBOX_OPTIONS,
    create_field,
    ensure_field,
    ensure_table,
    field_by_name,
    get_tables,
    load_env,
    table_by_name,
)
from airtable import airtable
from work_order_types import WorkOrderTypeService
from workflow_templates import WorkflowTemplateService


def main():
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")

    workflow_templates = table_by_name(get_tables(), Config.WORKFLOW_TEMPLATES_TABLE)
    if not workflow_templates:
        raise SystemExit("Workflow Templates table is required. Run backend/ensure_workflow_schema.py first.")

    work_order_types, created_types = ensure_table(Config.WORK_ORDER_TYPES_TABLE, [
        {"name": Config.F_WORK_ORDER_TYPE_NAME, "type": "singleLineText"},
        {"name": Config.F_WORK_ORDER_TYPE_KEY, "type": "singleLineText"},
        {"name": Config.F_WORK_ORDER_TYPE_DESCRIPTION, "type": "multilineText"},
        {"name": Config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE, "type": "multipleRecordLinks", "options": {"linkedTableId": workflow_templates["id"]}},
        {"name": Config.F_WORK_ORDER_TYPE_ACTIVE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORK_ORDER_TYPE_DEFAULT, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORK_ORDER_TYPE_SORT_ORDER, "type": "number", "options": {"precision": 0}},
        {"name": Config.F_WORK_ORDER_TYPE_ICON, "type": "singleLineText"},
        {"name": Config.F_WORK_ORDER_TYPE_COLOR, "type": "singleLineText"},
        {"name": Config.F_WORK_ORDER_TYPE_DEFAULT_ASSIGNEE_ROLE, "type": "singleLineText"},
        {"name": Config.F_WORK_ORDER_TYPE_ALLOW_MULTIPLE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORK_ORDER_TYPE_AUTO_CREATE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORK_ORDER_TYPE_CREATED_AT, "type": "singleLineText"},
        {"name": Config.F_WORK_ORDER_TYPE_UPDATED_AT, "type": "singleLineText"},
    ])

    added_type_fields = []
    if not created_types:
        for field in [
            {"name": Config.F_WORK_ORDER_TYPE_KEY, "type": "singleLineText"},
            {"name": Config.F_WORK_ORDER_TYPE_DESCRIPTION, "type": "multilineText"},
            {"name": Config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE, "type": "multipleRecordLinks", "options": {"linkedTableId": workflow_templates["id"]}},
            {"name": Config.F_WORK_ORDER_TYPE_ACTIVE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
            {"name": Config.F_WORK_ORDER_TYPE_DEFAULT, "type": "checkbox", "options": CHECKBOX_OPTIONS},
            {"name": Config.F_WORK_ORDER_TYPE_SORT_ORDER, "type": "number", "options": {"precision": 0}},
            {"name": Config.F_WORK_ORDER_TYPE_ICON, "type": "singleLineText"},
            {"name": Config.F_WORK_ORDER_TYPE_COLOR, "type": "singleLineText"},
            {"name": Config.F_WORK_ORDER_TYPE_DEFAULT_ASSIGNEE_ROLE, "type": "singleLineText"},
            {"name": Config.F_WORK_ORDER_TYPE_ALLOW_MULTIPLE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
            {"name": Config.F_WORK_ORDER_TYPE_AUTO_CREATE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
            {"name": Config.F_WORK_ORDER_TYPE_CREATED_AT, "type": "singleLineText"},
            {"name": Config.F_WORK_ORDER_TYPE_UPDATED_AT, "type": "singleLineText"},
        ]:
            refreshed = table_by_name(get_tables(), Config.WORK_ORDER_TYPES_TABLE)
            if not field_by_name(refreshed, field["name"]):
                create_field(refreshed["id"], field)
                added_type_fields.append(field["name"])

    work_orders = table_by_name(get_tables(), Config.WORK_ORDERS_TABLE)
    added_work_order_fields = []
    if work_orders and ensure_field(work_orders, {
        "name": Config.F_WORK_ORDER_TYPE,
        "type": "multipleRecordLinks",
        "options": {"linkedTableId": work_order_types["id"]},
    }):
        added_work_order_fields.append(Config.F_WORK_ORDER_TYPE)

    workflow_service = WorkflowTemplateService(airtable, Config)
    work_order_type = WorkOrderTypeService(airtable, Config, workflow_service).ensure_default_type()
    print(json.dumps({
        "workOrderTypesTableCreated": created_types,
        "workOrderTypeFieldsAdded": added_type_fields,
        "workOrderFieldsAdded": added_work_order_fields,
        "defaultWorkOrderTypeId": work_order_type["id"],
        "defaultWorkOrderTypeKey": work_order_type["key"],
        "defaultWorkflowTemplateId": work_order_type["workflowTemplateId"],
        "active": work_order_type["active"],
        "default": work_order_type["default"],
    }, indent=2))


if __name__ == "__main__":
    main()
