#!/usr/bin/env python3
import json

import requests

from config import Config
from airtable_schema import create_field, field_by_name, get_tables, load_env, meta_request, table_by_name


def single_select_field(name, options):
    return {
        "name": name,
        "type": "singleSelect",
        "options": {
            "choices": [{"name": option} for option in options],
        },
    }


def multi_select_field(name, options):
    return {
        "name": name,
        "type": "multipleSelects",
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


def equivalent_multi_select(table, name, options):
    field = field_by_name(table, name)
    if not field:
        return None
    if field.get("type") not in {"singleSelect", "multipleSelects"}:
        raise SystemExit(f"{name} exists but is {field.get('type')}, not singleSelect or multipleSelects.")
    current = option_names(field)
    missing = [option for option in options if option not in current]
    extra = [option for option in current if option not in options]
    if missing or extra:
        raise SystemExit(f"{name} options must be exactly: {', '.join(options)}.")
    return field


def ensure_intake_field(table, name, options):
    existing = equivalent_single_select(table, name, options)
    if existing:
        return {"field": name, "result": "reused", "id": existing.get("id", "")}
    created = create_field(table["id"], single_select_field(name, options))
    return {"field": name, "result": "created", "id": created.get("id", "")}


def update_field(table_id, field_id, payload):
    return meta_request("PATCH", f"/tables/{table_id}/fields/{field_id}", payload)


def ensure_deliverables_field(table, name, options):
    existing = equivalent_multi_select(table, name, options)
    if existing:
        if existing.get("type") == "multipleSelects":
            return {"field": name, "result": "reused", "id": existing.get("id", ""), "type": "multipleSelects"}
        try:
            updated = update_field(table["id"], existing["id"], multi_select_field(name, options))
        except requests.HTTPError as error:
            detail = ""
            response = getattr(error, "response", None)
            if response is not None:
                detail = f" Airtable response: {response.text}"
            raise SystemExit(
                f"{name} is currently singleSelect and must be converted manually to multipleSelects in Airtable. "
                f"The existing options are compatible and no duplicate field was created.{detail}"
            ) from error
        return {"field": name, "result": "converted", "id": updated.get("id", existing.get("id", "")), "type": "multipleSelects"}
    created = create_field(table["id"], multi_select_field(name, options))
    return {"field": name, "result": "created", "id": created.get("id", ""), "type": "multipleSelects"}


def main():
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")

    tables = get_tables()
    merchandise = table_by_name(tables, Config.MERCHANDISE_TABLE)
    if not merchandise:
        raise SystemExit(f"{Config.MERCHANDISE_TABLE} table is required.")

    results = [
        ensure_deliverables_field(merchandise, Config.F_RECEIPT_ENTRY_DELIVERABLES, Config.DELIVERABLE_OPTIONS),
    ]
    print(json.dumps({
        "table": Config.MERCHANDISE_TABLE,
        "fields": results,
        "created": [result["field"] for result in results if result["result"] == "created"],
        "reused": [result["field"] for result in results if result["result"] == "reused"],
    }, indent=2))


if __name__ == "__main__":
    main()
