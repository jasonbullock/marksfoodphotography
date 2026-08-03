# Product Decisions

## 2026-08-03 - Topco Readiness Is Activation-Driven

Topco Planning should not start from matching newly received Merchandise to previously imported Product records.

Topco starts from received Merchandise plus a Topco Activation. The PM-facing match target is an Activation row matched to received Merchandise, primarily by UPC. Product reference records may still be created or updated in the background when useful for history/reporting, but Product matching should not be the main PM blocker for Topco.

Topco Ready for Photo requires:

- Merchandise received
- Activation confirmed
- Activation row matched
- Deliverables confirmed

Topco Ecomm Photo activation data currently requires UPC, CVID, Description, Structure, Walnut Scope, and Upload Location.

Topco Packaging Photo activation data currently requires UPC, Job Number, Brand, and Coordinator Description.

Quantity received, storage location, individual file names, and post-photo tracking statuses are not Topco activation requirements. Quantity and physical handling remain Shipments facts. Creative Force owns detailed production file naming unless Marks Photo explicitly needs a token such as CVID or a folder reference to perform the handoff.

The current implementation exposes this as a Topco client readiness profile in Clients/Admin and `/api/clients`, and stores activation package data in the existing `Activations` table. Activation is the client/project readiness package created in Marks, not an inbound email. Email or notification content may be generated from Activation data later, but it is an output channel and not the source of truth.

The first Activation editing surface lives inside Admin > Clients as a basic Topco package editor while the daily Planning experience is still being shaped. Planning also exposes a PM-facing `Add Activation` action because PMs should not need Airtable or Admin access to create readiness packages. UPC matching confirmation, notification automation, and automatic movement to Ready for Photo remain future implementation work.

## 2026-07-22 - Planning Uses Draft -> Commit Modals

Planning board cards represent committed business state. Planning modals represent draft work.

The canonical interaction contract is:

- Board = committed state.
- Modal = draft workspace.
- Footer = single commit area.
- `Finish & Move` = only commit action for routing changes.
- No optimistic routing, board refresh, card movement, badge movement, or background animation while the modal is open.
- Background board interaction is frozen while the modal is active.
- Cancel, Esc, close, and backdrop close discard uncommitted draft changes.
- Cards move or animate only after the finish save succeeds and the board reloads.

For the Merchandise Verification modal, selecting `Thr3d`, `Packaging Photo`, or `Ecomm Photo` updates only local modal state and the `Will move to ...` footer preview. The frontend must not call the Deliverables save endpoint or reload the Planning board from that selection. `Finish & Move` sends the selected `Deliverables`, destination `stage`, and blocking requirements together through `/api/merchandise/:id/intake-state`; after success, the board refreshes, the modal closes, and the card appears in its committed destination.

## 2026-07-22 - Merchandise Comments Are Lightweight Conversation Records

Merchandise comments are intentionally small human discussion records.

The active model is one `Comments` table linked to Merchandise and Users:

- `Comment`
- `Merchandise`
- `User`

Comments are created only by an authenticated Marks Photo user. The app persists the linked User record ID and renders the current user display name, role, avatar or initials, and timestamp from Users plus the Airtable record timestamp. It must not create anonymous comments or store duplicate author display text on the comment.

Planning cards may show comment count. Unread indication may use local browser last-viewed timestamps only. Do not add Airtable read-state fields for this pass.

Deferred scope for this model:

- Read By
- mentions
- replies
- reactions
- notifications
- deletion state
- system events
- activity types

## 2026-07-22 - Planning Board Contract Uses Queue Terminology

The active Planning board contract must use Merchandise/Planning terminology internally.

Old active frontend contract names were retired:

- `workOrder` -> `planningCard`
- `currentGate` / `gate` -> `currentQueue` / `queue`
- `validNextGates` / `blockedNextGates` -> `validNextQueues` / `blockedNextQueues`
- `workstream` / Product `Workstream` presentation -> `deliverableRoute` derived from Merchandise `Deliverables`
- `workflowForClient` / workflow registry naming -> `planningBoardForClient` / Planning board registry naming
- `workflow-*` Planning drawer CSS -> `planning-*`

The backend `/api/merchandise/:id/intake-state` endpoint may continue accepting `currentGate` as a request-body alias for older clients, but active frontend code must send `stage` with a Planning queue id. No Airtable schema, visible UX, route, status, or routing-rule change is implied by this rename.

## 2026-07-22 - Legacy Workflow Architecture Is Removed

Marks Photo must not depend on Workstreams, Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, or Merchandise Resolution.

Planning is Merchandise-driven. The active Planning contract is:

- Merchandise `Deliverables`
- Merchandise `Intake Status`
- Merchandise verification fields
- derived Required to Shoot blockers
- shared Ready for Photo handoff
- Merchandise-owned release fields

Products and Jobs remain supporting data. Product-level `Workstream` is obsolete and must not be written by import, product update, readiness, or Planning code.

