import csv
import io
import json
import os
import random
import re
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from xml.etree import ElementTree

import requests

from flask import Blueprint, jsonify, request, send_from_directory

from airtable import airtable
from config import Config
from receiving_photo_storage import (
    ReceivingPhotoConfigError,
    ReceivingPhotoStorage,
    ReceivingPhotoStorageError,
    ReceivingPhotoValidationError,
    sanitize_path_segment,
)

api = Blueprint("api", __name__)

C = Config  # shorthand
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads" / "receiving"


def err(msg, status=400):
    return jsonify({"error": msg}), status


def airtable_err(error):
    response = getattr(error, "response", None)
    status = getattr(response, "status_code", 500)
    if status in {403, 404}:
        return err("Airtable table is not configured yet.", 501)
    message = "Airtable request failed."
    try:
        payload = response.json() if response is not None else {}
        airtable_message = (payload.get("error") or {}).get("message")
        if airtable_message:
            message = airtable_message
    except ValueError:
        pass
    return err(message, status)


def _photo_storage():
    return ReceivingPhotoStorage(C)


def _is_unknown_field_error(error, field_name):
    response = getattr(error, "response", None)
    try:
        payload = response.json() if response is not None else {}
    except ValueError:
        return False
    message = str((payload.get("error") or {}).get("message") or "")
    return "Unknown field name" in message and field_name in message


def _now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _as_list(value):
    if not value:
        return []
    return value if isinstance(value, list) else [value]


def _field_value(record, field):
    return (record.get("fields", {}) if record else {}).get(field)


def _first_link(record, field):
    values = _field_value(record, field)
    return values[0] if isinstance(values, list) and values else None


def _current_user():
    user_id = (request.headers.get("X-User-Id") or request.args.get("userId") or "").strip()
    email = (request.headers.get("X-User-Email") or request.args.get("userEmail") or "").strip().lower()
    if not user_id and not email:
        return None
    try:
        if user_id:
            return airtable.get_record(C.USERS_TABLE, user_id, by_field_id=False)
        data = airtable.list_records(C.USERS_TABLE, params={"sort[0][field]": C.F_USER_NAME, "sort[0][direction]": "asc"}, by_field_id=False)
    except requests.HTTPError:
        return None
    for record in data.get("records", []):
        if (record.get("fields", {}).get(C.F_USER_EMAIL, "") or "").lower() == email:
            return record
    return None


def _current_user_id():
    user = _current_user()
    return user.get("id") if user else None


def _permission_context():
    user = _current_user()
    if user is None:
        return {"all": True, "client_ids": None}
    fields = user.get("fields", {})
    if fields.get(C.F_USER_ALL_CLIENTS):
        return {"all": True, "client_ids": None}
    return {"all": False, "client_ids": set(fields.get(C.F_USER_CLIENTS, []) or [])}


def _client_permitted(client_id, permissions=None):
    if not client_id:
        return False
    permissions = permissions or _permission_context()
    return permissions["all"] or client_id in permissions["client_ids"]


def _client_ids_permitted(client_ids, permissions=None):
    ids = set(_as_list(client_ids))
    if not ids:
        return False
    permissions = permissions or _permission_context()
    return permissions["all"] or bool(ids & permissions["client_ids"])


def _receipt_client_permitted(client_ids, permissions=None):
    ids = set(_as_list(client_ids))
    if not ids:
        return True
    permissions = permissions or _permission_context()
    return permissions["all"] or bool(ids & permissions["client_ids"])


def _filter_by_client_field(records, field):
    permissions = _permission_context()
    if permissions["all"]:
        return records
    return [record for record in records if _client_ids_permitted(record.get("fields", {}).get(field, []), permissions)]


def _filter_receipts_by_access(records):
    permissions = _permission_context()
    if permissions["all"]:
        return records
    return [record for record in records if _receipt_client_permitted(record.get("fields", {}).get(C.F_RECEIPT_CLIENT, []), permissions)]


def _list_all_record_ids(table_name):
    record_ids = []
    params = {"pageSize": 100}
    while True:
        data = airtable.list_records(table_name, params=params, by_field_id=False)
        record_ids.extend(record["id"] for record in data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return record_ids
        params["offset"] = offset


def _list_all_records(table_name, params=None):
    records = []
    merged = {"pageSize": 100, **(params or {})}
    while True:
        data = airtable.list_records(table_name, params=merged, by_field_id=False)
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return records
        merged["offset"] = offset


def _delete_records_in_batches(table_name, record_ids):
    deleted = 0
    for index in range(0, len(record_ids), 10):
        batch = record_ids[index:index + 10]
        if batch:
            airtable.delete_records(table_name, batch)
            deleted += len(batch)
    return deleted


def _permitted_client_records(records):
    permissions = _permission_context()
    if permissions["all"]:
        return records
    return [record for record in records if record.get("id") in permissions["client_ids"]]


def _record_client_ids(table, record_id):
    if not record_id:
        return []
    try:
        record = airtable.get_record(table, record_id, by_field_id=False)
    except requests.HTTPError:
        return []
    fields = record.get("fields", {})
    if table == C.JOBS_TABLE:
        return fields.get(C.F_JOB_CLIENT, []) or []
    if table == C.ITEMS_TABLE:
        return fields.get(C.F_ITEM_CLIENT, []) or []
    if table == C.RECEIPTS_TABLE:
        return fields.get(C.F_RECEIPT_CLIENT, []) or []
    return []


def _job_client_ids(job_id):
    return _record_client_ids(C.JOBS_TABLE, job_id)


def _item_client_ids(item_id):
    return _record_client_ids(C.ITEMS_TABLE, item_id)


def _client_ids_for_issue(record):
    fields = record.get("fields", {})
    client_ids = set()
    for item_id in fields.get(C.F_ISSUE_ITEM, []) or []:
        client_ids.update(_item_client_ids(item_id))
    for job_id in fields.get(C.F_ISSUE_JOB, []) or []:
        client_ids.update(_job_client_ids(job_id))
    return list(client_ids)


def _client_ids_for_history(record):
    fields = record.get("fields", {})
    client_ids = set()
    for item_id in fields.get(C.F_HISTORY_ITEM, []) or []:
        client_ids.update(_item_client_ids(item_id))
    for job_id in fields.get(C.F_HISTORY_JOB, []) or []:
        client_ids.update(_job_client_ids(job_id))
    return list(client_ids)


def _filter_indirect_client_records(records, resolver):
    permissions = _permission_context()
    if permissions["all"]:
        return records
    return [record for record in records if _client_ids_permitted(resolver(record), permissions)]


def _all_linked_records_permitted(table, ids):
    return all(_client_ids_permitted(_record_client_ids(table, record_id)) for record_id in _as_list(ids))


def _forbidden():
    return err("You do not have access to that Client.", 403)


def _linked_location_names(ids):
    names = []
    for record_id in _as_list(ids):
        try:
            record = airtable.get_record(C.LOCATIONS_TABLE, record_id, by_field_id=False)
        except requests.HTTPError:
            continue
        name = record.get("fields", {}).get(C.F_LOCATION_NAME)
        if name:
            names.append(name)
    return ", ".join(names)


def _history_signature(fields):
    parts = [
        fields.get(C.F_HISTORY_TYPE, ""),
        fields.get(C.F_HISTORY_EVENT, ""),
        ",".join(fields.get(C.F_HISTORY_ITEM, []) or []),
        ",".join(fields.get(C.F_HISTORY_JOB, []) or []),
        fields.get(C.F_HISTORY_FIELD, ""),
        fields.get(C.F_HISTORY_FROM, ""),
        fields.get(C.F_HISTORY_TO, ""),
    ]
    return " | ".join(parts)


def _history_exists(fields):
    params = {"maxRecords": 100, "sort[0][field]": C.F_HISTORY_DATE, "sort[0][direction]": "desc"}
    try:
        data = airtable.list_records(C.HISTORY_TABLE, params=params, by_field_id=False)
    except requests.HTTPError:
        return False

    signature = _history_signature(fields)
    now = datetime.now(timezone.utc)
    for record in data.get("records", []):
        existing = record.get("fields", {})
        event_date = existing.get(C.F_HISTORY_DATE)
        if event_date:
            try:
                parsed = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
            except ValueError:
                parsed = None
            if parsed and (now - parsed).total_seconds() > 120:
                continue
        existing_fields = {
            C.F_HISTORY_EVENT: existing.get(C.F_HISTORY_EVENT, ""),
            C.F_HISTORY_ITEM: existing.get(C.F_HISTORY_ITEM, []),
            C.F_HISTORY_JOB: existing.get(C.F_HISTORY_JOB, []),
            C.F_HISTORY_TYPE: existing.get(C.F_HISTORY_TYPE, ""),
            C.F_HISTORY_FIELD: existing.get(C.F_HISTORY_FIELD, ""),
            C.F_HISTORY_FROM: existing.get(C.F_HISTORY_FROM, ""),
            C.F_HISTORY_TO: existing.get(C.F_HISTORY_TO, ""),
        }
        if _history_signature(existing_fields) == signature:
            return True
    return False


def _create_history_event(event, event_type, *, item_ids=None, job_ids=None, user_ids=None, field=None, from_value=None, to_value=None, details=None):
    fields = {
        C.F_HISTORY_EVENT: event,
        C.F_HISTORY_TYPE: event_type,
        C.F_HISTORY_DATE: _now_iso(),
    }
    if item_ids:
        fields[C.F_HISTORY_ITEM] = _as_list(item_ids)
    if job_ids:
        fields[C.F_HISTORY_JOB] = _as_list(job_ids)
    if user_ids:
        fields[C.F_HISTORY_USER] = _as_list(user_ids)
    if field:
        fields[C.F_HISTORY_FIELD] = field
    if from_value not in (None, ""):
        fields[C.F_HISTORY_FROM] = str(from_value)
    if to_value not in (None, ""):
        fields[C.F_HISTORY_TO] = str(to_value)
    if details:
        fields[C.F_HISTORY_DETAILS] = details

    if _history_exists(fields):
        return None
    try:
        return airtable.create_record(C.HISTORY_TABLE, fields, by_field_id=False)
    except requests.HTTPError:
        return None


# ── Health ────────────────────────────────────────────────────────────────────

@api.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "Marks Food Photography API",
        "airtableConfigured": C.airtable_ready(),
    })


@api.get("/airtable/status")
def airtable_status():
    return jsonify({
        "configured": airtable.is_configured,
        "baseIdPresent": bool(C.AIRTABLE_BASE_ID),
        "apiKeyPresent": bool(C.AIRTABLE_API_KEY),
    })


# ── Clients ───────────────────────────────────────────────────────────────────

@api.get("/clients")
def list_clients():
    data = airtable.list_records(
        C.CLIENTS_TABLE,
        params={"sort[0][field]": C.F_CLIENT_NAME, "sort[0][direction]": "asc"},
        by_field_id=False,
    )
    records = [_shape_client(r) for r in _permitted_client_records(data.get("records", []))]
    clients = [{"id": r["id"], "client": r["name"]} for r in records]
    return jsonify({"records": records, "clients": clients})


def _shape_client(r):
    f = r.get("fields", {})
    return {
        "id": r["id"],
        "name": f.get(C.F_CLIENT_NAME, ""),
        "codeType": f.get(C.F_CLIENT_IDENTIFIER_TYPE, ""),
        "identifierLabel": f.get(C.F_CLIENT_IDENTIFIER_LABEL, "") or "Identifier",
        "requiredPhotographyFields": f.get(C.F_CLIENT_REQUIRED_PHOTO_FIELDS, []) or ["Identifier"],
        "artworkRequirement": f.get(C.F_CLIENT_ARTWORK_REQUIREMENT, "") or "Optional",
        "merchandiseRequired": f.get(C.F_CLIENT_MERCHANDISE_REQUIRED, True),
        "holdDays": f.get(C.F_CLIENT_HOLD_DAYS),
        "dispoDays": f.get(C.F_CLIENT_DISPO_DAYS),
        "jobPrefix": f.get(C.F_CLIENT_JOB_PREFIX, ""),
        "active": f.get(C.F_CLIENT_ACTIVE, False),
    }


READINESS_LABELS = {
    "merchandise_issue": "Merchandise Issue",
    "waiting_for_merchandise": "Waiting for Merchandise",
    "missing_data": "Missing Data",
    "missing_artwork": "Missing Artwork",
    "ready_for_photo": "Ready for Photo",
}
MERCHANDISE_ISSUE_TYPES = {"Missing Merch", "Wrong Merch", "Damaged", "Unknown Item"}
RESOLVED_ISSUE_STATUSES = {"Resolved", "Cancelled"}
PRODUCTION_LOCK_STATUSES = {"In Production", "Complete", "Cancelled"}


def _identifier_label(client):
    return (client or {}).get("identifierLabel") or "Identifier"


def _required_photo_fields(client):
    fields = (client or {}).get("requiredPhotographyFields") or ["Identifier"]
    return fields if isinstance(fields, list) else [fields]


def _validate_identifier_value(identifier, code_type, label="Identifier"):
    value = str(identifier or "")
    code_type = code_type or ""
    if code_type == "UPC-12" and not (value.isdigit() and len(value) == 12):
        return f"{label} must be exactly 12 digits."
    if code_type == "GTIN-14" and not (value.isdigit() and len(value) == 14):
        return f"{label} must be exactly 14 digits."
    if code_type == "GTIN-13" and not (value.isdigit() and len(value) == 13):
        return f"{label} must be exactly 13 digits."
    if code_type == "GTIN-12" and not (value.isdigit() and len(value) == 12):
        return f"{label} must be exactly 12 digits."
    if code_type == "GTIN-8" and not (value.isdigit() and len(value) == 8):
        return f"{label} must be exactly 8 digits."
    if code_type == "Numeric" and not value.isdigit():
        return f"{label} must contain digits only."
    if code_type in {"Text", "Item #"} and not value:
        return f"{label} is required."
    return ""


def _item_has_merchandise(item):
    return bool(item.get("received"))


def _blocking_merchandise_issues(issues):
    blockers = []
    for issue in issues or []:
        if issue.get("status") in RESOLVED_ISSUE_STATUSES:
            continue
        if issue.get("type") in MERCHANDISE_ISSUE_TYPES:
            blockers.append(issue)
    return blockers


def evaluate_photo_readiness(item, client=None, issues=None, full=False):
    client = client or {}
    label = _identifier_label(client)
    required_fields = _required_photo_fields(client)
    artwork_requirement = client.get("artworkRequirement") or "Optional"
    merchandise_required = client.get("merchandiseRequired")
    if merchandise_required is None:
        merchandise_required = True

    details = {
        "ready": False,
        "state": "missing_data",
        "label": READINESS_LABELS["missing_data"],
        "missing": [],
        "warnings": [],
    }
    if full:
        details["requirements"] = {
            "identifierLabel": label,
            "codeType": client.get("codeType", ""),
            "requiredPhotographyFields": required_fields,
            "artworkRequirement": artwork_requirement,
            "merchandiseRequired": merchandise_required,
        }

    if item.get("status") in PRODUCTION_LOCK_STATUSES:
        details.update({"ready": True, "state": "ready_for_photo", "label": READINESS_LABELS["ready_for_photo"]})
        details["warnings"].append("Item is already in production or complete; readiness will not move it backward.")
        return details

    blockers = _blocking_merchandise_issues(issues)
    if blockers:
        details.update({"state": "merchandise_issue", "label": READINESS_LABELS["merchandise_issue"]})
        details["missing"].append("Resolve merchandise issue.")
        if full:
            details["issues"] = blockers
        return details

    if merchandise_required and not _item_has_merchandise(item):
        details.update({"state": "waiting_for_merchandise", "label": READINESS_LABELS["waiting_for_merchandise"]})
        details["missing"].append("Merchandise must be received and matched to this item.")
        return details

    missing_data = []
    for field in required_fields:
        if field in {"Identifier", "ID"}:
            identifier = item.get("productId") or item.get("identifier") or ""
            if not identifier:
                missing_data.append(f"{label} is required.")
            else:
                message = _validate_identifier_value(identifier, client.get("codeType", ""), label)
                if message:
                    missing_data.append(message)
        elif field in {"Product Name", "Product/File Name", "Product or File Name"} and not item.get("product"):
            missing_data.append("Product or File Name is required.")
        elif field == "Brand" and not item.get("brand"):
            missing_data.append("Brand is required.")
        elif field == "Artwork" and not item.get("artworkReceived"):
            missing_data.append("Artwork is required.")

    if missing_data:
        details.update({"state": "missing_data", "label": READINESS_LABELS["missing_data"], "missing": missing_data})
        return details

    if artwork_requirement == "Required" and not item.get("artworkReceived"):
        details.update({"state": "missing_artwork", "label": READINESS_LABELS["missing_artwork"]})
        details["missing"].append("Artwork is required.")
        return details
    if artwork_requirement == "Optional" and not item.get("artworkReceived"):
        details["warnings"].append("Artwork has not been received.")

    details.update({"ready": True, "state": "ready_for_photo", "label": READINESS_LABELS["ready_for_photo"]})
    return details


# ── Intake preview ────────────────────────────────────────────────────────────

