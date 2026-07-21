# Work Orders Rename

Date: 2026-07-20

Status: Applied

## Summary

The experimental V2 workflow terminology was renamed from `Workstream Assignment` to `Work Order`.

This is an in-place Airtable rename and application terminology migration. It does not duplicate Merchandise, Products, Workstreams, Jobs, or existing workflow records.

## Airtable Changes

Renamed table:
- `Workstream Assignments` -> `Work Orders`
- Table ID preserved: `tbl9EkXDtQSc8CEyL`

Renamed fields on `Work Orders`:
- `Assignment` -> `Work Order`
  - Field ID preserved: `fldAiYGCELRCY3bYh`
- `Current Gate` -> `Current Stage`
  - Field ID preserved: `flddqh4KN4j6FflKW`

Renamed reciprocal linked fields:
- Merchandise `Work Orders`
  - Field ID: `fldkhfsFwylhVxLOc`
  - Linked table: `tbl9EkXDtQSc8CEyL`
- Workstreams `Work Orders`
  - Field ID: `fldELg7iuoGAiCIe9`
  - Linked table: `tbl9EkXDtQSc8CEyL`
- Jobs `Work Orders`
  - Field ID: `fldBhvmbf2p3sW4Wk`
  - Linked table: `tbl9EkXDtQSc8CEyL`

Other Work Order fields were preserved:
- Merchandise: `fldje0NoNebA9zHVf`
- Workstream: `fldHLYhZXX9MNjfvk`
- Workflow: `fldnZNwo9RMIMfC5Z`
- Current Owner: `fld1cfIw0Jg28Tp0Q`
- Current Status: `fldInFCsH1wcdBgAU`
- Job: `flddvL8335j3SYHbJ`
- Readiness Metadata: `fldeSzyg3rpu5ID3U`
- Blocking Requirements: `fldBCThYsfPbVhXFg`
- Created At: `fldcPYmVL4XVVL5mF`
- Completed At: `fld3Jxwu0SsMm5yFc`

## Application Changes

Canonical backend configuration now uses:
- `AIRTABLE_WORK_ORDERS_TABLE=Work Orders`
- `Config.WORK_ORDERS_TABLE`
- `F_WORK_ORDER_*` field constants

One-cycle compatibility aliases remain:
- `AIRTABLE_WORKSTREAM_ASSIGNMENTS_TABLE`
- `Config.WORKSTREAM_ASSIGNMENTS_TABLE`
- `F_WORKSTREAM_ASSIGNMENT_*`
- `GET /merchandise/review/workstream-assignments`
- `POST /merchandise/review/<entry_id>/workstream-assignments`
- `PATCH /workstream-assignments/<work_order_id>`

Canonical endpoints are:
- `GET /work-orders`
- `GET /merchandise/review/work-orders`
- `POST /merchandise/review/<entry_id>/work-orders`
- `PATCH /work-orders/<work_order_id>`

The backend accepts `currentStage` and the deprecated `currentGate` payload key, but writes Airtable `Current Stage`.

## Navigation Changes

The experimental workflow workspace is now `Work`.

Canonical route:
- `/work`

Compatibility route:
- `/merchandise-review-v2` redirects to `/work`

V1 Merchandise Review:
- `/merchandise/review` remains routable but hidden from primary navigation.

Primary navigation:
- Dashboard
- Imports
- Receiving
- Merchandise
- Work
- Products
- Jobs

Admin remains a right-side utility navigation item.

## Deprecated Field Audit

Deprecated Airtable photo attachment fields from the R2-only migration still physically exist in the live base. They were not deleted during this migration because this task did not change image storage and destructive field deletion remains unsafe through the current Airtable API workflow.

Known deprecated attachment fields:
- Products `Deprecated Airtable Photos - Do Not Use`: `fld518nperBoHn9yG`
- Shipments `Deprecated Airtable Photos - Do Not Use`: `fldlDpgrtKRTpBWla`
- Issues `Deprecated Airtable Photos - Do Not Use`: `fldBqWeFeXoFPo2Ws`
- Merchandise `Deprecated Airtable Photos - Do Not Use`: `fldtTr7eNQrT6iVrS`

These fields are expected to remain empty and protected by backend write guards until a separate explicit cleanup task deletes them.

## Rollback

If rollback is needed:
- Rename `Work Orders` back to `Workstream Assignments`.
- Rename `Work Order` back to `Assignment`.
- Rename `Current Stage` back to `Current Gate`.
- Rename reciprocal linked fields on Merchandise, Workstreams, and Jobs back to `Workstream Assignments`.
- Set `AIRTABLE_WORKSTREAM_ASSIGNMENTS_TABLE=Workstream Assignments` if using the deprecated environment alias during rollback.
- Route users away from `/work` or temporarily redirect it back to the previous experimental route.

Do not delete Work Order records during rollback unless a separate data-retention decision is made.

## Validation

- Airtable Metadata API confirmed table ID `tbl9EkXDtQSc8CEyL` was preserved after rename.
- Airtable Metadata API confirmed reciprocal linked fields still point to `tbl9EkXDtQSc8CEyL`.
- `backend/.venv/bin/python -m unittest discover -s tests`
- `python3 -m unittest tests/test_frontend_routing.py`
- `backend/.venv/bin/python -m unittest tests/test_job_item_schema.py`
- `npm run build` in `frontend/`
