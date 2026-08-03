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

The Planning modal now follows the Draft -> Commit interaction model. The board is committed state; the modal is draft state; the footer is the single commit area. Deliverable selections update local modal state and the `Will move to ...` preview only. They do not autosave Deliverables, refresh the Planning board, move the card, or animate background card changes. `Finish & Move` commits the selected Deliverables and routing stage through one intake-state transaction, then refreshes the board and closes the modal after success. Closing or canceling the modal discards uncommitted draft Deliverables. The background board is frozen while the modal is open.

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

Topco now has an activation-driven client readiness profile exposed through the Clients/Admin area and `/api/clients`.

Topco readiness is documented as:

- activation-driven
- activation row matches received Merchandise by UPC
- Ready for Photo requires Merchandise received, Activation confirmed, Activation row matched, and Deliverables confirmed
- Ecomm Photo activation data requires UPC, CVID, Description, Structure, Walnut Scope, and Upload Location
- Packaging Photo activation data requires UPC, Job Number, Brand, and Coordinator Description
- Quantity received, storage location, individual file names, and post-photo tracking statuses are not activation requirements

Activation is the client/project readiness package created in Marks, not an inbound email. For Topco, the Activation package is the source of truth for the facts needed to validate whether the project is ready to shoot. Any email or notification is an output generated from the stored Activation package, not the source of truth.

The existing Airtable `Activations` table now has the fields needed to store Topco activation packages and SKU details. The live fields previously named `Source Method`, `Source Reference`, and `Original Message` were renamed to `Creation Method`, `Project Reference`, and `Activation Package`. The backend supports `GET /api/activations`, `POST /api/activations`, and `PATCH /api/activations/:id`, and the frontend API wrapper exposes list/create/update helpers. The Clients/Admin Topco profile includes a basic Activation Package editor for creating or revising this readiness package. The Planning board now also exposes a PM-facing `Create Activation Package` action that opens a modal and creates an Activation record from the frontend. The Planning modal uses repeatable SKU rows for UPC, CVID, description, structure, job number, brand, and coordinator description, then stores those rows in the existing `SKU Details JSON` field. The current implementation does not yet confirm UPC matches, trigger notification automation, or automatically move Topco Merchandise to Ready for Photo.

Detailed artifact: `docs/migrations/2026-08-03-topco-activations.md`.

The active Planning board code now uses Merchandise/Planning terminology internally: `planningCard` for card evaluation, `currentQueue` and `queues` for board placement, `deliverableRoute` for derived deliverable presentation, `requiredToShoot` for blockers, and `planningBoard` for the local board configuration. The backend still accepts the old `currentGate` request key on `/api/merchandise/:id/intake-state` as an inbound compatibility alias only.

Planning comments are lightweight Merchandise conversation records.

Active Comments fields:

- `Comment`
- `Merchandise`
- `User`

The app creates comments through `POST /api/merchandise/:id/comments`, requiring the authenticated Marks Photo user and non-empty text. Comments render from the linked current Users record, including display name, role, avatar or initials, and timestamp. `GET /api/merchandise/:id/comments` returns the Merchandise comments oldest-to-newest.

The Planning board displays comment counts on cards. Unread dots are local browser state only, keyed by last viewed timestamp in `localStorage`; there is no Airtable read-state model.

The Planning `New` card surface has a tightened compact read model:

- Required to Shoot overlay indicators use the shared `required-to-shoot-*` styles.
- Cards with no visible Required to Shoot requirements show `Not started` rather than implying completion.
- Cards can show compact Merchandise detail facts such as observed identifier and storage location when present.
- New queue cards now present newly received physical merchandise as recognition cards, not status or problem cards. Time Here is promoted, observed identifier stays visible when present, quantity appears only when greater than one, storage location is hidden, client appears only for users with multi-client access, and Deliverables appear only when already selected. Expected-missing prompts such as `Deliverables not set`, `New Arrival`, and `Needs PM review` are intentionally not rendered on New cards.
- The polish is visual/card-level only and does not change Planning queues, routing, Draft -> Commit modal behavior, or Shipments THR3D eligibility.

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