ALLOWED_INTAKE_EXTENSIONS = {".csv", ".xlsx", ".xls"}
XLSX_MAIN_NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
XLSX_RELS_NS = {
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "office": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
DEFAULT_IMPORT_OUTPUT = "Photo + Render"
IMPORT_OUTPUTS = {"Photo Only", "Render Only", "Photo + Render"}
INTAKE_FALLBACK_DESCRIPTIONS = {
    "Item Name": "Optional item display name in the app.",
    "Identifier": "Client product identifier.",
    "Product or File Name": "Product or file name.",
    "Description": "Longer source product or item description.",
    "Item Job Number": "Row-level job or project number for the item.",
    "Output Type": "Photo Only, Render Only, or Photo + Render.",
    "Master or Variant": "Whether this item is a master or a variant.",
    "Pickup Job Number": "Previous production job number for variant pickup work.",
    "Brand": "Product brand.",
    "Due Date": "Job due date when present in the source spreadsheet.",
    "Notes": "Source notes that describe the item.",
    "Job Name": "Human-readable job or group name.",
    "Reference Data": "Preserve source values as item reference JSON.",
}
INTAKE_MAPPINGS = {
    "kroger": {
        "item_job_number": "Job #",
        "job_name": "Description",
        "item_name": "Product Received",
        "description": "Description",
        "id": "UPC",
        "brand": "Brand",
        "output": "Output Type",
        "notes": ["Notes"],
    },
    "unfi": {
        "item_job_number": "Project Number",
        "item_name": "Description",
        "description": "Description",
        "id": "UPC",
        "output": "Output Type",
        "notes": ["Notes"],
    },
    "smithfield": {
        "item_job_number": "Job #",
        "item_name": "Product Description",
        "description": "Product Description",
        "id": "GAR #",
        "brand": "Brand",
        "output": "Output",
        "notes": ["Notes"],
    },
}


def _import_record_name(filename):
    return f"{filename or 'Spreadsheet'} - {_now_iso()}"


def _import_summary_fields(result, status):
    summary = result.get("summary") or {}
    jobs_to_create = sum(1 for job in result.get("jobsPreview", []) if not job.get("existingId"))
    jobs_to_reuse = sum(1 for job in result.get("jobsPreview", []) if job.get("existingId"))
    if status == "Validated":
        return {
            C.F_IMPORT_STATUS: status,
            C.F_IMPORT_ROWS: result.get("totalRows", 0),
            C.F_IMPORT_JOBS_CREATED: jobs_to_create,
            C.F_IMPORT_JOBS_REUSED: jobs_to_reuse,
            C.F_IMPORT_ITEMS_CREATED: result.get("itemsToCreate", 0),
            C.F_IMPORT_ITEMS_UPDATED: result.get("itemsToUpdate", 0),
            C.F_IMPORT_ROWS_SKIPPED: sum(1 for row in result.get("rows", []) if row.get("errors")),
            C.F_IMPORT_ERRORS: result.get("errorCount", 0),
            C.F_IMPORT_WARNINGS: result.get("warningCount", 0),
        }
    return {
        C.F_IMPORT_STATUS: status,
        C.F_IMPORT_ROWS: result.get("totalRows", 0),
        C.F_IMPORT_JOBS_CREATED: summary.get("jobsCreated", jobs_to_create),
        C.F_IMPORT_JOBS_REUSED: summary.get("jobsReused", jobs_to_reuse),
        C.F_IMPORT_ITEMS_CREATED: summary.get("itemsCreated", result.get("itemsToCreate", 0)),
        C.F_IMPORT_ITEMS_UPDATED: summary.get("itemsUpdated", result.get("itemsToUpdate", 0)),
        C.F_IMPORT_ROWS_SKIPPED: summary.get("rowsSkipped", 0),
        C.F_IMPORT_ERRORS: summary.get("errors", result.get("errorCount", 0)),
        C.F_IMPORT_WARNINGS: summary.get("warnings", result.get("warningCount", 0)),
    }


def _create_import_record(client_id, filename, status, rows=None, details=""):
    fields = {
        C.F_IMPORT_NAME: _import_record_name(filename),
        C.F_IMPORT_CLIENT: [client_id],
        C.F_IMPORT_FILE: filename,
        C.F_IMPORT_TYPE: "Spreadsheet",
        C.F_IMPORT_STATUS: status,
        C.F_IMPORT_STARTED: _now_iso(),
    }
    user_id = _current_user_id()
    if user_id:
        fields[C.F_IMPORT_USER] = [user_id]
    if rows is not None:
        fields[C.F_IMPORT_ROWS] = rows
    if details:
        fields[C.F_IMPORT_DETAILS] = details
    if status == "Failed":
        fields[C.F_IMPORT_FINISHED] = _now_iso()
    return airtable.create_record(C.IMPORTS_TABLE, fields, by_field_id=False)


def _update_import_record(import_id, fields):
    if not import_id:
        return None
    return airtable.update_record(C.IMPORTS_TABLE, import_id, fields, by_field_id=False)


def _fail_import_record(import_id, client_id, filename, message):
    fields = {
        C.F_IMPORT_STATUS: "Failed",
        C.F_IMPORT_FINISHED: _now_iso(),
        C.F_IMPORT_DETAILS: message,
    }
    if import_id:
        return _update_import_record(import_id, fields)
    if client_id and filename:
        return _create_import_record(client_id, filename, "Failed", details=message)
    return None


@api.post("/intake/preview")
def intake_preview():
    client_id = (request.form.get("clientId") or "").strip()
    uploaded = request.files.get("file")

    if client_id and not _client_permitted(client_id):
        return _forbidden()
    if not uploaded or not uploaded.filename:
        return err("Upload an XLSX or CSV file.")

    filename = uploaded.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_INTAKE_EXTENSIONS:
        return err("Invalid file type. Upload .xlsx, .xls, or .csv.")

    content = uploaded.read()
    if not content:
        return err("The uploaded file is empty.")

    try:
        parsed = _parse_spreadsheet(content, ext)
        import_record = _create_import_record(client_id, filename, "Parsed", rows=parsed.get("rowCount", 0)) if client_id else None
    except UnicodeDecodeError:
        _fail_import_record(None, client_id, filename, "Unreadable file. The CSV encoding could not be detected.")
        return err("Unreadable file. The CSV encoding could not be detected.")
    except zipfile.BadZipFile:
        _fail_import_record(None, client_id, filename, "Unreadable file. The Excel workbook could not be opened.")
        return err("Unreadable file. The Excel workbook could not be opened.")
    except ValueError as exc:
        _fail_import_record(None, client_id, filename, str(exc))
        return err(str(exc))
    except requests.HTTPError as error:
        return airtable_err(error)
    except Exception:
        _fail_import_record(None, client_id, filename, "Unreadable file. The spreadsheet could not be parsed.")
        return err("Unreadable file. The spreadsheet could not be parsed.")

    return jsonify({
        "fileName": filename,
        "clientId": client_id,
        "importId": import_record.get("id") if import_record else "",
        **parsed,
    })


@api.post("/intake/review")
def intake_review():
    return _intake_import_response(dry_run=True)


@api.post("/intake/import")
def intake_import():
    return _intake_import_response(dry_run=False)


def _intake_import_response(dry_run):
    if request.is_json:
        return _intake_import_json_response(dry_run)

    client_id = (request.form.get("clientId") or "").strip()
    import_id = (request.form.get("importId") or "").strip()
    uploaded = request.files.get("file")
    if not client_id:
        return err("Choose a client before uploading a spreadsheet.")
    if not _client_permitted(client_id):
        return _forbidden()
    if not uploaded or not uploaded.filename:
        return err("Upload an XLSX or CSV file.")

    filename = uploaded.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_INTAKE_EXTENSIONS:
        return err("Invalid file type. Upload .xlsx, .xls, or .csv.")

    content = uploaded.read()
    if not content:
        return err("The uploaded file is empty.")

    try:
        parsed = _parse_spreadsheet(content, ext)
        result = _build_intake_plan(client_id, filename, parsed)
        if not dry_run:
            result = _execute_intake_plan(result)
            fields = _import_summary_fields(result, "Imported")
            fields[C.F_IMPORT_FINISHED] = _now_iso()
            _update_import_record(import_id, fields)
        else:
            _update_import_record(import_id, _import_summary_fields(result, "Validated"))
    except UnicodeDecodeError:
        _fail_import_record(import_id, client_id, filename, "Unreadable file. The CSV encoding could not be detected.")
        return err("Unreadable file. The CSV encoding could not be detected.")
    except zipfile.BadZipFile:
        _fail_import_record(import_id, client_id, filename, "Unreadable file. The Excel workbook could not be opened.")
        return err("Unreadable file. The Excel workbook could not be opened.")
    except ValueError as exc:
        _fail_import_record(import_id, client_id, filename, str(exc))
        return err(str(exc))
    except requests.HTTPError as error:
        _fail_import_record(import_id, client_id, filename, "Airtable request failed.")
        return airtable_err(error)
    except Exception:
        _fail_import_record(import_id, client_id, filename, "Unreadable file. The spreadsheet could not be imported.")
        return err("Unreadable file. The spreadsheet could not be imported.")

    result["dryRun"] = dry_run
    result["importId"] = import_id
    return jsonify(result)


def _intake_import_json_response(dry_run):
    body = request.get_json(silent=True) or {}
    client_id = (body.get("clientId") or "").strip()
    filename = (body.get("fileName") or "Edited import").strip()
    import_id = (body.get("importId") or "").strip()
    rows = body.get("rows") or []
    source_rows = body.get("sourceRows") or []
    headers = body.get("columnHeaders") or []
    mapping = body.get("mapping") or {}
    if not client_id:
        return err("Choose a client before importing.")
    if not _client_permitted(client_id):
        return _forbidden()
    if source_rows and (not isinstance(source_rows, list) or not isinstance(headers, list)):
        return err("Invalid source rows were provided for import.")
    if not source_rows and (not isinstance(rows, list) or not rows):
        return err("No rows were provided for import.")

    try:
        if not import_id:
            row_count = len(source_rows) if source_rows else len(rows)
            import_record = _create_import_record(client_id, filename, "Parsed", rows=row_count)
            import_id = import_record.get("id", "")
        if source_rows:
            result = _build_intake_plan_from_source_rows(client_id, filename, headers, source_rows, mapping)
        else:
            result = _build_intake_plan_from_mapped_rows(client_id, filename, rows)
        if not dry_run:
            result = _execute_intake_plan(result)
            fields = _import_summary_fields(result, "Imported")
            fields[C.F_IMPORT_FINISHED] = _now_iso()
            _update_import_record(import_id, fields)
        else:
            _update_import_record(import_id, _import_summary_fields(result, "Validated"))
    except requests.HTTPError as error:
        _fail_import_record(import_id, client_id, filename, "Airtable request failed.")
        return airtable_err(error)
    except ValueError as exc:
        _fail_import_record(import_id, client_id, filename, str(exc))
        return err(str(exc))

    result["dryRun"] = dry_run
    result["importId"] = import_id
    return jsonify(result)


def _parse_spreadsheet(content, ext):
    if _looks_like_xlsx(content):
        return _parse_xlsx(content)
    if ext == ".csv":
        return _parse_csv(content)
    if ext == ".xlsx":
        return _parse_xlsx(content)
    if _looks_like_text_spreadsheet(content):
        return _parse_delimited_text(content)
    return _parse_xls(content)


def _looks_like_xlsx(content):
    return bytes(content[:4]) == b"PK\x03\x04"


def _looks_like_text_spreadsheet(content):
    sample = bytes(content[:2048]).lstrip()
    if not sample:
        return False
    return not sample.startswith(b"\xd0\xcf\x11\xe0")


def _parse_delimited_text(content):
    text = _decode_text_spreadsheet(content)
    sample = text[:2048]
    delimiter = "\t" if sample.count("\t") > sample.count(",") else ","
    rows = list(csv.reader(io.StringIO(text), delimiter=delimiter))
    summary = _summarize_rows(rows)
    return {
        "sheetNames": [],
        "selectedSheet": "",
        **summary,
    }


def _decode_text_spreadsheet(content):
    for encoding in ("utf-8-sig", "utf-16", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8-sig", errors="replace")


@api.get("/imports")
def list_imports():
    limit = request.args.get("limit", "25")
    params = {
        "sort[0][field]": C.F_IMPORT_STARTED,
        "sort[0][direction]": "desc",
        "maxRecords": limit,
    }
    data = airtable.list_records(C.IMPORTS_TABLE, params=params, by_field_id=False)
    records = _filter_by_client_field(data.get("records", []), C.F_IMPORT_CLIENT)
    return jsonify({"records": _shape_import_records(records)})


@api.get("/imports/client-status")
def import_client_status():
    client_id = (request.args.get("clientId") or "").strip()
    if not client_id:
        return err("clientId is required")
    if not _client_permitted(client_id):
        return _forbidden()
    records = _list_all_records(C.IMPORTS_TABLE)
    records = [
        record for record in records
        if client_id in (record.get("fields", {}).get(C.F_IMPORT_CLIENT, []) or [])
    ]
    return jsonify({"clientId": client_id, "hasImports": bool(records), "importCount": len(records)})


@api.get("/imports/<record_id>")
def get_import(record_id):
    record = airtable.get_record(C.IMPORTS_TABLE, record_id, by_field_id=False)
    if not _client_ids_permitted(record.get("fields", {}).get(C.F_IMPORT_CLIENT, [])):
        return _forbidden()
    return jsonify({"record": _shape_import_records([record])[0]})


def _name_map(table, name_field):
    data = airtable.list_records(table, by_field_id=False)
    return {record.get("id"): record.get("fields", {}).get(name_field, "") for record in data.get("records", [])}


def _shape_import_records(records):
    client_names = _name_map(C.CLIENTS_TABLE, C.F_CLIENT_NAME)
    user_names = _name_map(C.USERS_TABLE, C.F_USER_NAME)
    return [_shape_import_record(record, client_names, user_names) for record in records]


def _shape_import_record(record, client_names, user_names):
    fields = record.get("fields", {})
    client_ids = fields.get(C.F_IMPORT_CLIENT, []) or []
    user_ids = fields.get(C.F_IMPORT_USER, []) or []
    return {
        "id": record.get("id"),
        "name": fields.get(C.F_IMPORT_NAME, ""),
        "clientIds": client_ids,
        "client": client_names.get(client_ids[0], "") if client_ids else "",
        "userIds": user_ids,
        "user": user_names.get(user_ids[0], "") if user_ids else "",
        "file": fields.get(C.F_IMPORT_FILE, ""),
        "type": fields.get(C.F_IMPORT_TYPE, ""),
        "status": fields.get(C.F_IMPORT_STATUS, ""),
        "started": fields.get(C.F_IMPORT_STARTED, ""),
        "finished": fields.get(C.F_IMPORT_FINISHED, ""),
        "rows": fields.get(C.F_IMPORT_ROWS, 0),
        "jobsCreated": fields.get(C.F_IMPORT_JOBS_CREATED, 0),
        "jobsReused": fields.get(C.F_IMPORT_JOBS_REUSED, 0),
        "itemsCreated": fields.get(C.F_IMPORT_ITEMS_CREATED, 0),
        "itemsUpdated": fields.get(C.F_IMPORT_ITEMS_UPDATED, 0),
        "rowsSkipped": fields.get(C.F_IMPORT_ROWS_SKIPPED, 0),
        "errors": fields.get(C.F_IMPORT_ERRORS, 0),
        "warnings": fields.get(C.F_IMPORT_WARNINGS, 0),
        "details": fields.get(C.F_IMPORT_DETAILS, ""),
    }


def _parse_csv(content):
    text = content.decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text)))
    summary = _summarize_rows(rows)
    return {
        "sheetNames": [],
        "selectedSheet": "",
        **summary,
    }


def _parse_xlsx(content):
    try:
        from openpyxl import load_workbook
    except ImportError:
        return _parse_xlsx_xml(content)

    workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    sheet_names = workbook.sheetnames
    if not sheet_names:
        raise ValueError("No sheets were found in the workbook.")
    selected = workbook[sheet_names[0]]
    rows = [[_spreadsheet_value(cell.value) for cell in row] for row in selected.iter_rows()]
    summary = _summarize_rows(rows)
    return {
        "sheetNames": sheet_names,
        "selectedSheet": selected.title,
        **summary,
    }


def _parse_xls(content):
    try:
        import xlrd
    except ImportError:
        raise ValueError("Unreadable file. Legacy .xls support requires xlrd.")

    workbook = xlrd.open_workbook(file_contents=content)
    sheet_names = workbook.sheet_names()
    if not sheet_names:
        raise ValueError("No sheets were found in the workbook.")
    selected = workbook.sheet_by_index(0)
    rows = [
        [_spreadsheet_value(selected.cell_value(row_index, col_index)) for col_index in range(selected.ncols)]
        for row_index in range(selected.nrows)
    ]
    summary = _summarize_rows(rows)
    return {
        "sheetNames": sheet_names,
        "selectedSheet": selected.name,
        **summary,
    }


def _parse_xlsx_xml(content):
    with zipfile.ZipFile(io.BytesIO(content)) as workbook:
        shared_strings = _xlsx_shared_strings(workbook)
        sheets = _xlsx_sheets(workbook)
        if not sheets:
            raise ValueError("No sheets were found in the workbook.")

        selected = sheets[0]
        rows = _xlsx_sheet_rows(workbook, selected["path"], shared_strings)
        summary = _summarize_rows(rows)
        return {
            "sheetNames": [sheet["name"] for sheet in sheets],
            "selectedSheet": selected["name"],
            **summary,
        }


def _spreadsheet_value(value):
    if value is None:
        return ""
    return str(value)


def _xlsx_shared_strings(workbook):
    try:
        root = ElementTree.fromstring(workbook.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    strings = []
    for item in root.findall("main:si", XLSX_MAIN_NS):
        text = "".join(node.text or "" for node in item.findall(".//main:t", XLSX_MAIN_NS))
        strings.append(text)
    return strings


def _xlsx_sheets(workbook):
    workbook_root = ElementTree.fromstring(workbook.read("xl/workbook.xml"))
    rels_root = ElementTree.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))
    rels = {}
    for rel in rels_root.findall("rel:Relationship", XLSX_RELS_NS):
        rel_id = rel.attrib.get("Id")
        target = rel.attrib.get("Target", "")
        if rel_id and target:
            rels[rel_id] = "xl/" + target.lstrip("/")

    sheets = []
    for sheet in workbook_root.findall("main:sheets/main:sheet", XLSX_MAIN_NS):
        rel_id = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        path = rels.get(rel_id)
        if path:
            sheets.append({"name": sheet.attrib.get("name", "Sheet"), "path": path})
    return sheets


def _xlsx_sheet_rows(workbook, path, shared_strings):
    root = ElementTree.fromstring(workbook.read(path))
    rows = []
    for row in root.findall(".//main:sheetData/main:row", XLSX_MAIN_NS):
        values = []
        for cell in row.findall("main:c", XLSX_MAIN_NS):
            index = _xlsx_cell_index(cell.attrib.get("r", ""))
            while len(values) <= index:
                values.append("")
            values[index] = _xlsx_cell_value(cell, shared_strings)
        rows.append(values)
    return rows


def _xlsx_cell_index(reference):
    match = re.match(r"([A-Z]+)", reference or "")
    if not match:
        return 0
    index = 0
    for char in match.group(1):
        index = index * 26 + ord(char) - ord("A") + 1
    return index - 1


def _xlsx_cell_value(cell, shared_strings):
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//main:t", XLSX_MAIN_NS))

    value_node = cell.find("main:v", XLSX_MAIN_NS)
    value = value_node.text if value_node is not None else ""
    if cell_type == "s":
        try:
            return shared_strings[int(value)]
        except (ValueError, IndexError):
            return ""
    return value or ""


def _summarize_rows(rows):
    normalized = [[("" if value is None else str(value)) for value in row] for row in rows]
    normalized = [row for row in normalized if _row_has_value(row)]
    if not normalized:
        raise ValueError("No usable rows were found in the spreadsheet.")

    header = normalized[0]
    data_rows = [row for row in normalized[1:] if _row_has_value(row)]
    if not data_rows:
        raise ValueError("No usable data rows were found after the header row.")

    width = max(len(header), *(len(row) for row in data_rows))
    header = _pad_row(header, width)
    data_rows = [_pad_row(row, width) for row in data_rows]
    keep_indexes = [
        index for index in range(width)
        if _cell_has_value(header[index]) or any(_cell_has_value(row[index]) for row in data_rows)
    ]
    header = [header[index] for index in keep_indexes]
    data_rows = [[row[index] for index in keep_indexes] for row in data_rows]

    if not header:
        raise ValueError("No usable columns were found in the spreadsheet.")

    return {
        "rowCount": len(data_rows),
        "columnHeaders": header,
        "previewRows": data_rows[:10],
        "rows": data_rows,
    }


