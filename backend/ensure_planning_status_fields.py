#!/usr/bin/env python3
"""Ensure the single normalized Planning Status field exists on planning records."""

import argparse
import json

from config import Config
from airtable import airtable
from airtable_schema import create_field, field_by_name, get_tables, load_env, meta_request, table_by_name


LEGACY_MIDDLE_STATUSES = {
    "Needs Product / Work",
    "Awaiting Info",
    "Awaiting Info/Activation",
    "Waiting on Information",
}

LEGACY_READY_STATUSES = {
    "Ready for Photo",
}


def single_select_field(name, options):
    return {
        "name": name,
        "type": "singleSelect",
        "options": {"choices": [{"name": option} for option in options]},
    }


def option_names(field):
    return [choice.get("name", "") for choice in (field.get("options") or {}).get("choices", [])]


def field_options_payload(field, required_options):
    choices = list((field.get("options") or {}).get("choices") or [])
    current = [choice.get("name", "") for choice in choices]
    for option in required_options:
        if option not in current:
            choices.append({"name": option})
    return {"options": {"choices": choices}}


def pruned_field_options_payload(field, allowed_options):
    choices = [
        choice
        for choice in (field.get("options") or {}).get("choices", [])
        if choice.get("name", "") in allowed_options
    ]
    ordered = []
    for option in allowed_options:
        existing = next((choice for choice in choices if choice.get("name") == option), None)
        ordered.append(existing or {"name": option})
    return {"options": {"choices": ordered}}


def update_field(table_id, field_id, payload):
    return meta_request(
        "PATCH",
        f"/tables/{table_id}/fields/{field_id}",
        payload,
    )


def ensure_field(table, name, options, *, dry_run=False):
    existing = field_by_name(table, name)
    if existing:
        if existing.get("type") != "singleSelect":
            raise SystemExit(f"{name} on {table['name']} is not a singleSelect field.")
        current = option_names(existing)
        missing = [option for option in options if option not in current]
        if missing:
            if dry_run:
                return {"table": table["name"], "field": name, "result": "would_update_options", "id": existing.get("id", ""), "added": missing}
            try:
                update_field(table["id"], existing["id"], field_options_payload(existing, options))
                result = "updated_options"
            except Exception as error:  # Airtable may reject singleSelect option edits for older bases.
                result = "option_update_blocked"
                return {
                    "table": table["name"],
                    "field": name,
                    "result": result,
                    "id": existing.get("id", ""),
                    "added": missing,
                    "reason": str(error),
                }
            return {"table": table["name"], "field": name, "result": result, "id": existing.get("id", ""), "added": missing}
        return {"table": table["name"], "field": name, "result": "reused", "id": existing.get("id", ""), "added": []}
    if dry_run:
        return {"table": table["name"], "field": name, "result": "would_create", "id": "", "added": options}
    created = create_field(table["id"], single_select_field(name, options))
    return {"table": table["name"], "field": name, "result": "created", "id": created.get("id", ""), "added": options}


def list_all_records(table_name):
    records = []
    params = {"pageSize": 100}
    while True:
        data = airtable.list_records(table_name, params=params, by_field_id=False)
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return records
        params["offset"] = offset


def migrate_middle_statuses(table_name, field_name, *, dry_run=False):
    records = list_all_records(table_name)
    updated = []
    for record in records:
        value = str((record.get("fields") or {}).get(field_name) or "").strip()
        if value not in LEGACY_MIDDLE_STATUSES and value not in LEGACY_READY_STATUSES:
            continue
        target = "Awaiting Photo Release" if value in LEGACY_READY_STATUSES else "Needs More Information"
        updated.append({"id": record.get("id", ""), "from": value, "to": target})
        if not dry_run:
            airtable.update_record(
                table_name,
                record["id"],
                {field_name: target},
                by_field_id=False,
                typecast=True,
            )
    return {"table": table_name, "field": field_name, "recordsUpdated": len(updated), "records": updated}


def prune_field_options(table, field_name, options, *, dry_run=False):
    field = field_by_name(table, field_name)
    if not field:
        return {"table": table["name"], "field": field_name, "result": "missing"}
    current = option_names(field)
    extra = [option for option in current if option not in options]
    if not extra:
        return {"table": table["name"], "field": field_name, "result": "unchanged", "removed": []}
    if dry_run:
        return {"table": table["name"], "field": field_name, "result": "would_prune", "removed": extra}
    try:
        update_field(table["id"], field["id"], pruned_field_options_payload(field, options))
        result = "pruned"
    except Exception as error:  # Airtable may reject singleSelect option edits for older bases.
        return {
            "table": table["name"],
            "field": field_name,
            "result": "prune_blocked",
            "removed": extra,
            "reason": str(error),
        }
    return {"table": table["name"], "field": field_name, "result": result, "removed": extra}


def run(*, dry_run=False, prune_extra_options=False):
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")
    tables = get_tables()
    field_targets = (
        (Config.MERCHANDISE_TABLE, Config.F_RECEIPT_ENTRY_PLANNING_STATUS),
        (Config.WORKSTREAM_CARDS_TABLE, Config.F_WORKSTREAM_CARD_PLANNING_STATUS),
    )
    schema = []
    migrations = []
    pruned = []
    for table_name, field_name in field_targets:
        table = table_by_name(tables, table_name)
        if not table:
            raise SystemExit(f"{table_name} table is required.")
        schema.append(ensure_field(table, field_name, Config.PLANNING_STATUS_OPTIONS, dry_run=dry_run))
    for table_name, field_name in field_targets:
        migrations.append(migrate_middle_statuses(table_name, field_name, dry_run=dry_run))
    if prune_extra_options:
        tables = get_tables()
        for table_name, field_name in field_targets:
            table = table_by_name(tables, table_name)
            pruned.append(prune_field_options(table, field_name, Config.PLANNING_STATUS_OPTIONS, dry_run=dry_run))
    return {
        "dryRun": dry_run,
        "canonicalValues": Config.PLANNING_STATUS_OPTIONS,
        "schema": schema,
        "migrations": migrations,
        "pruned": pruned,
    }


def main():
    parser = argparse.ArgumentParser(description="Ensure and clean Planning Status fields.")
    parser.add_argument("--dry-run", action="store_true", help="Report record/status changes without writing records or pruning options.")
    parser.add_argument("--prune-extra-options", action="store_true", help="Remove non-canonical dropdown options after migration.")
    args = parser.parse_args()
    print(json.dumps(run(dry_run=args.dry_run, prune_extra_options=args.prune_extra_options), indent=2))


if __name__ == "__main__":
    main()
