import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[1]


def load_env():
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(ROOT / "backend" / ".env")


ATTACHMENT_FIELDS = [
    {
        "table": "Products",
        "table_id": "tblC9Tu69BEOIy6Q4",
        "field_id": "fld518nperBoHn9yG",
        "field_name": "Photos",
        "deprecated_field_name": "Deprecated Airtable Photos - Do Not Use",
        "metadata_field": "Photo Metadata",
    },
    {
        "table": "Shipments",
        "table_id": "tblnDJYWtYvgEunVM",
        "field_id": "fldlDpgrtKRTpBWla",
        "field_name": "Photos",
        "deprecated_field_name": "Deprecated Airtable Photos - Do Not Use",
        "metadata_field": None,
    },
    {
        "table": "Issues",
        "table_id": "tblKdfmqPpFe9cZXN",
        "field_id": "fldBqWeFeXoFPo2Ws",
        "field_name": "Photos",
        "deprecated_field_name": "Deprecated Airtable Photos - Do Not Use",
        "metadata_field": None,
    },
    {
        "table": "Merchandise",
        "table_id": "tblWALCoKwvT6Nl8A",
        "field_id": "fldtTr7eNQrT6iVrS",
        "field_name": "Photos",
        "deprecated_field_name": "Deprecated Airtable Photos - Do Not Use",
        "metadata_field": "Photo Metadata",
    },
]


def airtable_headers():
    return {
        "Authorization": f"Bearer {os.environ['AIRTABLE_API_KEY']}",
        "Content-Type": "application/json",
    }


def airtable_url(table, record_id=None):
    base = f"https://api.airtable.com/v0/{os.environ['AIRTABLE_BASE_ID']}/{requests.utils.quote(table, safe='')}"
    return f"{base}/{record_id}" if record_id else base


def list_records(table):
    records = []
    offset = None
    while True:
        params = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        response = requests.get(airtable_url(table), headers=airtable_headers(), params=params, timeout=30)
        response.raise_for_status()
        payload = response.json()
        records.extend(payload.get("records", []))
        offset = payload.get("offset")
        if not offset:
            return records


