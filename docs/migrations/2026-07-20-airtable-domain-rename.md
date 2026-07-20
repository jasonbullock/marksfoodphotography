# 2026-07-20 Airtable Domain Rename Manifest

## Purpose

Align the live Airtable schema with the canonical Marks Photo domain language:

- `Items` -> `Products`
- `Receipts` -> `Shipments`
- `Receipt Entries` -> `Merchandise`

This migration is an in-place schema rename. It must preserve existing records, record IDs, table IDs, field IDs, attachments, linked relationships, views, formulas, rollups, lookups, and application behavior.

## Base

- Base ID: `appE30EGZv8OzssDx`
- Migration date: 2026-07-20
- Mutation method: Airtable Metadata API `PATCH` by table ID and field ID.
- Record mutation: none planned.
- Secrets included: none.

## Pre-Migration Table State

| Current name | Table ID | Record count | Primary field |
| --- | --- | ---: | --- |
| Items | `tblC9Tu69BEOIy6Q4` | 18 | `Item` (`fld96N7hMpncFfXhJ`) |
| Receipts | `tblnDJYWtYvgEunVM` | 2 | `Receipt` (`fldmc1GLRF7aADXQJ`) |
| Receipt Entries | `tblWALCoKwvT6Nl8A` | 3 | `Product Name` (`fldXCqOarj5rBAYyj`) |

## Proposed Table Renames

| Table ID | From | To |
| --- | --- | --- |
| `tblC9Tu69BEOIy6Q4` | Items | Products |
| `tblnDJYWtYvgEunVM` | Receipts | Shipments |
| `tblWALCoKwvT6Nl8A` | Receipt Entries | Merchandise |

## Proposed Field Renames

### Products (`tblC9Tu69BEOIy6Q4`)

| Field ID | Type | From | To | Reason |
| --- | --- | --- | --- | --- |
| `fld96N7hMpncFfXhJ` | singleLineText | Item | Product Name | Canonical Product primary name |
| `fldKETVOMVg2D1K3q` | singleLineText | Item Job Number | Product Job Number | Product reporting reference |
| `fldPupvhigNmnZ5h9` | multipleRecordLinks | Receipts | Shipments | Reciprocal logistics link |
| `fldCI6lq7AKn3ToP7` | multipleRecordLinks | Receipt Entries | Merchandise | Reciprocal Merchandise link |

### Shipments (`tblnDJYWtYvgEunVM`)

| Field ID | Type | From | To | Reason |
| --- | --- | --- | --- | --- |
| `fldmc1GLRF7aADXQJ` | singleLineText | Receipt | Shipment | Canonical Shipment primary name |
| `fld8A5fMivNJYSYEV` | multipleRecordLinks | Items | Products | Existing direct Product relationship |
| `fldC57ZWMcCljOb0L` | multipleRecordLinks | Receipt Entries | Merchandise | Shipment contains Merchandise |

### Merchandise (`tblWALCoKwvT6Nl8A`)

| Field ID | Type | From | To | Reason |
| --- | --- | --- | --- | --- |
| `fldXCqOarj5rBAYyj` | singleLineText | Product Name | Observed Package Name | Merchandise owns observed physical name |
| `fldAtWJlCrpnc9Rfb` | singleLineText | SKU / ID | Observed Identifier | Merchandise owns observed identifier |
| `fld6ytX9oRJrcnU2s` | multipleRecordLinks | Receipt | Shipment | Merchandise belongs to Shipment |
| `fldYgmRPSi11mLzos` | multipleRecordLinks | Item | Product | Merchandise links to canonical Product |
| `fld6vzQ6bCKERzNO4` | multipleRecordLinks | Location | Storage Location | Merchandise shelf/storage location |

### Supporting Tables

