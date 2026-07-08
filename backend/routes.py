from flask import Blueprint, jsonify, request

from airtable import airtable
from config import Config


api = Blueprint("api", __name__)

C = Config  # shorthand


def err(msg, status=400):
    return jsonify({"error": msg}), status


# ── Health ────────────────────────────────────────────────────────────────────

@api.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "Sierra Intake API",
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
    )
    records = [_shape_client(r) for r in data.get("records", [])]
    return jsonify({"records": records})


def _shape_client(r):
    f = r.get("fields", {})
    return {
        "id":              r["id"],
        "name":            f.get(C.F_CLIENT_NAME, ""),
        "jobCodePrefix":   f.get(C.F_CLIENT_JOB_CODE_PREFIX, ""),
        "gtinLength":      f.get(C.F_CLIENT_GTIN_LENGTH),
        "cfStyleGuide":    f.get(C.F_CLIENT_CF_STYLE_GUIDE, ""),
        "deliveryPlatform":f.get(C.F_CLIENT_DELIVERY_PLATFORM, ""),
    }


# ── Jobs ──────────────────────────────────────────────────────────────────────

@api.get("/jobs")
def list_jobs():
    params = {
        "sort[0][field]": C.F_JOB_DEADLINE,
        "sort[0][direction]": "asc",
    }
    client_id = request.args.get("clientId")
    if client_id:
        params["filterByFormula"] = f'FIND("{client_id}", ARRAYJOIN({{{C.F_JOB_CLIENT}}}))'
    data = airtable.list_records(C.JOBS_TABLE, params=params)
    records = [_shape_job(r) for r in data.get("records", [])]
    return jsonify({"records": records})


@api.post("/jobs")
def create_job():
    body = request.get_json(silent=True) or {}
    client_id  = body.get("clientId")
    sgs_num    = body.get("sgsJobNum", "").strip()
    batch_id   = body.get("clientBatchId", "").strip()
    period     = body.get("period", "").strip()
    deadline   = body.get("deadline", "")

    if not client_id:
        return err("clientId is required")
    if not sgs_num:
        return err("sgsJobNum is required")

    # Auto-generate job name: SGS# — Period (or batch)
    job_name = f"{sgs_num}" + (f" — {period}" if period else "")

    fields = {
        C.F_JOB_NAME:            job_name,
        C.F_JOB_CLIENT:          [client_id],
        C.F_JOB_SGS_JOB_NUM:    sgs_num,
        C.F_JOB_CLIENT_BATCH_ID: batch_id,
        C.F_JOB_PERIOD:          period,
    }
    if deadline:
        fields[C.F_JOB_DEADLINE] = deadline

    data = airtable.create_record(C.JOBS_TABLE, fields)
    return jsonify(_shape_job(data)), 201


def _shape_job(r):
    f = r.get("fields", {})
    return {
        "id":            r["id"],
        "name":          f.get(C.F_JOB_NAME, ""),
        "clientIds":     f.get(C.F_JOB_CLIENT, []),
        "sgsJobNum":     f.get(C.F_JOB_SGS_JOB_NUM, ""),
        "clientBatchId": f.get(C.F_JOB_CLIENT_BATCH_ID, ""),
        "period":        f.get(C.F_JOB_PERIOD, ""),
        "deadline":      f.get(C.F_JOB_DEADLINE, ""),
        "status":        f.get(C.F_JOB_STATUS, ""),
        "cfJobId":       f.get(C.F_JOB_CF_JOB_ID, ""),
    }


# ── SKUs ──────────────────────────────────────────────────────────────────────

@api.get("/skus")
def list_skus():
    params = {
        "sort[0][field]": C.F_SKU_NAME,
        "sort[0][direction]": "asc",
    }
    job_id = request.args.get("jobId")
    if job_id:
        params["filterByFormula"] = f'FIND("{job_id}", ARRAYJOIN({{{C.F_SKU_JOB}}}))'
    data = airtable.list_records(C.SKUS_TABLE, params=params)
    records = [_shape_sku(r) for r in data.get("records", [])]
    return jsonify({"records": records})