def update_record(table, record_id, fields):
    response = requests.patch(
        airtable_url(table, record_id),
        headers=airtable_headers(),
        json={"fields": fields},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def patch_field(table_id, field_id, name, description):
    url = f"https://api.airtable.com/v0/meta/bases/{os.environ['AIRTABLE_BASE_ID']}/tables/{table_id}/fields/{field_id}"
    response = requests.patch(
        url,
        headers=airtable_headers(),
        json={"name": name, "description": description},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def r2_client():
    import boto3
    from botocore.config import Config as BotoConfig

    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def parse_manifest(value):
    if not value:
        return []
    if isinstance(value, list):
        raw = value
    else:
        try:
            raw = json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return []
    if not isinstance(raw, list):
        return []
    manifest = []
    for index, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            continue
        object_key = (item.get("object_key") or item.get("objectKey") or "").strip()
        if not object_key:
            continue
        try:
            sort_order = int(item.get("sort_order") or item.get("sortOrder") or index)
        except (TypeError, ValueError):
            sort_order = index
        entry = {"object_key": object_key, "sort_order": sort_order}
        thumbnail_key = (item.get("thumbnail_key") or item.get("thumbnailKey") or "").strip()
        if thumbnail_key:
            entry["thumbnail_key"] = thumbnail_key
        filename = item.get("filename") or item.get("original_filename") or item.get("originalFilename") or item.get("stored_filename")
        if filename:
            entry["filename"] = str(filename)
        original_filename = item.get("original_filename") or item.get("originalFilename")
        if original_filename:
            entry["original_filename"] = str(original_filename)
        stored_filename = item.get("stored_filename") or item.get("storedFilename")
        if stored_filename:
            entry["stored_filename"] = str(stored_filename)
        content_type = item.get("content_type") or item.get("contentType") or item.get("mime_type") or item.get("mimeType")
        if content_type:
            entry["content_type"] = str(content_type)
        size_bytes = item.get("size_bytes") or item.get("sizeBytes")
        if size_bytes:
            try:
                entry["size_bytes"] = int(size_bytes)
            except (TypeError, ValueError):
                pass
        uploaded_at = item.get("uploaded_at") or item.get("uploadedAt")
        if uploaded_at:
            entry["uploaded_at"] = str(uploaded_at)
        manifest.append(entry)
    return sorted(manifest, key=lambda item: item.get("sort_order") or 0)


def attachment_values(fields, spec):
    values = []
    for name in (spec["field_name"], spec.get("deprecated_field_name")):
        if name:
            values.extend(fields.get(name) or [])
    return values


def verify_object(client, object_key):
    try:
        head = client.head_object(Bucket=os.environ["R2_BUCKET_NAME"], Key=object_key)
        body = client.get_object(Bucket=os.environ["R2_BUCKET_NAME"], Key=object_key)["Body"].read(32)
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
    return {
        "ok": bool(body),
        "content_type": head.get("ContentType") or "",
        "content_length": head.get("ContentLength"),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report", default="")
    args = parser.parse_args()

    load_env()
    required = ["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise SystemExit(f"Missing required env vars: {', '.join(missing)}")

    client = r2_client()
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "applied": args.apply,
        "tables": [],
        "records": [],
        "field_updates": [],
        "failures": [],
    }

    for spec in ATTACHMENT_FIELDS:
        records = list_records(spec["table"])
        attachment_records = []
        for record in records:
            fields = record.get("fields") or {}
            attachments = attachment_values(fields, spec)
            if attachments:
                attachment_records.append(record)
        report["tables"].append({
            "table": spec["table"],
            "field": spec["field_name"],
            "field_id": spec["field_id"],
            "attachment_record_count": len(attachment_records),
            "attachment_count": sum(len(attachment_values(record.get("fields") or {}, spec)) for record in attachment_records),
        })

        for record in attachment_records:
            fields = record.get("fields") or {}
            attachments = attachment_values(fields, spec)
            manifest = parse_manifest(fields.get(spec["metadata_field"])) if spec["metadata_field"] else []
            verifications = []
            for item in manifest:
                result = verify_object(client, item["object_key"])
                verifications.append({"object_key": item["object_key"], **result})
            all_verified = bool(manifest) and all(item["ok"] for item in verifications)
            record_report = {
                "table": spec["table"],
                "record_id": record["id"],
                "attachment_field": spec["field_name"],
                "original_attachment_count": len(attachments),
                "original_attachment_filenames": [item.get("filename") for item in attachments],
                "new_r2_object_keys": [item["object_key"] for item in manifest],
                "verification": verifications,
                "attachment_removal_result": "not_applied",
                "metadata_update_result": "not_applied",
            }
            if not all_verified:
                record_report["attachment_removal_result"] = "skipped_unverified"
                report["failures"].append(record_report)
                report["records"].append(record_report)
                continue
            if args.apply:
                update_fields = {spec["field_name"]: []}
                if spec["metadata_field"]:
                    update_fields[spec["metadata_field"]] = json.dumps(manifest, separators=(",", ":"))
                update_record(spec["table"], record["id"], update_fields)
                record_report["attachment_removal_result"] = "cleared"
                record_report["metadata_update_result"] = "canonicalized" if spec["metadata_field"] else "not_needed"
            report["records"].append(record_report)

        if args.apply:
            field_result = patch_field(
                spec["table_id"],
                spec["field_id"],
                "Deprecated Airtable Photos - Do Not Use",
                "Deprecated after R2-only image migration on 2026-07-20. Store image references in Photo Metadata or another R2 key manifest field only.",
            )
            report["field_updates"].append({
                "table": spec["table"],
                "field_id": spec["field_id"],
                "result": "deprecated",
                "new_name": field_result.get("name"),
            })

    if args.apply:
        for spec in ATTACHMENT_FIELDS:
            records = list_records(spec["table"])
            remaining = []
            for record in records:
                fields = record.get("fields") or {}
                remaining.extend(fields.get(spec["field_name"]) or [])
                remaining.extend(fields.get("Deprecated Airtable Photos - Do Not Use") or [])
            if remaining:
                report["failures"].append({
                    "table": spec["table"],
                    "field_id": spec["field_id"],
                    "remaining_attachment_count": len(remaining),
                })

    default_report = "2026-07-20-r2-only-image-storage-report.json" if args.apply else "2026-07-20-r2-only-image-storage-dry-run.json"
    report_path = Path(args.report or ROOT / "docs" / "migrations" / default_report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({
        "report": str(report_path),
        "applied": args.apply,
        "tables": report["tables"],
        "failures": len(report["failures"]),
    }, indent=2))
    return 1 if report["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