def _pad_row(row, width):
    return row + [""] * (width - len(row))


def _row_has_value(row):
    return any(_cell_has_value(value) for value in row)


def _cell_has_value(value):
    return str(value or "").strip() != ""


def _client_record(client_id):
    return airtable.get_record(C.CLIENTS_TABLE, client_id, by_field_id=False)


def _client_name(client_record):
    return client_record.get("fields", {}).get(C.F_CLIENT_NAME, "")


def _intake_destination_field_map():
    return {
        "Job Name": (C.JOBS_TABLE, C.F_JOB_NAME),
        "Parent Job Number": (C.JOBS_TABLE, C.F_JOB_PARENT_NUMBER),
        "Due Date": (C.JOBS_TABLE, C.F_JOB_DUE),
        "Item Name": (C.ITEMS_TABLE, C.F_ITEM_NAME),
        "Identifier": (C.ITEMS_TABLE, C.F_ITEM_IDENTIFIER),
        "Product or File Name": (C.ITEMS_TABLE, C.F_ITEM_PRODUCT),
        "Description": (C.ITEMS_TABLE, C.F_ITEM_DESCRIPTION),
        "Item Job Number": (C.ITEMS_TABLE, C.F_ITEM_JOB_NUMBER),
        "Output Type": (C.ITEMS_TABLE, C.F_ITEM_OUTPUT),
        "Master or Variant": (C.ITEMS_TABLE, C.F_ITEM_MASTER_VARIANT),
        "Pickup Job Number": (C.ITEMS_TABLE, C.F_ITEM_PICKUP_JOB_NUMBER),
        "Brand": (C.ITEMS_TABLE, C.F_ITEM_BRAND),
        "Notes": (C.ITEMS_TABLE, C.F_ITEM_NOTES),
        "Reference Data": (C.ITEMS_TABLE, C.F_ITEM_REFERENCE_DATA),
    }


def _airtable_field_descriptions():
    if not airtable.is_configured:
        return {}
    url = f"https://api.airtable.com/v0/meta/bases/{C.AIRTABLE_BASE_ID}/tables"
    response = requests.get(url, headers=airtable._headers(), timeout=20)
    response.raise_for_status()
    descriptions = {}
    destinations = _intake_destination_field_map()
    for table in response.json().get("tables", []):
        table_name = table.get("name")
        for field in table.get("fields", []):
            field_name = field.get("name")
            for destination, (target_table, target_field) in destinations.items():
                if table_name == target_table and field_name == target_field and field.get("description"):
                    descriptions[destination] = field["description"]
    return descriptions


@api.get("/intake/mapping-targets")
def intake_mapping_targets():
    targets = list(INTAKE_FALLBACK_DESCRIPTIONS)
    try:
        airtable_descriptions = _airtable_field_descriptions()
    except requests.HTTPError as error:
        return airtable_err(error)
    except Exception:
        airtable_descriptions = {}

    return jsonify({
        "targets": [
            {
                "target": target,
                "description": airtable_descriptions.get(target) or INTAKE_FALLBACK_DESCRIPTIONS[target],
                "descriptionSource": "airtable" if target in airtable_descriptions else "local",
            }
            for target in targets
        ],
    })


def _mapping_for_client(client_name):
    mapping = INTAKE_MAPPINGS.get((client_name or "").strip().lower())
    if not mapping:
        raise ValueError(f"No spreadsheet mapping exists for {client_name or 'this Client'}.")
    return mapping


def _row_dict(headers, values):
    return {header: values[index] if index < len(values) else "" for index, header in enumerate(headers)}


def _source_value(row, field):
    return str(row.get(field, "") or "").strip() if field else ""


def _mapped_value(row, mapping, key):
    field = mapping.get(key)
    value = _source_value(row, field)
    if value:
        return value
    fallback = mapping.get(f"{key}_fallback")
    return _source_value(row, fallback)


def _mapped_notes(row, mapping):
    notes = []
    for field in mapping.get("notes", []):
        value = _source_value(row, field)
        if value:
            notes.append(value)
    return "\n".join(notes)


def _mapped_reference_data(row, mapping):
    reference_data = {}
    for field in mapping.get("reference_data", []):
        value = _source_value(row, field)
        if value:
            reference_data[str(field)] = value
    return reference_data


def _normalize_reference_data(value):
    if not isinstance(value, dict):
        return {}
    normalized = {}
    for key, raw_value in value.items():
        clean_key = str(key or "").strip()
        clean_value = str(raw_value or "").strip()
        if clean_key and clean_value:
            normalized[clean_key] = clean_value
    return normalized


