#!/usr/bin/env python3
"""Ensure the flat, app-owned Airtable surface used by Creative Force imports."""

import json

from airtable_schema import create_field, create_table, get_tables, load_env, table_by_name
from airtable import airtable
from config import Config


BASE_FEED_FIELDS = [
    (Config.F_CF_FEED_PRODUCT, "singleLineText"),
    (Config.F_CF_FEED_CLIENT, "singleLineText"),
    (Config.F_CF_FEED_PRODUCT_CODE, "singleLineText"),
    (Config.F_CF_FEED_CATEGORY, "singleLineText"),
    (Config.F_CF_FEED_PRODUCTION_TYPE, "singleLineText"),
    (Config.F_CF_FEED_SOURCE_KEY, "singleLineText"),
]


def configured_product_field_names(client_records):
    names = []
    for client in client_records:
        raw = client.get("fields", {}).get(Config.F_CLIENT_PHOTO_PRODUCTION_REQUIREMENTS, "")
        if not raw:
            continue
        try:
            config = json.loads(raw) if isinstance(raw, str) else raw
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        workstreams = config.get("workstreams", {}) if isinstance(config, dict) else {}
        for workstream in workstreams.values() if isinstance(workstreams, dict) else []:
            for key in workstream.get("requiredProductFields", []) if isinstance(workstream, dict) else []:
                label = Config.CREATIVE_FORCE_FEED_PRODUCT_FIELDS.get(str(key))
                if label and label not in names:
                    names.append(label)
    return names


def feed_field_definitions(client_records):
    dynamic = [(name, "singleLineText") for name in configured_product_field_names(client_records)]
    fixed_names = {name for name, _ in BASE_FEED_FIELDS}
    return BASE_FEED_FIELDS + [field for field in dynamic if field[0] not in fixed_names]


def ensure_feed_schema(*, dry_run=False):
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")

    tables = get_tables()
    client_records = airtable.list_records(Config.CLIENTS_TABLE, by_field_id=False).get("records", [])
    feed_fields = feed_field_definitions(client_records)
    feed = table_by_name(tables, Config.CREATIVE_FORCE_PRODUCT_FEED_TABLE)
    if not feed:
        if dry_run:
            return {
                "table": Config.CREATIVE_FORCE_PRODUCT_FEED_TABLE,
                "result": "would_create",
                "fields": [name for name, _ in feed_fields],
            }
        feed = create_table({
            "name": Config.CREATIVE_FORCE_PRODUCT_FEED_TABLE,
            "fields": [{"name": name, "type": field_type} for name, field_type in feed_fields],
        })
        return {
            "table": Config.CREATIVE_FORCE_PRODUCT_FEED_TABLE,
            "result": "created",
            "id": feed.get("id", ""),
            "fields": [name for name, _ in feed_fields],
        }

    existing = {field.get("name"): field for field in feed.get("fields", [])}
    changes = []
    for name, field_type in feed_fields:
        current = existing.get(name)
        if current:
            if current.get("type") != field_type:
                raise SystemExit(f"{name} exists but is {current.get('type')}, not {field_type}.")
            continue
        if dry_run:
            changes.append({"name": name, "result": "would_create"})
        else:
            created = create_field(feed["id"], {"name": name, "type": field_type})
            changes.append({"name": name, "result": "created", "id": created.get("id", "")})
    return {"table": Config.CREATIVE_FORCE_PRODUCT_FEED_TABLE, "result": "reused", "changes": changes}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    print(json.dumps(ensure_feed_schema(dry_run=args.dry_run), indent=2))
