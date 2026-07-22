#!/usr/bin/env python3
"""Generate a non-destructive Airtable schema cleanup audit."""

from __future__ import annotations

import json
import os
from pathlib import Path

import requests

from config import Config as C


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "migrations" / "2026-07-22-minimal-operating-model-airtable-audit.json"
TEXT_EXTENSIONS = {".py", ".js", ".jsx", ".md", ".json", ".csv", ".txt", ".env", ".example"}

CANONICAL_TABLES = {
    C.CLIENTS_TABLE,
    C.SHIPMENTS_TABLE,
    C.MERCHANDISE_TABLE,
    C.PRODUCTS_TABLE,
    C.JOBS_TABLE,
    C.USERS_TABLE,
    C.LOCATIONS_TABLE,
    C.ISSUES_TABLE,
    C.IMPORTS_TABLE,
}

LEGACY_TABLES = {
    "Workstreams",
    "Work Orders",
    "Workflow Templates",
    "Workflow Stages",
    "Work Order Types",
}

CORE_PRODUCT_FIELDS = {
    C.F_ITEM_NAME,
    C.F_ITEM_CLIENT,
    C.F_ITEM_IDENTIFIER,
    C.F_ITEM_IDENTIFIER_TYPE,
    C.F_ITEM_PRODUCT,
    C.F_ITEM_DESCRIPTION,
    C.F_ITEM_BRAND,
    C.F_ITEM_ARTWORK_RECEIVED,
    C.F_ITEM_REFERENCE_DATA,
    C.F_ITEM_ACTIVE if hasattr(C, "F_ITEM_ACTIVE") else "Active",
}

REPORTING_PRODUCT_FIELDS = {
    C.F_ITEM_JOB,
    C.F_ITEM_JOB_NUMBER,
    C.F_ITEM_PICKUP_JOB_NUMBER,
    C.F_ITEM_MASTER_VARIANT,
    C.F_ITEM_CATEGORY,
}

OBSOLETE_PRODUCT_FIELDS = {
    C.F_ITEM_RECEIVED,
    C.F_ITEM_REC_DATE,
    C.F_ITEM_LOCATION,
    C.F_ITEM_CONDITION,
    C.F_ITEM_STATUS,
    C.F_ITEM_PHOTOS,
    C.F_ITEM_PHOTO_METADATA,
    C.F_ITEM_RECEIPTS,
    C.F_ITEM_ISSUES,
    C.F_ITEM_EXPORTED,
    C.F_ITEM_EXPORTED_ON,
    C.F_ITEM_EXPORT_ERROR,
    "Workstream",
    "Output Type",
}


def airtable_metadata():
    if not C.AIRTABLE_API_KEY or not C.AIRTABLE_BASE_ID:
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")
    response = requests.get(
        f"https://api.airtable.com/v0/meta/bases/{C.AIRTABLE_BASE_ID}/tables",
        headers={"Authorization": f"Bearer {C.AIRTABLE_API_KEY}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def record_count(table_id):
    response = requests.get(
        f"https://api.airtable.com/v0/{C.AIRTABLE_BASE_ID}/{table_id}",
        headers={"Authorization": f"Bearer {C.AIRTABLE_API_KEY}"},
        params={"pageSize": 1},
        timeout=30,
    )
    response.raise_for_status()
    return len(response.json().get("records", []))


def repo_files():
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in {".git", "node_modules", ".venv", "dist", "__pycache__"} for part in path.parts):
            continue
        if path.suffix in TEXT_EXTENSIONS or path.name in {"AGENTS.md", "README.md"}:
            yield path


def dependency_hits(needles):
    hits = {needle: [] for needle in needles if needle}
    for path in repo_files():
        try:
            text = path.read_text(errors="ignore")
        except OSError:
            continue
        for needle in hits:
            if needle in text:
                hits[needle].append(str(path.relative_to(ROOT)))
    return hits


def recommendation_for_table(table, hits):
    name = table["name"]
    if name in CANONICAL_TABLES:
        return "Keep"
    if name in LEGACY_TABLES:
        return "Archive review"
    if hits.get(name) or hits.get(table["id"]):
        return "Investigate"
    return "Delete review"


def recommendation_for_field(table_name, field, hits):
    name = field["name"]
    if table_name == C.PRODUCTS_TABLE:
        if name in CORE_PRODUCT_FIELDS:
            return "Keep"
        if name in REPORTING_PRODUCT_FIELDS:
            return "Keep for reporting/integration review"
        if name in OBSOLETE_PRODUCT_FIELDS:
            return "Manual delete after backup"
    if name.lower() in {"notes", "pm notes", "receiver notes", "shipment notes", "review notes", "resolution notes"}:
        return "Consolidate into Conversation review"
    if hits.get(name) or hits.get(field["id"]):
        return "Keep or rename after dependency review"
    return "Delete review"


def main():
    metadata = airtable_metadata()
    needles = []
    for table in metadata.get("tables", []):
        needles.extend([table.get("name", ""), table.get("id", "")])
        for field in table.get("fields", []):
            needles.extend([field.get("name", ""), field.get("id", "")])
    hits = dependency_hits(needles)

    tables = []
    for table in metadata.get("tables", []):
        table_hits = sorted(set(hits.get(table["name"], []) + hits.get(table["id"], [])))
        try:
            has_records = record_count(table["id"]) > 0
        except requests.HTTPError:
            has_records = None
        fields = []
        for field in table.get("fields", []):
            field_hits = sorted(set(hits.get(field["name"], []) + hits.get(field["id"], [])))
            fields.append({
                "id": field["id"],
                "name": field["name"],
                "type": field.get("type", ""),
                "dependencies": field_hits,
                "recommendation": recommendation_for_field(table["name"], field, hits),
            })
        tables.append({
            "id": table["id"],
            "name": table["name"],
            "hasRecords": has_records,
            "dependencies": table_hits,
            "recommendation": recommendation_for_table(table, hits),
            "fields": fields,
        })

    audit = {
        "baseId": C.AIRTABLE_BASE_ID,
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "safeMode": True,
        "tables": tables,
    }
    OUTPUT.write_text(json.dumps(audit, indent=2, sort_keys=True) + "\n")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
