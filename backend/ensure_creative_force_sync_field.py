#!/usr/bin/env python3
"""Ensure app-owned Workstream Card Creative Force fields exist."""

import json

from airtable_schema import create_field, field_by_name, get_tables, load_env, table_by_name
from config import Config


def main():
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")
    tables = get_tables()
    workstream_cards = table_by_name(tables, Config.WORKSTREAM_CARDS_TABLE)
    if not workstream_cards:
        raise SystemExit(f"{Config.WORKSTREAM_CARDS_TABLE} table is required.")
    definitions = [
        (Config.F_WORKSTREAM_CARD_CREATIVE_FORCE_SYNC, "multilineText"),
        (Config.F_WORKSTREAM_CARD_CREATIVE_FORCE_STATUS, "singleLineText"),
        (Config.F_WORKSTREAM_CARD_CREATIVE_FORCE_STEP, "singleLineText"),
    ]
    results = []
    for name, field_type in definitions:
        existing = field_by_name(workstream_cards, name)
        if existing:
            if existing.get("type") != field_type:
                raise SystemExit(f"{name} exists but is {existing.get('type')}, not {field_type}.")
            results.append({"field": name, "result": "reused", "id": existing.get("id", "")})
        else:
            created = create_field(workstream_cards["id"], {"name": name, "type": field_type})
            results.append({"field": name, "result": "created", "id": created.get("id", "")})
    print(json.dumps({"table": Config.WORKSTREAM_CARDS_TABLE, "fields": results}, indent=2))


if __name__ == "__main__":
    main()
