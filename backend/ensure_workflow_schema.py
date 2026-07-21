#!/usr/bin/env python3
import json
import os
from pathlib import Path

import requests

from airtable import airtable
from config import Config
from workflow_templates import WorkflowTemplateService


CHECKBOX_OPTIONS = {"icon": "check", "color": "greenBright"}


def load_env():
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def headers():
    return {
        "Authorization": f"Bearer {Config.AIRTABLE_API_KEY}",
        "Content-Type": "application/json",
    }


def meta_request(method, path, body=None):
    url = f"https://api.airtable.com/v0/meta/bases/{Config.AIRTABLE_BASE_ID}{path}"
    response = requests.request(method, url, headers=headers(), json=body, timeout=30)
    response.raise_for_status()
    return response.json()


def get_tables():
    return meta_request("GET", "/tables").get("tables", [])


def table_by_name(tables, name):
    return next((table for table in tables if table.get("name") == name), None)


def field_by_name(table, name):
    return next((field for field in table.get("fields", []) if field.get("name") == name), None)


def create_field(table_id, field):
    return meta_request("POST", f"/tables/{table_id}/fields", field)


def ensure_table(name, fields):
    tables = get_tables()
    table = table_by_name(tables, name)
    if table:
        return table, False
    payload = {"name": name, "fields": fields}
    meta_request("POST", "/tables", payload)
    table = table_by_name(get_tables(), name)
    return table, True


def ensure_field(table, field):
    if field_by_name(table, field["name"]):
        return False
    create_field(table["id"], field)
    return True


def main():
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")

    templates, created_templates = ensure_table(Config.WORKFLOW_TEMPLATES_TABLE, [
        {"name": Config.F_WORKFLOW_TEMPLATE_NAME, "type": "singleLineText"},
        {"name": Config.F_WORKFLOW_TEMPLATE_DESCRIPTION, "type": "multilineText"},
        {"name": Config.F_WORKFLOW_TEMPLATE_ACTIVE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORKFLOW_TEMPLATE_DEFAULT, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORKFLOW_TEMPLATE_VERSION, "type": "number", "options": {"precision": 0}},
        {"name": Config.F_WORKFLOW_TEMPLATE_CREATED_AT, "type": "singleLineText"},
        {"name": Config.F_WORKFLOW_TEMPLATE_UPDATED_AT, "type": "singleLineText"},
    ])

    stages, created_stages = ensure_table(Config.WORKFLOW_STAGES_TABLE, [
        {"name": Config.F_WORKFLOW_STAGE_NAME, "type": "singleLineText"},
        {"name": Config.F_WORKFLOW_STAGE_TEMPLATE, "type": "multipleRecordLinks", "options": {"linkedTableId": templates["id"]}},
        {"name": Config.F_WORKFLOW_STAGE_KEY, "type": "singleLineText"},
        {"name": Config.F_WORKFLOW_STAGE_DISPLAY_ORDER, "type": "number", "options": {"precision": 0}},
        {"name": Config.F_WORKFLOW_STAGE_COLOR_TOKEN, "type": "singleLineText"},
        {"name": Config.F_WORKFLOW_STAGE_TYPE, "type": "singleSelect", "options": {"choices": [
            {"name": "start"},
            {"name": "active"},
            {"name": "waiting"},
            {"name": "blocked"},
            {"name": "complete"},
            {"name": "cancelled"},
        ]}},
        {"name": Config.F_WORKFLOW_STAGE_IS_COMPLETE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORKFLOW_STAGE_IS_TERMINAL, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORKFLOW_STAGE_ACTIVE, "type": "checkbox", "options": CHECKBOX_OPTIONS},
        {"name": Config.F_WORKFLOW_STAGE_DESCRIPTION, "type": "multilineText"},
    ])

    work_orders = table_by_name(get_tables(), Config.WORK_ORDERS_TABLE)
    added_work_order_fields = []
    if work_orders:
        if ensure_field(work_orders, {
            "name": Config.F_WORK_ORDER_WORKFLOW_TEMPLATE,
            "type": "multipleRecordLinks",
            "options": {"linkedTableId": templates["id"]},
        }):
            added_work_order_fields.append(Config.F_WORK_ORDER_WORKFLOW_TEMPLATE)
        work_orders = table_by_name(get_tables(), Config.WORK_ORDERS_TABLE)
        if ensure_field(work_orders, {
            "name": Config.F_WORK_ORDER_CURRENT_WORKFLOW_STAGE,
            "type": "multipleRecordLinks",
            "options": {"linkedTableId": stages["id"]},
        }):
            added_work_order_fields.append(Config.F_WORK_ORDER_CURRENT_WORKFLOW_STAGE)

    seeded = WorkflowTemplateService(airtable, Config).ensure_default_template()
    print(json.dumps({
        "workflowTemplatesTableCreated": created_templates,
        "workflowStagesTableCreated": created_stages,
        "workOrderFieldsAdded": added_work_order_fields,
        "defaultTemplateId": seeded["id"],
        "defaultStageKeys": [stage["stageKey"] for stage in seeded.get("stages", [])],
    }, indent=2))


if __name__ == "__main__":
    main()
