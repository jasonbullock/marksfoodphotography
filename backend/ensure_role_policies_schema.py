#!/usr/bin/env python3
"""Ensure and seed the shared role-policy table."""

import json

from airtable import airtable
from airtable_schema import create_table, get_tables, load_env, table_by_name
from config import Config
from routes import ROLE_POLICY_DEFAULTS


def ensure_role_policies_schema(*, dry_run=False):
    load_env()
    if not Config.airtable_ready():
        raise SystemExit("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.")
    table = table_by_name(get_tables(), Config.ROLE_POLICIES_TABLE)
    if not table:
        if dry_run:
            return {"table": Config.ROLE_POLICIES_TABLE, "result": "would_create"}
        table = create_table({
            "name": Config.ROLE_POLICIES_TABLE,
            "fields": [
                {"name": Config.F_ROLE_POLICY_ROLE, "type": "singleLineText"},
                {"name": Config.F_ROLE_POLICY_PATHS, "type": "multilineText"},
            ],
        })
    existing = airtable.list_records(Config.ROLE_POLICIES_TABLE, by_field_id=False).get("records", [])
    existing_roles = {record.get("fields", {}).get(Config.F_ROLE_POLICY_ROLE) for record in existing}
    seeded = []
    if not dry_run:
        for role, paths in ROLE_POLICY_DEFAULTS.items():
            if role not in existing_roles:
                airtable.create_record(Config.ROLE_POLICIES_TABLE, {
                    Config.F_ROLE_POLICY_ROLE: role,
                    Config.F_ROLE_POLICY_PATHS: json.dumps(paths),
                }, by_field_id=False)
                seeded.append(role)
    return {"table": Config.ROLE_POLICIES_TABLE, "result": "ready", "seeded": seeded}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    print(json.dumps(ensure_role_policies_schema(dry_run=args.dry_run), indent=2))