Product-level operational state is obsolete. Products must not carry physical receipt, storage location, condition, photo, shipment, issue, export, or production-status fields in active code. Those facts belong to Merchandise, Shipments, Issues, History, external production systems, or downstream reporting integrations as appropriate.

THR3D remains a Merchandise `Deliverables` value and an outgoing physical shipment queue inside Shipments. Do not recreate THR3D Work Orders, Workstreams, workflow templates, workflow stages, or a standalone THR3D workspace.

The 2026-07-22 cleanup cleared legacy workflow table records and obsolete field values in Airtable after backup. A later live metadata audit no longer listed the legacy workflow tables. Remaining obsolete Product fields are manual deletion targets and should not be treated as compatibility aliases.

## 2026-07-22 - Minimal Status Model

Marks Photo uses workspace-owned states instead of one overloaded global status.

Canonical persisted Intake Status values are:

- `Needs Review`
- `Waiting on Information`
- `Ready to Release`
- `Complete`

Planning uses local PM queue placement for daily organization:

- `New`
- `Planning`
- `Waiting`
- `Ready for Photo`

The Planning queue is not a second Airtable workflow status. Production state should come from Creative Force or a minimal future sync field, not from Product status or hidden Planning gates. Physical movement/state belongs to Shipments, Merchandise storage/location data, and Merchandise status.

## 2026-07-22 - Intake Uses Deliverables Only

The current Intake/Planning workflow must not depend on a separate physical-routing field.

Canonical Planning routing is represented by:

- `Deliverables`
- `Intake Status`
- derived Required to Shoot blockers

Selecting `Thr3d` means the Merchandise has the `Thr3d` Deliverable. Finishing that path sets the current Intake state appropriately and makes the record eligible for Shipments `THR3D / Outgoing` when the rest of the queue filter is satisfied.

Do not add compatibility aliases, API payload fields, validation rules, schema utility creation, or UI controls for a separate physical-routing field unless a future approved schema decision introduces a new current field with a clear owner and lifecycle.

## 2026-07-22 - Shipments THR3D Outgoing Uses The Merchandise Read Model

Shipments `THR3D / Outgoing` is a real queue over Merchandise, not a placeholder and not a separate THR3D workflow.

The canonical THR3D designation is Merchandise `Deliverables = Thr3d`.

THR3D-only Merchandise uses a minimal Planning path. It does not require Product linkage, Product verification, artwork, Required to Shoot photo fields, Packaging Photo fields, Ecomm Photo fields, or photo-production gates. Its required basics are the current intake facts already captured by the app:

- Client
- at least one merchandise photo
- Quantity
- `Deliverables` containing `Thr3d`

A THR3D-only Merchandise record appears in Shipments `THR3D / Outgoing` only when:

- `Deliverables` includes `Thr3d` and does not include `Packaging Photo` or `Ecomm Photo`
- `Intake Status` is `Ready to Release`
- `Released` is false
- `Merch Status` still represents a physically present sample

Mixed photo + Thr3d Merchandise must complete the full photo verification path first. Until Marks Photo has a reliable production-complete signal from Creative Force or PhotoTrack, mixed records must be excluded from Shipments `THR3D / Outgoing` so they do not ship before photo production is complete.

## 2026-07-21 - Shipments Replaces Receiving As User-Facing Workspace

The user-facing `Receiving` workspace is now `Shipments`.

Canonical route:

- `/shipments`

Compatibility routes:

- `/receiving` redirects to `/shipments`
- `/receipts` redirects to `/shipments`

New user-facing navigation, permissions, labels, and documentation should use `Shipments`, not `Receiving`.

Shipment-level photos belong to the Shipment, not individual Merchandise records. Store originals in R2. The current live Shipments schema does not have `Photo Metadata`, so shipment photo metadata is stored in a private backend-managed block inside Shipments `Notes` until a deliberate schema migration is approved.

## 2026-07-21 - Planning Replaces Intake As PM Workspace

The PM-owned board is now the `Planning` workspace.

Canonical route:

- `/planning`

Compatibility redirects:

- `/intake`
- `/work`
- `/merchandise-review-v2`

Planning owns planning states only:

- New
- Planning
- Waiting
- Ready for Photo

Cards must not automatically move because fields are completed. PMs explicitly choose where Planning work sits.

`Ready for Photo` is the shared handoff queue between Planning and Production. It is not a duplicated record or a separate Production Request.

## 2026-07-21 - Required To Shoot Is The Public Gate

`Required to Shoot` is the PM-facing production gate language.

Required to Shoot is calculated from underlying Merchandise, Product, Deliverables, artwork, and activation/campaign facts. It is not a generic manually maintained status.

Do not create a public Readiness field unless a later reporting/performance decision proves a cached value is necessary.

## 2026-07-20 - R2 Is The Image Storage Layer

Cloudflare R2 is the source of truth for Marks Photo images.

Airtable must not store image files, image attachments, base64 image data, duplicate image copies, permanent public URLs, or signed URLs for merchandise, shipment, product, review, production, or delivery images.

Airtable may store lightweight image references and structured metadata only.
