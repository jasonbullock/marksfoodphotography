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
    records = [_shape_client(r) for r in data.get("records", [])]
    return jsonify({"records": records})


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


# ── Locations ─────────────────────────────────────────────────────────────────

@api.get("/locations")
def list_locations():
    data = airtable.list_records(
        C.LOCATIONS_TABLE,
        params={"sort[0][field]": C.F_LOCATION_NAME, "sort[0][direction]": "asc"},
        by_field_id=False,
    )
    records = [_shape_location(r) for r in data.get("records", [])]
    return jsonify({"records": records})


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
    }


# ── Jobs ──────────────────────────────────────────────────────────────────────

@api.get("/jobs")
def list_jobs():
    params = {
        "sort[0][field]": C.F_JOB_DUE,
        "sort[0][direction]": "asc",
    }
    client_id = request.args.get("clientId")
    if client_id:
        params["filterByFormula"] = f'FIND("{client_id}", ARRAYJOIN({{{C.F_JOB_CLIENT}}}))'
    data = airtable.list_records(C.JOBS_TABLE, params=params, by_field_id=False)
    records = [_shape_job(r) for r in data.get("records", [])]
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
    if job_id:
        params["filterByFormula"] = f'FIND("{job_id}", ARRAYJOIN({{{C.F_ITEM_JOB}}}))'
    data = airtable.list_records(C.ITEMS_TABLE, params=params, by_field_id=False)
    records = [_shape_item(r) for r in data.get("records", [])]
    return jsonify({"records": records})


@api.post("/items")
@api.post("/skus")
def create_item():
    body = request.get_json(silent=True) or {}
    client_id = body.get("clientId")
    job_id = body.get("jobId")
    identifier = (body.get("id") or body.get("gtinUpc") or "").strip()
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
    return jsonify(_shape_item(data)), 201


@api.patch("/items/<record_id>")
@api.patch("/skus/<record_id>")
def update_item(record_id):
    body = request.get_json(silent=True) or {}
    fields = {}
    identifier = body.get("id") or body.get("gtinUpc")
    code_type = body.get("codeType") or (_client_code_type(body.get("clientId")) if body.get("clientId") else "")
    if identifier is not None:
        validation_error = _validate_item_identifier(identifier.strip(), code_type)
        if validation_error:
            return err(validation_error)
        fields[C.F_ITEM_IDENTIFIER] = identifier.strip()
    if body.get("clientId"):
        fields[C.F_ITEM_CLIENT] = [body["clientId"]]
    if body.get("jobId"):
        fields[C.F_ITEM_JOB] = [body["jobId"]]
    _apply_item_fields(fields, body)
    if not fields:
        return err("No updatable fields provided")

    data = airtable.update_record(C.ITEMS_TABLE, record_id, fields, by_field_id=False)
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
        return "ID must be exactly 12 digits for UPC-12."
    if code_type == "GTIN-14" and not (identifier.isdigit() and len(identifier) == 14):
        return "ID must be exactly 14 digits for GTIN-14."
    if code_type == "Item #" and not identifier:
        return "ID is required for Item #."
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
    for record in data.get("records", []):
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
    records = [_shape_issue(record) for record in data.get("records", [])]
    return jsonify({"records": records})


@api.post("/issues")
def create_issue():
    body = request.get_json(silent=True) or {}
    issue = (body.get("issue") or body.get("name") or "").strip()
    if not issue:
        return err("issue is required")

    fields = {C.F_ISSUE_NAME: issue}
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
    return jsonify(_shape_issue(data)), 201


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
    data = airtable.list_records(
        C.HISTORY_TABLE,
        params={"sort[0][field]": C.F_HISTORY_DATE, "sort[0][direction]": "desc"},
        by_field_id=False,
    )
    records = [_shape_history(record) for record in data.get("records", [])]
    return jsonify({"records": records})


@api.post("/history")
def create_history():
    body = request.get_json(silent=True) or {}
    event = (body.get("event") or "").strip()
    if not event:
        return err("event is required")

    fields = {C.F_HISTORY_EVENT: event}
    _set_link_field(fields, C.F_HISTORY_ITEM, body.get("itemId") or body.get("itemIds"))
    _set_link_field(fields, C.F_HISTORY_JOB, body.get("jobId") or body.get("jobIds"))
    _set_link_field(fields, C.F_HISTORY_USER, body.get("userId") or body.get("userIds"))
    for key, field in {
        "type": C.F_HISTORY_TYPE,
        "date": C.F_HISTORY_DATE,
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

    records = [_shape_receipt(record) for record in data.get("records", [])]
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
        fields[C.F_RECEIPT_CLIENT] = [client_id]
    if isinstance(item_ids, str):
        item_ids = [item_ids]
    if item_ids:
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

    return jsonify(_shape_receipt(data)), 201


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
            },
        }
    })
