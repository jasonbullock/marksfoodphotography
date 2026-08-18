#!/usr/bin/env python3
import argparse
import json

from airtable import airtable
from config import Config
from airtable_schema import field_by_name, get_tables, load_env, meta_request, table_by_name


LEGACY_WAITING_FOR_PRODUCT_DATA_MARKER = "[Waiting for Product Data]"
HISTORICAL_MERCH_STATUSES = {
    "disposed",
    "destroyed",
    "removed",
    "returned",
    "shipped",
    "shipped to thr3d",
    "sent to thr3d",
    "sent to thread",
}
MERCH_STATUS_OPTIONS = ["Received", "Issue", "Ready to Ship", "Shipped", "Disposed"]
LEGACY_INTAKE_STATUS_FIELD = "Intake Status"

def single_select_field(name, options):
    return {
        "name": name,
        "type": "singleSelect",
        "options": {"choices": [{"name": option} for option in options]},
    }


def option_names(field):
    choices = (field.get("options") or {}).get("choices") or []
    return [choice.get("name", "") for choice in choices]


def field_options_payload(field, required_options):
    choices = list((field.get("options") or {}).get("choices") or [])
    current = [choice.get("name", "") for choice in choices]
    for option in required_options:
        if option not in current:
            choices.append({"name": option})
    return {"options": {"choices": choices}}


def update_field(table_id, field_id, payload):
    return meta_request("PATCH", f"/tables/{table_id}/fields/{field_id}", payload)


def merch_status_is_safe_intake_field(merchandise_table):
    merch_status = field_by_name(merchandise_table, Config.F_RECEIPT_ENTRY_MERCH_STATUS)
    if not merch_status or merch_status.get("type") != "singleSelect":
        return False
    return set(option_names(merch_status)) == set(Config.INTAKE_STATUS_OPTIONS)


def ensure_intake_status_schema(merchandise_table, *, dry_run=False):
    intake_field = field_by_name(merchandise_table, LEGACY_INTAKE_STATUS_FIELD)
    decision = {
        "field": LEGACY_INTAKE_STATUS_FIELD,
        "result": "retired",
        "id": intake_field.get("id", "") if intake_field else "",
        "reusedMerchStatus": False,
        "merchStatusSafe": merch_status_is_safe_intake_field(merchandise_table),
        "reason": "Intake Status is a retired field. Planning Status is canonical.",
        "missingOptions": [],
        "extraOptions": [],
    }

    if intake_field:
        decision["id"] = intake_field.get("id", "")
        decision["result"] = "would_delete" if dry_run else "retired"
    return decision


def clean_legacy_waiting_marker(notes):
    if notes is None:
        return ""
    return str(notes).replace(LEGACY_WAITING_FOR_PRODUCT_DATA_MARKER, "")


def has_legacy_marker(fields):
    return LEGACY_WAITING_FOR_PRODUCT_DATA_MARKER in str(fields.get(Config.F_RECEIPT_ENTRY_NOTES, "") or "")


def valid_intake_status(value):
    return str(value or "").strip() in Config.INTAKE_STATUS_OPTIONS


def historical_or_closed(fields):
    intake_status = str(fields.get(LEGACY_INTAKE_STATUS_FIELD, "") or "").strip()
    merch_status = str(fields.get(Config.F_RECEIPT_ENTRY_MERCH_STATUS, "") or "").strip()
    if intake_status == "Closed":
        return True
    if merch_status.lower() in HISTORICAL_MERCH_STATUSES:
        return True
    return False


