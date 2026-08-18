#!/usr/bin/env python3
"""Ensure the single normalized Planning Status field exists on planning records."""

import json

from config import Config
from airtable_schema import create_field, field_by_name, get_tables, load_env, table_by_name


def single_select_field(name, options):
    return {
        "name": name,
        "type": "singleSelect",
        "options": {"choices": [{"name": option} for option in options]},
    }


def ensure_field(table, name, options):
    existing = field_by_name(table, name)
    if existing:
        if existing.get("type") != "singleSelect":
            raise SystemExit(f"{name} on {table['name']} is not a singleSelect field.")
        current = [choice.get("name", "") for choice in (existing.get("options") or {}).get("choices", [])]
        missing = [option for option in options if option not in current]
        if missing:
            raise SystemExit(f"{name} on {table['name']} is missing options: {', '.join(missing)}.")
        return {"table": table["name"], "field": name, "result": "reused", "id": existing.get("id", "")}
    created = create_field(table["id"], single_select_field(name, options))
    return {"table": table["name"], "field": name, "result": "created", "id": created.get("id", "")}


def main():
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")
    tables = get_tables()
    results = []
    for table_name, field_name in (
        (Config.MERCHANDISE_TABLE, Config.F_RECEIPT_ENTRY_PLANNING_STATUS),
        (Config.WORKSTREAM_CARDS_TABLE, Config.F_WORKSTREAM_CARD_PLANNING_STATUS),
    ):
        table = table_by_name(tables, table_name)
        if not table:
            raise SystemExit(f"{table_name} table is required.")
        results.append(ensure_field(table, field_name, Config.PLANNING_STATUS_OPTIONS))
    print(json.dumps({"fields": results}, indent=2))


if __name__ == "__main__":
    main()
