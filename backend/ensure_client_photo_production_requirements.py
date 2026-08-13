#!/usr/bin/env python3
"""Ensure the app-owned Client photo production configuration field exists."""

import json

from config import Config
from airtable_schema import create_field, field_by_name, get_tables, load_env, table_by_name


def main():
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")

    tables = get_tables()
    clients = table_by_name(tables, Config.CLIENTS_TABLE)
    if not clients:
        raise SystemExit(f"{Config.CLIENTS_TABLE} table is required.")

    existing = field_by_name(clients, Config.F_CLIENT_PHOTO_PRODUCTION_REQUIREMENTS)
    if existing:
        if existing.get("type") != "multilineText":
            raise SystemExit(
                f"{Config.F_CLIENT_PHOTO_PRODUCTION_REQUIREMENTS} exists but is {existing.get('type')}, not multilineText."
            )
        result = {"field": Config.F_CLIENT_PHOTO_PRODUCTION_REQUIREMENTS, "result": "reused", "id": existing.get("id", "")}
    else:
        created = create_field(clients["id"], {
            "name": Config.F_CLIENT_PHOTO_PRODUCTION_REQUIREMENTS,
            "type": "multilineText",
        })
        result = {"field": Config.F_CLIENT_PHOTO_PRODUCTION_REQUIREMENTS, "result": "created", "id": created.get("id", "")}

    print(json.dumps({"table": Config.CLIENTS_TABLE, "field": result}, indent=2))


if __name__ == "__main__":
    main()
