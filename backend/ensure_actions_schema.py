#!/usr/bin/env python3
"""Evolve Workstream Cards into Actions and import current THR3D work."""

import argparse
import json

from airtable import airtable
from airtable_schema import create_field, field_by_name, get_tables, load_env, meta_request, table_by_name
from config import Config as C


LEGACY_ACTIONS_TABLE = "Workstream Cards"


def _choices(values):
    return {"choices": [{"name": value} for value in values]}


def _field(name, field_type, options=None):
    result = {"name": name, "type": field_type}
    if options:
        result["options"] = options
    return result


def _records(table_name):
    records = []
    params = {"pageSize": 100}
    while True:
        data = airtable.list_records(table_name, params=params, by_field_id=False)
        records.extend(data.get("records", []))
        if not data.get("offset"):
            return records
        params["offset"] = data["offset"]


def _rename_table(table, *, dry_run):
    if table["name"] == C.ACTIONS_TABLE:
        return table, "reused"
    if dry_run:
        return {**table, "name": C.ACTIONS_TABLE}, "would_rename"
    renamed = meta_request("PATCH", f"/tables/{table['id']}", {"name": C.ACTIONS_TABLE})
    return renamed, "renamed"


def _ensure_field(table, definition, *, legacy_name="", dry_run=False):
    existing = field_by_name(table, definition["name"])
    legacy = field_by_name(table, legacy_name) if legacy_name else None
    if existing:
        return {"field": definition["name"], "result": "reused"}
    if legacy:
        if dry_run:
            return {"field": definition["name"], "result": "would_rename", "from": legacy_name}
        meta_request("PATCH", f"/tables/{table['id']}/fields/{legacy['id']}", {"name": definition["name"]})
        return {"field": definition["name"], "result": "renamed", "from": legacy_name}
    if dry_run:
        return {"field": definition["name"], "result": "would_create"}
    create_field(table["id"], definition)
    return {"field": definition["name"], "result": "created"}


def _source_reference(table_name, record_id):
    return json.dumps({"sourceTable": table_name, "sourceRecordId": record_id}, sort_keys=True)


def run(*, dry_run=False):
    load_env()
    if not C.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")
    tables = get_tables()
    table = table_by_name(tables, C.ACTIONS_TABLE) or table_by_name(tables, LEGACY_ACTIONS_TABLE)
    if not table:
        raise SystemExit("Workstream Cards or Actions table is required.")
    table, table_result = _rename_table(table, dry_run=dry_run)

    definitions = [
        (_field(C.F_ACTION_NAME, "singleLineText"), "Workstream Card"),
        (_field(C.F_ACTION_MERCHANDISE, "multipleRecordLinks"), "Received Merch"),
        (_field(C.F_ACTION_TYPE, "singleSelect", _choices(C.ACTION_TYPE_OPTIONS + ["Packaging"])), "Workstream Type"),
        (_field(C.F_ACTION_STATUS, "singleSelect", _choices(C.ACTION_STATUS_OPTIONS)), ""),
        (_field(C.F_ACTION_ACTIVATED_AT, "dateTime", {
            "dateFormat": {"name": "iso"},
            "timeFormat": {"name": "24hour"},
            "timeZone": "utc",
        }), ""),
        (_field(C.F_ACTION_ACTIVATED_BY, "singleLineText"), ""),
        (_field(C.F_ACTION_EXTERNAL_REFERENCE, "multilineText"), ""),
        (_field(C.F_ACTION_CANCELLATION_REASON, "multilineText"), ""),
    ]
    schema = [_ensure_field(table, definition, legacy_name=legacy, dry_run=dry_run) for definition, legacy in definitions]

    action_table_name = LEGACY_ACTIONS_TABLE if dry_run and table_result == "would_rename" else C.ACTIONS_TABLE
    existing_actions = _records(action_table_name)
    updates = []
    existing_source_refs = set()
    for record in existing_actions:
        fields = record.get("fields", {})
        source_ref = str(fields.get(C.F_ACTION_EXTERNAL_REFERENCE) or "")
        if source_ref:
            existing_source_refs.add(source_ref)
        patch = {}
        if not fields.get(C.F_ACTION_STATUS):
            if fields.get(C.F_WORKSTREAM_CARD_RELEASED):
                cf_status = str(fields.get(C.F_WORKSTREAM_CARD_CREATIVE_FORCE_STATUS) or "").casefold()
                patch[C.F_ACTION_STATUS] = "Done" if cf_status in {"done", "complete", "completed", "approved"} else "Executing" if cf_status else "Activated"
            else:
                patch[C.F_ACTION_STATUS] = "Proposed"
        if not source_ref:
            patch[C.F_ACTION_EXTERNAL_REFERENCE] = _source_reference(LEGACY_ACTIONS_TABLE, record["id"])
        if patch:
            updates.append({"id": record["id"], "fields": patch})
            if not dry_run:
                airtable.update_record(C.ACTIONS_TABLE, record["id"], patch, by_field_id=False, typecast=True)

    creates = []
    for record in _records(C.THR3D_SHIPPING_ITEMS_TABLE):
        fields = record.get("fields", {})
        source_ref = _source_reference(C.THR3D_SHIPPING_ITEMS_TABLE, record["id"])
        if source_ref in existing_source_refs:
            continue
        action = {
            C.F_ACTION_NAME: fields.get(C.F_THR3D_SHIPPING_ITEM_NAME) or "THR3D action",
            C.F_ACTION_MERCHANDISE: fields.get(C.F_THR3D_SHIPPING_ITEM_RECEIVED_MERCH, []),
            C.F_ACTION_TYPE: "THR3D",
            C.F_ACTION_STATUS: "Done" if str(fields.get(C.F_THR3D_SHIPPING_ITEM_STATUS) or "").casefold() == "shipped" else "Proposed",
            C.F_ACTION_QUANTITY: fields.get(C.F_THR3D_SHIPPING_ITEM_QUANTITY) or 1,
            C.F_ACTION_EXTERNAL_REFERENCE: source_ref,
        }
        creates.append(action)
        if not dry_run:
            airtable.create_record(C.ACTIONS_TABLE, action, by_field_id=False, typecast=True)
    return {
        "dryRun": dry_run,
        "table": table_result,
        "schema": schema,
        "actionsUpdated": len(updates),
        "thr3dActionsCreated": len(creates),
    }


def main():
    parser = argparse.ArgumentParser(description="Evolve Workstream Cards into Actions.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    print(json.dumps(run(dry_run=args.dry_run), indent=2))


if __name__ == "__main__":
    main()
