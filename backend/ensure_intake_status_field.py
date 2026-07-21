#!/usr/bin/env python3
import argparse
import json

from airtable import airtable
from config import Config
from ensure_workflow_schema import create_field, field_by_name, get_tables, load_env, meta_request, table_by_name


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
HISTORICAL_RESOLUTIONS = {"Return to Client", "Dispose"}


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
    intake_field = field_by_name(merchandise_table, Config.F_RECEIPT_ENTRY_INTAKE_STATUS)
    merch_status = field_by_name(merchandise_table, Config.F_RECEIPT_ENTRY_MERCH_STATUS)
    decision = {
        "field": Config.F_RECEIPT_ENTRY_INTAKE_STATUS,
        "result": "unchanged",
        "id": intake_field.get("id", "") if intake_field else "",
        "reusedMerchStatus": False,
        "merchStatusSafe": merch_status_is_safe_intake_field(merchandise_table),
        "reason": "Intake Status already exists.",
        "missingOptions": [],
        "extraOptions": [],
    }

    if intake_field:
        if intake_field.get("type") != "singleSelect":
            raise SystemExit(f"{Config.F_RECEIPT_ENTRY_INTAKE_STATUS} exists but is {intake_field.get('type')}, not singleSelect.")
        current_options = option_names(intake_field)
        missing = [option for option in Config.INTAKE_STATUS_OPTIONS if option not in current_options]
        decision["missingOptions"] = missing
        decision["extraOptions"] = [option for option in current_options if option not in Config.INTAKE_STATUS_OPTIONS]
        if missing:
            decision["result"] = "would_update" if dry_run else "updated"
            decision["reason"] = "Existing Intake Status field is missing required options."
            if not dry_run:
                update_field(merchandise_table["id"], intake_field["id"], field_options_payload(intake_field, Config.INTAKE_STATUS_OPTIONS))
        return decision

    decision["reason"] = (
        "Merch Status is not reused because it already drives inventory/review compatibility "
        "with Received, Matched, Validated, and Issue."
    )
    if merch_status:
        decision["merchStatusChoices"] = option_names(merch_status)
    decision["result"] = "would_create" if dry_run else "created"
    if not dry_run:
        created = create_field(merchandise_table["id"], single_select_field(Config.F_RECEIPT_ENTRY_INTAKE_STATUS, Config.INTAKE_STATUS_OPTIONS))
        decision["id"] = created.get("id", "")
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
    intake_status = str(fields.get(Config.F_RECEIPT_ENTRY_INTAKE_STATUS, "") or "").strip()
    merch_status = str(fields.get(Config.F_RECEIPT_ENTRY_MERCH_STATUS, "") or "").strip()
    resolution = str(fields.get(Config.F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION, "") or "").strip()
    if intake_status == "Closed":
        return True
    if merch_status.lower() in HISTORICAL_MERCH_STATUSES:
        return True
    if resolution in HISTORICAL_RESOLUTIONS:
        return True
    return False


def planned_record_update(record):
    fields = record.get("fields", {})
    existing_status = str(fields.get(Config.F_RECEIPT_ENTRY_INTAKE_STATUS, "") or "").strip()
    marker_present = has_legacy_marker(fields)
    update = {}
    reason = ""

    if marker_present:
        update[Config.F_RECEIPT_ENTRY_NOTES] = clean_legacy_waiting_marker(fields.get(Config.F_RECEIPT_ENTRY_NOTES, ""))

    if valid_intake_status(existing_status):
        return update, "cleaned_marker_only" if update else "skipped_existing_status"

    if existing_status and not valid_intake_status(existing_status):
        return update, "skipped_invalid_existing_status"

    if historical_or_closed(fields):
        return update, "skipped_historical"

    if marker_present:
        update[Config.F_RECEIPT_ENTRY_INTAKE_STATUS] = "Waiting on Information"
        reason = "migrated_marker"
    elif str(fields.get(Config.F_RECEIPT_ENTRY_MERCH_STATUS, "") or "").strip() == "Validated":
        update[Config.F_RECEIPT_ENTRY_INTAKE_STATUS] = "Ready to Release"
        reason = "defaulted_ready"
    else:
        update[Config.F_RECEIPT_ENTRY_INTAKE_STATUS] = "Needs Review"
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


def run(*, dry_run=False):
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")

    tables = get_tables()
    merchandise = table_by_name(tables, Config.MERCHANDISE_TABLE)
    if not merchandise:
        raise SystemExit(f"{Config.MERCHANDISE_TABLE} table is required.")

    schema = ensure_intake_status_schema(merchandise, dry_run=dry_run)
    migration = migrate_intake_status_records(dry_run=dry_run)
    return {
        "dryRun": dry_run,
        "table": Config.MERCHANDISE_TABLE,
        "canonicalValues": Config.INTAKE_STATUS_OPTIONS,
        "schema": schema,
        "migration": migration,
    }


def main():
    parser = argparse.ArgumentParser(description="Ensure Merchandise has a durable Intake Status field and migrate legacy waiting markers.")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and report without changing Airtable.")
    args = parser.parse_args()
    print(json.dumps(run(dry_run=args.dry_run), indent=2))


if __name__ == "__main__":
    main()
