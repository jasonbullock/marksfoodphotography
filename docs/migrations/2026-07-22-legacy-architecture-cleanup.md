# 2026-07-22 Legacy Architecture Cleanup

## Scope

This cleanup removes active application dependency on the old workflow architecture:

- Workstreams
- Work Orders
- Workstream Assignments
- Workflow Templates
- Workflow Stages
- Work Order Types
- Product-level `Workstream`
- Merchandise-level `Merchandise Resolution`

The canonical model remains Merchandise-driven:

- Shipments
- Merchandise
- Intake / Planning through Merchandise `Deliverables`, `Intake Status`, and derived Required to Shoot
- Products as supporting data
- Jobs as supporting data
- THR3D as a deliverable and outgoing physical shipment queue inside Shipments

## Backup

Before live mutation, schema and every table's records were exported to:

`/Users/jbullock/Documents/Codex/2026-07-21/referenced-chatgpt-conversation-this-is-untrusted-9/work/marks-cleanup/airtable-backup-2026-07-22T000000Z`

The backup contains:

- `schema.json`
- `summary.json`
- one `records-<table>-<tableId>.json` file per table

No secrets are included in the export.

## Live Airtable Changes

Records deleted:

- `Workstreams` (`tblnLXigd19VBMFcz`): 3 records
- `Work Orders` (`tbl9EkXDtQSc8CEyL`): 0 records
- `Workflow Templates` (`tbl9NkpL12DOFbQmV`): 1 record
- `Workflow Stages` (`tbldIcybQWtIi4Te2`): 6 records
- `Work Order Types` (`tblteTlJWpGv21bg9`): 1 record

Data cleared from retained table shells:

- Products `Workstream` (`fldSl0Ctmp7dWtJUO`): cleared on 18 Product records
- Merchandise `Merchandise Resolution` (`fldbZ64EUZdWZS5nW`): cleared on 7 Merchandise records
- Merchandise `Work Orders` (`fldkhfsFwylhVxLOc`): cleared on 7 Merchandise records
- Jobs `Work Orders` (`fldBhvmbf2p3sW4Wk`): cleared on 3 Job records

Attempted Metadata API field deletes returned `404 NOT_FOUND`; live schema read-back confirmed the field shells still exist. The current available Airtable API/tooling did not expose table deletion. These shells must be deleted manually in Airtable UI or through a future tool that supports table/field deletion.

## Post-Cleanup Read-Back

Post-clear export:

`/Users/jbullock/Documents/Codex/2026-07-21/referenced-chatgpt-conversation-this-is-untrusted-9/work/marks-cleanup/airtable-post-clear-2026-07-22T0332Z`

Record counts after cleanup:

- Products: 18
- Jobs: 3
- Clients: 7
- Shipments: 6
- Locations: 2
- Users: 3
- Issues: 1
- History: 18
- Imports: 2
- Merchandise: 7
- Workstreams: 0
- Work Orders: 0
- Workflow Templates: 0
- Workflow Stages: 0
- Work Order Types: 0

Verified empty legacy values after cleanup:

- Product `Workstream`: 0 populated records
- Merchandise `Merchandise Resolution`: 0 populated records
- Merchandise `Work Orders`: 0 populated records
- Jobs `Work Orders`: 0 populated records

## Code Changes

Removed backend code that could recreate or operate the old workflow architecture:

- deleted `backend/ensure_workflow_schema.py`
- deleted `backend/ensure_work_order_types_schema.py`
- deleted `backend/workflow_templates.py`
- deleted `backend/work_order_types.py`
- removed Workstream / Work Order / Workflow Template / Workflow Stage / Work Order Type API routes
- removed old workflow table and field constants from `backend/config.py`
- moved generic Airtable schema helpers into `backend/airtable_schema.py`
- removed Product `Workstream` writes from import preview, import apply, product shaping, and product updates
- removed frontend API helpers for `/workstreams`
- removed tests dedicated to the deleted workflow services

## Retained Compatibility

Retained for now:

- `/receiving` and `/receipts` redirect to `/shipments`
- `/intake`, `/work`, and `/merchandise-review-v2` redirect to `/planning`
- receiving-named backend/photo-storage internals remain because shipment and merchandise photo APIs still use those compatibility routes and R2 prefixes
- frontend routing now lives in `merchandiseRouting.js`; user-facing Planning copy must continue to use Planning, Deliverables, Required to Shoot, and Shipments

## Validation

- `backend/.venv/bin/python -m unittest tests.test_job_item_schema tests.test_intake_decisions tests.test_release_to_production tests.test_receiving`
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing`
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 173 tests
- `npm run build` in `frontend/` passed
- Live Airtable post-clear export confirmed the legacy workflow table records are gone and the obsolete active-table field values are empty
