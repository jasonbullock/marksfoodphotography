#!/usr/bin/env python3
import argparse
import json

from config import Config
from airtable_schema import CHECKBOX_OPTIONS, create_field, field_by_name, get_tables, load_env, table_by_name


def verified_fields():
    return [
        {
            "name": Config.F_RECEIPT_ENTRY_MERCH_VERIFIED,
            "type": "checkbox",
            "options": CHECKBOX_OPTIONS,
        },
        {
            "name": Config.F_RECEIPT_ENTRY_MERCH_VERIFIED_AT,
            "type": "singleLineText",
        },
        {
            "name": Config.F_RECEIPT_ENTRY_MERCH_VERIFIED_BY,
            "type": "singleLineText",
        },
    ]


def ensure_verified_fields(merchandise_table, *, dry_run=False):
    results = []
    for field in verified_fields():
        existing = field_by_name(merchandise_table, field["name"])
        if existing:
            results.append({
                "field": field["name"],
                "result": "unchanged",
                "id": existing.get("id", ""),
                "type": existing.get("type", ""),
            })
            continue
        result = {
            "field": field["name"],
            "result": "would_create" if dry_run else "created",
            "id": "",
            "type": field["type"],
        }
        if not dry_run:
            created = create_field(merchandise_table["id"], field)
            result["id"] = created.get("id", "")
        results.append(result)
    return results


def run(*, dry_run=False):
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")
    tables = get_tables()
    merchandise = table_by_name(tables, Config.MERCHANDISE_TABLE)
    if not merchandise:
        raise SystemExit(f"{Config.MERCHANDISE_TABLE} table is required.")
    fields = ensure_verified_fields(merchandise, dry_run=dry_run)
    return {
        "dryRun": dry_run,
        "table": Config.MERCHANDISE_TABLE,
        "fields": fields,
        "created": [field["field"] for field in fields if field["result"] == "created"],
        "wouldCreate": [field["field"] for field in fields if field["result"] == "would_create"],
        "unchanged": [field["field"] for field in fields if field["result"] == "unchanged"],
    }


def main():
    parser = argparse.ArgumentParser(description="Ensure Merchandise physical-verification fields exist.")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and report without changing Airtable.")
    args = parser.parse_args()
    print(json.dumps(run(dry_run=args.dry_run), indent=2))


if __name__ == "__main__":
    main()
