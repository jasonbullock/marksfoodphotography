# Workstream Assignment Foundation

Status: Superseded by `docs/migrations/2026-07-20-work-orders-rename.md`.

The table created by this migration has since been renamed in place from `Workstream Assignments` to `Work Orders`, preserving table ID `tbl9EkXDtQSc8CEyL`. This file remains as historical context for the original V2 workflow branch foundation.

Date: 2026-07-20

## Summary

Merchandise Review V2 now stores experimental workflow branching in durable Workstream Assignment records.

Merchandise remains one physical object. Workstream Assignments represent operational work branches connected to that Merchandise record.

## Schema Audit

The live Airtable base did not already contain `Workstreams` or `Workstream Assignments` tables.

The Products table has a `Workstream` single-select field:
- Table: `Products`
- Table ID: `tblC9Tu69BEOIy6Q4`
- Field ID: `fldSl0Ctmp7dWtJUO`
- Field type: `singleSelect`
- Existing values: `Photo Only`, `Render Only`, `Photo + Render`

That Product field cannot represent multiple Workstream Assignments for one Merchandise record and is retained only as a compatibility bridge for imported Product routing data.

## Airtable Changes

Added `Workstreams` table:
- Table ID: `tblnLXigd19VBMFcz`
- Fields:
  - `Name` (`fldr7d7RkBc07GtrK`)
  - `Active` (`fldhA01nzlAi86gK7`)
  - `Description` (`fldyK6ST0XdNwawlf`)
  - `Workflow Template` (`fld6tSpdvCar9zfN6`)
  - `Configuration` (`fldMv1o8xjoVjLXcL`)
  - `Workstream Assignments` reverse link (`fldELg7iuoGAiCIe9`)

Added `Workstream Assignments` table:
- Table ID: `tbl9EkXDtQSc8CEyL`
- Fields:
  - `Assignment` (`fldAiYGCELRCY3bYh`)
  - `Merchandise` (`fldje0NoNebA9zHVf`)
  - `Workstream` (`fldHLYhZXX9MNjfvk`)
  - `Workflow` (`fldnZNwo9RMIMfC5Z`)
  - `Current Gate` (`flddqh4KN4j6FflKW`)
  - `Current Owner` (`fld1cfIw0Jg28Tp0Q`)
  - `Current Status` (`fldInFCsH1wcdBgAU`)
  - `Job` (`flddvL8335j3SYHbJ`)
  - `Readiness Metadata` (`fldeSzyg3rpu5ID3U`)
  - `Blocking Requirements` (`fldBCThYsfPbVhXFg`)
  - `Created At` (`fldcPYmVL4XVVL5mF`)
  - `Completed At` (`fld3Jxwu0SsMm5yFc`)

## Seeded Workstreams

- Ecomm Photo: `receJrKONodoL97kh`
- Packaging Photo: `reck5ZjD9Flay990T`
- THR3D: `rec8ChTv3qARXrJus`

No Video, Other, Styled Photo, GS1 Ecomm, or Packaging Photography Workstream records were seeded for V2.

## Application Mapping

Backend configuration now defines:
- `WORKSTREAMS_TABLE`
- `WORKSTREAM_ASSIGNMENTS_TABLE`
- Workstream field constants
- Workstream Assignment field constants

Backend endpoints added for V2:
- `GET /workstreams`
- `GET /merchandise/review/workstream-assignments`
- `POST /merchandise/review/<entry_id>/workstream-assignments`
- `PATCH /workstream-assignments/<assignment_id>`

Frontend V2 now:
- loads configured Workstreams,
- presents a multi-select Workstreams control,
- renders assignment previews from Workflow Engine configuration,
- saves selected Workstreams as Workstream Assignment records,
- renders persisted assignment cards with Merchandise information and Workstream labels,
- updates assignment gate/status/readiness metadata when moving cards.

## Scope Preserved

This migration did not change:
- Merchandise Review V1
- Merchandise Inventory
- Receiving behavior
- Creative Force integration
- R2-only image storage
- Product linking
- existing Merchandise records
- existing Product records

## Rollback

Rollback is additive:
- Stop calling the V2 Workstream Assignment endpoints.
- Hide or disable `/merchandise-review-v2` if needed.
- Leave `Workstreams` and `Workstream Assignments` tables intact for inspection.

Do not delete Workstream Assignment records during rollback unless a separate data-retention decision is made.

## Verification

- Airtable Metadata API returned HTTP 200 for table verification after creation.
- Both tables and all expected fields listed above were present.

## Remaining Work

- Admin configuration for client-specific Workstream availability.
- Audit logging for assignment changes.
- Backend rule enforcement beyond the initial V2 assignment endpoints.
- Complete downstream Ecomm, Packaging, and THR3D workflows.
- Creative Force synchronization.
- Job creation/linking rules per Workstream.