| Table | Table ID | Field ID | Type | From | To | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| Clients | `tblQe6Fn5yAfqM6H7` | `fldyrAm4tjUWviO3D` | multipleRecordLinks | Items | Products | Reciprocal Product link |
| Clients | `tblQe6Fn5yAfqM6H7` | `fldWld15lq7lMtWfe` | multipleRecordLinks | Receipts | Shipments | Reciprocal Shipment link |
| Jobs | `tbliPzjwAh96ZA4vS` | `fldYn5jG6sc0B9yLA` | multipleRecordLinks | Items | Products | Job links Products |
| Locations | `tbloEUCimK1st01Br` | `fldElZA0o3YcwFM2N` | multipleRecordLinks | Items | Products | Location/Product compatibility link |
| Locations | `tbloEUCimK1st01Br` | `fldEJwm27H2AUtT5E` | multipleRecordLinks | Receipts | Shipments | Location/Shipment link |
| Locations | `tbloEUCimK1st01Br` | `fldoqX20NZlHx9HXF` | multipleRecordLinks | Receipt Entries | Merchandise | Location/Merchandise link |
| Users | `tblVdKjdVTS56wBhn` | `fld1AGbRVMINWAfTr` | multipleRecordLinks | Receipts | Shipments | Receiver reciprocal link |
| Issues | `tblKdfmqPpFe9cZXN` | `fldqzXcECgj1HIIrS` | multipleRecordLinks | Item | Product | Issues currently link Products |
| History | `tbludoajTRWF5otCb` | `fld6fjhtSdeJFww6K` | multipleRecordLinks | Item | Product | History currently links Products |
| Imports | `tbll7KZWnwPWfNZrz` | `fldCJhntsd4A9izmi` | number | Items Created | Products Created | Import summary terminology |
| Imports | `tbll7KZWnwPWfNZrz` | `fldiGTEpqWsX6uJdj` | number | Items Updated | Products Updated | Import summary terminology |

## Dependencies Audited

- Table IDs and field IDs were recorded before mutation.
- Record counts were recorded before mutation.
- Metadata API showed all target fields and linked-record inverse fields.
- Metadata API showed the following calculated fields as valid before mutation:
  - Products `Identifier Type` (`fld1ZqlcmXfTmitIj`), lookup, valid.
  - Products `CF Product Name` (`fldP1IraFC316G2Z6`), formula, valid.
  - Products `CF Category` (`fldj7Vp72PVoVxzGJ`), formula, valid.
- Metadata API showed existing views:
  - Items: `Grid view` (`viwnPOOeIF0QkcqO1`), `Kanban` (`viwZTnqZnwGXXtiJI`).
  - Receipts: `Grid view` (`viw4MKQzXtlHJoG2i`).
  - Receipt Entries: `Grid view` (`viw5sna5rFv8TEOH6`).
- Webhooks endpoint `GET /v0/bases/appE30EGZv8OzssDx/webhooks` returned `{"webhooks":[]}`.
- Airtable Metadata API does not expose full Interfaces, Automations, embedded scripts, or external integrations in this environment. No repository code or environment setting references an Airtable automation/interface ID.
- Repository references to old physical names are concentrated in backend config constants, field-name constants, import mapping compatibility paths, frontend direct-Airtable constants, tests, and documentation.

## Application Configuration Changes

After the schema rename:

- Backend canonical defaults should become:
  - `PRODUCTS_TABLE = "Products"`
  - `SHIPMENTS_TABLE = "Shipments"`
  - `MERCHANDISE_TABLE = "Merchandise"`
- Legacy environment-variable aliases may remain for one rollback cycle.
- `.env.example` should show new physical table defaults.
- Tests should expect the canonical physical schema.
- Admin technical table mapping should show Products, Shipments, and Merchandise as the active physical schema.

## Verification Checklist

After mutation:

- Products table exists with table ID `tblC9Tu69BEOIy6Q4`.
- Shipments table exists with table ID `tblnDJYWtYvgEunVM`.
- Merchandise table exists with table ID `tblWALCoKwvT6Nl8A`.
- Record counts remain:
  - Products: 18
  - Shipments: 2
  - Merchandise: 3
