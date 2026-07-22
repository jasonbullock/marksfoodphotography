# Current State

Marks Photo is an Operations Readiness Platform centered on Merchandise.

The app transforms incoming physical merchandise into production-ready work. It should not become a workflow engine, project management tool, Creative Force replacement, or PhotoTrack replacement.

## Canonical Architecture

Active business concepts:

- Shipments: physical merchandise entering or leaving the studio
- Merchandise: the physical sample and operational center
- Planning: PM-owned preparation through Merchandise Verification
- Products: supporting reference and reporting data only
- Jobs: supporting production/reporting references
- THR3D: a Merchandise `Deliverables` value and an outgoing shipment queue inside Shipments

Active Airtable tables:

- Products
- Jobs
- Clients
- Shipments
- Locations
- Users
- Issues
- Imports
- Merchandise
- Comments

History remains present as existing audit data, but it is not a workflow engine.

## Planning

Planning is Merchandise-driven.

Canonical Intake and Planning fields:

- Merchandise `Deliverables`
- Merchandise `Intake Status`
- Merchandise verification fields
- derived Required to Shoot blockers
- release fields: `Released`, `Released At`, `Released By`

Canonical Intake Status values:

- `Needs Review`
- `Waiting on Information`
- `Ready to Release`
- `Complete`

Planning queue columns are local PM organization, not a second Airtable status:

- `New`
- `Planning`
- `Waiting`
- `Ready for Photo`

The Merchandise Verification wizard is:

1. Verify Merchandise
2. Identify Product
3. Choose Deliverables
4. Complete Required Information
5. Finish

The wizard uses business-language outcomes:

- incomplete verification routes to Waiting for Information
- photo deliverables route toward Ready for Photo when Required to Shoot is complete
- `Thr3d`-only routes to Shipments `THR3D / Outgoing` when the minimal intake basics are complete, Intake is finished, and the sample is physically present

THR3D-only Merchandise does not require Product linkage, Product verification, artwork, Required to Shoot photo fields, Ecomm Photo fields, Packaging Photo fields, or photo-production gates. Its required basics are:

- Client
- at least one merchandise photo
- Quantity
- `Deliverables` containing `Thr3d`

Mixed photo + Thr3d Merchandise keeps the full photo verification path. Because Marks Photo does not yet have a reliable production-complete signal from Creative Force or PhotoTrack, mixed photo + Thr3d records are intentionally excluded from Shipments `THR3D / Outgoing` rather than appearing before photo work is complete.

Planning must not create or require Workstreams, Work Orders, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, Product-level production state, or Product-level storage state.

The active Planning board code now uses Merchandise/Planning terminology internally: `planningCard` for card evaluation, `currentQueue` and `queues` for board placement, `deliverableRoute` for derived deliverable presentation, `requiredToShoot` for blockers, and `planningBoard` for the local board configuration. The backend still accepts the old `currentGate` request key on `/api/merchandise/:id/intake-state` as an inbound compatibility alias only.

Planning comments are lightweight Merchandise conversation records.

Active Comments fields:

- `Comment`
- `Merchandise`
- `User`

The app creates comments through `POST /api/merchandise/:id/comments`, requiring the authenticated Marks Photo user and non-empty text. Comments render from the linked current Users record, including display name, role, avatar or initials, and timestamp. `GET /api/merchandise/:id/comments` returns the Merchandise comments oldest-to-newest.

The Planning board displays comment counts on cards. Unread dots are local browser state only, keyed by last viewed timestamp in `localStorage`; there is no Airtable read-state model.

Deferred comment scope:

- Read By
- mentions
- replies
- reactions
- notifications
- deletion state
- system events
- activity types

## Products

Products are reference records. Active code keeps Product fields for identity, client/job/reporting, descriptive facts, artwork received, and reference-data JSON.

Active Product serializers, imports, forms, tables, and Planning code no longer read or write Product-level workflow/storage fields such as `Workstream`, `Received`, `Rec Date`, `Location`, `Condition`, `Status`, Product photos, shipment links, issue links, export flags, or Product photo metadata.

## Shipments

`/shipments` is the canonical workspace for merchandise-team physical movement.

Compatibility routes:

- `/receiving` redirects to `/shipments`
- `/receipts` redirects to `/shipments`

Shipment-level photos belong to Shipments. Originals are stored in R2, and the current live Shipments schema stores the shipment photo manifest in a private backend-managed block inside Shipments `Notes`; API responses strip that private block from visible notes.

THR3D is not a standalone workspace. Shipments `THR3D / Outgoing` reads THR3D-only Merchandise records where:

- `Deliverables` includes `Thr3d` and does not include `Packaging Photo` or `Ecomm Photo`
- `Intake Status` is `Ready to Release`
- `Released` is false
- `Merch Status` still represents a physically present sample

## Legacy Cleanup

On 2026-07-22, legacy workflow table records were backed up and cleared:

- Workstreams: 3 records deleted
- Work Orders: 0 records
- Workflow Templates: 1 record deleted
- Workflow Stages: 6 records deleted
- Work Order Types: 1 record deleted

Obsolete field values were cleared:

- Products `Workstream`: 0 populated records after cleanup
- Merchandise `Merchandise Resolution`: 0 populated records after cleanup
- Merchandise `Work Orders`: 0 populated records after cleanup
- Jobs `Work Orders`: 0 populated records after cleanup

Active backend dependencies were removed:

- workflow service files
- workflow schema creation scripts
- workflow/work-order API routes
- workflow/work-order config constants
- Product `Workstream` import/update/read paths
- frontend `/workstreams` API helper

Current Airtable cleanup state:

- Live metadata audit on 2026-07-22 no longer listed the legacy workflow tables.
- The obsolete Product operational fields were manually deleted after backup and Airtable dependency review.
- Product operational fields are not supported compatibility surfaces.
- The live Airtable base now includes the lightweight `Comments` table. Airtable Metadata API creation does not support `createdTime` fields; the app currently uses Airtable record `createdTime` as the comment timestamp and will also read a `Created At` field if one is added manually.

Detailed artifact: `docs/migrations/2026-07-22-legacy-architecture-cleanup.md`.
Latest schema artifact: `docs/migrations/2026-07-22-minimal-operating-model-airtable-audit.json`.

## Validation

Latest verified commands:

- Browser reproduction on `http://localhost:5173/__test/planning-thr3d` first captured the blank-screen stack as `ReferenceError: DELIVERABLE_TONE is not defined` in `DeliverablesSelector`; after fixing the test hook to use `DELIVERABLE_ROUTE_MAP`, the same browser interaction opened a Planning card, selected `Thr3d`, showed `Routes to Thr3d Shipment`, finished verification, and displayed the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready to Release` and `Released: false`, with no console errors.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 106 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 182 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- `npm run dev` started Vite on `5173`; an existing Flask dev server was already listening on `5057`.
- Read-only Airtable metadata audit passed and wrote `docs/migrations/2026-07-22-minimal-operating-model-airtable-audit.json`.

The 2026-07-22 terminology pass has targeted build coverage green; final full-suite and route-smoke results are recorded in `docs/migrations/2026-07-22-minimal-operating-model-cleanup.md`.
