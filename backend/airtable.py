from urllib.parse import quote

import requests

from config import Config


class AirtableClient:
    def __init__(self):
        self.api_key = Config.AIRTABLE_API_KEY
        self.base_id = Config.AIRTABLE_BASE_ID
        self.base_url = f"https://api.airtable.com/v0/{self.base_id}" if self.base_id else ""

    @property
    def is_configured(self):
        return Config.airtable_ready()

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _table_url(self, table_name):
        return f"{self.base_url}/{quote(table_name, safe='')}"

    def _request(self, method, table_name, **kwargs):
        if not self.is_configured:
            return {
                "configured": False,
                "records": [],
                "message": "Airtable is not configured. Add AIRTABLE_API_KEY and AIRTABLE_BASE_ID to .env.",
            }

        response = requests.request(
            method,
            self._table_url(table_name),
            headers=self._headers(),
            timeout=20,
            **kwargs,
        )
        response.raise_for_status()
        payload = response.json()
        payload["configured"] = True
        return payload

    def _field_id_params(self, params=None):
        merged = dict(params or {})
        merged.setdefault("returnFieldsByFieldId", "true")
        return merged

    def list_records(self, table_name, params=None, by_field_id=True):
        params = self._field_id_params(params) if by_field_id else dict(params or {})
        return self._request("GET", table_name, params=params)

    def create_record(self, table_name, fields, by_field_id=True):
        params = self._field_id_params() if by_field_id else {}
        return self._request(
            "POST",
            table_name,
            params=params,
            json={"fields": fields},
        )

    def update_record(self, table_name, record_id, fields, by_field_id=True):
        params = self._field_id_params() if by_field_id else {}
        return self._request(
            "PATCH",
            f"{table_name}/{record_id}",
            params=params,
            json={"fields": fields},
        )


airtable = AirtableClient()
