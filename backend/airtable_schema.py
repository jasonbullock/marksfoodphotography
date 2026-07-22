import os
from pathlib import Path

import requests

from config import Config


CHECKBOX_OPTIONS = {"icon": "check", "color": "greenBright"}


def load_env():
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def headers():
    return {
        "Authorization": f"Bearer {Config.AIRTABLE_API_KEY}",
        "Content-Type": "application/json",
    }


def meta_request(method, path, body=None):
    url = f"https://api.airtable.com/v0/meta/bases/{Config.AIRTABLE_BASE_ID}{path}"
    response = requests.request(method, url, headers=headers(), json=body, timeout=30)
    response.raise_for_status()
    return response.json()


def get_tables():
    return meta_request("GET", "/tables").get("tables", [])


def table_by_name(tables, name):
    return next((table for table in tables if table.get("name") == name), None)


def field_by_name(table, name):
    return next((field for field in table.get("fields", []) if field.get("name") == name), None)


def create_field(table_id, field):
    return meta_request("POST", f"/tables/{table_id}/fields", field)