@api.post("/skus")
def create_sku():
    body = request.get_json(silent=True) or {}
    job_id   = body.get("jobId")
    gtin_upc = body.get("gtinUpc", "").strip()
    brand    = body.get("brand", "").strip()

    if not job_id:
        return err("jobId is required")
    if not gtin_upc:
        return err("gtinUpc is required")

    fields = {
        C.F_SKU_NAME:     gtin_upc,
        C.F_SKU_JOB:      [job_id],
        C.F_SKU_GTIN_UPC: gtin_upc,
    }
    if brand:
        fields[C.F_SKU_BRAND] = brand
    if body.get("vendor"):
        fields[C.F_SKU_VENDOR] = body["vendor"]
    if body.get("outputType"):
        fields[C.F_SKU_OUTPUT_TYPE] = body["outputType"]
    if body.get("masterVariant"):
        fields[C.F_SKU_MASTER_VARIANT] = body["masterVariant"]
    if body.get("pickupJobNum"):
        fields[C.F_SKU_PICKUP_JOB_NUM] = body["pickupJobNum"]
    if body.get("specialInstr"):
        fields[C.F_SKU_SPECIAL_INSTR] = body["specialInstr"]
    if body.get("merchVerified") is not None:
        fields[C.F_SKU_MERCH_VERIFIED] = bool(body["merchVerified"])

    data = airtable.create_record(C.SKUS_TABLE, fields)
    return jsonify(_shape_sku(data)), 201


@api.patch("/skus/<record_id>")
def update_sku(record_id):
    body = request.get_json(silent=True) or {}
    allowed = {
        "gtinUpc":       C.F_SKU_GTIN_UPC,
        "brand":         C.F_SKU_BRAND,
        "vendor":        C.F_SKU_VENDOR,
        "outputType":    C.F_SKU_OUTPUT_TYPE,
        "masterVariant": C.F_SKU_MASTER_VARIANT,
        "pickupJobNum":  C.F_SKU_PICKUP_JOB_NUM,
        "specialInstr":  C.F_SKU_SPECIAL_INSTR,
        "merchVerified": C.F_SKU_MERCH_VERIFIED,
        "shootDate":     C.F_SKU_SHOOT_DATE,
        "status":        C.F_SKU_STATUS,
    }
    fields = {field_id: body[key] for key, field_id in allowed.items() if key in body}
    if not fields:
        return err("No updatable fields provided")

    data = airtable.update_record(C.SKUS_TABLE, record_id, fields)
    return jsonify(_shape_sku(data))


def _shape_sku(r):
    f = r.get("fields", {})
    return {
        "id":            r["id"],
        "name":          f.get(C.F_SKU_NAME, ""),
        "jobIds":        f.get(C.F_SKU_JOB, []),
        "gtinUpc":       f.get(C.F_SKU_GTIN_UPC, ""),
        "brand":         f.get(C.F_SKU_BRAND, ""),
        "vendor":        f.get(C.F_SKU_VENDOR, ""),
        "outputType":    f.get(C.F_SKU_OUTPUT_TYPE, ""),
        "masterVariant": f.get(C.F_SKU_MASTER_VARIANT, ""),
        "pickupJobNum":  f.get(C.F_SKU_PICKUP_JOB_NUM, ""),
        "specialInstr":  f.get(C.F_SKU_SPECIAL_INSTR, ""),
        "merchVerified": f.get(C.F_SKU_MERCH_VERIFIED, False),
        "shootDate":     f.get(C.F_SKU_SHOOT_DATE, ""),
        "status":        f.get(C.F_SKU_STATUS, ""),
        "cfProductId":   f.get(C.F_SKU_CF_PRODUCT_ID, ""),
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
                "skus":    C.SKUS_TABLE,
            },
        }
    })
