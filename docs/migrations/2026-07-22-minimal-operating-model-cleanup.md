# 2026-07-22 Minimal Operating Model Cleanup

This pass tightens Marks Photo around the Merchandise-driven model after the legacy workflow-table cleanup.

## Final Status Model

Persisted Intake Status lives on Merchandise:

- `Needs Review`
- `Waiting on Information`
- `Ready to Release`
- `Complete`

Planning Queue is PM-owned board placement, not an Airtable workflow status:

- `New`
- `Planning`
- `Waiting`
- `Ready for Photo`

Production state should come from Creative Force or a future intentionally scoped production sync. Product `Status` is not an active production-state source.

Physical movement and physical state stay with Shipments, Merchandise storage/location, and Merchandise status. They are not duplicated into Product fields.

## Final Routing Model

Planning routing is derived from:

- Merchandise `Deliverables`
- Merchandise `Intake Status`
- Merchandise verification fields
- derived Required to Shoot blockers
- release fields: `Released`, `Released At`, `Released By`

`Thr3d` is a Deliverable. Shipments `THR3D / Outgoing` reads Merchandise records where:

- `Deliverables` includes `Thr3d`
- `Intake Status` is `Ready to Release`
- `Released` is false
- Merchandise is still physically present

Photo production routes through `Ready for Photo` when Required to Shoot is complete. Required to Shoot remains derived, not a public Readiness field.

## Product Field Decisions

Keep in Products:

- `Product Name` (`fld96N7hMpncFfXhJ`)
- `Client` (`fldEO5eq2KZXF0lvJ`)
- `Job` (`fldTkQ5R14otWYKfb`)
- `Identifier Type` (`fld1ZqlcmXfTmitIj`)
- `Identifier` (`fld4V648DORD6hWee`)
- `Product or File Name` (`fldtaJEzWpmAN02sk`)
- `Product Job Number` (`fldKETVOMVg2D1K3q`)
- `Description` (`fldL8mH6x9F9KS0B6`)
- `Master or Variant` (`fldv3ZlY830B3TKDl`)
- `Pickup Job Number` (`fldOgmOAS9bMuFMON`)
- `Brand` (`fldjXorVmESIHhTRv`)
- `Category` (`fldHBntQSh15V88MD`)
- `Artwork Received` (`fldzb4TFbuvDPKgdn`)
- `Reference Data` (`fldabPgphzAXQATgG`)
- `CF Product Name` (`fldP1IraFC316G2Z6`) pending Creative Force/reporting review
- `CF Category` (`fldj7Vp72PVoVxzGJ`) pending Creative Force/reporting review
- `Merchandise` (`fldCI6lq7AKn3ToP7`) as the reverse link from Merchandise Product
- `History` (`fldIKTVLS6Wma8aEi`) pending audit/reporting review

Manually deleted from Products after backup and Airtable dependency check:

- `Workstream` (`fldSl0Ctmp7dWtJUO`)
- `Received` (`fldBvh1XfurPzCFea`)
- `Rec Date` (`fldDiwQJjaDzqMd4Y`)
- `Condition` (`fldFAtluxtCymbMYx`)
- `Status` (`flds7t7Qf4bQibAje`)
- `Shipments` (`fldPupvhigNmnZ5h9`)
- `Issues` (`fldGGhPh80pNH4FcC`)
- `Location` (`fldH4Lvl2K0p3585y`)
- `Deprecated Airtable Photos - Do Not Use` (`fld518nperBoHn9yG`)
- `Photo Metadata` (`fldUXsdT6F6S5LZ8q`)
- `Exported` (`fldoXDI58Qz896RlU`)
- `Exported On` (`fldhIAVGRR8Z17WcW`)
- `Export Error` (`fld2SUiQEmm2P6vZP`)

Review before deleting:

- `Notes` (`fldJkPvdTZPdqWvGN`): keep only if it contains durable reference notes; otherwise move active discussion to Conversation/History.

## Code Cleanup Performed

