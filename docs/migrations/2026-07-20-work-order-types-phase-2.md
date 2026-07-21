# Work Order Types Phase 2

Date: 2026-07-20

Status: Applied

## Summary

Phase 2 adds configurable Work Order Types.

This is an additive compatibility migration. It does not redesign the Work board, rename current stages, remove compatibility fields, or expose multiple workflow experiences yet.

## Airtable Changes

Created table:
- `Work Order Types`
- Table ID: `tblteTlJWpGv21bg9`

Fields:
- `Name` (`fld2uKswV3JaqLXiB`)
- `Key` (`fldmuIP6OrmHl9XJF`)
- `Description` (`fldADdGycq8MFEga9`)
- `Workflow Template` (`fldM4LoJoJoXO63xl`)
- `Active` (`fldWD7ea8Fohwg6Ex`)
- `Is Default` (`flds481Bv3GCpC7XY`)
- `Sort Order` (`fld4ml4xKWqyFc5Z4`)
- `Icon` (`fldxY1f4gYcIyKqEc`)
- `Color` (`fldoVBe8ggEBZenQo`)
- `Default Assignee Role` (`fldUyaLC3og8YP2k8`)
- `Allow Multiple Per Merchandise` (`fldPUUTtrZHdL2925`)
- `Auto Create` (`fldvQc3nXkRcpEWHL`)
- `Created At` (`fldf02fVUlDazYUCM`)
- `Updated At` (`fldaikLgU1QqwRNSn`)

Added field to `Work Orders` (`tbl9EkXDtQSc8CEyL`):
- `Work Order Type` (`fldLSsIzX2a1lWood`)

Preserved Work Order fields:
- `Current Stage`
- `Workflow Template`
- `Current Workflow Stage`
- Workstream Assignment compatibility aliases

## Seeded Default Work Order Type

Seeded exactly one Work Order Type:
- Name: `Merchandise Review`
- Key: `merchandise-review`
- Record ID: `recZMtKK3Pw1kOAXC`
- Description: `Review incoming merchandise, resolve required information, determine routing, and prepare it for production.`
- Workflow Template: `recEnCm1E05vQYPN5`
- Active: true
- Is Default: true
- Sort Order: 10
- Icon: `clipboard-check`
- Color: blank
- Default Assignee Role: blank
- Allow Multiple Per Merchandise: false
- Auto Create: true

No Photo Shoot, Retouch, Approval, THR3D, Packaging, Ecomm, or speculative Work Order Types were seeded.

## Relationship To Workflow Templates

Workflow Template owns stages and workflow structure.

Work Order Type owns business purpose and configuration for a kind of Work Order.

Work Order remains the individual operational work instance connected to Merchandise.

## Default Resolution Logic

Effective workflow configuration resolves in this order:

1. Work Order's linked Work Order Type
2. Work Order's directly linked Workflow Template
3. Active default Work Order Type and its Workflow Template
4. Phase 1 default Workflow Template fallback
5. Legacy `Current Stage` compatibility behavior

Legacy Work Orders do not require immediate bulk migration.

## New Work Order Assignment Behavior

New Merchandise Review Work Orders receive:
- active default Work Order Type
- that type's linked Workflow Template
- the starting Workflow Stage
- legacy `Current Stage`

This preserves existing Work board behavior and response fields.

## API Routes

Added routes:
- `GET /work-order-types`
- `GET /work-order-types/<record_id>`
- `POST /work-order-types`
- `PATCH /work-order-types/<record_id>`
- `POST /work-order-types/<record_id>/duplicate`
- `POST /work-order-types/<record_id>/set-default`
- `POST /work-order-types/<record_id>/activate`
- `POST /work-order-types/<record_id>/deactivate`

Reads require the normal authenticated app session. Mutations require Admin access.

## Admin UI

Admin now includes:
- `Work Order Types`

The section supports:
- create
- edit
- duplicate
- set default
- activate
- deactivate

It displays the linked Workflow Template and concise Active / Default badges. The active default type cannot be deactivated and the UI shows an inline explanation.

## Validation And Protection

Server-side validation enforces:
- Name required
- Key required
- slug-safe lowercase keys
- unique keys
- no casual key changes when active Work Orders reference the type
- active Work Order Types must reference an active Workflow Template
- one active default Work Order Type
- default type must be active
- active default cannot be deactivated
- referenced active types cannot be deactivated
- duplicate creates inactive, non-default copy with unique key
- Sort Order numeric

Hard deletion is not implemented.

## Future-Flexibility Fields

The following fields exist for future configuration but are not yet used by the Work board:
- Icon
- Color
- Default Assignee Role
- Allow Multiple Per Merchandise
- Auto Create

## What Phase 2 Does Not Change

Phase 2 does not change:
- Work board columns
- stage labels
- stage order
- filters
- card layout
- board routing
- transition behavior
- Merchandise Review V1
- Merchandise Inventory
- Receiving
- Creative Force synchronization
- backend workflow automation
- Client Defaults

## Validation

Commands run:
- `backend/.venv/bin/python backend/ensure_work_order_types_schema.py`
- `backend/.venv/bin/python backend/ensure_work_order_types_schema.py`
- `backend/.venv/bin/python -m unittest tests.test_work_order_types tests.test_workflow_templates tests.test_job_item_schema tests.test_frontend_routing tests.test_merchandise_review`
- `npm run build` in `frontend/`

Live Airtable metadata and `Work Order Types` records were verified after migration.

## Recommended Phase 3

Evaluate either configurable Work Order creation rules or configurable workflow transitions/actions. Do not add Phase 3 behavior until the workflow operating model is approved.

## Rollback Notes

This migration is additive. If rollback is required:
- Stop writing `Work Order Type` in application code.
- Leave `Work Order Types` and the Work Order link field in place until records are confirmed safe.
- Existing `Current Stage`, `Workflow Template`, and `Current Workflow Stage` compatibility fields remain usable.