def _parse_reference_data(raw):
    if not raw:
        return {}
    if isinstance(raw, dict):
        return _normalize_reference_data(raw)
    text = str(raw or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
    except (TypeError, ValueError):
        print(f"Malformed Reference Data JSON: {text[:200]}")
        return {"Raw": text}
    if not isinstance(parsed, dict):
        print(f"Malformed Reference Data JSON: {text[:200]}")
        return {"Raw": text}
    return _normalize_reference_data(parsed)


def _reference_data_json(value):
    normalized = _normalize_reference_data(value)
    if not normalized:
        return ""
    return json.dumps(normalized, ensure_ascii=False, sort_keys=True)


def _mapping_from_ui_mapping(ui_mapping):
    if not isinstance(ui_mapping, dict):
        raise ValueError("Invalid column mapping.")

    mapping = {"notes": [], "reference_data": []}
    single_job_name = str(ui_mapping.get("__singleJobName") or "").strip()
    if single_job_name:
        mapping["single_job_name"] = single_job_name
    existing_job_id = str(ui_mapping.get("__existingJobId") or "").strip()
    if existing_job_id:
        mapping["existing_job_id"] = existing_job_id
        mapping["existing_job_name"] = str(ui_mapping.get("__existingJobName") or "").strip()
    job_group_field = str(ui_mapping.get("__jobGroupField") or "").strip()
    if job_group_field:
        mapping["job_group"] = job_group_field
    target_keys = {
        "Item Name": "item_name",
        "Identifier": "id",
        "Product or File Name": "product",
        "Product/File Name": "product",
        "Product Name": "product",
        "Description": "description",
        "Item Job Number": "item_job_number",
        "Brand": "brand",
        "Job Number": "item_job_number",
        "Parent Job Number": "parent_job_number",
        "Output Type": "output",
        "Master or Variant": "master_or_variant",
        "Pickup Job Number": "pickup_job_number",
        "Due Date": "due",
        "Job Name": "job_name",
        "Jobs.Job": "job_name",
        "Jobs.Job Number": "parent_job_number",
        "Jobs.Parent Job Number": "parent_job_number",
        "Jobs.Due": "due",
        "Items.Item": "item_name",
        "Items.Identifier": "id",
        "Items.Product or File Name": "product",
        "Items.Product/File Name": "product",
        "Items.Product Name": "product",
        "Items.Description": "description",
        "Items.Item Job Number": "item_job_number",
        "Items.Job Number": "item_job_number",
        "Items.Output Type": "output",
        "Items.Master or Variant": "master_or_variant",
        "Items.Pickup Job Number": "pickup_job_number",
        "Items.Brand": "brand",
        "Items.Category": "category",
        "Job": "job_name",
        "Job Name": "job_name",
        "Identifier": "id",
        "ID": "id",
        "Product or File Name": "product",
        "Product/File Name": "product",
        "Product Name": "product",
        "Description": "description",
        "Item Job Number": "item_job_number",
        "Job Number": "item_job_number",
        "Output Type": "output",
        "Master or Variant": "master_or_variant",
        "Pickup Job Number": "pickup_job_number",
        "Brand": "brand",
        "Category": "category",
    }

    target_mapping = ui_mapping.get("__targetMapping")
    if isinstance(target_mapping, dict):
        for target, source in target_mapping.items():
            source_name = str(source or "").strip()
            target_name = str(target or "").strip()
            if not source_name:
                continue
            if target_name == "Notes" or target_name == "Items.Notes":
                mapping["notes"].append(source_name)
                continue
            key = target_keys.get(target_name)
            if key and key not in {"notes", "job_notes"}:
                mapping[key] = source_name

    for source, target in ui_mapping.items():
        if source in {"__targetMapping", "__singleJobName", "__existingJobId", "__existingJobName", "__jobGroupField"}:
            continue
        source_name = str(source or "").strip()
        target_name = str(target or "").strip()
        if not source_name or target_name == "Ignore":
            continue
        if target_name == "Items.Notes" or target_name == "Notes":
            mapping["notes"].append(source_name)
            continue
        if target_name == "Reference Data":
            mapping["reference_data"].append(source_name)
            continue
        key = target_keys.get(target_name)
        if key and key not in mapping:
            mapping[key] = source_name

    required_targets = (("Identifier", "id"),)
    if "single_job_name" not in mapping and "existing_job_id" not in mapping and "job_group" not in mapping:
        required_targets = (*required_targets, ("Job", "job_group"))
    missing = [label for label, key in required_targets if key not in mapping]
    if missing:
        raise ValueError(f"Missing required column mapping: {', '.join(missing)}.")
    return mapping


def _normalize_output(value):
    cleaned = (value or "").strip()
    if not cleaned:
        return DEFAULT_IMPORT_OUTPUT
    aliases = {
        "photo": "Photo Only",
        "photo only": "Photo Only",
        "render": "Render Only",
        "render only": "Render Only",
        "photo + render": "Photo + Render",
        "photo and render": "Photo + Render",
        "photo/render": "Photo + Render",
        "both": "Photo + Render",
    }
    return aliases.get(cleaned.lower(), cleaned if cleaned in IMPORT_OUTPUTS else DEFAULT_IMPORT_OUTPUT)


def _normalize_master_or_variant(value):
    cleaned = str(value or "").strip()
    if not cleaned:
        return ""
    aliases = {
        "master": "Master",
        "m": "Master",
        "variant": "Variant",
        "v": "Variant",
    }
    return aliases.get(cleaned.lower(), cleaned if cleaned in {"Master", "Variant"} else "")


def _normalize_item_job_number(value):
    return str(value or "").strip()


def _normalize_description(value):
    text = str(value or "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text.strip()


def _readable_item_name(brand, product, identifier):
    if brand and product:
        return f"{brand} {product}"
    return product or identifier


def _received_signal(row):
    for key in ("Received", "Product Received", "Merch Received"):
        value = _source_value(row, key).lower()
        if value in {"yes", "true", "received", "y", "1"}:
            return True
        if value in {"no", "false", "n", "0"}:
            return False
    return None


def _default_item_status(row):
    return "Pending"


def _job_name_from_group_value(client_name, group_value):
    value = str(group_value or "").strip()
    if not value:
        return ""
    letters = re.sub(r"[^A-Za-z]+", "", value)
    looks_like_code = len(letters) < 3 or bool(re.fullmatch(r"[A-Z]{0,4}[-_ ]?\d+[A-Z0-9-_. ]*", value, re.I))
    return f"{client_name} {value}" if looks_like_code else value


def _validate_identifier(identifier, code_type, label="Identifier"):
    return _validate_item_identifier(identifier, code_type, label)


def _normalized_required_fields(client_config):
    return {
        "Identifier" if field == "ID" else "Product or File Name" if field in {"Product Name", "Product/File Name"} else str(field or "").strip()
        for field in (client_config or {}).get("requiredPhotographyFields", [])
        if str(field or "").strip()
    }


def _existing_jobs_by_lookup(client_id):
    data = airtable.list_records(C.JOBS_TABLE, by_field_id=False)
    jobs = {}
    for record in _filter_by_client_field(data.get("records", []), C.F_JOB_CLIENT):
        fields = record.get("fields", {})
        if client_id in (fields.get(C.F_JOB_CLIENT, []) or []):
            parent_number = fields.get(C.F_JOB_PARENT_NUMBER, "")
            name = fields.get(C.F_JOB_NAME, "")
            if parent_number:
                jobs[f"parent:{parent_number}"] = record
            if name:
                jobs[f"name:{name}"] = record
    return jobs


def _existing_job_for_import(existing_jobs, group_key, job_name, parent_number=""):
    if parent_number and f"parent:{parent_number}" in existing_jobs:
        return existing_jobs[f"parent:{parent_number}"]
    if job_name and f"name:{job_name}" in existing_jobs:
        return existing_jobs[f"name:{job_name}"]
    if group_key and f"parent:{group_key}" in existing_jobs:
        return existing_jobs[f"parent:{group_key}"]
    return {}


def _existing_items_by_identifier(client_id):
    data = airtable.list_records(C.ITEMS_TABLE, by_field_id=False)
    items = {}
    for record in _filter_by_client_field(data.get("records", []), C.F_ITEM_CLIENT):
        fields = record.get("fields", {})
        if client_id in (fields.get(C.F_ITEM_CLIENT, []) or []):
            identifier = fields.get(C.F_ITEM_IDENTIFIER, "")
            if identifier:
                items[identifier] = record
    return items


def _build_intake_plan(client_id, filename, parsed, mapping=None):
    client_record = _client_record(client_id)
    if not _client_permitted(client_id):
        raise ValueError("You do not have access to that Client.")
    client_name = _client_name(client_record)
    client_config = _shape_client(client_record)
    code_type = client_config.get("codeType", "")
    identifier_label = _identifier_label(client_config)
    required_photo_fields = _normalized_required_fields(client_config)
    mapping = mapping or _mapping_for_client(client_name)
    headers = parsed.get("columnHeaders", [])
    rows = [_row_dict(headers, values) for values in parsed.get("rows", [])]
    existing_jobs = _existing_jobs_by_lookup(client_id)
    existing_items = _existing_items_by_identifier(client_id)
    seen_ids = {}
    row_results = []
    jobs = {}
    items_to_create = 0
    items_to_update = 0
    warning_count = 0
    error_count = 0
    single_job_name = str(mapping.get("single_job_name") or "").strip()
    existing_job_id = str(mapping.get("existing_job_id") or "").strip()
    existing_job_name = str(mapping.get("existing_job_name") or "").strip()

    for index, row in enumerate(rows, start=2):
        ext_id = existing_job_id or single_job_name or _mapped_value(row, mapping, "job_group") or _mapped_value(row, mapping, "ext_id")
        identifier = _mapped_value(row, mapping, "id")
        product = _mapped_value(row, mapping, "product")
        product_source = _source_value(row, mapping.get("product"))
        item_job_number = _normalize_item_job_number(_mapped_value(row, mapping, "item_job_number"))
        description = _normalize_description(_mapped_value(row, mapping, "description"))
        parent_job_number = _normalize_item_job_number(_mapped_value(row, mapping, "parent_job_number"))
        brand = _mapped_value(row, mapping, "brand")
        category = _mapped_value(row, mapping, "category")
        output = _normalize_output(_mapped_value(row, mapping, "output"))
        master_or_variant = _normalize_master_or_variant(_mapped_value(row, mapping, "master_or_variant"))
        pickup_job_number = _normalize_item_job_number(_mapped_value(row, mapping, "pickup_job_number"))
        job_name_text = existing_job_name or single_job_name or _mapped_value(row, mapping, "job_name")
        job_due = _mapped_value(row, mapping, "due")
        notes = _mapped_notes(row, mapping)
        reference_data = _mapped_reference_data(row, mapping)
        item_name = _mapped_value(row, mapping, "item_name")
        problems = []
        warnings = []

        if not ext_id:
            problems.append("Missing Job")
        if not identifier:
            problems.append(f"Missing {identifier_label}")
        if identifier:
            validation_error = _validate_identifier(identifier, code_type, identifier_label)
            if validation_error:
                problems.append(validation_error)
            if identifier in seen_ids:
                warnings.append(f"Duplicate {identifier_label} also appears on row {seen_ids[identifier]}")
            else:
                seen_ids[identifier] = index
        if "Product or File Name" in required_photo_fields and not product_source:
            problems.append("Missing Product or File Name")
        if "Brand" in required_photo_fields and not brand:
            problems.append("Missing Brand")

        if ext_id:
            resolved_job_name = job_name_text or _job_name_from_group_value(client_name, ext_id)
            existing_job = {"id": existing_job_id} if existing_job_id else _existing_job_for_import(existing_jobs, ext_id, resolved_job_name, parent_job_number)
            job = jobs.setdefault(ext_id, {
                "extId": ext_id,
                "parentJobNumber": parent_job_number,
                "jobName": resolved_job_name,
                "due": job_due,
                "existingId": existing_job.get("id"),
                "rowCount": 0,
            })
            job["rowCount"] += 1

        existing_item = existing_items.get(identifier) if identifier else None
        action = "skip" if problems else ("update" if existing_item else "create")
        if action == "create":
            items_to_create += 1
        elif action == "update":
            items_to_update += 1
        warning_count += len(warnings)
        error_count += len(problems)
        row_results.append({
            "rowNumber": index,
            "action": action,
            "extId": ext_id,
            "existingJobId": existing_job_id,
            "id": identifier,
            "jobName": job_name_text or _job_name_from_group_value(client_name, ext_id),
            "itemName": item_name or _readable_item_name(brand, product, identifier),
            "product": product,
            "itemJobNumber": item_job_number,
            "description": description,
            "brand": brand,
            "category": category,
            "due": job_due,
            "output": output,
            "masterOrVariant": master_or_variant,
            "pickupJobNumber": pickup_job_number,
            "notes": notes,
            "referenceData": reference_data,
            "status": _default_item_status(row),
            "existingItemId": existing_item.get("id") if existing_item else None,
            "errors": problems,
            "warnings": warnings,
        })

    jobs_detected = list(jobs.values())
    jobs_to_create = sum(1 for job in jobs_detected if not job.get("existingId"))
    jobs_to_reuse = len(jobs_detected) - jobs_to_create
    return {
        "fileName": filename,
        "clientId": client_id,
        "clientName": client_name,
        "codeType": code_type,
        "identifierLabel": identifier_label,
        "sheetNames": parsed.get("sheetNames", []),
        "selectedSheet": parsed.get("selectedSheet", ""),
        "totalRows": len(rows),
        "jobsDetected": len(jobs_detected),
        "itemsToCreate": items_to_create,
        "itemsToUpdate": items_to_update,
        "warningCount": warning_count,
        "errorCount": error_count,
        "jobsPreview": jobs_detected,
        "rows": row_results,
        "summary": {
            "jobsCreated": 0,
            "jobsReused": jobs_to_reuse,
            "itemsCreated": 0,
            "itemsUpdated": 0,
            "rowsSkipped": error_count and sum(1 for row in row_results if row["errors"]) or 0,
            "errors": error_count,
            "warnings": warning_count,
        },
    }


def _build_intake_plan_from_source_rows(client_id, filename, headers, source_rows, ui_mapping):
    parsed = {
        "columnHeaders": [str(header or "") for header in headers],
        "rows": source_rows,
        "sheetNames": [],
        "selectedSheet": "",
    }
    mapping = _mapping_from_ui_mapping(ui_mapping)
    return _build_intake_plan(client_id, filename, parsed, mapping=mapping)


def _build_intake_plan_from_mapped_rows(client_id, filename, rows):
    client_record = _client_record(client_id)
    client_name = _client_name(client_record)
    client_config = _shape_client(client_record)
    code_type = client_config.get("codeType", "")
    identifier_label = _identifier_label(client_config)
    required_photo_fields = _normalized_required_fields(client_config)
    existing_jobs = _existing_jobs_by_lookup(client_id)
    existing_items = _existing_items_by_identifier(client_id)
    seen_ids = {}
    row_results = []
    jobs = {}
    items_to_create = 0
    items_to_update = 0
    warning_count = 0
    error_count = 0

    for index, source in enumerate(rows, start=1):
        ext_id = str(source.get("extId", "") or "").strip()
        existing_job_id = str(source.get("existingJobId", "") or "").strip()
        identifier = str(source.get("id", "") or "").strip()
        product = str(source.get("product", "") or "").strip()
        item_job_number = _normalize_item_job_number(source.get("itemJobNumber"))
        description = _normalize_description(source.get("description"))
        parent_job_number = _normalize_item_job_number(source.get("parentJobNumber"))
        brand = str(source.get("brand", "") or "").strip()
        category = str(source.get("category", "") or "").strip()
        output = _normalize_output(str(source.get("output", "") or ""))
        master_or_variant = _normalize_master_or_variant(source.get("masterOrVariant"))
        pickup_job_number = _normalize_item_job_number(source.get("pickupJobNumber"))
        notes = str(source.get("notes", "") or "").strip()
        job_due = str(source.get("due", "") or "").strip()
        reference_data = _normalize_reference_data(source.get("referenceData") or {})
        status = source.get("status") or "Pending"
        item_name = str(source.get("itemName", "") or "").strip()
        problems = []
        warnings = []

        if not ext_id:
            problems.append("Missing Job")
        if not identifier:
            problems.append(f"Missing {identifier_label}")
        if identifier:
            validation_error = _validate_identifier(identifier, code_type, identifier_label)
            if validation_error:
                problems.append(validation_error)
            if identifier in seen_ids:
                warnings.append(f"Duplicate {identifier_label} also appears on row {seen_ids[identifier]}")
            else:
                seen_ids[identifier] = index
        if "Product or File Name" in required_photo_fields and not product:
            problems.append("Missing Product or File Name")
        if "Brand" in required_photo_fields and not brand:
            problems.append("Missing Brand")

        if ext_id:
            resolved_job_name = source.get("jobName") or _job_name_from_group_value(client_name, ext_id)
            existing_job = {"id": existing_job_id} if existing_job_id else _existing_job_for_import(existing_jobs, ext_id, resolved_job_name, parent_job_number)
            job = jobs.setdefault(ext_id, {
                "extId": ext_id,
                "parentJobNumber": parent_job_number,
                "jobName": resolved_job_name,
                "due": job_due,
                "existingId": existing_job.get("id"),
                "rowCount": 0,
            })
            job["rowCount"] += 1

        existing_item = existing_items.get(identifier) if identifier else None
        action = "skip" if problems else ("update" if existing_item else "create")
        if action == "create":
            items_to_create += 1
        elif action == "update":
            items_to_update += 1
        warning_count += len(warnings)
        error_count += len(problems)
        row_results.append({
            "rowNumber": source.get("rowNumber") or index,
            "action": action,
            "extId": ext_id,
            "existingJobId": existing_job_id,
            "id": identifier,
            "jobName": source.get("jobName") or _job_name_from_group_value(client_name, ext_id),
            "itemName": item_name or _readable_item_name(brand, product, identifier),
            "product": product,
            "itemJobNumber": item_job_number,
            "description": description,
            "brand": brand,
            "category": category,
            "due": job_due,
            "output": output,
            "masterOrVariant": master_or_variant,
            "pickupJobNumber": pickup_job_number,
            "notes": notes,
            "referenceData": reference_data,
            "status": status,
            "existingItemId": existing_item.get("id") if existing_item else None,
            "errors": problems,
            "warnings": warnings,
        })

    jobs_detected = list(jobs.values())
    jobs_to_create = sum(1 for job in jobs_detected if not job.get("existingId"))
    jobs_to_reuse = len(jobs_detected) - jobs_to_create
    return {
        "fileName": filename,
        "clientId": client_id,
        "clientName": client_name,
        "codeType": code_type,
        "identifierLabel": identifier_label,
        "sheetNames": [],
        "selectedSheet": "",
        "totalRows": len(rows),
        "jobsDetected": len(jobs_detected),
        "itemsToCreate": items_to_create,
        "itemsToUpdate": items_to_update,
        "warningCount": warning_count,
        "errorCount": error_count,
        "jobsPreview": jobs_detected,
        "rows": row_results,
        "summary": {
            "jobsCreated": 0,
            "jobsReused": jobs_to_reuse,
            "itemsCreated": 0,
            "itemsUpdated": 0,
            "rowsSkipped": sum(1 for row in row_results if row["errors"]),
            "errors": error_count,
            "warnings": warning_count,
        },
    }


def _job_fields_from_plan(client_id, job):
    fields = {
        C.F_JOB_NAME: job["jobName"],
        C.F_JOB_CLIENT: [client_id],
        C.F_JOB_STATUS: "Active",
    }
    if job.get("parentJobNumber"):
        fields[C.F_JOB_PARENT_NUMBER] = job["parentJobNumber"]
    if job.get("due"):
        fields[C.F_JOB_DUE] = job["due"]
    return fields


def _item_fields_from_row(client_id, job_id, row):
    fields = {
        C.F_ITEM_NAME: row["itemName"],
        C.F_ITEM_CLIENT: [client_id],
        C.F_ITEM_JOB: [job_id],
        C.F_ITEM_IDENTIFIER: row["id"],
        C.F_ITEM_PRODUCT: row["product"],
        C.F_ITEM_OUTPUT: row.get("output") or DEFAULT_IMPORT_OUTPUT,
        C.F_ITEM_STATUS: row["status"],
    }
    if row.get("brand"):
        fields[C.F_ITEM_BRAND] = row["brand"]
    if row.get("itemJobNumber"):
        fields[C.F_ITEM_JOB_NUMBER] = row["itemJobNumber"]
    if row.get("description"):
        fields[C.F_ITEM_DESCRIPTION] = row["description"]
    if row.get("masterOrVariant"):
        fields[C.F_ITEM_MASTER_VARIANT] = row["masterOrVariant"]
    if row.get("pickupJobNumber"):
        fields[C.F_ITEM_PICKUP_JOB_NUMBER] = row["pickupJobNumber"]
    if row.get("category"):
        fields[C.F_ITEM_CATEGORY] = row["category"]
    if row.get("notes"):
        fields[C.F_ITEM_NOTES] = row["notes"]
    reference_data = _reference_data_json(row.get("referenceData"))
    if reference_data:
        fields[C.F_ITEM_REFERENCE_DATA] = reference_data
    return fields


def _execute_intake_plan(plan):
    client_id = plan["clientId"]
    job_ids = {}
    summary = {
        "jobsCreated": 0,
        "jobsReused": 0,
        "itemsCreated": 0,
        "itemsUpdated": 0,
        "rowsSkipped": 0,
        "errors": plan["errorCount"],
        "warnings": plan["warningCount"],
    }

    for job in plan["jobsPreview"]:
        fields = _job_fields_from_plan(client_id, job)
        if job.get("existingId"):
            data = airtable.update_record(C.JOBS_TABLE, job["existingId"], fields, by_field_id=False)
            job_ids[job["extId"]] = data["id"]
            summary["jobsReused"] += 1
        else:
            data = airtable.create_record(C.JOBS_TABLE, fields, by_field_id=False)
            job_ids[job["extId"]] = data["id"]
            job["existingId"] = data["id"]
            summary["jobsCreated"] += 1

    for row in plan["rows"]:
        if row["errors"]:
            summary["rowsSkipped"] += 1
            continue
        job_id = job_ids.get(row["extId"])
        if not job_id:
            row["errors"].append("Job was not available for this row")
            summary["rowsSkipped"] += 1
            summary["errors"] += 1
            continue
        fields = _item_fields_from_row(client_id, job_id, row)
        if row.get("existingItemId"):
            previous = airtable.get_record(C.ITEMS_TABLE, row["existingItemId"], by_field_id=False)
            data = airtable.update_record(C.ITEMS_TABLE, row["existingItemId"], fields, by_field_id=False)
            _log_item_changes(data["id"], previous, data, fields)
            row["action"] = "updated"
            summary["itemsUpdated"] += 1
        else:
            data = airtable.create_record(C.ITEMS_TABLE, fields, by_field_id=False)
            row["existingItemId"] = data["id"]
            row["action"] = "created"
            _create_history_event(
                "Item Created",
                "Item Created",
                item_ids=[data["id"]],
                job_ids=[job_id],
                details=f"Item created: {fields.get(C.F_ITEM_NAME, data['id'])}.",
            )
            summary["itemsCreated"] += 1

    plan["summary"] = summary
    return plan


# ── Locations ─────────────────────────────────────────────────────────────────

@api.get("/locations")
def list_locations():
    data = airtable.list_records(
        C.LOCATIONS_TABLE,
        params={"sort[0][field]": C.F_LOCATION_NAME, "sort[0][direction]": "asc"},
        by_field_id=False,
    )
    records = _filter_locations(data.get("records", []))
    records = [_shape_location(r) for r in records]
    return jsonify({"records": records})


def _filter_locations(records):
    permissions = _permission_context()
    if permissions["all"]:
        return records
    permitted_item_ids = _permitted_record_ids(C.ITEMS_TABLE, C.F_ITEM_CLIENT)
    permitted_receipt_ids = _permitted_record_ids(C.RECEIPTS_TABLE, C.F_RECEIPT_CLIENT)
    filtered = []
    for record in records:
        fields = record.get("fields", {})
        item_ids = set(fields.get("Items", []) or [])
        receipt_ids = set(fields.get("Receipts", []) or [])
        if item_ids & permitted_item_ids or receipt_ids & permitted_receipt_ids:
            filtered.append(record)
    return filtered


def _permitted_record_ids(table, client_field):
    data = airtable.list_records(table, by_field_id=False)
    records = _filter_by_client_field(data.get("records", []), client_field)
    return {record.get("id") for record in records}


def _shape_location(r):
    f = r.get("fields", {})
    return {
        "id": r["id"],
        "name": f.get(C.F_LOCATION_NAME, ""),
        "type": f.get(C.F_LOCATION_TYPE, ""),
        "active": f.get(C.F_LOCATION_ACTIVE, False),
        "notes": f.get(C.F_LOCATION_NOTES, ""),
    }


# ── Users ─────────────────────────────────────────────────────────────────────

@api.get("/users")
def list_users():
    data = airtable.list_records(
        C.USERS_TABLE,
        params={"sort[0][field]": C.F_USER_NAME, "sort[0][direction]": "asc"},
        by_field_id=False,
    )
    records = [_shape_user(r) for r in data.get("records", [])]
    return jsonify({"records": records})


def _shape_user(r):
    f = r.get("fields", {})
    return {
        "id": r["id"],
        "name": f.get(C.F_USER_NAME, ""),
        "email": f.get(C.F_USER_EMAIL, ""),
        "role": f.get(C.F_USER_ROLE, ""),
        "active": f.get(C.F_USER_ACTIVE, False),
        "clientIds": f.get(C.F_USER_CLIENTS, []),
        "allClients": f.get(C.F_USER_ALL_CLIENTS, False),
    }


# ── Jobs ──────────────────────────────────────────────────────────────────────

@api.get("/jobs")
def list_jobs():
    params = {
        "sort[0][field]": C.F_JOB_DUE,
        "sort[0][direction]": "asc",
    }
    client_id = request.args.get("clientId")
    data = airtable.list_records(C.JOBS_TABLE, params=params, by_field_id=False)
    records = _filter_by_client_field(data.get("records", []), C.F_JOB_CLIENT)
    if client_id:
        if not _client_permitted(client_id):
            return _forbidden()
        records = [record for record in records if client_id in (record.get("fields", {}).get(C.F_JOB_CLIENT, []) or [])]
    records = [_shape_job(r) for r in records]
    return jsonify({"records": records})


@api.post("/jobs")
def create_job():
    body = request.get_json(silent=True) or {}
    client_id = body.get("clientId")
    job = (body.get("job") or body.get("name") or body.get("sgsJobNum") or "").strip()
    parent_job_number = (body.get("parentJobNumber") or body.get("extId") or body.get("jobNumber") or body.get("jobId") or "").strip()
    period = (body.get("period") or "").strip()
    status = (body.get("status") or "").strip()
    due = body.get("due") or body.get("deadline") or ""

    if not client_id:
        return err("clientId is required")
    if not _client_permitted(client_id):
        return _forbidden()
    if not job:
        return err("job is required")

    fields = {
        C.F_JOB_NAME: job,
        C.F_JOB_CLIENT: [client_id],
    }
    if parent_job_number:
        fields[C.F_JOB_PARENT_NUMBER] = parent_job_number
    if period:
        fields[C.F_JOB_PERIOD] = period
    if status:
        fields[C.F_JOB_STATUS] = status
    if due:
        fields[C.F_JOB_DUE] = due
    data = airtable.create_record(C.JOBS_TABLE, fields, by_field_id=False)
    return jsonify(_shape_job(data)), 201


@api.patch("/jobs/<record_id>")
def update_job(record_id):
    body = request.get_json(silent=True) or {}
    previous = airtable.get_record(C.JOBS_TABLE, record_id, by_field_id=False)
    if not _client_ids_permitted(previous.get("fields", {}).get(C.F_JOB_CLIENT, [])):
        return _forbidden()
    fields = {}
    for key, field in {
        "job": C.F_JOB_NAME,
        "name": C.F_JOB_NAME,
        "clientIds": C.F_JOB_CLIENT,
        "parentJobNumber": C.F_JOB_PARENT_NUMBER,
        "jobNumber": C.F_JOB_PARENT_NUMBER,
        "extId": C.F_JOB_PARENT_NUMBER,
        "period": C.F_JOB_PERIOD,
        "status": C.F_JOB_STATUS,
        "due": C.F_JOB_DUE,
    }.items():
        if key in body and body[key] not in (None, ""):
            fields[field] = body[key]
    if not fields:
        return err("No updatable fields provided")
    if C.F_JOB_CLIENT in fields and not _client_ids_permitted(fields[C.F_JOB_CLIENT]):
        return _forbidden()

    data = airtable.update_record(C.JOBS_TABLE, record_id, fields, by_field_id=False)
    old_status = _field_value(previous, C.F_JOB_STATUS)
    new_status = fields.get(C.F_JOB_STATUS)
    if new_status and old_status != new_status:
        _create_history_event(
            "Status Changed",
            "Status Changed",
            job_ids=[record_id],
            field="Status",
            from_value=old_status,
            to_value=new_status,
            details=f"Job status changed from {old_status or 'blank'} to {new_status}.",
        )
    return jsonify(_shape_job(data))


def _shape_job(r):
    f = r.get("fields", {})
    return {
        "id": r["id"],
        "name": f.get(C.F_JOB_NAME, ""),
        "job": f.get(C.F_JOB_NAME, ""),
        "clientIds": f.get(C.F_JOB_CLIENT, []),
        "parentJobNumber": f.get(C.F_JOB_PARENT_NUMBER, ""),
        "extId": f.get(C.F_JOB_PARENT_NUMBER, ""),
        "period": f.get(C.F_JOB_PERIOD, ""),
        "status": f.get(C.F_JOB_STATUS, ""),
        "due": f.get(C.F_JOB_DUE, ""),
        "deadline": f.get(C.F_JOB_DUE, ""),
    }


def _jobs_by_id():
    try:
        data = airtable.list_records(C.JOBS_TABLE, by_field_id=False)
    except requests.HTTPError:
        return {}
    records = _filter_by_client_field(data.get("records", []), C.F_JOB_CLIENT)
    return {record["id"]: _shape_job(record) for record in records}


# ── Items ─────────────────────────────────────────────────────────────────────

@api.get("/items")
@api.get("/skus")
def list_items():
    params = {
        "sort[0][field]": C.F_ITEM_NAME,
        "sort[0][direction]": "asc",
    }
    job_id = request.args.get("jobId")
    data = airtable.list_records(C.ITEMS_TABLE, params=params, by_field_id=False)
    records = _filter_by_client_field(data.get("records", []), C.F_ITEM_CLIENT)
    if job_id:
        records = [record for record in records if job_id in (record.get("fields", {}).get(C.F_ITEM_JOB, []) or [])]
    clients_by_id = _clients_by_id()
    issues_by_item_id = _issues_by_item_id()
    records = [_shape_item(r, clients_by_id=clients_by_id, issues_by_item_id=issues_by_item_id) for r in records]
    return jsonify({"records": records})


@api.get("/items/<record_id>")
@api.get("/skus/<record_id>")
def get_item(record_id):
    record = airtable.get_record(C.ITEMS_TABLE, record_id, by_field_id=False)
    if not _client_ids_permitted(record.get("fields", {}).get(C.F_ITEM_CLIENT, [])):
        return _forbidden()
    clients_by_id = _clients_by_id()
    issues_by_item_id = _issues_by_item_id()
    return jsonify({"record": _shape_item(record, clients_by_id=clients_by_id, issues_by_item_id=issues_by_item_id, readiness_full=True)})


@api.post("/items")
@api.post("/skus")
def create_item():
    body = request.get_json(silent=True) or {}
    client_id = body.get("clientId")
    job_id = body.get("jobId")
    if client_id and not _client_permitted(client_id):
        return _forbidden()
    if job_id and not _client_ids_permitted(_job_client_ids(job_id)):
        return _forbidden()
    identifier = (body.get("productId") or body.get("id") or body.get("gtinUpc") or "").strip()
    client_config = _client_config(client_id) if client_id else {}
    code_type = client_config.get("codeType") or body.get("codeType") or ""
    validation_error = _validate_item_identifier(identifier, code_type, _identifier_label(client_config))
    if validation_error:
        return err(validation_error)

    fields = {
        C.F_ITEM_NAME: body.get("name") or body.get("product") or identifier,
        C.F_ITEM_IDENTIFIER: identifier,
    }
    if client_id:
        fields[C.F_ITEM_CLIENT] = [client_id]
    if job_id:
        fields[C.F_ITEM_JOB] = [job_id]
    _apply_item_fields(fields, body)

    data = airtable.create_record(C.ITEMS_TABLE, fields, by_field_id=False)
    item_id = data["id"]
    _create_history_event(
        "Item Created",
        "Item Created",
        item_ids=[item_id],
        job_ids=[job_id] if job_id else None,
        details=f"Item created: {fields.get(C.F_ITEM_NAME, item_id)}.",
    )
    return jsonify(_shape_item(data, clients_by_id=_clients_by_id(), issues_by_item_id=_issues_by_item_id())), 201


@api.patch("/items/<record_id>")
@api.patch("/skus/<record_id>")
def update_item(record_id):
    body = request.get_json(silent=True) or {}
    previous = airtable.get_record(C.ITEMS_TABLE, record_id, by_field_id=False)
    if not _client_ids_permitted(previous.get("fields", {}).get(C.F_ITEM_CLIENT, [])):
        return _forbidden()
    fields = {}
    identifier = body.get("productId") or body.get("id") or body.get("gtinUpc")
    client_config = _client_config(body.get("clientId")) if body.get("clientId") else {}
    code_type = body.get("codeType") or client_config.get("codeType", "")
    if identifier is not None:
        validation_error = _validate_item_identifier(identifier.strip(), code_type, _identifier_label(client_config))
        if validation_error:
            return err(validation_error)
        fields[C.F_ITEM_IDENTIFIER] = identifier.strip()
    if body.get("clientId"):
        if not _client_permitted(body["clientId"]):
            return _forbidden()
        fields[C.F_ITEM_CLIENT] = [body["clientId"]]
    if body.get("jobId"):
        if not _client_ids_permitted(_job_client_ids(body["jobId"])):
            return _forbidden()
        fields[C.F_ITEM_JOB] = [body["jobId"]]
    _apply_item_fields(fields, body)
    if not fields:
        return err("No updatable fields provided")

    data = airtable.update_record(C.ITEMS_TABLE, record_id, fields, by_field_id=False)
    _log_item_changes(record_id, previous, data, fields)
    return jsonify(_shape_item(data, clients_by_id=_clients_by_id(), issues_by_item_id=_issues_by_item_id()))


def _clients_by_id():
    data = airtable.list_records(C.CLIENTS_TABLE, by_field_id=False)
    return {record["id"]: _shape_client(record) for record in _permitted_client_records(data.get("records", []))}


def _issues_by_item_id():
    data = airtable.list_records(C.ISSUES_TABLE, by_field_id=False)
    issues = {}
    for record in _filter_indirect_client_records(data.get("records", []), _client_ids_for_issue):
        shaped = _shape_issue(record)
        for item_id in shaped.get("itemIds", []):
            issues.setdefault(item_id, []).append(shaped)
    return issues


def _shape_item(r, *, clients_by_id=None, issues_by_item_id=None, readiness_full=False):
    f = r.get("fields", {})
    code_type = f.get(C.F_ITEM_IDENTIFIER_TYPE, "")
    if isinstance(code_type, list):
        code_type = code_type[0] if code_type else ""
    client_ids = f.get(C.F_ITEM_CLIENT, [])
    client = (clients_by_id or {}).get(client_ids[0]) if client_ids else None
    if client and not code_type:
        code_type = client.get("codeType", "")
    item = {
        "id": r["id"],
        "name": f.get(C.F_ITEM_NAME, ""),
        "clientIds": client_ids,
        "jobIds": f.get(C.F_ITEM_JOB, []),
        "productId": f.get(C.F_ITEM_IDENTIFIER, ""),
        "identifier": f.get(C.F_ITEM_IDENTIFIER, ""),
        "gtinUpc": f.get(C.F_ITEM_IDENTIFIER, ""),
        "codeType": code_type,
        "identifierLabel": _identifier_label(client),
        "product": f.get(C.F_ITEM_PRODUCT, ""),
        "itemJobNumber": f.get(C.F_ITEM_JOB_NUMBER, ""),
        "description": f.get(C.F_ITEM_DESCRIPTION, ""),
        "output": f.get(C.F_ITEM_OUTPUT, ""),
        "masterOrVariant": f.get(C.F_ITEM_MASTER_VARIANT, ""),
        "pickupJobNumber": f.get(C.F_ITEM_PICKUP_JOB_NUMBER, ""),
        "brand": f.get(C.F_ITEM_BRAND, ""),
        "category": f.get(C.F_ITEM_CATEGORY, ""),
        "received": f.get(C.F_ITEM_RECEIVED, False),
        "merchVerified": f.get(C.F_ITEM_RECEIVED, False),
        "receiptIds": f.get(C.F_ITEM_RECEIPTS, []) if isinstance(f.get(C.F_ITEM_RECEIPTS), list) else [],
        "issueIds": f.get(C.F_ITEM_ISSUES, []) if isinstance(f.get(C.F_ITEM_ISSUES), list) else [],
        "artworkReceived": f.get(C.F_ITEM_ARTWORK_RECEIVED, False),
        "recDate": f.get(C.F_ITEM_REC_DATE, ""),
        "location": "",
        "locationIds": f.get(C.F_ITEM_LOCATION, []) if isinstance(f.get(C.F_ITEM_LOCATION), list) else [],
        "condition": f.get(C.F_ITEM_CONDITION, ""),
        "status": f.get(C.F_ITEM_STATUS, ""),
        "notes": f.get(C.F_ITEM_NOTES, ""),
        "photos": f.get(C.F_ITEM_PHOTOS, []) if isinstance(f.get(C.F_ITEM_PHOTOS), list) else [],
        "photoMetadata": _photo_metadata_from_fields(f, C.F_ITEM_PHOTO_METADATA),
        "referenceDataRaw": f.get(C.F_ITEM_REFERENCE_DATA, ""),
        "referenceData": _parse_reference_data(f.get(C.F_ITEM_REFERENCE_DATA, "")),
    }
    item["readiness"] = evaluate_photo_readiness(
        item,
        client=client,
        issues=(issues_by_item_id or {}).get(r["id"], []),
        full=readiness_full,
    )
    return item


def _apply_item_fields(fields, body):
    mapping = {
        "name": C.F_ITEM_NAME,
        "product": C.F_ITEM_PRODUCT,
        "brand": C.F_ITEM_BRAND,
        "category": C.F_ITEM_CATEGORY,
        "received": C.F_ITEM_RECEIVED,
        "merchVerified": C.F_ITEM_RECEIVED,
        "recDate": C.F_ITEM_REC_DATE,
        "locationIds": C.F_ITEM_LOCATION,
        "condition": C.F_ITEM_CONDITION,
        "status": C.F_ITEM_STATUS,
        "notes": C.F_ITEM_NOTES,
        "artworkReceived": C.F_ITEM_ARTWORK_RECEIVED,
    }
    for key, field in mapping.items():
        if key in body and body[key] not in (None, ""):
            fields[field] = body[key]
    if "itemJobNumber" in body and body["itemJobNumber"] not in (None, ""):
        fields[C.F_ITEM_JOB_NUMBER] = _normalize_item_job_number(body.get("itemJobNumber"))
    if "description" in body and body["description"] not in (None, ""):
        fields[C.F_ITEM_DESCRIPTION] = _normalize_description(body.get("description"))
    if "output" in body and body["output"] not in (None, ""):
        fields[C.F_ITEM_OUTPUT] = _normalize_output(str(body.get("output") or ""))
    if "masterOrVariant" in body and body["masterOrVariant"] not in (None, ""):
        normalized = _normalize_master_or_variant(body.get("masterOrVariant"))
        if normalized:
            fields[C.F_ITEM_MASTER_VARIANT] = normalized
    if "pickupJobNumber" in body and body["pickupJobNumber"] not in (None, ""):
        fields[C.F_ITEM_PICKUP_JOB_NUMBER] = _normalize_item_job_number(body.get("pickupJobNumber"))
    if "referenceData" in body:
        fields[C.F_ITEM_REFERENCE_DATA] = _reference_data_json(body.get("referenceData"))
    elif "referenceDataRaw" in body:
        fields[C.F_ITEM_REFERENCE_DATA] = str(body.get("referenceDataRaw") or "")


def _log_item_changes(record_id, previous, current, changed_fields):
    job_id = _first_link(current, C.F_ITEM_JOB) or _first_link(previous, C.F_ITEM_JOB)

    if C.F_ITEM_STATUS in changed_fields:
        old = _field_value(previous, C.F_ITEM_STATUS)
        new = _field_value(current, C.F_ITEM_STATUS)
        if old != new:
            _create_history_event(
                "Status Changed",
                "Status Changed",
                item_ids=[record_id],
                job_ids=[job_id] if job_id else None,
                field="Status",
                from_value=old,
                to_value=new,
                details=f"Item status changed from {old or 'blank'} to {new or 'blank'}.",
            )

    if C.F_ITEM_LOCATION in changed_fields:
        old_ids = _field_value(previous, C.F_ITEM_LOCATION) or []
        new_ids = _field_value(current, C.F_ITEM_LOCATION) or []
        if old_ids != new_ids:
            old = _linked_location_names(old_ids)
            new = _linked_location_names(new_ids)
            _create_history_event(
                "Status Changed",
                "Status Changed",
                item_ids=[record_id],
                job_ids=[job_id] if job_id else None,
                field="Location",
                from_value=old,
                to_value=new,
                details=f"Item location changed from {old or 'blank'} to {new or 'blank'}.",
            )

    if C.F_ITEM_CONDITION in changed_fields:
        old = _field_value(previous, C.F_ITEM_CONDITION)
        new = _field_value(current, C.F_ITEM_CONDITION)
        if old != new:
            _create_history_event(
                "Status Changed",
                "Status Changed",
                item_ids=[record_id],
                job_ids=[job_id] if job_id else None,
                field="Condition",
                from_value=old,
                to_value=new,
                details=f"Item condition changed from {old or 'blank'} to {new or 'blank'}.",
            )


def _client_code_type(client_id):
    if not client_id:
        return ""
    data = airtable.list_records(C.CLIENTS_TABLE, by_field_id=False)
    for record in data.get("records", []):
        if record.get("id") == client_id:
            return record.get("fields", {}).get(C.F_CLIENT_IDENTIFIER_TYPE, "")
    return ""


def _client_config(client_id):
    if not client_id:
        return {}
    try:
        return _shape_client(airtable.get_record(C.CLIENTS_TABLE, client_id, by_field_id=False))
    except requests.HTTPError:
        return {}


def _validate_item_identifier(identifier, code_type, label="Identifier"):
    return _validate_identifier_value(identifier, code_type, label)


def _match_text(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _match_compact(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def _item_match_score(item, query):
    query_text = _match_text(query)
    query_compact = _match_compact(query)
    if len(query_compact) < 3:
        return 0
    reference_data = item.get("referenceData") or {}
    reference_values = reference_data.values() if isinstance(reference_data, dict) else []
    fields = [
        item.get("identifier", ""),
        item.get("name", ""),
        item.get("product", ""),
        item.get("itemJobNumber", ""),
        item.get("masterOrVariant", ""),
        item.get("pickupJobNumber", ""),
        item.get("description", ""),
        item.get("brand", ""),
        item.get("category", ""),
        item.get("referenceDataRaw", ""),
        *[str(value) for value in reference_values],
    ]
    identifier = _match_compact(item.get("identifier", ""))
    item_job_number = _match_compact(item.get("itemJobNumber", ""))
    name_text = _match_text(item.get("name", ""))
    product_text = _match_text(item.get("product", ""))
    detail_text = _match_text(" ".join(fields))
    if query_compact and query_compact in {identifier, item_job_number}:
        return 120
    if query_compact and (query_compact in identifier or query_compact in item_job_number):
        return 92
    if query_text and query_text in {name_text, product_text}:
        return 84
    if query_text and (query_text in name_text or query_text in product_text):
        return 70
    query_tokens = set(query_text.split())
    detail_tokens = set(detail_text.split())
    overlap = query_tokens & detail_tokens
    if overlap:
        return 48 + min(18, len(overlap) * 6)
    return 0


def _find_matching_skus(query, *, client_id="", include_item_id=""):
    cleaned = (query or "").strip()
    if len(_match_compact(cleaned)) < 3:
        return []

    data = airtable.list_records(C.ITEMS_TABLE, params={"sort[0][field]": C.F_ITEM_NAME, "sort[0][direction]": "asc"}, by_field_id=False)
    jobs_by_id = _jobs_by_id()
    matches = []
    for record in _filter_by_client_field(data.get("records", []), C.F_ITEM_CLIENT):
        if client_id and client_id not in _as_list(record.get("fields", {}).get(C.F_ITEM_CLIENT, [])):
            continue
        sku = _shape_item(record)
        # Skip items already linked to a receipt (already claimed), unless the
        # caller explicitly wants to include a specific item (re-match case).
        if sku.get("receiptIds") and sku["id"] != include_item_id:
            continue
        score = _item_match_score(sku, cleaned)
        if score:
            job_ids = sku.get("jobIds") or []
            jobs = [jobs_by_id[job_id] for job_id in job_ids if job_id in jobs_by_id]
            matches.append({
                **sku,
                "score": score,
                "jobNumber": sku.get("itemJobNumber") or (jobs[0].get("job") if jobs else ""),
                "parentJobNumber": jobs[0].get("parentJobNumber") if jobs else "",
                "hasValidatedMerchandise": bool(sku.get("merchVerified") or sku.get("received")),
            })
    return sorted(
        matches,
        key=lambda sku: (
            -sku["score"],
            sku.get("hasValidatedMerchandise", False),
            sku.get("gtinUpc") or sku.get("name") or "",
        ),
    )[:8]


# ── Issues ────────────────────────────────────────────────────────────────────

@api.get("/issues")
def list_issues():
    data = airtable.list_records(
        C.ISSUES_TABLE,
        params={"sort[0][field]": C.F_ISSUE_OPENED, "sort[0][direction]": "desc"},
        by_field_id=False,
    )
    records = _filter_indirect_client_records(data.get("records", []), _client_ids_for_issue)
    records = [_shape_issue(record) for record in records]
    return jsonify({"records": records})


@api.post("/issues")
def create_issue():
    body = request.get_json(silent=True) or {}
    issue = (body.get("issue") or body.get("name") or "").strip()
    if not issue:
        return err("issue is required")

    fields = {C.F_ISSUE_NAME: issue}
    item_ids = _as_list(body.get("itemId") or body.get("itemIds"))
    job_ids = _as_list(body.get("jobId") or body.get("jobIds"))
    if item_ids and not _all_linked_records_permitted(C.ITEMS_TABLE, item_ids):
        return _forbidden()
    if job_ids and not _all_linked_records_permitted(C.JOBS_TABLE, job_ids):
        return _forbidden()
    _set_link_field(fields, C.F_ISSUE_ITEM, body.get("itemId") or body.get("itemIds"))
    _set_link_field(fields, C.F_ISSUE_JOB, body.get("jobId") or body.get("jobIds"))
    _set_link_field(fields, C.F_ISSUE_ASSIGNED, body.get("assignedId") or body.get("assignedIds"))
    for key, field in {
        "type": C.F_ISSUE_TYPE,
        "status": C.F_ISSUE_STATUS,
        "priority": C.F_ISSUE_PRIORITY,
        "opened": C.F_ISSUE_OPENED,
        "closed": C.F_ISSUE_CLOSED,
        "photos": C.F_ISSUE_PHOTOS,
        "notes": C.F_ISSUE_NOTES,
    }.items():
        if key in body and body[key] not in (None, ""):
            fields[field] = body[key]

    data = airtable.create_record(C.ISSUES_TABLE, fields, by_field_id=False)
    issue_id = data["id"]
    issue_fields = data.get("fields", {})
    _create_history_event(
        "Issue Created",
        "Issue Created",
        item_ids=issue_fields.get(C.F_ISSUE_ITEM),
        job_ids=issue_fields.get(C.F_ISSUE_JOB),
        user_ids=issue_fields.get(C.F_ISSUE_ASSIGNED),
        details=f"Issue created: {issue_fields.get(C.F_ISSUE_NAME, issue_id)}.",
    )
    return jsonify(_shape_issue(data)), 201


@api.patch("/issues/<record_id>")
def update_issue(record_id):
    body = request.get_json(silent=True) or {}
    previous = airtable.get_record(C.ISSUES_TABLE, record_id, by_field_id=False)
    if not _client_ids_permitted(_client_ids_for_issue(previous)):
        return _forbidden()
    fields = {}
    item_ids = _as_list(body.get("itemId") or body.get("itemIds"))
    job_ids = _as_list(body.get("jobId") or body.get("jobIds"))
    if item_ids and not _all_linked_records_permitted(C.ITEMS_TABLE, item_ids):
        return _forbidden()
    if job_ids and not _all_linked_records_permitted(C.JOBS_TABLE, job_ids):
        return _forbidden()
    _set_link_field(fields, C.F_ISSUE_ITEM, body.get("itemId") or body.get("itemIds"))
    _set_link_field(fields, C.F_ISSUE_JOB, body.get("jobId") or body.get("jobIds"))
    _set_link_field(fields, C.F_ISSUE_ASSIGNED, body.get("assignedId") or body.get("assignedIds"))
    for key, field in {
        "issue": C.F_ISSUE_NAME,
        "name": C.F_ISSUE_NAME,
        "type": C.F_ISSUE_TYPE,
        "status": C.F_ISSUE_STATUS,
        "priority": C.F_ISSUE_PRIORITY,
        "opened": C.F_ISSUE_OPENED,
        "closed": C.F_ISSUE_CLOSED,
        "photos": C.F_ISSUE_PHOTOS,
        "notes": C.F_ISSUE_NOTES,
    }.items():
        if key in body and body[key] not in (None, ""):
            fields[field] = body[key]
    if not fields:
        return err("No updatable fields provided")

    data = airtable.update_record(C.ISSUES_TABLE, record_id, fields, by_field_id=False)
    old_status = _field_value(previous, C.F_ISSUE_STATUS)
    new_status = _field_value(data, C.F_ISSUE_STATUS)
    if C.F_ISSUE_STATUS in fields and old_status != "Resolved" and new_status == "Resolved":
        issue_fields = data.get("fields", {})
        _create_history_event(
            "Issue Resolved",
            "Issue Resolved",
            item_ids=issue_fields.get(C.F_ISSUE_ITEM),
            job_ids=issue_fields.get(C.F_ISSUE_JOB),
            user_ids=issue_fields.get(C.F_ISSUE_ASSIGNED),
            field="Status",
            from_value=old_status,
            to_value="Resolved",
            details=f"Issue resolved: {issue_fields.get(C.F_ISSUE_NAME, record_id)}.",
        )
    return jsonify(_shape_issue(data))


def _shape_issue(r):
    f = r.get("fields", {})
    return {
        "id": r["id"],
        "name": f.get(C.F_ISSUE_NAME, ""),
        "issue": f.get(C.F_ISSUE_NAME, ""),
        "itemIds": f.get(C.F_ISSUE_ITEM, []),
        "jobIds": f.get(C.F_ISSUE_JOB, []),
        "type": f.get(C.F_ISSUE_TYPE, ""),
        "status": f.get(C.F_ISSUE_STATUS, ""),
        "priority": f.get(C.F_ISSUE_PRIORITY, ""),
        "assignedIds": f.get(C.F_ISSUE_ASSIGNED, []),
        "opened": f.get(C.F_ISSUE_OPENED, ""),
        "closed": f.get(C.F_ISSUE_CLOSED, ""),
        "photos": f.get(C.F_ISSUE_PHOTOS, []),
        "notes": f.get(C.F_ISSUE_NOTES, ""),
    }


# ── History ───────────────────────────────────────────────────────────────────

@api.get("/history")
def list_history():
    item_id = request.args.get("itemId")
    job_id = request.args.get("jobId")
    user_id = request.args.get("userId")
    limit = request.args.get("limit", "100")
    requested_limit = int(limit) if limit.isdigit() else 100
    params = {
        "sort[0][field]": C.F_HISTORY_DATE,
        "sort[0][direction]": "desc",
        "maxRecords": max(requested_limit * 10, requested_limit, 100),
    }
    data = airtable.list_records(
        C.HISTORY_TABLE,
        params=params,
        by_field_id=False,
    )
    records = _filter_indirect_client_records(data.get("records", []), _client_ids_for_history)
    records = [_shape_history(record) for record in records]
    if item_id or job_id or user_id:
        records = [
            record for record in records
            if (item_id and item_id in record.get("itemIds", []))
            or (job_id and job_id in record.get("jobIds", []))
            or (user_id and user_id in record.get("userIds", []))
        ]
    records = records[:requested_limit]
    return jsonify({"records": records})


@api.post("/history")
def create_history():
    body = request.get_json(silent=True) or {}
    event = (body.get("event") or "").strip()
    if not event:
        return err("event is required")

    fields = {C.F_HISTORY_EVENT: event}
    item_ids = _as_list(body.get("itemId") or body.get("itemIds"))
    job_ids = _as_list(body.get("jobId") or body.get("jobIds"))
    if item_ids and not _all_linked_records_permitted(C.ITEMS_TABLE, item_ids):
        return _forbidden()
    if job_ids and not _all_linked_records_permitted(C.JOBS_TABLE, job_ids):
        return _forbidden()
    _set_link_field(fields, C.F_HISTORY_ITEM, body.get("itemId") or body.get("itemIds"))
    _set_link_field(fields, C.F_HISTORY_JOB, body.get("jobId") or body.get("jobIds"))
    _set_link_field(fields, C.F_HISTORY_USER, body.get("userId") or body.get("userIds"))
    for key, field in {
        "type": C.F_HISTORY_TYPE,
        "date": C.F_HISTORY_DATE,
        "field": C.F_HISTORY_FIELD,
        "from": C.F_HISTORY_FROM,
        "to": C.F_HISTORY_TO,
        "details": C.F_HISTORY_DETAILS,
    }.items():
        if key in body and body[key] not in (None, ""):
            fields[field] = body[key]

    data = airtable.create_record(C.HISTORY_TABLE, fields, by_field_id=False)
    return jsonify(_shape_history(data)), 201


def _shape_history(r):
    f = r.get("fields", {})
    return {
        "id": r["id"],
        "event": f.get(C.F_HISTORY_EVENT, ""),
        "itemIds": f.get(C.F_HISTORY_ITEM, []),
        "jobIds": f.get(C.F_HISTORY_JOB, []),
        "userIds": f.get(C.F_HISTORY_USER, []),
        "type": f.get(C.F_HISTORY_TYPE, ""),
        "date": f.get(C.F_HISTORY_DATE, ""),
        "field": f.get(C.F_HISTORY_FIELD, ""),
        "from": f.get(C.F_HISTORY_FROM, ""),
        "to": f.get(C.F_HISTORY_TO, ""),
        "details": f.get(C.F_HISTORY_DETAILS, ""),
    }


def _set_link_field(fields, field, value):
    if not value:
        return
    fields[field] = value if isinstance(value, list) else [value]


# ── Receipts ─────────────────────────────────────────────────────────────────

@api.get("/receipts")
@api.get("/receiving")
def list_receipts():
    try:
        data = airtable.list_records(
            C.RECEIPTS_TABLE,
            params={"sort[0][field]": C.F_RECEIPT_RECEIVED, "sort[0][direction]": "desc"},
            by_field_id=False,
        )
    except requests.HTTPError as error:
        return airtable_err(error)

    records = _filter_receipts_by_access(data.get("records", []))
    client_id = (request.args.get("clientId") or "").strip()
    unassigned_client = (request.args.get("unassignedClient") or "").strip().lower() in {"1", "true", "yes"}
    if client_id:
        if not _client_permitted(client_id):
            return _forbidden()
        records = [record for record in records if client_id in _as_list(record.get("fields", {}).get(C.F_RECEIPT_CLIENT, []))]
    if unassigned_client:
        records = [record for record in records if not _as_list(record.get("fields", {}).get(C.F_RECEIPT_CLIENT, []))]
    entries_by_receipt = _receipt_entries_by_receipt_id([record["id"] for record in records])
    records = [_shape_receipt(record, entries_by_receipt=entries_by_receipt) for record in records]
    return jsonify({"records": records})


# ── Verification ──────────────────────────────────────────────────────────────

@api.get("/verification/entries")
def list_verification_entries():
    try:
        entries = _list_all_records(C.RECEIPT_ENTRIES_TABLE)
        receipts = _list_all_records(C.RECEIPTS_TABLE)
    except requests.HTTPError as error:
        return airtable_err(error)

    receipts_by_id = {record["id"]: record for record in _filter_receipts_by_access(receipts)}
    records = []
    for entry in entries:
        linked_receipts = _as_list(entry.get("fields", {}).get(C.F_RECEIPT_ENTRY_RECEIPT, []))
        receipt = next((receipts_by_id.get(receipt_id) for receipt_id in linked_receipts if receipt_id in receipts_by_id), None)
        if linked_receipts and receipt is None:
            continue
        shaped = _shape_verification_entry(entry, receipt)
        if shaped["merchStatus"] != "Validated":
            records.append(shaped)
    records.sort(key=lambda record: (record.get("received") or "", record.get("name") or ""), reverse=True)
    return jsonify({"records": records})


@api.get("/verification/items")
def verification_items():
    query = request.args.get("q", "")
    client_id = (request.args.get("clientId") or "").strip()
    include_item_id = (request.args.get("includeItemId") or "").strip()
    if client_id and not _client_permitted(client_id):
        return _forbidden()
    try:
        matches = _find_matching_skus(query, client_id=client_id, include_item_id=include_item_id)
    except requests.HTTPError as error:
        return airtable_err(error)
    return jsonify({"records": matches})


@api.post("/verification/entries/<entry_id>/match")
def match_verification_entry(entry_id):
    body = request.get_json(silent=True) or {}
    item_id = (body.get("itemId") or "").strip()
    if not item_id:
        return err("itemId is required")

    try:
        entry = airtable.get_record(C.RECEIPT_ENTRIES_TABLE, entry_id, by_field_id=False)
        item = airtable.get_record(C.ITEMS_TABLE, item_id, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)

    linked_receipts = _as_list(entry.get("fields", {}).get(C.F_RECEIPT_ENTRY_RECEIPT, []))
    receipt = _first_permitted_receipt(linked_receipts)
    if linked_receipts and receipt is None:
        return _forbidden()
    item_client_ids = _as_list(item.get("fields", {}).get(C.F_ITEM_CLIENT, []))
    if not _client_ids_permitted(item_client_ids):
        return _forbidden()
    receipt_client_ids = _as_list(receipt.get("fields", {}).get(C.F_RECEIPT_CLIENT, [])) if receipt else []
    if receipt_client_ids and item_client_ids and not (set(receipt_client_ids) & set(item_client_ids)):
        return err("Item does not belong to this receipt client.", 403)

    try:
        updated_item = _merge_receipt_entry_photos_into_item(entry, item)
        updated = _update_receipt_entry_record(entry_id, {
            C.F_RECEIPT_ENTRY_ITEM: [item_id],
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Matched",
        })
    except requests.HTTPError as error:
        return airtable_err(error)
    return jsonify(_shape_verification_entry(updated, receipt, item_record=updated_item or item))


@api.post("/verification/entries/<entry_id>/validate")
def validate_verification_entry(entry_id):
    body = request.get_json(silent=True) or {}
    status = (body.get("status") or "").strip()
    if status not in {"Validated", "Issue"}:
        return err("status must be 'Validated' or 'Issue'")

    try:
        entry = airtable.get_record(C.RECEIPT_ENTRIES_TABLE, entry_id, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)

    linked_receipts = _as_list(entry.get("fields", {}).get(C.F_RECEIPT_ENTRY_RECEIPT, []))
    receipt = _first_permitted_receipt(linked_receipts)
    if linked_receipts and receipt is None:
        return _forbidden()

    update_fields = {C.F_RECEIPT_ENTRY_MERCH_STATUS: status}

    try:
        updated = _update_receipt_entry_record(entry_id, update_fields)
    except requests.HTTPError as error:
        return airtable_err(error)
    return jsonify(_shape_verification_entry(updated, receipt))


def _attachment_url(attachment):
    if not isinstance(attachment, dict):
        return ""
    return attachment.get("url") or attachment.get("public_url") or attachment.get("publicUrl") or ""


def _merge_receipt_entry_photos_into_item(entry_record, item_record):
    entry_fields = entry_record.get("fields", {})
    item_fields = item_record.get("fields", {})
    entry_attachments = entry_fields.get(C.F_RECEIPT_ENTRY_PHOTOS, []) or []
    entry_metadata = _photo_metadata_from_entry(entry_fields)
    if not entry_attachments and not entry_metadata:
        return item_record

    existing_item_attachments = item_fields.get(C.F_ITEM_PHOTOS, []) or []
    existing_urls = {_attachment_url(photo) for photo in existing_item_attachments if _attachment_url(photo)}
    merged_attachments = list(existing_item_attachments)
    for attachment in entry_attachments:
        url = _attachment_url(attachment)
        if not url or url in existing_urls:
            continue
        merged_attachments.append({"url": url})
        existing_urls.add(url)

    existing_item_metadata = _photo_metadata_from_fields(item_fields, C.F_ITEM_PHOTO_METADATA)
    existing_keys = {
        item.get("object_key") or item.get("public_url") or item.get("url")
        for item in existing_item_metadata
        if isinstance(item, dict)
    }
    merged_metadata = list(existing_item_metadata)
    for item in entry_metadata:
        if not isinstance(item, dict):
            continue
        key = item.get("object_key") or item.get("public_url") or item.get("url")
        if key and key in existing_keys:
            continue
        merged_metadata.append(item)
        if key:
            existing_keys.add(key)

    update_fields = {}
    if len(merged_attachments) != len(existing_item_attachments):
        update_fields[C.F_ITEM_PHOTOS] = merged_attachments
    if len(merged_metadata) != len(existing_item_metadata):
        update_fields[C.F_ITEM_PHOTO_METADATA] = json.dumps(merged_metadata)
    if not update_fields:
        return item_record
    try:
        return airtable.update_record(C.ITEMS_TABLE, item_record["id"], update_fields, by_field_id=False)
    except requests.HTTPError as error:
        if _is_unknown_field_error(error, C.F_ITEM_PHOTOS) or _is_unknown_field_error(error, C.F_ITEM_PHOTO_METADATA):
            return item_record
        raise


@api.post("/receiving/photos")
def upload_receiving_photos():
    receipt_id = (request.form.get("receiptId") or "").strip()
    receipt_entry_id = (request.form.get("receiptEntryId") or request.form.get("entryId") or "").strip()
    if receipt_id and receipt_entry_id:
        return _upload_receiving_entry_photos(receipt_id, receipt_entry_id)

    storage = _photo_storage()
    if storage.mode == "r2":
        return err("Create the received item before uploading permanent photos.", 409)
    files = request.files.getlist("photos")
    if not files:
        return err("Add at least one photo.")
    photos = []
    for uploaded in files:
        if not uploaded or not uploaded.filename:
            continue
        try:
            photo = storage.upload_photo(uploaded, "unsaved", uuid.uuid4().hex)
        except ReceivingPhotoValidationError as error:
            return err(str(error))
        except ReceivingPhotoConfigError as error:
            return err(str(error), 500)
        except ReceivingPhotoStorageError:
            return err("Photo could not be uploaded.", 502)
        photo["url"] = f"{request.host_url.rstrip('/')}/api/receiving/photos/{photo['object_key']}"
        photo["public_url"] = photo["url"]
        photos.append(photo)
    if not photos:
        return err("Add at least one photo.")
    return jsonify({"photos": photos})


@api.get("/receiving/photo-storage/status")
def receiving_photo_storage_status():
    storage = _photo_storage()
    required = {
        "R2_ACCOUNT_ID": bool(C.R2_ACCOUNT_ID),
        "R2_ACCESS_KEY_ID": bool(C.R2_ACCESS_KEY_ID),
        "R2_SECRET_ACCESS_KEY": bool(C.R2_SECRET_ACCESS_KEY),
        "R2_BUCKET_NAME": bool(C.R2_BUCKET_NAME),
        "R2_PUBLIC_BASE_URL": bool(C.R2_PUBLIC_BASE_URL),
    }
    return jsonify({
        "mode": storage.mode,
        "bucketName": C.R2_BUCKET_NAME or "",
        "publicBaseUrlConfigured": bool(C.R2_PUBLIC_BASE_URL),
        "requiredVariables": required,
        "ready": storage.mode == "local" or all(required.values()),
    })


@api.get("/receiving/photos/<path:filename>")
def receiving_photo(filename):
    return send_from_directory(C.RECEIVING_PHOTO_LOCAL_DIR, filename)


@api.post("/receiving/<receipt_id>/entries/<receipt_entry_id>/photos")
def upload_receiving_entry_photos(receipt_id, receipt_entry_id):
    return _upload_receiving_entry_photos(receipt_id, receipt_entry_id)


@api.delete("/receiving/photos")
def delete_receiving_photo():
    body = request.get_json(silent=True) or {}
    object_key = (body.get("objectKey") or body.get("object_key") or "").strip()
    try:
        result = _photo_storage().delete_photo(object_key)
    except ReceivingPhotoValidationError as error:
        return err(str(error))
    except ReceivingPhotoConfigError as error:
        return err(str(error), 500)
    except ReceivingPhotoStorageError:
        return err("Photo could not be deleted.", 502)
    return jsonify(result)


def _local_received_datetime(value):
    raw = (value or "").strip()
    parsed = None
    if raw:
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            parsed = None
    if parsed is None:
        return datetime.now().astimezone()
    if parsed.tzinfo is not None:
        return parsed.astimezone()
    return parsed


def _delivery_folder_base(client_name, received):
    client_segment = sanitize_path_segment(client_name or "Unknown", "Unknown")
    local_received = _local_received_datetime(received)
    return f"{client_segment}-{local_received.strftime('%Y-%m-%d-%H-%M')}"


def _receipt_client_name(receipt):
    fields = receipt.get("fields", {}) if receipt else {}
    client_ids = _as_list(fields.get(C.F_RECEIPT_CLIENT, []))
    if not client_ids:
        return "Unknown"
    try:
        return _client_name(_client_record(client_ids[0])) or "Unknown"
    except requests.HTTPError:
        return "Unknown"


def _delivery_folder_for_receipt(receipt):
    fields = receipt.get("fields", {}) if receipt else {}
    base = _delivery_folder_base(_receipt_client_name(receipt), fields.get(C.F_RECEIPT_RECEIVED, ""))
    receipt_id = receipt.get("id", "")
    try:
        receipts = _list_all_records(C.RECEIPTS_TABLE)
    except requests.HTTPError:
        return base

    collisions = []
    for candidate in receipts:
        candidate_base = _delivery_folder_base(
            _receipt_client_name(candidate),
            candidate.get("fields", {}).get(C.F_RECEIPT_RECEIVED, ""),
        )
        if candidate_base == base:
            collisions.append(candidate)
    collisions.sort(key=lambda item: (
        _local_received_datetime(item.get("fields", {}).get(C.F_RECEIPT_RECEIVED, "")).isoformat(),
        item.get("id", ""),
    ))
    for index, candidate in enumerate(collisions, start=1):
        if candidate.get("id") == receipt_id:
            return base if index == 1 else f"{base}-{index}"
    return base


def _sequence_from_object_key(object_key, delivery_folder):
    pattern = rf"^receiving/{re.escape(delivery_folder)}/{re.escape(delivery_folder)}-(\d+)\.[A-Za-z0-9]+$"
    match = re.match(pattern, str(object_key or ""))
    return int(match.group(1)) if match else None


def _existing_receipt_photo_metadata(receipt_id, current_entry_record):
    metadata = []
    try:
        entries = _list_all_records(C.RECEIPT_ENTRIES_TABLE)
    except requests.HTTPError:
        entries = [current_entry_record]
    seen_current = False
    for entry in entries:
        if entry.get("id") == current_entry_record.get("id"):
            seen_current = True
        linked_receipts = _as_list(entry.get("fields", {}).get(C.F_RECEIPT_ENTRY_RECEIPT, []))
        if receipt_id in linked_receipts:
            metadata.extend(_photo_metadata_from_entry(entry.get("fields", {})))
    if not seen_current:
        metadata.extend(_photo_metadata_from_entry(current_entry_record.get("fields", {})))
    return metadata


def _next_delivery_photo_sequence(delivery_folder, existing_metadata, existing_object_keys):
    used = set()
    for item in existing_metadata or []:
        sequence = _sequence_from_object_key(item.get("object_key"), delivery_folder)
        if sequence:
            used.add(sequence)
    for key in existing_object_keys or []:
        sequence = _sequence_from_object_key(key, delivery_folder)
        if sequence:
            used.add(sequence)
    return max(used, default=0) + 1


def _upload_receiving_entry_photos(receipt_id, receipt_entry_id):
    files = request.files.getlist("photos")
    if not files:
        return err("Add at least one photo.")
    try:
        receipt = airtable.get_record(C.RECEIPTS_TABLE, receipt_id, by_field_id=False)
        entry_record = airtable.get_record(C.RECEIPT_ENTRIES_TABLE, receipt_entry_id, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)
    if not _receipt_client_permitted(receipt.get("fields", {}).get(C.F_RECEIPT_CLIENT, [])):
        return _forbidden()
    linked_receipts = _as_list(entry_record.get("fields", {}).get(C.F_RECEIPT_ENTRY_RECEIPT, []))
    if receipt_id not in linked_receipts:
        return err("Receipt entry does not belong to this receipt.", 404)

    storage = _photo_storage()
    uploaded_photos = []
    delivery_folder = _delivery_folder_for_receipt(receipt)
    existing_metadata = _existing_receipt_photo_metadata(receipt_id, entry_record)
    try:
        existing_object_keys = storage.list_object_keys(f"receiving/{delivery_folder}/")
    except (ReceivingPhotoConfigError, ReceivingPhotoValidationError) as error:
        return err(str(error), 500 if isinstance(error, ReceivingPhotoConfigError) else 400)
    except ReceivingPhotoStorageError:
        existing_object_keys = []
    existing_keys = set(existing_object_keys)
    next_sequence = _next_delivery_photo_sequence(delivery_folder, existing_metadata, existing_keys)
    for uploaded in files:
        if not uploaded or not uploaded.filename:
            continue
        try:
            photo = storage.upload_photo(
                uploaded,
                receipt_id,
                receipt_entry_id,
                delivery_folder=delivery_folder,
                sequence_number=next_sequence,
                existing_keys=existing_keys,
            )
            uploaded_photos.append(photo)
            existing_keys.add(photo["object_key"])
            next_sequence = _next_delivery_photo_sequence(delivery_folder, existing_metadata + uploaded_photos, existing_keys)
        except ReceivingPhotoValidationError as error:
            return err(str(error))
        except ReceivingPhotoConfigError as error:
            return err(str(error), 500)
        except ReceivingPhotoStorageError:
            return err("Photo could not be uploaded.", 502)
    if not uploaded_photos:
        return err("Add at least one photo.")

    current_fields = entry_record.get("fields", {})
    current_attachments = current_fields.get(C.F_RECEIPT_ENTRY_PHOTOS, []) or []
    attachment_payload = current_attachments + [{"url": photo["public_url"]} for photo in uploaded_photos]
    metadata_payload = _photo_metadata_from_entry(current_fields) + uploaded_photos
    try:
        updated = airtable.update_record(
            C.RECEIPT_ENTRIES_TABLE,
            receipt_entry_id,
            {C.F_RECEIPT_ENTRY_PHOTOS: attachment_payload},
            by_field_id=False,
        )
        try:
            updated = airtable.update_record(
                C.RECEIPT_ENTRIES_TABLE,
                receipt_entry_id,
                {C.F_RECEIPT_ENTRY_PHOTO_METADATA: json.dumps(metadata_payload)},
                by_field_id=False,
            )
        except requests.HTTPError as metadata_error:
            if _is_unknown_field_error(metadata_error, C.F_RECEIPT_ENTRY_PHOTO_METADATA):
                shaped = _shape_receipt_entry(updated)
                if not shaped.get("photos"):
                    shaped["photos"] = attachment_payload
                shaped["photoMetadata"] = metadata_payload
                return err("Airtable Receipt Entries table is missing the Photo Metadata long-text field.", 500)
            raise
    except requests.HTTPError as error:
        return airtable_err(error)
    shaped = _shape_receipt_entry(updated)
    if not shaped.get("photos"):
        shaped["photos"] = attachment_payload
    shaped["photoMetadata"] = metadata_payload
    return jsonify({"photos": uploaded_photos, "entry": shaped})


@api.get("/receiving/<record_id>")
def get_receiving_session(record_id):
    try:
        record = airtable.get_record(C.RECEIPTS_TABLE, record_id, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)
    if not _receipt_client_permitted(record.get("fields", {}).get(C.F_RECEIPT_CLIENT, [])):
        return _forbidden()
    entries_by_receipt = _receipt_entries_by_receipt_id([record_id])
    return jsonify(_shape_receipt(record, entries_by_receipt=entries_by_receipt))


@api.patch("/receiving/<record_id>")
def update_receiving_session(record_id):
    body = request.get_json(silent=True) or {}
    try:
        current = airtable.get_record(C.RECEIPTS_TABLE, record_id, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)
    if not _receipt_client_permitted(current.get("fields", {}).get(C.F_RECEIPT_CLIENT, [])):
        return _forbidden()
    fields_or_error = _receipt_update_fields_from_body(body)
    if isinstance(fields_or_error, tuple):
        return fields_or_error
    if not fields_or_error:
        entries_by_receipt = _receipt_entries_by_receipt_id([record_id])
        return jsonify(_shape_receipt(current, entries_by_receipt=entries_by_receipt))
    try:
        updated = airtable.update_record(C.RECEIPTS_TABLE, record_id, fields_or_error, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)
    entries_by_receipt = _receipt_entries_by_receipt_id([record_id])
    return jsonify(_shape_receipt(updated, entries_by_receipt=entries_by_receipt))


@api.post("/receiving/sessions")
def create_receiving_session():
    body = request.get_json(silent=True) or {}
    fields_or_error = _receipt_fields_from_body(body)
    if isinstance(fields_or_error, tuple):
        return fields_or_error
    try:
        data = airtable.create_record(C.RECEIPTS_TABLE, fields_or_error, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)
    receipt_fields = data.get("fields", {})
    _create_history_event(
        "Receiving Logged",
        "Receiving Logged",
        user_ids=receipt_fields.get(C.F_RECEIPT_RECEIVER),
        details=f"Receiving session started: {receipt_fields.get(C.F_RECEIPT_NAME, data['id'])}.",
    )
    return jsonify(_shape_receipt(data, entries_by_receipt={data["id"]: []})), 201


@api.post("/receiving/<record_id>/entries")
def create_receiving_entry(record_id):
    body = request.get_json(silent=True) or {}
    try:
        receipt = airtable.get_record(C.RECEIPTS_TABLE, record_id, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)
    if not _receipt_client_permitted(receipt.get("fields", {}).get(C.F_RECEIPT_CLIENT, [])):
        return _forbidden()
    errors = _validate_receipt_entries([body])
    if errors:
        return err(errors[0])
    receipt_name = receipt.get("fields", {}).get(C.F_RECEIPT_NAME) or record_id
    existing_entries = _receipt_entries_by_receipt_id([record_id]).get(record_id, [])
    try:
        entry_fields = _receipt_entry_fields(body, record_id, len(existing_entries) + 1, receipt_name)
        match_fields = _receipt_entry_match_fields(body, receipt)
        if isinstance(match_fields, tuple):
            return match_fields
        entry_fields.update(match_fields)
        entry_data = _create_receipt_entry_record(entry_fields)
    except requests.HTTPError as error:
        return airtable_err(error)
    return jsonify(_shape_receipt_entry(entry_data)), 201


@api.patch("/receiving/<record_id>/entries/<entry_id>")
def update_receiving_entry(record_id, entry_id):
    body = request.get_json(silent=True) or {}
    try:
        receipt = airtable.get_record(C.RECEIPTS_TABLE, record_id, by_field_id=False)
        entry_record = airtable.get_record(C.RECEIPT_ENTRIES_TABLE, entry_id, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)
    if not _receipt_client_permitted(receipt.get("fields", {}).get(C.F_RECEIPT_CLIENT, [])):
        return _forbidden()
    linked_receipts = _as_list(entry_record.get("fields", {}).get(C.F_RECEIPT_ENTRY_RECEIPT, []))
    if record_id not in linked_receipts:
        return err("Receipt entry does not belong to this receipt.", 404)
    fields_or_error = _receipt_entry_update_fields_from_body(body)
    if isinstance(fields_or_error, tuple):
        return fields_or_error
    item_ids_for_match = _as_list(body.get("itemIds") or body.get("itemId"))
    should_update_match = bool(item_ids_for_match) or "matchStatus" in body or body.get("noClearMatch")
    if should_update_match:
        match_fields = _receipt_entry_match_fields(body, receipt)
        if isinstance(match_fields, tuple):
            return match_fields
        fields_or_error.update(match_fields)
    if not fields_or_error:
        return jsonify(_shape_receipt_entry(entry_record))
    try:
        updated = _update_receipt_entry_record(entry_id, fields_or_error)
    except requests.HTTPError as error:
        return airtable_err(error)
    return jsonify(_shape_receipt_entry(updated))


@api.delete("/receiving/<record_id>/entries/<entry_id>")
def delete_receiving_entry(record_id, entry_id):
    try:
        receipt = airtable.get_record(C.RECEIPTS_TABLE, record_id, by_field_id=False)
        entry_record = airtable.get_record(C.RECEIPT_ENTRIES_TABLE, entry_id, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)
    if not _receipt_client_permitted(receipt.get("fields", {}).get(C.F_RECEIPT_CLIENT, [])):
        return _forbidden()
    linked_receipts = _as_list(entry_record.get("fields", {}).get(C.F_RECEIPT_ENTRY_RECEIPT, []))
    if record_id not in linked_receipts:
        return err("Received item does not belong to this delivery.", 404)
    try:
        airtable.delete_record(C.RECEIPT_ENTRIES_TABLE, entry_id)
    except requests.HTTPError as error:
        return airtable_err(error)
    return jsonify({"deleted": True, "id": entry_id})


@api.post("/receipts")
@api.post("/receiving")
def create_receipt():
    body = request.get_json(silent=True) or {}
    entries = body.get("entries") or []

    if not isinstance(entries, list) or not entries:
        return err("Add at least one merchandise entry.")
    entry_errors = _validate_receipt_entries(entries)
    if entry_errors:
        return err(entry_errors[0])
    fields_or_error = _receipt_fields_from_body(body)
    if isinstance(fields_or_error, tuple):
        return fields_or_error

    created_entry_ids = []
    try:
        data = airtable.create_record(C.RECEIPTS_TABLE, fields_or_error, by_field_id=False)
        receipt_name = data.get("fields", {}).get(C.F_RECEIPT_NAME) or data["id"]
        shaped_entries = []
        for index, entry in enumerate(entries, start=1):
            entry_fields = _receipt_entry_fields(entry, data["id"], index, receipt_name)
            match_fields = _receipt_entry_match_fields(entry, data)
            if isinstance(match_fields, tuple):
                return match_fields
            entry_fields.update(match_fields)
            entry_data = _create_receipt_entry_record(entry_fields)
            created_entry_ids.append(entry_data["id"])
            shaped_entries.append(_shape_receipt_entry(entry_data))
    except requests.HTTPError as error:
        if created_entry_ids:
            try:
                airtable.delete_records(C.RECEIPT_ENTRIES_TABLE, created_entry_ids)
            except requests.HTTPError:
                pass
        if "data" in locals() and data.get("id"):
            try:
                airtable.delete_record(C.RECEIPTS_TABLE, data["id"])
            except requests.HTTPError:
                pass
        return airtable_err(error)

    receipt_fields = data.get("fields", {})
    _create_history_event(
        "Receiving Logged",
        "Receiving Logged",
        user_ids=receipt_fields.get(C.F_RECEIPT_RECEIVER),
        details=f"Receiving session logged: {receipt_fields.get(C.F_RECEIPT_NAME, data['id'])}.",
    )
    entries_by_receipt = {data["id"]: shaped_entries}
    return jsonify(_shape_receipt(data, entries_by_receipt=entries_by_receipt)), 201


def _receipt_fields_from_body(body):
    fields = {}
    receipt = (body.get("receipt") or body.get("name") or "").strip()
    client_id = (body.get("clientId") or "").strip()
    try:
        carrier = _normalize_receipt_carrier(body.get("carrier"))
    except ValueError as error:
        return err(str(error))
    tracking = (body.get("tracking") or body.get("identifier") or "").strip()
    box_quantity = body.get("boxQuantity", body.get("box_quantity"))
    received = (body.get("received") or body.get("receivedDate") or "").strip()
    receiver_ids = body.get("receiverIds") or body.get("receiverId") or []
    location_ids = body.get("locationIds") or body.get("locationId") or []
    photos = body.get("photos") or []
    notes = (body.get("notes") or "").strip()
    try:
        box_quantity_number = int(box_quantity)
    except (TypeError, ValueError):
        return err("Box Quantity must be at least 1.")
    if box_quantity_number < 1:
        return err("Box Quantity must be at least 1.")

    if client_id:
        if not _client_permitted(client_id):
            return _forbidden()
        fields[C.F_RECEIPT_CLIENT] = [client_id]
    if receipt:
        fields[C.F_RECEIPT_NAME] = receipt
    else:
        fields[C.F_RECEIPT_NAME] = _receipt_name_for_create(client_id, received)
    if carrier:
        fields[C.F_RECEIPT_CARRIER] = carrier
    if tracking:
        fields[C.F_RECEIPT_TRACKING] = tracking
    fields[C.F_RECEIPT_BOX_QUANTITY] = box_quantity_number
    fields[C.F_RECEIPT_RECEIVED] = received or _now_iso()
    if not receiver_ids:
        current_user_id = _current_user_id()
        if current_user_id:
            receiver_ids = [current_user_id]
    if receiver_ids:
        fields[C.F_RECEIPT_RECEIVER] = receiver_ids if isinstance(receiver_ids, list) else [receiver_ids]
    if location_ids:
        fields[C.F_RECEIPT_LOCATION] = location_ids if isinstance(location_ids, list) else [location_ids]
    if photos:
        fields[C.F_RECEIPT_PHOTOS] = photos
    if notes:
        fields[C.F_RECEIPT_NOTES] = notes
    return fields


def _receipt_update_fields_from_body(body):
    fields = {}
    if "clientId" in body:
        client_id = (body.get("clientId") or "").strip()
        if client_id:
            if not _client_permitted(client_id):
                return _forbidden()
            fields[C.F_RECEIPT_CLIENT] = [client_id]
        else:
            fields[C.F_RECEIPT_CLIENT] = []
    if "carrier" in body:
        try:
            carrier = _normalize_receipt_carrier(body.get("carrier"))
        except ValueError as error:
            return err(str(error))
        fields[C.F_RECEIPT_CARRIER] = carrier
    if "tracking" in body:
        fields[C.F_RECEIPT_TRACKING] = (body.get("tracking") or "").strip()
    if "boxQuantity" in body or "box_quantity" in body:
        box_quantity = body.get("boxQuantity", body.get("box_quantity"))
        try:
            box_quantity_number = int(box_quantity)
        except (TypeError, ValueError):
            return err("Box Quantity must be at least 1.")
        if box_quantity_number < 1:
            return err("Box Quantity must be at least 1.")
        fields[C.F_RECEIPT_BOX_QUANTITY] = box_quantity_number
    if "received" in body or "receivedDate" in body:
        fields[C.F_RECEIPT_RECEIVED] = (body.get("received") or body.get("receivedDate") or "").strip()
    if "locationIds" in body or "locationId" in body:
        location_ids = body.get("locationIds") if "locationIds" in body else body.get("locationId")
        fields[C.F_RECEIPT_LOCATION] = location_ids if isinstance(location_ids, list) else ([location_ids] if location_ids else [])
    if "notes" in body:
        fields[C.F_RECEIPT_NOTES] = (body.get("notes") or "").strip()
    return fields


def _receipt_name_for_create(client_id, received):
    client_name = "Unknown"
    if client_id:
        try:
            client_name = _client_name(_client_record(client_id)) or client_name
        except requests.HTTPError:
            pass
    timestamp = _format_receipt_name_time(received)
    return f"{client_name} - {timestamp}"


def _format_receipt_name_time(value):
    parsed = None
    raw = (value or "").strip()
    if raw:
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            parsed = None
    if parsed is None:
        parsed = datetime.now()
    return parsed.strftime("%Y-%m-%d %H:%M")


def _validate_receipt_entries(entries):
    errors = []
    for index, entry in enumerate(entries, start=1):
        quantity = entry.get("quantity", 1) if isinstance(entry, dict) else None
        try:
            quantity_number = int(quantity)
        except (TypeError, ValueError):
            errors.append(f"Entry {index} quantity must be at least 1.")
            continue
        if quantity_number < 1:
            errors.append(f"Entry {index} quantity must be at least 1.")
    return errors


RECEIPT_CARRIER_OPTIONS = {
    "ups": "UPS",
    "u.p.s.": "UPS",
    "fedex": "FedEx",
    "fed ex": "FedEx",
    "federal express": "FedEx",
    "usps": "USPS",
    "u.s.p.s.": "USPS",
    "dhl": "DHL",
    "courier": "Courier",
    "freight": "Freight",
    "hand delivery": "Hand Delivery",
    "hand-delivery": "Hand Delivery",
    "internal": "Internal",
    "other": "Other",
}


def _normalize_receipt_carrier(value):
    carrier = (value or "").strip()
    if not carrier:
        return ""
    normalized = RECEIPT_CARRIER_OPTIONS.get(re.sub(r"\s+", " ", carrier.lower()))
    if normalized:
        return normalized
    allowed = ", ".join(sorted(set(RECEIPT_CARRIER_OPTIONS.values())))
    raise ValueError(f"Carrier must be one of: {allowed}.")


def _receipt_entry_fields(entry, receipt_id, index, receipt_name):
    entry = entry if isinstance(entry, dict) else {}
    quantity = int(entry.get("quantity") or 1)
    product_name = (
        entry.get("productName")
        or entry.get("product_name")
        or entry.get("name")
        or ""
    ).strip()
    sku_id = (
        entry.get("skuId")
        or entry.get("sku_id")
        or entry.get("observedIdentifier")
        or entry.get("identifier")
        or ""
    ).strip()
    fields = {
        C.F_RECEIPT_ENTRY_NAME: product_name or "Unnamed Product",
        C.F_RECEIPT_ENTRY_RECEIPT: [receipt_id],
        C.F_RECEIPT_ENTRY_QUANTITY: quantity,
        C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
    }
    location_ids = entry.get("locationIds") or entry.get("locationId") or []
    condition = (entry.get("condition") or "").strip()
    description = (entry.get("description") or "").strip()
    notes = (entry.get("notes") or "").strip()
    photos = entry.get("photos") or []
    if sku_id:
        fields[C.F_RECEIPT_ENTRY_SKU_ID] = sku_id
    if location_ids:
        fields[C.F_RECEIPT_ENTRY_LOCATION] = location_ids if isinstance(location_ids, list) else [location_ids]
    if condition:
        fields[C.F_RECEIPT_ENTRY_CONDITION] = condition
    if description:
        fields[C.F_RECEIPT_ENTRY_DESCRIPTION] = description
    if notes:
        fields[C.F_RECEIPT_ENTRY_NOTES] = notes
    if photos:
        fields[C.F_RECEIPT_ENTRY_PHOTOS] = photos
    return fields


def _receipt_entry_match_fields(body, receipt):
    fields = {}
    item_ids = _as_list(body.get("itemIds") or body.get("itemId"))
    item_id = item_ids[0] if item_ids else ""
    match_status = (body.get("matchStatus") or "").strip()
    if item_id:
        try:
            item = airtable.get_record(C.ITEMS_TABLE, item_id, by_field_id=False)
        except requests.HTTPError as error:
            return airtable_err(error)
        item_client_ids = _as_list(item.get("fields", {}).get(C.F_ITEM_CLIENT, []))
        if not _client_ids_permitted(item_client_ids):
            return _forbidden()
        receipt_client_ids = _as_list(receipt.get("fields", {}).get(C.F_RECEIPT_CLIENT, []))
        if receipt_client_ids and item_client_ids and not (set(receipt_client_ids) & set(item_client_ids)):
            return err("Item does not belong to this receipt client.", 403)
        fields[C.F_RECEIPT_ENTRY_ITEM] = [item_id]
        fields[C.F_RECEIPT_ENTRY_MERCH_STATUS] = "Matched"
    elif body.get("noClearMatch") or match_status in {"Needs Match", "No Clear Match"}:
        fields[C.F_RECEIPT_ENTRY_MERCH_STATUS] = "Received"
    elif match_status == "Matched":
        return err("Choose an Item before marking this entry matched.")
    else:
        fields[C.F_RECEIPT_ENTRY_MERCH_STATUS] = "Received"
    return fields


def _receipt_entry_update_fields_from_body(body):
    fields = {}
    if any(key in body for key in ("productName", "product_name", "name")):
        product_name = (
            body.get("productName")
            or body.get("product_name")
            or body.get("name")
            or ""
        ).strip()
        fields[C.F_RECEIPT_ENTRY_NAME] = product_name or "Unnamed Product"
    if any(key in body for key in ("skuId", "sku_id", "observedIdentifier", "identifier")):
        sku_id = (
            body.get("skuId")
            or body.get("sku_id")
            or body.get("observedIdentifier")
            or body.get("identifier")
            or ""
        ).strip()
        fields[C.F_RECEIPT_ENTRY_SKU_ID] = sku_id
    if "quantity" in body:
        try:
            quantity = int(body.get("quantity") or 1)
        except (TypeError, ValueError):
            return err("Quantity must be at least 1.")
        if quantity < 1:
            return err("Quantity must be at least 1.")
        fields[C.F_RECEIPT_ENTRY_QUANTITY] = quantity
    if "locationIds" in body or "locationId" in body:
        location_ids = body.get("locationIds") if "locationIds" in body else body.get("locationId")
        fields[C.F_RECEIPT_ENTRY_LOCATION] = location_ids if isinstance(location_ids, list) else ([location_ids] if location_ids else [])
    if "condition" in body:
        fields[C.F_RECEIPT_ENTRY_CONDITION] = (body.get("condition") or "").strip()
    if "description" in body:
        fields[C.F_RECEIPT_ENTRY_DESCRIPTION] = (body.get("description") or "").strip()
    if "notes" in body:
        fields[C.F_RECEIPT_ENTRY_NOTES] = (body.get("notes") or "").strip()
    if "photos" in body:
        fields[C.F_RECEIPT_ENTRY_PHOTOS] = body.get("photos") or []
    if "merchStatus" in body:
        merch_status = (body.get("merchStatus") or "").strip()
        if merch_status in {"Received", "Matched", "Validated", "Issue"}:
            fields[C.F_RECEIPT_ENTRY_MERCH_STATUS] = merch_status
    return fields


def _create_receipt_entry_record(fields):
    return airtable.create_record(C.RECEIPT_ENTRIES_TABLE, fields, by_field_id=False)


def _update_receipt_entry_record(entry_id, fields):
    return airtable.update_record(C.RECEIPT_ENTRIES_TABLE, entry_id, fields, by_field_id=False)


def _receipt_entries_by_receipt_id(receipt_ids):
    receipt_ids = set(receipt_ids or [])
    grouped = {receipt_id: [] for receipt_id in receipt_ids}
    if not receipt_ids:
        return grouped
    try:
        entries = _list_all_records(C.RECEIPT_ENTRIES_TABLE)
    except requests.HTTPError:
        return grouped
    for entry in entries:
        linked_receipts = set(_as_list(entry.get("fields", {}).get(C.F_RECEIPT_ENTRY_RECEIPT, [])))
        for receipt_id in linked_receipts & receipt_ids:
            grouped.setdefault(receipt_id, []).append(_shape_receipt_entry(entry))
    return grouped


def _job_ids_for_items(item_ids):
    job_ids = []
    for item_id in _as_list(item_ids):
        try:
            item = airtable.get_record(C.ITEMS_TABLE, item_id, by_field_id=False)
        except requests.HTTPError:
            continue
        for job_id in item.get("fields", {}).get(C.F_ITEM_JOB, []) or []:
            if job_id not in job_ids:
                job_ids.append(job_id)
    return job_ids


def _shape_receipt(r, *, entries_by_receipt=None):
    f = r.get("fields", {})
    entries_by_receipt = entries_by_receipt or {}
    return {
        "id": r["id"],
        "name": f.get(C.F_RECEIPT_NAME, ""),
        "receipt": f.get(C.F_RECEIPT_NAME, ""),
        "clientIds": f.get(C.F_RECEIPT_CLIENT, []),
        "itemIds": [],
        "skuIds": [],
        "carrier": f.get(C.F_RECEIPT_CARRIER, ""),
        "tracking": f.get(C.F_RECEIPT_TRACKING, ""),
        "boxQuantity": f.get(C.F_RECEIPT_BOX_QUANTITY, 1),
        "received": f.get(C.F_RECEIPT_RECEIVED, ""),
        "receivedDate": f.get(C.F_RECEIPT_RECEIVED, ""),
        "receiver": "",
        "receiverIds": f.get(C.F_RECEIPT_RECEIVER, []) if isinstance(f.get(C.F_RECEIPT_RECEIVER), list) else [],
        "location": "",
        "locationIds": f.get(C.F_RECEIPT_LOCATION, []) if isinstance(f.get(C.F_RECEIPT_LOCATION), list) else [],
        "photos": f.get(C.F_RECEIPT_PHOTOS, []),
        "notes": f.get(C.F_RECEIPT_NOTES, ""),
        "entries": entries_by_receipt.get(r["id"], []),
    }


def _shape_receipt_entry(r):
    f = r.get("fields", {})
    product_name = f.get(C.F_RECEIPT_ENTRY_NAME, "")
    sku_id = f.get(C.F_RECEIPT_ENTRY_SKU_ID, "")
    item_ids = f.get(C.F_RECEIPT_ENTRY_ITEM, []) if isinstance(f.get(C.F_RECEIPT_ENTRY_ITEM), list) else []
    merch_status = f.get(C.F_RECEIPT_ENTRY_MERCH_STATUS) or ("Matched" if item_ids else "Received")
    return {
        "id": r["id"],
        "name": product_name,
        "productName": product_name,
        "receiptIds": f.get(C.F_RECEIPT_ENTRY_RECEIPT, []),
        "skuId": sku_id,
        "observedIdentifier": sku_id,
        "quantity": f.get(C.F_RECEIPT_ENTRY_QUANTITY, 0),
        "locationIds": f.get(C.F_RECEIPT_ENTRY_LOCATION, []) if isinstance(f.get(C.F_RECEIPT_ENTRY_LOCATION), list) else [],
        "condition": f.get(C.F_RECEIPT_ENTRY_CONDITION, ""),
        "description": f.get(C.F_RECEIPT_ENTRY_DESCRIPTION, ""),
        "notes": f.get(C.F_RECEIPT_ENTRY_NOTES, ""),
        "photos": f.get(C.F_RECEIPT_ENTRY_PHOTOS, []),
        "photoMetadata": _photo_metadata_from_entry(f),
        "itemIds": item_ids,
        "merchStatus": merch_status,
    }


VERIFICATION_STATUS_LABELS = {
    "Needs Review": "Awaiting Verification",
    "Verified": "Verified",
    "Issue": "Awaiting Item Import",
}


def _verification_status_label(status):
    return VERIFICATION_STATUS_LABELS.get(status or "", status or "Awaiting Verification")


def _first_permitted_receipt(receipt_ids):
    for receipt_id in _as_list(receipt_ids):
        try:
            receipt = airtable.get_record(C.RECEIPTS_TABLE, receipt_id, by_field_id=False)
        except requests.HTTPError:
            continue
        if _receipt_client_permitted(receipt.get("fields", {}).get(C.F_RECEIPT_CLIENT, [])):
            return receipt
    return None


def _shape_verification_entry(entry, receipt=None, *, item_record=None):
    shaped = _shape_receipt_entry(entry)
    entry_fields = entry.get("fields", {})
    receipt_fields = receipt.get("fields", {}) if receipt else {}
    client_ids = receipt_fields.get(C.F_RECEIPT_CLIENT, []) if isinstance(receipt_fields.get(C.F_RECEIPT_CLIENT, []), list) else []
    location_ids = shaped.get("locationIds", [])
    item_ids = shaped.get("itemIds", [])
    linked_item = None
    if item_record is None and item_ids:
        try:
            item_record = airtable.get_record(C.ITEMS_TABLE, item_ids[0], by_field_id=False)
        except requests.HTTPError:
            item_record = None
    if item_record:
        linked_item = _shape_item(item_record, clients_by_id=_clients_by_id())
    return {
        **shaped,
        "receipt": {
            "id": receipt.get("id") if receipt else "",
            "name": receipt_fields.get(C.F_RECEIPT_NAME, "") if receipt else "",
            "clientIds": client_ids,
            "carrier": receipt_fields.get(C.F_RECEIPT_CARRIER, "") if receipt else "",
            "tracking": receipt_fields.get(C.F_RECEIPT_TRACKING, "") if receipt else "",
            "boxQuantity": receipt_fields.get(C.F_RECEIPT_BOX_QUANTITY, 1) if receipt else 1,
            "received": receipt_fields.get(C.F_RECEIPT_RECEIVED, "") if receipt else "",
        },
        "clientIds": client_ids,
        "locationId": location_ids[0] if location_ids else "",
        "productName": shaped.get("productName") or shaped.get("description", ""),
        "skuId": shaped.get("skuId", ""),
        "brand": entry_fields.get("Brand", ""),
        "packageSize": entry_fields.get("Package Size", ""),
        "linkedItem": linked_item,
        "received": receipt_fields.get(C.F_RECEIPT_RECEIVED, "") if receipt else "",
    }


def _photo_metadata_from_entry(fields):
    return _photo_metadata_from_fields(fields, C.F_RECEIPT_ENTRY_PHOTO_METADATA)


def _photo_metadata_from_fields(fields, field_name):
    value = fields.get(field_name, "")
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return [value]
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


# ── Development tools ─────────────────────────────────────────────────────────

def _is_development_mode():
    return C.FLASK_ENV == "development" or C.FLASK_DEBUG


def _demo_date(days_ago):
    value = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return value.isoformat(timespec="seconds").replace("+00:00", "Z")


def _demo_identifier(code_type, index):
    code_type = code_type or "Text"
    if code_type in {"UPC-12", "GTIN-12"}:
        return f"036800{index % 1000000:06d}"[-12:]
    if code_type == "GTIN-14":
        return f"00036800{index % 1000000:06d}"[-14:]
    if code_type == "GTIN-13":
        return f"0036800{index % 1000000:06d}"[-13:]
    if code_type == "GTIN-8":
        return f"{index % 100000000:08d}"
    if code_type == "Numeric":
        return f"{index:06d}"
    return f"DEMO-{index:04d}"


def _item_client_id(record):
    client_ids = record.get("fields", {}).get(C.F_ITEM_CLIENT, []) or []
    return client_ids[0] if client_ids else ""


def _item_receipt_ids(record):
    receipts = record.get("fields", {}).get(C.F_ITEM_RECEIPTS, [])
    return receipts if isinstance(receipts, list) else []


def _issue_item_ids(record):
    item_ids = record.get("fields", {}).get(C.F_ISSUE_ITEM, [])
    return item_ids if isinstance(item_ids, list) else []


def _demo_item_payload(record, client, queue_id, index):
    client = client or {}
    valid_identifier = _demo_identifier(client.get("codeType"), index)
    base = {
        C.F_ITEM_IDENTIFIER: valid_identifier,
        C.F_ITEM_PRODUCT: record.get("fields", {}).get(C.F_ITEM_PRODUCT) or f"Demo Product {index}",
        C.F_ITEM_BRAND: record.get("fields", {}).get(C.F_ITEM_BRAND) or "Demo Brand",
        C.F_ITEM_CONDITION: "Good",
        C.F_ITEM_STATUS: "Pending",
        C.F_ITEM_RECEIVED: True,
        C.F_ITEM_REC_DATE: _demo_date(21 - (index % 14)),
        C.F_ITEM_ARTWORK_RECEIVED: True,
    }
    if queue_id == "waiting_merchandise":
        base.update({
            C.F_ITEM_RECEIVED: False,
            C.F_ITEM_REC_DATE: None,
            C.F_ITEM_ARTWORK_RECEIVED: True,
        })
    elif queue_id == "merchandise_issues":
        base.update({
            C.F_ITEM_RECEIVED: True,
            C.F_ITEM_ARTWORK_RECEIVED: True,
        })
    elif queue_id == "missing_data":
        base.update({
            C.F_ITEM_PRODUCT: "",
            C.F_ITEM_RECEIVED: True,
            C.F_ITEM_ARTWORK_RECEIVED: True,
        })
    elif queue_id == "missing_artwork":
        base.update({
            C.F_ITEM_RECEIVED: True,
            C.F_ITEM_ARTWORK_RECEIVED: False,
        })
    elif queue_id == "ready_for_photo":
        base.update({
            C.F_ITEM_RECEIVED: True,
            C.F_ITEM_ARTWORK_RECEIVED: True,
        })
    elif queue_id == "in_creative_force":
        base.update({
            C.F_ITEM_STATUS: "In Production",
            C.F_ITEM_RECEIVED: True,
            C.F_ITEM_ARTWORK_RECEIVED: True,
        })
    elif queue_id == "completed":
        base.update({
            C.F_ITEM_STATUS: "Complete",
            C.F_ITEM_RECEIVED: True,
            C.F_ITEM_ARTWORK_RECEIVED: True,
        })
    return base


def _queue_assignment(records, issues_by_item):
    shuffled = list(records)
    random.shuffle(shuffled)
    used = set()
    assignments = {}

    def take(queue_id, predicate=lambda record: True):
        for record in shuffled:
            if record["id"] not in used and predicate(record):
                used.add(record["id"])
                assignments[queue_id] = record
                return record
        return None

    take("waiting_merchandise", lambda record: not _item_receipt_ids(record))
    take("merchandise_issues", lambda record: bool(issues_by_item.get(record["id"])))
    take("missing_data")
    take("missing_artwork")
    take("ready_for_photo")
    take("in_creative_force")
    take("completed")
    return assignments


@api.post("/dev/randomize-demo-data")
def randomize_demo_data():
    if not _is_development_mode():
        return err("Developer tools are only available in development mode.", 404)

    clients_data = airtable.list_records(C.CLIENTS_TABLE, by_field_id=False).get("records", [])
    clients_by_id = {record["id"]: _shape_client(record) for record in clients_data}
    items = airtable.list_records(C.ITEMS_TABLE, by_field_id=False).get("records", [])
    issues = airtable.list_records(C.ISSUES_TABLE, by_field_id=False).get("records", [])
    issues_by_item = {}
    for issue in issues:
        for item_id in _issue_item_ids(issue):
            issues_by_item.setdefault(item_id, []).append(issue)

    if not items:
        return jsonify({"summary": {"itemsUpdated": 0, "issuesUpdated": 0, "clientsUpdated": 0, "warnings": ["No Items records exist to randomize."]}})

    assignments = _queue_assignment(items, issues_by_item)
    item_queue_by_id = {record["id"]: queue_id for queue_id, record in assignments.items() if record}
    queue_counts = {
        "waiting_merchandise": 0,
        "merchandise_issues": 0,
        "missing_data": 0,
        "missing_artwork": 0,
        "ready_for_photo": 0,
        "in_creative_force": 0,
        "completed": 0,
    }
    queue_cycle = ["ready_for_photo", "waiting_merchandise", "missing_data", "in_creative_force", "completed"]
    warnings = []
    updated_items = 0
    updated_issues = 0
    updated_clients = 0

    if not assignments.get("waiting_merchandise"):
        warnings.append("No unreceived/unlinked Item was available for Waiting for Merchandise without changing relationships.")
    if not assignments.get("merchandise_issues"):
        warnings.append("No existing Issue linked to an Item was available for Merchandise Issues.")

    artwork_client_ids = {
        _item_client_id(assignments["missing_artwork"])
    } if assignments.get("missing_artwork") and _item_client_id(assignments["missing_artwork"]) else set()

    for client_record in clients_data:
        client_id = client_record["id"]
        target_artwork = "Required" if client_id in artwork_client_ids else "Optional"
        fields = {
            C.F_CLIENT_REQUIRED_PHOTO_FIELDS: ["Identifier", "Product Name"],
            C.F_CLIENT_ARTWORK_REQUIREMENT: target_artwork,
            C.F_CLIENT_MERCHANDISE_REQUIRED: True,
        }
        airtable.update_record(C.CLIENTS_TABLE, client_id, fields, by_field_id=False)
        updated_clients += 1

    for index, item in enumerate(items, start=1):
        queue_id = item_queue_by_id.get(item["id"]) or queue_cycle[index % len(queue_cycle)]
        if queue_id == "waiting_merchandise" and _item_receipt_ids(item):
            queue_id = "ready_for_photo"
        if queue_id == "merchandise_issues" and not issues_by_item.get(item["id"]):
            queue_id = "ready_for_photo"
        client = clients_by_id.get(_item_client_id(item), {})
        fields = _demo_item_payload(item, client, queue_id, index)
        airtable.update_record(C.ITEMS_TABLE, item["id"], fields, by_field_id=False)
        queue_counts[queue_id] = queue_counts.get(queue_id, 0) + 1
        updated_items += 1

    merchandise_issue_item_id = assignments.get("merchandise_issues", {}).get("id") if assignments.get("merchandise_issues") else ""
    for index, issue in enumerate(issues, start=1):
        item_ids = _issue_item_ids(issue)
        should_block = merchandise_issue_item_id and merchandise_issue_item_id in item_ids
        fields = {
            C.F_ISSUE_TYPE: "Damaged" if should_block else issue.get("fields", {}).get(C.F_ISSUE_TYPE, "Other"),
            C.F_ISSUE_STATUS: "Open" if should_block else "Resolved",
            C.F_ISSUE_PRIORITY: "High" if should_block else issue.get("fields", {}).get(C.F_ISSUE_PRIORITY, "Normal"),
            C.F_ISSUE_OPENED: _demo_date(14 + index),
            C.F_ISSUE_CLOSED: None if should_block else _demo_date(2 + (index % 5)),
        }
        airtable.update_record(C.ISSUES_TABLE, issue["id"], fields, by_field_id=False)
        updated_issues += 1

    return jsonify({
        "summary": {
            "itemsUpdated": updated_items,
            "issuesUpdated": updated_issues,
            "clientsUpdated": updated_clients,
            "queues": queue_counts,
            "warnings": warnings,
        }
    })


@api.post("/dev/clear-core-tables")
def clear_core_tables():
    if not _is_development_mode():
        return err("Developer tools are only available in development mode.", 404)

    tables = [
        ("items", C.ITEMS_TABLE),
        ("history", C.HISTORY_TABLE),
        ("jobs", C.JOBS_TABLE),
        ("imports", C.IMPORTS_TABLE),
    ]
    summary = {}
    try:
        for key, table_name in tables:
            record_ids = _list_all_record_ids(table_name)
            summary[key] = {
                "table": table_name,
                "deleted": _delete_records_in_batches(table_name, record_ids),
            }
    except requests.HTTPError as error:
        return airtable_err(error)

    return jsonify({"summary": summary})


# ── Settings ──────────────────────────────────────────────────────────────────

@api.get("/settings")
def settings():
    return jsonify({
        "settings": {
            "airtableConfigured": C.airtable_ready(),
            "environment": C.FLASK_ENV,
            "development": _is_development_mode(),
            "base": C.AIRTABLE_BASE_ID,
            "tables": {
                "clients": C.CLIENTS_TABLE,
                "jobs":    C.JOBS_TABLE,
                "items":   C.ITEMS_TABLE,
                "skus":    C.SKUS_TABLE,
                "receipts": C.RECEIPTS_TABLE,
                "locations": C.LOCATIONS_TABLE,
                "users": C.USERS_TABLE,
                "issues": C.ISSUES_TABLE,
                "history": C.HISTORY_TABLE,
                "imports": C.IMPORTS_TABLE,
            },
        }
    })
