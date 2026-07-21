# Output To Workstream Airtable Rename

Date: 2026-07-20

Status: Superseded for Merchandise Review V2 workflow state by `docs/migrations/2026-07-20-workstream-assignments.md`.

## Summary

The Products single-select field formerly named `Output Type` was renamed in place to `Workstream`.

This migration supports the domain-language refactor that makes Workstream the first-class Workflow Engine routing concept.

## Airtable Change

- Base: `appE30EGZv8OzssDx`
- Table: `Products`
- Table ID: `tblC9Tu69BEOIy6Q4`
- Field ID: `fldSl0Ctmp7dWtJUO`
- Previous field name: `Output Type`
- New field name: `Workstream`
- Field type: `singleSelect`

The field ID was preserved. Existing record values and choice IDs were preserved.

Existing choices at migration time:
- `Photo Only`
- `Render Only`
- `Photo + Render`

## Application Mapping

- Backend configuration now defines `F_ITEM_WORKSTREAM = "Workstream"`.
- `F_ITEM_OUTPUT` remains a compatibility alias to the same Airtable field.
- Product payloads expose `workstream` while preserving the legacy `output` alias during the compatibility period.
- Merchandise Review V2 initially used a frontend Workstream registry for experimental Primary Workstream decisions.
- Merchandise Review V2 now uses durable Workstream Assignment records for workflow state.

## Workstream Registry

The current Merchandise Review V2 Workstream registry is:
- Ecomm Photo
- Packaging Photo
- THR3D

Legacy labels and Photo/Render values may remain as compatibility aliases during migration, but they are not seeded as active V2 Workstreams.

## Deferred Work

The migration does not implement:
- Full downstream Ecomm, Packaging, and THR3D workflows
- Multiple production paths
- Deliverable modeling
- Creative Force routing changes

Deliverables such as GS1 bundles, hero images, packaging images, marketing assets, and 3D deliverables remain downstream production concepts.

## Caveat

An Airtable Metadata API attempt to extend the existing single-select choices with the new Workstream values returned HTTP 422 parameter validation errors. The field rename itself succeeded and was verified. Existing choices remain available so existing records and imports are safely preserved.

## Verification

- Metadata API returned HTTP 200 for the in-place field rename.
- Metadata after the rename showed field `fldSl0Ctmp7dWtJUO` named `Workstream`.
- Existing single-select choices remained present.