- Renamed fields retain their field IDs.
- Linked-record fields retain linked table IDs and inverse field IDs.
- Formula/lookup fields remain valid.
- Existing views still appear in metadata.
- Webhooks remain empty unless a new webhook is intentionally created later.
- Attachments remain present on renamed Merchandise and Products photo fields.
- Backend tests pass.
- Frontend routing tests pass.
- Frontend build passes.
- `git diff --check` passes.
- Route smoke checks pass for `/shipments`, `/merchandise`, `/merchandise/review`, `/merchandise-review-v2`, `/products`, `/imports`, `/settings`, and `/clients`.

## Post-Migration Verification Results

Completed on 2026-07-20 after the in-place Airtable Metadata API rename.

- Products table exists as `Products` with table ID `tblC9Tu69BEOIy6Q4`.
- Shipments table exists as `Shipments` with table ID `tblnDJYWtYvgEunVM`.
- Merchandise table exists as `Merchandise` with table ID `tblWALCoKwvT6Nl8A`.
- Record counts returned to the pre-migration baseline after smoke-test cleanup:
  - Products: 18
  - Shipments: 2
  - Merchandise: 3
- Primary fields retain their field IDs:
  - Products `Product Name`: `fld96N7hMpncFfXhJ`
  - Shipments `Shipment`: `fldmc1GLRF7aADXQJ`
  - Merchandise `Observed Package Name`: `fldXCqOarj5rBAYyj`
- Linked-record fields retain linked table IDs and inverse field IDs for Products, Shipments, Merchandise, Jobs, Clients, Users, Locations, Issues, and History.
- Products calculated fields remain valid:
  - `Identifier Type` (`fld1ZqlcmXfTmitIj`)
  - `CF Product Name` (`fldP1IraFC316G2Z6`)
  - `CF Category` (`fldj7Vp72PVoVxzGJ`)
- Existing views remain present in metadata:
  - Products: `Grid view` (`viwnPOOeIF0QkcqO1`), `Kanban` (`viwZTnqZnwGXXtiJI`)
  - Shipments: `Grid view` (`viw4MKQzXtlHJoG2i`)
  - Merchandise: `Grid view` (`viw5sna5rFv8TEOH6`)
- Webhooks endpoint still returns `{"webhooks":[]}`.
- Attachment presence was verified on photo fields:
  - Products `Photos`: 1 record with attachments
  - Merchandise `Photos`: 3 records with attachments
- Live application smoke tests passed:
  - Created a temporary Shipment through `/api/receiving`.
  - Created temporary Merchandise through the Receiving payload.
  - Matched temporary Merchandise to an existing Product through `/api/merchandise/review/{entry_id}/match`.
  - Read `/api/merchandise`, `/api/merchandise/review`, and `/api/receiving/{record_id}` successfully.
  - Imported one temporary Product row through `/api/intake/import`.
  - Deleted the temporary Shipment, Merchandise, Product, Job, Import, and History records.
- Local frontend route smoke checks returned HTTP 200 for `/shipments`, `/merchandise`, `/merchandise/review`, `/merchandise-review-v2`, `/products`, `/imports`, `/settings`, and `/clients`.
- Automated validation passed:
  - `backend/.venv/bin/python -m unittest discover tests`
  - `python3 -m unittest tests/test_frontend_routing.py`
  - `npm run build` in `frontend/`

Remaining audit limitation:
- Airtable Metadata API access in this environment did not expose full Interfaces, Automations, embedded scripts, or external integrations. Repository code and environment settings did not reference Airtable automation/interface IDs.

## Rollback Procedure

If verification fails:

1. Stop all further schema changes.
2. Rename tables back by ID:
   - `tblC9Tu69BEOIy6Q4`: Products -> Items
   - `tblnDJYWtYvgEunVM`: Shipments -> Receipts
   - `tblWALCoKwvT6Nl8A`: Merchandise -> Receipt Entries
3. Rename fields back by field ID using the tables and fields listed above.
4. Restore backend defaults and local environment table mappings to:
   - `Items`
   - `Receipts`
   - `Receipt Entries`
5. Re-run metadata verification and automated tests.
6. Document the failed verification point and exact rollback actions in `docs/CURRENT_STATE.md`.

Rollback must use in-place renames by ID. Do not delete records, recreate tables, or copy data unless Airtable makes in-place rollback impossible.
