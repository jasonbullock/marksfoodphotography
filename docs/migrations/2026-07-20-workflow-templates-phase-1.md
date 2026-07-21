# Workflow Templates Phase 1

Date: 2026-07-20

Status: Applied

## Summary

Phase 1 adds configurable Workflow Templates and Workflow Stages for Work Orders.

This is an additive compatibility migration. It does not change the current Work board behavior, current stage labels, current stage keys, Merchandise Review V1, Merchandise Inventory, or production workflow execution.

## Airtable Changes

Created table:
- `Workflow Templates`
- Table ID: `tbl9NkpL12DOFbQmV`

Fields:
- `Name` (`fldD90wyI9AcZMbh5`)
- `Description` (`fldtzVhqqx71gmj9K`)
- `Active` (`fldD5lPpRJTqz7Ppv`)
- `Default` (`fld51feYFRLz5bV89`)
- `Version` (`fldyWyZjuNsQJAK6r`)
- `Created At` (`fldjBg4SbU1mob6r8`)
- `Updated At` (`fldMgX6Iif4zoHnGh`)

Created table:
- `Workflow Stages`
- Table ID: `tbldIcybQWtIi4Te2`

Fields:
- `Name` (`fldVINM4cm4Lqzy4c`)
- `Workflow Template` (`fldox9mBfb8ty47CA`)
- `Stage Key` (`fldRGVW433Dc0WgSt`)
- `Display Order` (`fld1h01QD2waGkFw9`)
- `Color Token` (`fldnbTOPJMPMHemeQ`)
- `Stage Type` (`fldMCzWE29SzbOK0K`)
- `Is Complete` (`fldnOOoMMd0dNZtyT`)
- `Is Terminal` (`fld0LU7oEDQIgyZgB`)
- `Active` (`fldu2Ct30jq1AwyUX`)
- `Description` (`fldYkrZqmT5OcZYmp`)

Added fields to `Work Orders` (`tbl9EkXDtQSc8CEyL`):
- `Workflow Template` (`fldpR8FZhidSNcUTv`)
- `Current Workflow Stage` (`fldnrXS7uOpJQZda1`)

Preserved field:
- `Current Stage` (`flddqh4KN4j6FflKW`)

## Seeded Default Template

Default template:
- `Merchandise Review` (`recEnCm1E05vQYPN5`)

Seeded stages:
- `Review` / `new-review` / order 10 / type `start`
- `Waiting for Information` / `waiting-information` / order 20 / type `waiting`
- `Send to THR3D` / `send-thr3d` / order 30 / type `active`
- `Waiting for Activation` / `waiting-activation` / order 40 / type `waiting`
- `Ready for Production` / `ready-production` / order 50 / type `complete`

## Application Changes

Added backend configuration constants for:
- `WORKFLOW_TEMPLATES_TABLE`
- `WORKFLOW_STAGES_TABLE`
- `F_WORKFLOW_TEMPLATE_*`
- `F_WORKFLOW_STAGE_*`
- `F_WORK_ORDER_WORKFLOW_TEMPLATE`
- `F_WORK_ORDER_CURRENT_WORKFLOW_STAGE`

Added backend workflow-template service:
- `backend/workflow_templates.py`

Added idempotent schema/seed utility:
- `backend/ensure_workflow_schema.py`

Added API routes:
- `GET /workflow-templates`
- `POST /workflow-templates`
- `GET /workflow-templates/<template_id>`
- `PATCH /workflow-templates/<template_id>`
- `POST /workflow-templates/<template_id>/duplicate`
- `POST /workflow-templates/<template_id>/stages`
- `PATCH /workflow-stages/<stage_id>`
- `POST /workflow-stages/<stage_id>/deactivate`

Added Admin UI section:
- `Admin > Workflow Templates`

## Compatibility Rules

- `Current Stage` remains the compatibility field.
- Work Order shaping prefers linked `Current Workflow Stage` when present.
- Work Order shaping falls back to legacy `Current Stage` when no linked stage exists.
- Work Order creation and updates continue writing `Current Stage`.
- Work Order creation and updates write linked Workflow Template / Workflow Stage when the default template can be resolved.
- Existing Work Order and Workstream Assignment compatibility routes remain.

## Validation

Commands run:
- `backend/.venv/bin/python backend/ensure_workflow_schema.py`
- `backend/.venv/bin/python -m unittest tests.test_workflow_templates tests.test_job_item_schema tests.test_frontend_routing`
- `npm run build` in `frontend/`

Live Airtable metadata was re-read after migration and verified.

## Rollback Notes

This migration is additive. If rollback is required:
- Stop writing `Workflow Template` and `Current Workflow Stage` in application code.
- Leave the new tables/fields in place until all records are confirmed safe.
- Continue using legacy `Current Stage`, which was not removed or renamed.
