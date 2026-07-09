import csv
import io
import json
import os
import re
import zipfile
from datetime import datetime, timezone
from xml.etree import ElementTree

import requests

from flask import Blueprint, jsonify, request

from airtable import airtable
from config import Config


api = Blueprint("api", __name__)

C = Config  # shorthand


def err(msg, status=400):
    return jsonify({"error": msg}), status


def airtable_err(error):
    response = getattr(error, "response", None)
    status = getattr(response, "status_code", 500)
    if status in {403, 404}:
        return err("Airtable table is not configured yet.", 501)
    return err("Airtable request failed.", status)


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


def _filter_by_client_field(records, field):
    permissions = _permission_context()
    if permissions["all"]:
        return records
    return [record for record in records if _client_ids_permitted(record.get("fields", {}).get(field, []), permissions)]


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
        "codeType": f.get(C.F_CLIENT_CODE_TYPE, ""),
        "holdDays": f.get(C.F_CLIENT_HOLD_DAYS),
        "dispoDays": f.get(C.F_CLIENT_DISPO_DAYS),
        "jobPrefix": f.get(C.F_CLIENT_JOB_PREFIX, ""),
        "active": f.get(C.F_CLIENT_ACTIVE, False),
    }


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
    "Jobs.Job": "Human-readable job or group name.",
    "Jobs.Job ID": "External production job or project number.",
    "Jobs.Due": "Job due date when present in the source spreadsheet.",
    "Jobs.Output Type": "Photo Only, Render Only, or Photo + Render.",
    "Jobs.Notes": "Source notes that describe the job.",
    "Items.Item": "Readable item display name.",
    "Items.Product ID": "Client product identifier, usually UPC or GTIN.",
    "Items.Product Name": "Product or item description.",
    "Items.Brand": "Product brand.",
    "Items.Notes": "Source notes that describe the item.",
}
INTAKE_MAPPINGS = {
    "kroger": {
        "ext_id": "Job #",
        "job_name": "Description",
        "product": "Product Received",
        "product_fallback": "Description",
        "id": "UPC",
        "brand": "Brand",
        "output": "Output Type",
        "notes": ["Notes"],
    },
    "unfi": {
        "ext_id": "Project Number",
        "product": "Description",
        "id": "UPC",
        "output": "Output Type",
        "notes": ["Notes"],
    },
    "smithfield": {
        "ext_id": "Job #",
        "product": "Product Description",
        "id": "GTIN",
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
        if ext == ".csv":
            parsed = _parse_csv(content)
        elif ext == ".xlsx":
            parsed = _parse_xlsx(content)
        else:
            parsed = _parse_xls(content)
        import_record = _create_import_record(client_id, filename, "Parsed", rows=parsed.get("rowCount", 0))
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
        "importId": import_record.get("id"),
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
    if ext == ".csv":
        return _parse_csv(content)
    if ext == ".xlsx":
        return _parse_xlsx(content)
    return _parse_xls(content)


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
        "Jobs.Job": (C.JOBS_TABLE, C.F_JOB_NAME),
        "Jobs.Job ID": (C.JOBS_TABLE, C.F_JOB_EXT_ID),
        "Jobs.Due": (C.JOBS_TABLE, C.F_JOB_DUE),
        "Jobs.Output Type": (C.JOBS_TABLE, C.F_JOB_OUTPUT),
        "Jobs.Notes": (C.JOBS_TABLE, C.F_JOB_NOTES),
        "Items.Item": (C.ITEMS_TABLE, C.F_ITEM_NAME),
        "Items.Product ID": (C.ITEMS_TABLE, C.F_ITEM_IDENTIFIER),
        "Items.Product Name": (C.ITEMS_TABLE, C.F_ITEM_PRODUCT),
        "Items.Brand": (C.ITEMS_TABLE, C.F_ITEM_BRAND),
        "Items.Notes": (C.ITEMS_TABLE, C.F_ITEM_NOTES),
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


def _mapping_from_ui_mapping(ui_mapping):
    if not isinstance(ui_mapping, dict):
        raise ValueError("Invalid column mapping.")

    mapping = {"notes": [], "job_notes": []}
    target_keys = {
        "Jobs.Job": "job_name",
        "Jobs.Job ID": "ext_id",
        "Jobs.Due": "due",
        "Jobs.Output Type": "output",
        "Items.Item": "item_name",
        "Items.Product ID": "id",
        "Items.Product Name": "product",
        "Items.Brand": "brand",
        "Items.Category": "category",
        "Job": "job_name",
        "Job ID": "ext_id",
        "Job Name": "job_name",
        "Product ID": "id",
        "ID": "id",
        "Product Name": "product",
        "Brand": "brand",
        "Category": "category",
        "Output Type": "output",
    }
    for source, target in ui_mapping.items():
        source_name = str(source or "").strip()
        target_name = str(target or "").strip()
        if not source_name or target_name == "Ignore":
            continue
        if target_name == "Items.Notes" or target_name == "Notes":
            mapping["notes"].append(source_name)
            continue
        if target_name == "Jobs.Notes":
            mapping["job_notes"].append(source_name)
            continue
        key = target_keys.get(target_name)
        if key and key not in mapping:
            mapping[key] = source_name

    required_targets = (("Jobs.Job ID", "ext_id"), ("Items.Product ID", "id"), ("Items.Product Name", "product"))
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
    received = _received_signal(row)
    if received is True:
        return "New"
    if received is False:
        return "Waiting Merch"
    return "New"


def _validate_identifier(identifier, code_type):
    return _validate_item_identifier(identifier, code_type)


def _existing_jobs_by_ext_id(client_id):
    data = airtable.list_records(C.JOBS_TABLE, by_field_id=False)
    jobs = {}
    for record in _filter_by_client_field(data.get("records", []), C.F_JOB_CLIENT):
        fields = record.get("fields", {})
        if client_id in (fields.get(C.F_JOB_CLIENT, []) or []):
            ext_id = fields.get(C.F_JOB_EXT_ID, "")
            if ext_id:
                jobs[ext_id] = record
    return jobs


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
    code_type = client_record.get("fields", {}).get(C.F_CLIENT_CODE_TYPE, "")
    mapping = mapping or _mapping_for_client(client_name)
    headers = parsed.get("columnHeaders", [])
    rows = [_row_dict(headers, values) for values in parsed.get("rows", [])]
    existing_jobs = _existing_jobs_by_ext_id(client_id)
    existing_items = _existing_items_by_identifier(client_id)
    seen_ids = {}
    row_results = []
    jobs = {}
    items_to_create = 0
    items_to_update = 0
    warning_count = 0
    error_count = 0

    for index, row in enumerate(rows, start=2):
        ext_id = _mapped_value(row, mapping, "ext_id")
        identifier = _mapped_value(row, mapping, "id")
        product = _mapped_value(row, mapping, "product")
        product_source = _source_value(row, mapping.get("product"))
        brand = _mapped_value(row, mapping, "brand")
        category = _mapped_value(row, mapping, "category")
        output = _normalize_output(_mapped_value(row, mapping, "output"))
        job_name_text = _mapped_value(row, mapping, "job_name")
        job_due = _mapped_value(row, mapping, "due")
        job_notes = _mapped_notes(row, {"notes": mapping.get("job_notes", [])})
        notes = _mapped_notes(row, mapping)
        problems = []
        warnings = []

        if not ext_id:
            problems.append("Missing Job ID")
        if not identifier:
            problems.append("Missing Product ID")
        if identifier:
            validation_error = _validate_identifier(identifier, code_type)
            if validation_error:
                problems.append(validation_error)
            if identifier in seen_ids:
                warnings.append(f"Duplicate Product ID also appears on row {seen_ids[identifier]}")
            else:
                seen_ids[identifier] = index
        if not product_source:
            warnings.append("Blank Product Name/Description")

        if ext_id:
            job = jobs.setdefault(ext_id, {
                "extId": ext_id,
                "jobName": job_name_text or f"{client_name} {ext_id}",
                "due": job_due,
                "notes": job_notes,
                "output": output,
                "existingId": existing_jobs.get(ext_id, {}).get("id"),
                "rowCount": 0,
            })
            job["rowCount"] += 1

        existing_item = existing_items.get(identifier) if identifier else None
        item_name = _mapped_value(row, mapping, "item_name") or _readable_item_name(brand, product, identifier)
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
            "id": identifier,
            "jobName": job_name_text or (f"{client_name} {ext_id}" if ext_id else ""),
            "itemName": item_name,
            "product": product,
            "brand": brand,
            "category": category,
            "due": job_due,
            "output": output,
            "jobNotes": job_notes,
            "notes": notes,
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
    code_type = client_record.get("fields", {}).get(C.F_CLIENT_CODE_TYPE, "")
    existing_jobs = _existing_jobs_by_ext_id(client_id)
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
        identifier = str(source.get("id", "") or "").strip()
        product = str(source.get("product", "") or "").strip()
        brand = str(source.get("brand", "") or "").strip()
        category = str(source.get("category", "") or "").strip()
        output = _normalize_output(str(source.get("output", "") or ""))
        notes = str(source.get("notes", "") or "").strip()
        job_due = str(source.get("due", "") or "").strip()
        job_notes = str(source.get("jobNotes", "") or "").strip()
        status = source.get("status") or "New"
        item_name = str(source.get("itemName", "") or "").strip() or _readable_item_name(brand, product, identifier)
        problems = []
        warnings = []

        if not ext_id:
            problems.append("Missing Job ID")
        if not identifier:
            problems.append("Missing Product ID")
        if identifier:
            validation_error = _validate_identifier(identifier, code_type)
            if validation_error:
                problems.append(validation_error)
            if identifier in seen_ids:
                warnings.append(f"Duplicate Product ID also appears on row {seen_ids[identifier]}")
            else:
                seen_ids[identifier] = index
        if not product:
            warnings.append("Blank Product Name/Description")

        if ext_id:
            job = jobs.setdefault(ext_id, {
                "extId": ext_id,
                "jobName": source.get("jobName") or f"{client_name} {ext_id}",
                "due": job_due,
                "notes": job_notes,
                "output": output,
                "existingId": existing_jobs.get(ext_id, {}).get("id"),
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
            "id": identifier,
            "jobName": source.get("jobName") or (f"{client_name} {ext_id}" if ext_id else ""),
            "itemName": item_name,
            "product": product,
            "brand": brand,
            "category": category,
            "due": job_due,
            "output": output,
            "jobNotes": job_notes,
            "notes": notes,
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
        C.F_JOB_EXT_ID: job["extId"],
        C.F_JOB_OUTPUT: job.get("output") or DEFAULT_IMPORT_OUTPUT,
        C.F_JOB_STATUS: "Active",
    }
    if job.get("due"):
        fields[C.F_JOB_DUE] = job["due"]
    if job.get("notes"):
        fields[C.F_JOB_NOTES] = job["notes"]
    return fields


def _item_fields_from_row(client_id, job_id, row):
    fields = {
        C.F_ITEM_NAME: row["itemName"],
        C.F_ITEM_CLIENT: [client_id],
        C.F_ITEM_JOB: [job_id],
        C.F_ITEM_IDENTIFIER: row["id"],
        C.F_ITEM_PRODUCT: row["product"],
        C.F_ITEM_STATUS: row["status"],
    }
    if row.get("brand"):
        fields[C.F_ITEM_BRAND] = row["brand"]
    if row.get("category"):
        fields[C.F_ITEM_CATEGORY] = row["category"]
    if row.get("notes"):
        fields[C.F_ITEM_NOTES] = row["notes"]
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
    ext_id = (body.get("extId") or body.get("jobId") or "").strip()
    output = (body.get("output") or "").strip()
    status = (body.get("status") or "").strip()
    due = body.get("due") or body.get("deadline") or ""
    notes = (body.get("notes") or "").strip()

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
    if output:
        fields[C.F_JOB_OUTPUT] = output
    if ext_id:
        fields[C.F_JOB_EXT_ID] = ext_id
    if status:
        fields[C.F_JOB_STATUS] = status
    if due:
        fields[C.F_JOB_DUE] = due
    if notes:
        fields[C.F_JOB_NOTES] = notes

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
        "extId": C.F_JOB_EXT_ID,
        "output": C.F_JOB_OUTPUT,
        "status": C.F_JOB_STATUS,
        "due": C.F_JOB_DUE,
        "notes": C.F_JOB_NOTES,
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
        "extId": f.get(C.F_JOB_EXT_ID, ""),
        "output": f.get(C.F_JOB_OUTPUT, ""),
        "status": f.get(C.F_JOB_STATUS, ""),
        "due": f.get(C.F_JOB_DUE, ""),
        "deadline": f.get(C.F_JOB_DUE, ""),
        "notes": f.get(C.F_JOB_NOTES, ""),
    }


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
    records = [_shape_item(r) for r in records]
    return jsonify({"records": records})


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
    code_type = _client_code_type(client_id) if client_id else (body.get("codeType") or "")
    validation_error = _validate_item_identifier(identifier, code_type)
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
    return jsonify(_shape_item(data)), 201


@api.patch("/items/<record_id>")
@api.patch("/skus/<record_id>")
def update_item(record_id):
    body = request.get_json(silent=True) or {}
    previous = airtable.get_record(C.ITEMS_TABLE, record_id, by_field_id=False)
    if not _client_ids_permitted(previous.get("fields", {}).get(C.F_ITEM_CLIENT, [])):
        return _forbidden()
    fields = {}
    identifier = body.get("productId") or body.get("id") or body.get("gtinUpc")
    code_type = body.get("codeType") or (_client_code_type(body.get("clientId")) if body.get("clientId") else "")
    if identifier is not None:
        validation_error = _validate_item_identifier(identifier.strip(), code_type)
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
    return jsonify(_shape_item(data))


def _shape_item(r):
    f = r.get("fields", {})
    code_type = f.get(C.F_ITEM_CODE_TYPE, "")
    if isinstance(code_type, list):
        code_type = code_type[0] if code_type else ""
    return {
        "id": r["id"],
        "name": f.get(C.F_ITEM_NAME, ""),
        "clientIds": f.get(C.F_ITEM_CLIENT, []),
        "jobIds": f.get(C.F_ITEM_JOB, []),
        "productId": f.get(C.F_ITEM_IDENTIFIER, ""),
        "identifier": f.get(C.F_ITEM_IDENTIFIER, ""),
        "gtinUpc": f.get(C.F_ITEM_IDENTIFIER, ""),
        "codeType": code_type,
        "product": f.get(C.F_ITEM_PRODUCT, ""),
        "brand": f.get(C.F_ITEM_BRAND, ""),
        "category": f.get(C.F_ITEM_CATEGORY, ""),
        "received": f.get(C.F_ITEM_RECEIVED, False),
        "merchVerified": f.get(C.F_ITEM_RECEIVED, False),
        "recDate": f.get(C.F_ITEM_REC_DATE, ""),
        "location": "",
        "locationIds": f.get(C.F_ITEM_LOCATION, []) if isinstance(f.get(C.F_ITEM_LOCATION), list) else [],
        "condition": f.get(C.F_ITEM_CONDITION, ""),
        "status": f.get(C.F_ITEM_STATUS, ""),
        "notes": f.get(C.F_ITEM_NOTES, ""),
    }


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
    }
    for key, field in mapping.items():
        if key in body and body[key] not in (None, ""):
            fields[field] = body[key]


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
            return record.get("fields", {}).get(C.F_CLIENT_CODE_TYPE, "")
    return ""


def _validate_item_identifier(identifier, code_type):
    if code_type == "UPC-12" and not (identifier.isdigit() and len(identifier) == 12):
        return "Product ID must be exactly 12 digits for UPC-12."
    if code_type == "GTIN-14" and not (identifier.isdigit() and len(identifier) == 14):
        return "Product ID must be exactly 14 digits for GTIN-14."
    if code_type == "Item #" and not identifier:
        return "Product ID is required for Item #."
    return ""


def _item_match_score(item, query):
    haystack = " ".join([
        item.get("identifier", ""),
        item.get("name", ""),
        item.get("product", ""),
        item.get("brand", ""),
    ]).lower()
    exact_values = {
        item.get("identifier", "").lower(),
        item.get("name", "").lower(),
    }
    if query in exact_values:
        return 100
    if query and query in haystack:
        return 50
    return 0


def _find_matching_skus(query):
    cleaned = (query or "").strip().lower()
    if len(cleaned) < 3:
        return []

    data = airtable.list_records(C.ITEMS_TABLE, params={"sort[0][field]": C.F_ITEM_NAME, "sort[0][direction]": "asc"}, by_field_id=False)
    matches = []
    for record in _filter_by_client_field(data.get("records", []), C.F_ITEM_CLIENT):
        sku = _shape_item(record)
        score = _item_match_score(sku, cleaned)
        if score:
            matches.append({**sku, "score": score})
    return sorted(matches, key=lambda sku: (-sku["score"], sku.get("gtinUpc") or sku.get("name") or ""))[:8]


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

    records = _filter_by_client_field(data.get("records", []), C.F_RECEIPT_CLIENT)
    records = [_shape_receipt(record) for record in records]
    return jsonify({"records": records})


@api.get("/receiving/matches")
def receiving_matches():
    query = request.args.get("q", "")
    try:
        matches = _find_matching_skus(query)
    except requests.HTTPError as error:
        return airtable_err(error)
    return jsonify({"records": matches})


@api.post("/receipts")
@api.post("/receiving")
def create_receipt():
    body = request.get_json(silent=True) or {}
    fields = {}

    receipt = (body.get("receipt") or body.get("name") or "").strip()
    client_id = (body.get("clientId") or "").strip()
    item_ids = body.get("itemIds") or body.get("items") or []
    carrier = (body.get("carrier") or "").strip()
    tracking = (body.get("tracking") or body.get("identifier") or "").strip()
    received = (body.get("received") or body.get("receivedDate") or "").strip()
    receiver_ids = body.get("receiverIds") or body.get("receiverId") or []
    location_ids = body.get("locationIds") or body.get("locationId") or []
    photos = body.get("photos") or []
    notes = (body.get("notes") or "").strip()

    if receipt:
        fields[C.F_RECEIPT_NAME] = receipt
    if client_id:
        if not _client_permitted(client_id):
            return _forbidden()
        fields[C.F_RECEIPT_CLIENT] = [client_id]
    if isinstance(item_ids, str):
        item_ids = [item_ids]
    if item_ids:
        if not _all_linked_records_permitted(C.ITEMS_TABLE, item_ids):
            return _forbidden()
        fields[C.F_RECEIPT_ITEMS] = item_ids
    if carrier:
        fields[C.F_RECEIPT_CARRIER] = carrier
    if tracking:
        fields[C.F_RECEIPT_TRACKING] = tracking
    if received:
        fields[C.F_RECEIPT_RECEIVED] = received
    if receiver_ids:
        fields[C.F_RECEIPT_RECEIVER] = receiver_ids if isinstance(receiver_ids, list) else [receiver_ids]
    if location_ids:
        fields[C.F_RECEIPT_LOCATION] = location_ids if isinstance(location_ids, list) else [location_ids]
    if photos:
        fields[C.F_RECEIPT_PHOTOS] = photos
    if notes:
        fields[C.F_RECEIPT_NOTES] = notes

    if not fields:
        return err("Add at least one receipt detail.")

    try:
        data = airtable.create_record(C.RECEIPTS_TABLE, fields, by_field_id=False)
    except requests.HTTPError as error:
        return airtable_err(error)

    receipt_fields = data.get("fields", {})
    receipt_item_ids = receipt_fields.get(C.F_RECEIPT_ITEMS, [])
    _create_history_event(
        "Merch Received",
        "Merch Received",
        item_ids=receipt_item_ids,
        job_ids=_job_ids_for_items(receipt_item_ids),
        user_ids=receipt_fields.get(C.F_RECEIPT_RECEIVER),
        details=f"Receipt created: {receipt_fields.get(C.F_RECEIPT_NAME, data['id'])}.",
    )
    return jsonify(_shape_receipt(data)), 201


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


def _shape_receipt(r):
    f = r.get("fields", {})
    return {
        "id": r["id"],
        "name": f.get(C.F_RECEIPT_NAME, ""),
        "receipt": f.get(C.F_RECEIPT_NAME, ""),
        "clientIds": f.get(C.F_RECEIPT_CLIENT, []),
        "itemIds": f.get(C.F_RECEIPT_ITEMS, []),
        "skuIds": f.get(C.F_RECEIPT_ITEMS, []),
        "carrier": f.get(C.F_RECEIPT_CARRIER, ""),
        "tracking": f.get(C.F_RECEIPT_TRACKING, ""),
        "received": f.get(C.F_RECEIPT_RECEIVED, ""),
        "receivedDate": f.get(C.F_RECEIPT_RECEIVED, ""),
        "receiver": "",
        "receiverIds": f.get(C.F_RECEIPT_RECEIVER, []) if isinstance(f.get(C.F_RECEIPT_RECEIVER), list) else [],
        "location": "",
        "locationIds": f.get(C.F_RECEIPT_LOCATION, []) if isinstance(f.get(C.F_RECEIPT_LOCATION), list) else [],
        "photos": f.get(C.F_RECEIPT_PHOTOS, []),
        "notes": f.get(C.F_RECEIPT_NOTES, ""),
    }


# ── Settings ──────────────────────────────────────────────────────────────────

@api.get("/settings")
def settings():
    return jsonify({
        "settings": {
            "airtableConfigured": C.airtable_ready(),
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