- Topco Activations schema/API verification on 2026-08-03: the existing Airtable `Activations` table `tbleD3EuIMJTG2OWT` was expanded with activation fields, renamed to Activation Package language, `/api/activations` can list/create/update activation records, and the frontend exposes activation helpers plus a Planning-board `Create Activation Package` modal with repeatable SKU rows. No release automation or workflow routing behavior changed.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 70 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Planning New-card polish verification on 2026-08-03: browser check on `http://localhost:5175/__test/planning-thr3d` confirmed a New queue card keeps the simplified recognition presentation: promoted Time Here, item name, client in the unauthenticated regression fixture, no storage location, no Required-to-Shoot overlay indicators, and no `New Arrival`, `Needs PM review`, or `Deliverables not set` badge copy. Source-contract coverage confirms identifiers still render when present.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 42 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Draft -> Commit Planning modal verification on 2026-07-22: selecting `Thr3d` in the modal updates local draft state and the footer preview to `Will move to Thr3d Shipment`; the background board remains frozen with the card disabled in `New`, and Shipments `THR3D / Outgoing` remains empty until `Finish & Move` is clicked. After `Finish & Move`, the regression route closes the modal, unfreezes the board, and displays the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready to Release` and `Released: false`.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 42 tests. This now includes source-contract coverage that the Planning modal does not autosave Deliverables, does not call the Deliverables save API from draft selection, uses `Will move to` plus `Finish & Move`, and freezes the board while the modal is open.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 109 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 185 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- The 2026-07-22 `Thr3d` modal crash with `TypeError: Cannot read properties of undefined (reading 'currentQueueName')` was traced to the Planning card read model: modal/drawer code expected `item.planningCard.currentQueueName`, while `buildMerchandisePlanningCard` exposed the same object only as `assignment`. `queueLabel` usually masked this mismatch, but the Thr3d deliverables refresh could expose the missing `planningCard` object. The fix now exposes `planningCard: assignment` and hardens queue lookup so malformed or empty board queue inputs fall back to the canonical Planning queues, including `Thr3d Shipment`.
- Browser verification on a freshly restarted Vite server at `http://localhost:5175/__test/planning-thr3d` exercises the Planning card modal, clicks the visible `Thr3d` deliverable control, keeps the modal mounted and usable, recalculates Required to Shoot as complete, routes to `Thr3d Shipment`, finishes verification, and displays the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready to Release` and `Released: false`. Console capture after the clean run had no error logs.
- The live `/planning` route on `http://localhost:5175/planning` is served by Vite from `/Users/jbullock/Development/Marks Food Photography/frontend`; the backend on `5057` is served from `/Users/jbullock/Development/Marks Food Photography`. In the Codex in-app browser, the real board remains behind the user PIN selector and no authenticated tab was available to claim, so the authenticated live-card click still needs user-session verification.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 41 tests. This includes a Node-imported regression proving a Thr3d Planning card resolves `planningCard.currentQueueName` to `Thr3d Shipment` even when the supplied board queue list is empty.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 108 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- Browser reproduction on `http://localhost:5173/__test/planning-thr3d` first captured the blank-screen stack as `ReferenceError: DELIVERABLE_TONE is not defined` in `DeliverablesSelector`; after fixing the test hook to use `DELIVERABLE_ROUTE_MAP`, the same browser interaction opened a Planning card, selected `Thr3d`, showed `Will move to Thr3d Shipment`, finished verification, and displayed the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready to Release` and `Released: false`, with no console errors.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 106 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 182 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- `npm run dev` started Vite on `5173`; an existing Flask dev server was already listening on `5057`.
- Read-only Airtable metadata audit passed and wrote `docs/migrations/2026-07-22-minimal-operating-model-airtable-audit.json`.

The 2026-07-22 terminology pass has targeted build coverage green; final full-suite and route-smoke results are recorded in `docs/migrations/2026-07-22-minimal-operating-model-cleanup.md`.