- Renamed `frontend/src/workflowEngine.js` to `frontend/src/merchandiseRouting.js`.
- Removed active Product `Workstream`, received/storage/status/photo fields from backend shaping, Product update writes, imports, Product UI, exports, filters, Planning cards, and tests.
- Removed Product photo-copy behavior from Merchandise matching.
- Removed Product `Status`, `Received`, `Rec Date`, `Location`, and `Condition` utility writes from Product change history/demo seeding.
- Changed Intake release completion from `Closed` to `Complete`.
- Renamed backend Required to Shoot helpers away from public `readiness` naming.
- Removed dead workflow-template/work-order admin helpers, routes, tests, and CSS.
- Updated Airtable audit helper to flag obsolete Product fields for manual deletion.

## Airtable Audit

Read-only audit artifact:

- `docs/migrations/2026-07-22-minimal-operating-model-airtable-audit.json`

Live metadata on this audit listed the active tables:

- Products
- Jobs
- Clients
- Shipments
- Locations
- Users
- Issues
- History
- Imports
- Merchandise

The prior legacy workflow tables were not present in this metadata response.

No destructive Airtable writes were performed by Codex in this pass. The user later confirmed the obsolete Product fields listed above were manually deleted after backup and Airtable-side dependency review.

## Planning Terminology Cleanup

The follow-up terminology pass renamed the active Planning board contract without changing visible UX, routing rules, statuses, or Airtable schema.

Terminology map:

- `workOrder` -> `planningCard`
- `currentGate` / `gate` -> `currentQueue` / `queue`
- `validNextGates` / `blockedNextGates` -> `validNextQueues` / `blockedNextQueues`
- `gates` -> `queues`
- `initialGate` -> `initialQueue`
- `workstream` presentation -> `deliverableRoute` derived from Merchandise `Deliverables`
- `workflowForClient` / workflow registry naming -> `planningBoardForClient` / Planning board registry naming
- `workflow-*` Planning drawer CSS -> `planning-*`
- `readinessSummary` -> `requiredToShoot`

Compatibility removed:

- Active frontend Product `workstream` / `output` fallbacks were removed because Product operational fields are no longer shaped by the API after the Product cleanup.
- The active Planning card no longer carries a `workOrder` alias.

Compatibility retained:

- `/api/merchandise/:id/intake-state` still accepts request-body `currentGate` as an inbound alias for older clients. Active frontend requests continue to send `stage` with the current Planning queue id.

## Compatibility Retained

- `/receiving` and `/receipts` remain low-cost redirects to `/shipments`.
- Backend table/field constants still include some deprecated Product field names only so audit/checklist tools can identify Airtable deletion targets.
- Internal Shipment photo storage still uses some `receiving_*` names because the current storage API depends on those paths; user-facing copy remains Shipments.

## Verification

- `backend/.venv/bin/python -m unittest discover -s tests` passed, 173 tests.
- `npm run build` in `frontend/` passed with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Legacy-term search found no active frontend Planning-board `workOrder`, `currentGate`, `GATE_IDS`, `validNextGates`, `blockedNextGates`, `workflowForClient`, `workflowTemplate`, or `workflowName` references. Remaining matches are the backend inbound `currentGate` alias, Airtable audit deletion-target labels, and tests that assert deleted legacy APIs/constants stay absent.
- Planning queue search confirmed `New`, `Planning`, `Waiting`, and `Ready for Photo`.
- Intake Status search confirmed `Needs Review`, `Waiting on Information`, `Ready to Release`, and `Complete`.
- THR3D search confirmed `Thr3d` remains a Merchandise Deliverable and Shipments `THR3D / Outgoing` filter.
- Route smoke: frontend `/planning`, `/shipments`, `/merchandise`, and `/intake` returned 200 from Vite on port 5173.
- Backend route smoke on port 5057: `/api/merchandise/review`, `/api/shipments`, `/api/shipments/thr3d-outgoing`, and `/api/items` returned 401 unauthenticated, confirming the routes exist and are auth-gated.
- Read-only Airtable metadata audit passed.
