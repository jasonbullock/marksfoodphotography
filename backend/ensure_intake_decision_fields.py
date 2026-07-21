#!/usr/bin/env python3
import json

from config import Config
from ensure_workflow_schema import create_field, field_by_name, get_tables, load_env, table_by_name


def single_select_field(name, options):
    return {
        "name": name,
        "type": "singleSelect",
        "options": {
            "choices": [{"name": option} for option in options],
        },
    }


def option_names(field):
    choices = (field.get("options") or {}).get("choices") or []
    return [choice.get("name", "") for choice in choices]


def equivalent_single_select(table, name, options):
    field = field_by_name(table, name)
    if not field:
        return None
    if field.get("type") != "singleSelect":
        raise SystemExit(f"{name} exists but is {field.get('type')}, not singleSelect.")
    current = option_names(field)
    missing = [option for option in options if option not in current]
    if missing:
        raise SystemExit(f"{name} exists but is missing options: {', '.join(missing)}.")
    return field


def ensure_intake_field(table, name, options):
    existing = equivalent_single_select(table, name, options)
    if existing:
        return {"field": name, "result": "reused", "id": existing.get("id", "")}
    created = create_field(table["id"], single_select_field(name, options))
    return {"field": name, "result": "created", "id": created.get("id", "")}


def main():
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")

    tables = get_tables()
    merchandise = table_by_name(tables, Config.MERCHANDISE_TABLE)
    if not merchandise:
        raise SystemExit(f"{Config.MERCHANDISE_TABLE} table is required.")

    results = [
        ensure_intake_field(merchandise, Config.F_RECEIPT_ENTRY_PRODUCTION_TYPE, Config.PRODUCTION_TYPE_OPTIONS),
    ]
    merchandise = table_by_name(get_tables(), Config.MERCHANDISE_TABLE)
    results.append(
        ensure_intake_field(
            merchandise,
            Config.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION,
            Config.MERCHANDISE_RESOLUTION_OPTIONS,
        )
    )
    print(json.dumps({
        "table": Config.MERCHANDISE_TABLE,
        "fields": results,
        "created": [result["field"] for result in results if result["result"] == "created"],
        "reused": [result["field"] for result in results if result["result"] == "reused"],
    }, indent=2))


if __name__ == "__main__":
    main()
