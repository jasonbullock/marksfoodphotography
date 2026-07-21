# Intake Production Type And Merchandise Resolution

Date: 2026-07-20

## Purpose

This migration adds the first real Intake decision fields to Merchandise.

Intake asks:

> What still needs to happen before this can be produced?

The first two PM decisions are:
- What kind of production is required?
- What should happen to the physical merchandise?

## Fields

The implementation uses fields on the existing `Merchandise` table.

No configuration tables were created.

### Production Type

Field:
- `Production Type`

Type:
- Single select

Allowed values:
- `eCommerce`
- `Packaging`
- `THR3D`

### Merchandise Resolution

Field:
- `Merchandise Resolution`

Type:
- Single select

Allowed values:
- `Keep at Walnut`
- `Ship to Kentucky`
- `Hold`
- `Replacement Requested`
- `Return to Client`
- `Dispose`

## Live Airtable Result

The idempotent utility created both fields on the first live run:

- `Production Type`: `fldSwUluDDqwe6MVs`
- `Merchandise Resolution`: `fldbZ64EUZdWZS5nW`

The second live run reused both fields and created nothing.

## Utility

Utility:

```bash
backend/.venv/bin/python backend/ensure_intake_decision_fields.py
```

Behavior:
- Inspects the live Airtable schema.
- Reuses existing equivalent fields when present.
- Creates missing fields safely.
- Verifies the required single-select options.
- Exits if an existing field has the right name but the wrong type or incomplete options.
- Prints a JSON report of created and reused fields.

## Backend Behavior

Merchandise serialization now includes:
- `production_type`
- `productionType`
- `merchandise_resolution`
- `merchandiseResolution`

The Intake decision endpoint is:

```text
PATCH /api/merchandise/<entry_id>/intake-decisions
PATCH /api/merchandise/review/<entry_id>/intake-decisions
```

Validation:
- Empty values are allowed.
- Unknown Production Type values are rejected.
- Unknown Merchandise Resolution values are rejected.
- Existing Merchandise response fields remain compatible.

## THR3D Default

When `Production Type` is set to `THR3D`, the backend defaults `Merchandise Resolution` to `Ship to Kentucky` only when the existing Merchandise Resolution is blank.

The default does not overwrite an existing resolution.

Changing Production Type away from `THR3D` does not erase or change Merchandise Resolution.

## Intake UI

The Intake detail experience now shows editable selects:
- `Production Type`
- `Merchandise Resolution`

The previous non-persisted placeholder rows were removed from the primary Intake decision surfaces.

The New Items modal maps the selected Production Type to the existing internal Work Order workstream selection:
- `eCommerce` -> `ecomm-photo`
- `Packaging` -> `packaging-photo`
- `THR3D` -> `thr3d`

This preserves existing Work Order creation behavior while avoiding two visible PM-facing controls that appear to mean the same thing.

## Compatibility Decisions

The Product `Workstream` field was not reused because it is Product-level import/routing compatibility data with legacy values, not the Merchandise-level PM Intake decision.

The existing Workstreams table, Work Orders table, Workflow Templates, Workflow Stages, and Work Order Types remain unchanged.

Backend Work Order API routes remain unchanged.

## Intentionally Unimplemented

This migration does not implement:
- readiness rules
- readiness scores
- Release to Production
- client-specific Production Type options
- client-specific Merchandise Resolution options
- replacement records
- replacement chains
- workflow transitions
- workflow actions
- production scheduling
- Creative Force handoff behavior

`Replacement Requested` is only a Merchandise Resolution value in this phase.

## Why Fields Instead Of Tables

The initial option sets are small, shared, and do not yet have independent lifecycle, ownership, permissions, or client-specific behavior.

Fields on Merchandise keep the implementation simple and match the documented principle to prefer fields over tables until configuration is earned.