def planned_record_update(record):
    fields = record.get("fields", {})
    existing_status = str(fields.get(LEGACY_INTAKE_STATUS_FIELD, "") or "").strip()
    marker_present = has_legacy_marker(fields)
    update = {}
    reason = ""

    if marker_present:
        update[Config.F_RECEIPT_ENTRY_NOTES] = clean_legacy_waiting_marker(fields.get(Config.F_RECEIPT_ENTRY_NOTES, ""))

    planning_status = str(fields.get(Config.F_RECEIPT_ENTRY_PLANNING_STATUS, "") or "").strip()
    if planning_status:
        return update, "cleaned_marker_only" if update else "skipped_existing_status"

    if existing_status and not valid_intake_status(existing_status):
        return update, "skipped_invalid_existing_status"

    if historical_or_closed(fields):
        return update, "skipped_historical"

    if marker_present:
        update[Config.F_RECEIPT_ENTRY_PLANNING_STATUS] = "Awaiting Info"
        reason = "migrated_marker"
    else:
        update[Config.F_RECEIPT_ENTRY_PLANNING_STATUS] = "New"
        reason = "defaulted_needs_review"
    return update, reason


def list_all_merchandise_records():
    records = []
    params = {"pageSize": 100}
    while True:
        data = airtable.list_records(Config.MERCHANDISE_TABLE, params=params, by_field_id=False)
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return records
        params["offset"] = offset


def migrate_intake_status_records(*, dry_run=False):
    records = list_all_merchandise_records()
    report = {
        "recordsScanned": len(records),
        "recordsMigratedFromMarker": 0,
        "recordsDefaulted": 0,
        "recordsSkipped": 0,
        "notesCleaned": 0,
        "errors": [],
        "updatedRecordIds": [],
    }
    for record in records:
        update, reason = planned_record_update(record)
        if not update:
            report["recordsSkipped"] += 1
            continue
        if reason == "migrated_marker":
            report["recordsMigratedFromMarker"] += 1
        elif reason.startswith("defaulted"):
            report["recordsDefaulted"] += 1
        else:
            report["recordsSkipped"] += 1
        if Config.F_RECEIPT_ENTRY_NOTES in update:
            report["notesCleaned"] += 1
        report["updatedRecordIds"].append(record.get("id", ""))
        if dry_run:
            continue
        try:
            airtable.update_record(Config.MERCHANDISE_TABLE, record["id"], update, by_field_id=False)
        except Exception as exc:
            report["errors"].append({"recordId": record.get("id", ""), "error": str(exc)})
    return report


def delete_legacy_intake_status_field(merchandise_table, *, dry_run=False):
    field = field_by_name(merchandise_table, LEGACY_INTAKE_STATUS_FIELD)
    if not field:
        return {"result": "already_absent", "field": LEGACY_INTAKE_STATUS_FIELD}
    if dry_run:
        return {"result": "would_delete", "field": LEGACY_INTAKE_STATUS_FIELD, "id": field.get("id", "")}
    meta_request("DELETE", f"/tables/{merchandise_table['id']}/fields/{field['id']}")
    return {"result": "deleted", "field": LEGACY_INTAKE_STATUS_FIELD, "id": field.get("id", "")}


def run(*, dry_run=False):
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")

    tables = get_tables()
    merchandise = table_by_name(tables, Config.MERCHANDISE_TABLE)
    if not merchandise:
        raise SystemExit(f"{Config.MERCHANDISE_TABLE} table is required.")

    migration = migrate_intake_status_records(dry_run=dry_run)
    schema = ensure_intake_status_schema(merchandise, dry_run=dry_run)
    deletion = delete_legacy_intake_status_field(merchandise, dry_run=dry_run)
    return {
        "dryRun": dry_run,
        "table": Config.MERCHANDISE_TABLE,
        "canonicalValues": Config.PLANNING_STATUS_OPTIONS,
        "schema": schema,
        "migration": migration,
        "deletion": deletion,
    }


def main():
    parser = argparse.ArgumentParser(description="Migrate legacy Intake Status values into Planning Status and retire the old field.")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and report without changing Airtable.")
    args = parser.parse_args()
    print(json.dumps(run(dry_run=args.dry_run), indent=2))


if __name__ == "__main__":
    main()
