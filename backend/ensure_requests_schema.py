#!/usr/bin/env python3
"""Create optional Requests and retire the empty legacy Issues table."""

import argparse
import json

from airtable import airtable
from airtable_schema import create_table, get_tables, load_env, meta_request, table_by_name
from config import Config as C


def _link(table_id):
    return {"linkedTableId": table_id}


def run(*, dry_run=False, retire_issues=False):
    load_env()
    if not C.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")
    tables = get_tables()
    products = table_by_name(tables, C.PRODUCTS_TABLE)
    merchandise = table_by_name(tables, C.MERCHANDISE_TABLE)
    requests = table_by_name(tables, C.REQUESTS_TABLE)
    issues = table_by_name(tables, C.ISSUES_TABLE)
    if not products or not merchandise:
        raise SystemExit("Products and Merchandise tables are required.")
    request_result = "reused"
    if not requests:
        request_result = "would_create" if dry_run else "created"
        if not dry_run:
            create_table({
                "name": C.REQUESTS_TABLE,
                "fields": [
                    {"name": C.F_REQUEST_NAME, "type": "singleLineText"},
                    {"name": C.F_REQUEST_PRODUCT, "type": "multipleRecordLinks", "options": _link(products["id"])},
                    {"name": C.F_REQUEST_STATUS, "type": "singleSelect", "options": {
                        "choices": [{"name": value} for value in C.REQUEST_STATUS_OPTIONS],
                    }},
                    {"name": C.F_REQUEST_MERCHANDISE, "type": "multipleRecordLinks", "options": _link(merchandise["id"])},
                    {"name": C.F_REQUEST_NEEDED_BY, "type": "date", "options": {"dateFormat": {"name": "iso"}}},
                    {"name": C.F_REQUEST_NOTES, "type": "multilineText"},
                ],
            })
    issue_records = []
    if issues:
        issue_records = airtable.list_records(C.ISSUES_TABLE, params={"pageSize": 100}, by_field_id=False).get("records", [])
    issue_result = "missing"
    if issues:
        if issue_records:
            issue_result = "blocked_nonempty"
        elif retire_issues:
            issue_result = "would_retire" if dry_run else "retired"
            if not dry_run:
                # Airtable's metadata API does not support deleting tables. Rename
                # the empty table so it is unmistakably outside the active model.
                meta_request("PATCH", f"/tables/{issues['id']}", {"name": "Deprecated Issues - Delete"})
        else:
            issue_result = "empty"
    return {
        "dryRun": dry_run,
        "requests": request_result,
        "issues": issue_result,
        "issueRecordCount": len(issue_records),
    }


def main():
    parser = argparse.ArgumentParser(description="Ensure Requests and optionally retire empty Issues.")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--retire-issues", action="store_true")
    args = parser.parse_args()
    print(json.dumps(run(dry_run=args.dry_run, retire_issues=args.retire_issues), indent=2))


if __name__ == "__main__":
    main()
