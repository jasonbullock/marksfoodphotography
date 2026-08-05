#!/usr/bin/env python3
import argparse
import json

from airtable_schema import create_field, field_by_name, get_tables, load_env, meta_request, table_by_name
from config import Config


def single_select_field(name, options):
    return {
        "name": name,
        "type": "singleSelect",
        "options": {"choices": [{"name": option} for option in options]},
    }


def multiline_text_field(name):
    return {"name": name, "type": "multilineText"}


def number_field(name):
    return {"name": name, "type": "number", "options": {"precision": 0}}


def link_field(name, table_id):
    return {"name": name, "type": "multipleRecordLinks", "options": {"linkedTableId": table_id}}


def create_table(name, fields, description=""):
    body = {"name": name, "fields": fields}
    if description:
        body["description"] = description
    return meta_request("POST", "/tables", body)


def option_names(field):
    return [choice.get("name", "") for choice in (field.get("options") or {}).get("choices", [])]


def ensure_field(table, field, *, dry_run=False):
    existing = field_by_name(table, field["name"])
    if existing:
        if existing.get("type") == "singleSelect":
            missing = [option for option in option_names(field) if option not in option_names(existing)]
            if missing:
                return {"field": field["name"], "result": "missing_options", "missing": missing}
        return {"field": field["name"], "result": "reused", "id": existing.get("id", "")}
    if dry_run:
        return {"field": field["name"], "result": "would_create"}
    created = create_field(table["id"], field)
    return {"field": field["name"], "result": "created", "id": created.get("id", "")}


def ensure_table(tables, name, fields, *, description="", dry_run=False):
    existing = table_by_name(tables, name)
    if existing:
        field_results = [ensure_field(existing, field, dry_run=dry_run) for field in fields[1:]]
        return {"table": name, "result": "reused", "id": existing.get("id", ""), "fields": field_results}
    if dry_run:
        return {"table": name, "result": "would_create", "fields": [field["name"] for field in fields]}
    created = create_table(name, fields, description=description)
    return {"table": name, "result": "created", "id": created.get("id", ""), "fields": [field["name"] for field in fields]}


def ensure_received_merch_workflow_schema(*, dry_run=False):
    tables = get_tables()
    merchandise = table_by_name(tables, Config.MERCHANDISE_TABLE)
    products = table_by_name(tables, Config.PRODUCTS_TABLE)
    shipments = table_by_name(tables, Config.SHIPMENTS_TABLE)
    missing = [
        name for name, table in (
            (Config.MERCHANDISE_TABLE, merchandise),
            (Config.PRODUCTS_TABLE, products),
            (Config.SHIPMENTS_TABLE, shipments),
        ) if not table
    ]
    if missing:
        raise SystemExit(f"Missing required table(s): {', '.join(missing)}")

    merchandise_fields = [
        single_select_field(Config.F_RECEIPT_ENTRY_NEW_MERCH_STATUS, Config.NEW_MERCH_STATUS_OPTIONS),
        multiline_text_field(Config.F_RECEIPT_ENTRY_MANUAL_PRODUCT_INFO),
    ]
    workstream_fields = [
        {"name": Config.F_WORKSTREAM_CARD_NAME, "type": "singleLineText"},
        link_field(Config.F_WORKSTREAM_CARD_RECEIVED_MERCH, merchandise["id"]),
        link_field(Config.F_WORKSTREAM_CARD_EXPECTED_PRODUCT, products["id"]),
        single_select_field(Config.F_WORKSTREAM_CARD_TYPE, Config.WORKSTREAM_TYPE_OPTIONS),
        single_select_field(Config.F_WORKSTREAM_CARD_STATUS, Config.WORKSTREAM_CARD_STATUS_OPTIONS),
        number_field(Config.F_WORKSTREAM_CARD_QUANTITY),
        multiline_text_field(Config.F_WORKSTREAM_CARD_MANUAL_PRODUCT_INFO),
        multiline_text_field(Config.F_WORKSTREAM_CARD_NOTES),
    ]
    thr3d_fields = [
        {"name": Config.F_THR3D_SHIPPING_ITEM_NAME, "type": "singleLineText"},
        link_field(Config.F_THR3D_SHIPPING_ITEM_RECEIVED_MERCH, merchandise["id"]),
        link_field(Config.F_THR3D_SHIPPING_ITEM_EXPECTED_PRODUCT, products["id"]),
        number_field(Config.F_THR3D_SHIPPING_ITEM_QUANTITY),
        single_select_field(Config.F_THR3D_SHIPPING_ITEM_STATUS, Config.THR3D_SHIPPING_STATUS_OPTIONS),
        link_field(Config.F_THR3D_SHIPPING_ITEM_OUTBOUND_SHIPMENT, shipments["id"]),
        multiline_text_field(Config.F_THR3D_SHIPPING_ITEM_MANUAL_PRODUCT_INFO),
        multiline_text_field(Config.F_THR3D_SHIPPING_ITEM_NOTES),
    ]

    results = {
        "merchandiseFields": [ensure_field(merchandise, field, dry_run=dry_run) for field in merchandise_fields],
        "tables": [
            ensure_table(
                tables,
                Config.WORKSTREAM_CARDS_TABLE,
                workstream_fields,
                description="Child Ecomm and Packaging work created from Received Merch.",
                dry_run=dry_run,
            ),
            ensure_table(
                tables,
                Config.THR3D_SHIPPING_ITEMS_TABLE,
                thr3d_fields,
                description="Outbound THR3D shipping items created from Received Merch.",
                dry_run=dry_run,
            ),
        ],
    }
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    load_env()
    print(json.dumps(ensure_received_merch_workflow_schema(dry_run=args.dry_run), indent=2))


if __name__ == "__main__":
    main()
