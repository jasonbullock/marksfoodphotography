# Release To Production

Date: 2026-07-20

## Purpose

Implement baseline Production Readiness and the single Release to Production handoff.

This phase reinforces Marks Photo as an Operations Readiness Platform. Release answers one PM question:

> Is this merchandise production ready?

It does not implement Production, scheduling, resources, approvals, workflow transitions, Work Orders, or Creative Force records.

## Readiness Rules

Baseline readiness is universal and not configurable.

Merchandise is ready when:
- Product is linked
- Product Name exists
- Product Identifier exists
- Production Type exists
- Merchandise Resolution exists

The primary identifier uses the existing canonical Product `Identifier` field.

This phase intentionally does not require:
- artwork
- activation information
- job numbers
- client-specific fields
- approval state

Those may become future client-specific readiness rules only after real operating variation requires them.

## Release Fields

The live Merchandise schema did not contain release fields before this phase.

The idempotent utility `backend/ensure_release_to_production_fields.py` created:

- `Released` (`fldkoRrdLxg9kpcST`) checkbox
- `Released At` (`fldiJsIx7TmAHee0r`) single-line timestamp
- `Released By` (`fldXcJ4bnd6YEhrKL`) linked Users field

`Released` was not added to `Intake Status` because `Intake Status` is intentionally limited to:
- `Needs Review`
- `Waiting on Information`
- `Ready to Release`
- `Closed`

Release sets `Intake Status = Closed` and stores ownership transfer through the dedicated release fields.

## Backend Behavior

Added:

```text
POST /api/merchandise/<entry_id>/release
POST /api/merchandise/review/<entry_id>/release
```

The endpoint:
- validates readiness server-side
- returns exact missing requirements when release is blocked
- writes `Released`, `Released At`, `Released By`, and `Intake Status = Closed`
- returns updated Merchandise
- is idempotent for already released Merchandise
- preserves original release audit values on duplicate release calls

## Intake Behavior

The Intake UI now shows a real readiness panel instead of the placeholder.

If incomplete, it shows only missing baseline requirements and disables Release to Production with helper text.

If complete, it shows a green success state and enables Release to Production.

After release, the Intake data refreshes and the released item leaves the active Intake queue.

## Inventory Behavior

Released merchandise remains visible in Inventory.

Inventory is a warehouse perspective over physical goods. Release changes operational ownership from PM Intake to Production; it does not imply the item has physically left the studio.

## What Did Not Change

This phase did not:
- create Work Orders
- create Production records
- create Release records
- create History records
- create configuration tables
- build scheduling
- build resources
- build a Production Kanban
- build approval workflows
- build workflow transitions
- create Creative Force records
- implement client-specific readiness rules

## Utility Run Results

Dry run:
- planned `Released`
- planned `Released At`
- planned `Released By`

First live run:
- created `Released`
- created `Released At`
- created `Released By`

Second live run:
- all three fields unchanged
- no additional schema changes

Live metadata read-back confirmed field IDs and types.

## Validation

Validation included:
- focused release tests
- Intake compatibility tests
- Merchandise Review tests
- Merchandise Inventory tests
- Receiving tests
- frontend routing/source assertions
- preserved workflow compatibility tests
- full backend unittest discovery
- frontend production build
- `git diff --check`
- local frontend route smoke for `/intake` and `/merchandise`
