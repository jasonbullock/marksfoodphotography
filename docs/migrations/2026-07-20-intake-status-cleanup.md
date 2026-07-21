# Intake Status Cleanup

Date: 2026-07-20

## Purpose

Replace the temporary `[Waiting for Product Data]` Notes marker with a durable Merchandise-owned Intake Status field.

This is a cleanup step before Production Readiness and Release to Production. It does not add readiness gates, client-specific requirements, release behavior, workflow transitions, or new workflow configuration.

## Field Decision

The live Merchandise schema was inspected before migration.

`Merch Status` exists as a single-select field with:
- `Received`
- `Matched`
- `Validated`
- `Issue`

`Merch Status` was not reused for canonical Intake Status because it already supports inventory and review compatibility behavior. Reusing it would mix PM Intake state with broader operational status values.

A new Merchandise single-select field was created:

- Field: `Intake Status`
- Field ID: `fldPjABnLlNhZlmwY`

Allowed values are exactly:
- `Needs Review`
- `Waiting on Information`
- `Ready to Release`
- `Closed`

## Board Mapping

The Intake board preserves its existing visual and functional behavior while using durable Merchandise fields:

- Review: `Intake Status = Needs Review`, or active Merchandise not otherwise routed to a special derived column.
- Waiting for Information: `Intake Status = Waiting on Information`.
- Send to THR3D: `Production Type = THR3D`.
- Waiting for Activation: existing matched Merchandise condition.
- Ready for Production: `Intake Status = Ready to Release`.

Send to THR3D and Waiting for Activation did not become additional Intake Status values. They remain derived views from existing business fields.

Missing readiness requirements do not automatically route Merchandise to Waiting for Information. New Merchandise stays in Review/Needs Review until a PM explicitly marks it Waiting for Information.

## Notes Marker Migration

The migration utility detects the exact marker:

```text
[Waiting for Product Data]
```

When present, it:
- sets `Intake Status = Waiting on Information`
- removes only that exact marker string from Notes
- preserves all other note content
- does not strip unrelated bracketed text or normal user notes

The live migration found no records with the exact marker, so no Notes cleanup was performed.

## Historical Safeguards

The migration does not reopen records that are already closed, disposed, returned, shipped, removed, or otherwise historical based on current Merchandise status or Merchandise Resolution.

Existing valid `Intake Status` values are never overwritten.

Active records with no explicit Intake Status and no marker default safely:
- `Merch Status = Validated` defaults to `Ready to Release`
- other active Merchandise defaults to `Needs Review`

## Utility

The idempotent utility is:

```bash
backend/.venv/bin/python backend/ensure_intake_status_field.py --dry-run
backend/.venv/bin/python backend/ensure_intake_status_field.py
```

It reports:
- records scanned
- records migrated from marker
- records defaulted
- records skipped
- notes cleaned
- errors

## Live Run Results

Dry run:
- planned to create `Intake Status`
- scanned 5 records
- planned 5 safe defaults
- planned 0 marker migrations
- planned 0 Notes cleanups

First live run:
- created `Intake Status` with field ID `fldPjABnLlNhZlmwY`
- scanned 5 records
- defaulted 5 active records
- migrated 0 marker records
- cleaned 0 Notes fields
- reported 0 errors

Second live run:
- schema unchanged
- scanned 5 records
- skipped 5 records
- updated 0 records
- reported 0 errors

Live metadata read-back confirmed the exact four allowed options.

## Compatibility Behavior

Merchandise serialization now exposes:
- `intake_status`
- `intakeStatus`

`PATCH /api/merchandise/<entry_id>/intake-state` and `/api/merchandise/review/<entry_id>/intake-state` write `Intake Status`.

The legacy Merchandise Review V1 "Waiting for Product Data" label remains a compatibility label, now derived from `Intake Status = Waiting on Information`.

Existing Work Orders, Workflow Templates, Workflow Stages, Work Order Types, and Workstreams were not deleted, modified, or re-exposed in Admin.

## Deferred

The following remain intentionally unimplemented:
- Production Readiness rules
- Release to Production
- client-specific requirements
- artwork gates
- job number gates
- activation gates
- workflow transitions
- production planning
- new configuration tables
