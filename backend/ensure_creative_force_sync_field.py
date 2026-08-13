#!/usr/bin/env python3
"""Ensure the app-owned Workstream Card Creative Force sync field exists."""

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
    existing = field_by_name(workstream_cards, Config.F_WORKSTREAM_CARD_CREATIVE_FORCE_SYNC)
    if existing:
        if existing.get("type") != "multilineText":
            raise SystemExit(
                f"{Config.F_WORKSTREAM_CARD_CREATIVE_FORCE_SYNC} exists but is {existing.get('type')}, not multilineText."
            )
        result = {"result": "reused", "id": existing.get("id", "")}
    else:
        created = create_field(workstream_cards["id"], {"name": Config.F_WORKSTREAM_CARD_CREATIVE_FORCE_SYNC, "type": "multilineText"})
        result = {"result": "created", "id": created.get("id", "")}
    print(json.dumps({"table": Config.WORKSTREAM_CARDS_TABLE, "field": Config.F_WORKSTREAM_CARD_CREATIVE_FORCE_SYNC, **result}, indent=2))


if __name__ == "__main__":
    main()
