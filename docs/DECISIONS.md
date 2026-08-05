# Product Decisions

## 2026-08-05 - Activation Creation Method Removed

Activation creation source is not operational project data. The Airtable `Activations` field `Creation Method` was removed from active schema expectations and app code. Activations keep only the facts needed to define and move photo work: client, type, status, project/package details, due/urgency, Walnut scope, paths, SKU details, deliverables, linked Merchandise, and notes.

## 2026-08-05 - Client Required Field Label Is Required To Shoot

Client-level photo blocker configuration should use the same PM-facing language as Planning. The Airtable `Clients` field is `Required to Shoot`, and active app code uses `requiredToShoot` for this client configuration.

## 2026-08-05 - Activation Type Removed

Activation type is redundant with Activation `Deliverables`. Active app code no longer reads, validates, or writes `Activations.Activation Type`; Ecomm and Packaging intent should be represented by the Activation `Deliverables` field.

## 2026-08-05 - Deliverable Labels Are Literal

Canonical `Deliverables` values are `Packaging`, `Ecomm`, and `Thr3d`.

The old labels `Packaging Photo` and `Ecomm Photo` are too wordy and blur the distinction between deliverable intent and the actual photo-production work. They are now compatibility aliases only. Backend input normalization accepts the old labels but writes `Packaging` and `Ecomm`; frontend selectors render only the canonical labels; live Airtable Merchandise records were normalized on 2026-08-05 so saved rows no longer use the old photo-suffixed labels.

Airtable's public metadata update endpoint returned 422 when asked to prune the old dropdown choices from `Deliverables`, so old unused choices may remain visible in Airtable configuration until removed manually. App code must not write them.

## 2026-08-05 - Received Merch Splits Into Workstream Cards

Received Merch is the physical lot captured from a Shipment. It remains the operational evidence of what arrived, including quantity, photos, storage, observed identifiers, notes, and physical status.

Expected Product is pure imported reference data from the master spreadsheet. The Product page should stay limited to these imported Expected Product records and supporting reporting/reference facts. Manual product information captured during intake may live on Received Merch for readiness and handoff, but it must not create or update Product records.

New Merch is a focused Planning intake list for unsplit Received Merch. Its purpose is identity confirmation and production-intent assignment, not long-running production management.

After `Confirm & Assign`, the original Received Merch leaves New Merch and creates child work:

- one Ecomm workstream card when Ecomm is selected
- one Packaging workstream card when Packaging is selected
- one THR3D shipping item when THR3D is selected

Ecomm and THR3D are mutually exclusive GS1 paths. Packaging can pair with either Ecomm or THR3D. Packaging and Ecomm must be separate workstream cards because they have different dependencies, readiness checks, and downstream production handling.

THR3D is not a production workstream card in this model. It is a shipping item that needs quantity-to-ship and outbound shipment tracking. Shipments owns the physical outbound movement.

Workstream cards link back to the parent Received Merch and to Expected Product when a match exists. They may carry workstream-specific readiness/dependency state, but they must not recreate the old workflow-engine tables or Product-level workstream routing. The word `Workstream` in this decision means a scoped child work item for Ecomm or Packaging only, not the legacy Workstreams/Work Orders architecture removed on 2026-07-22.

Planning must make child workstream cards visibly distinct from the parent Received Merch. Ecomm and Packaging cards should show their workstream type, assigned quantity, and workstream status while continuing to use the parent Received Merch for photos and physical context.

Planning movement for Ecomm and Packaging child cards belongs to the child record. Moving a workstream card updates `Workstream Cards.Status` instead of parent Merchandise `Intake Status`. Active child statuses are intentionally small: `New`, `Planning`, `Waiting`, `Ready for Photo`, and `In Production`. Airtable metadata updates may not be able to pre-prune or pre-add select choices through the public metadata endpoint; app writes use `typecast` so valid statuses can still be saved.

The first implementation slice creates only the minimum schema and API needed to make this real:

- Merchandise `New Merch Status`: `Needs Review`, `Workflows Created`
- Merchandise `Manual Product Info`
- `Workstream Cards` table for Ecomm and Packaging child work
- `THR3D Shipping Items` table for outbound THR3D movement
- `POST /api/merchandise/:id/confirm-assign`

`Confirm & Assign` creates child records and then marks the parent Received Merch `Workflows Created`. It rejects Ecomm + THR3D together because those are alternate GS1 paths. Manual product info may be copied to the parent and child records for handoff context, but the endpoint must not create or update Product records.

The first UI wiring keeps the existing New Merch modal shell and changes only the commit behavior. The footer action is `Confirm & Assign`, it previews created child records, calls the backend assignment endpoint, and removes parent Merchandise from the active New Merch board once `Workflows Created` is saved. Packaging + THR3D quantity allocation is explicit: PMs enter the THR3D quantity and Packaging automatically receives the remaining quantity. The backend rejects Packaging + THR3D assignments whose quantities do not add up to the parent Received Merch quantity.

Shipments `THR3D / Outgoing` should read from `THR3D Shipping Items`, not from legacy Merchandise rows filtered by `Deliverables = Thr3d`. A THR3D shipping item is the actionable outbound unit; it carries `Quantity to Ship` and `Shipping Status`, while the linked Received Merch supplies photos, client, location, identifiers, and original shipment context.

Shipping a THR3D item creates an outbound Shipment row for carrier/tracking context, links that row to the THR3D shipping item, and marks the shipping item `Shipped`. Shipped THR3D items are hidden from the active outgoing queue. The parent Received Merch is marked `Shipped` only when the shipped quantity covers the full parent quantity; partial shipments preserve the parent physical status.

## 2026-08-05 - Merch Status Is Physical State Only

Merchandise `Merch Status` describes the physical state of the sample only.

Canonical values:

- `Received`
- `Issue`
- `Ready to Ship`
- `Shipped`
- `Disposed`

`Matched` and `Validated` are no longer valid product-facing meanings for `Merch Status`. Product information may be linked/imported behind the scenes, but that is not a physical state. Planning readiness may move a card toward photo work or THR3D, but it should not write `Matched` or `Validated` into `Merch Status`.

For THR3D-only Merchandise in the current implementation, completing the Planning decision marks the physical sample `Ready to Ship` so Shipments can box and send it. In the clarified split model, THR3D should be represented by a shipping item linked to Received Merch; once the shipped quantity leaves the studio, Shipments should mark the relevant physical movement `Shipped`; disposed samples should be marked `Disposed`.

Live Airtable data was normalized on 2026-08-05 so all existing Merchandise records use `Received`; new choices `Ready to Ship`, `Shipped`, and `Disposed` were added through Airtable typecast. Airtable's public field-update endpoint did not allow pruning old unused select choices, so `Matched` and `Validated` may remain visible in the Airtable field configuration until removed manually, but app code must not write them.

## 2026-08-04 - Shipment Deletion Is Empty-Only

Shipments may be deleted from the All Shipments browser only when no merchandise entries are attached. A Shipment that has logged Merchandise must keep its receipt context until those entries are explicitly removed or moved through an approved merchandise-removal flow. This prevents deleting the physical receipt record while leaving received Merchandise orphaned.

## 2026-08-03 - Topco Readiness Is Activation-Driven

Topco Planning should not start from matching newly received Merchandise to previously imported Product records.

Topco starts from received Merchandise plus a Topco Activation. The PM-facing link target is an Activation row linked to received Merchandise, primarily by UPC. Product reference records may still be created or updated in the background when useful for history/reporting, but Product matching should not be the main PM blocker for Topco.

Topco Ready for Photo requires:

- Merchandise received
- Activation confirmed
- Activation row linked
- Deliverables confirmed

Topco Ecomm activation data currently requires UPC, CVID, Description, Structure, Walnut Scope, and Upload Location.

Topco Packaging activation data currently requires UPC, Job Number, Brand, and Coordinator Description.

Quantity received, storage location, individual file names, and post-photo tracking statuses are not Topco activation requirements. Quantity and physical handling remain Shipments facts. Creative Force owns detailed production file naming unless Marks Photo explicitly needs a token such as CVID or a folder reference to perform the handoff.

The current implementation exposes this as a Topco client readiness profile in Clients/Admin and `/api/clients`, and stores activation package data in the existing `Activations` table. Activation is the client/project readiness package created in Marks, not an inbound email. Email or notification content may be generated from Activation data later, but it is an output channel and not the source of truth.

Admin > Clients is configuration only for Topco activation readiness: required fields, facts not required from activation, and client-specific path prefixes. It must not become an activation history or creation workspace. Planning exposes the PM-facing `Add Activation` action because PMs should not need Airtable or Admin access to create readiness packages. UPC matching confirmation, notification automation, and automatic movement to Ready for Photo remain future implementation work.

Activation is the readiness package PMs complete before photo work can be accepted. PMs may save an Activation draft without moving linked cards, or use `Move to Photo` once the Activation header and item rows are complete. `Move to Photo` makes the Activation the source of readiness for linked eligible Merchandise and moves those cards to the shared `Ready for Photo` handoff. The UI and Airtable schema should use `Linked Merchandise` language for Activation-to-Merchandise relationships.

If Merchandise was moved to Ready for Photo through an Activation and is later removed from that Activation, the Activation relationship no longer supports readiness. Saving the Activation must move that Merchandise out of Ready for Photo and back to the active Planning/needs-activation area.

The Planning `Edit Activations` utility should list only pending-photo Activation packages. Released, Complete, and Cancelled packages are hidden until the product has an explicit add-on-shot model for changing production work that has already been shot or released. Individual Topco cards may start a new Activation or be added to an existing pending Activation from the card modal, but that action only opens the Activation editor; moving cards to `Ready for Photo` still requires the Activation package to be completed and committed.

For activation-driven clients such as Topco, `Ready for Photo` requires a real linked Activation. A stale Planning state is not enough by itself; orphan cards must be kept in the active Planning/needs-activation area until the Activation relationship exists.

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

For the Merchandise Verification modal, selecting `Thr3d`, `Packaging`, or `Ecomm` updates only local modal state and the `Will move to ...` footer preview. The frontend must not call the Deliverables save endpoint or reload the Planning board from that selection. `Finish & Move` sends the selected `Deliverables`, destination `stage`, and blocking requirements together through `/api/merchandise/:id/intake-state`; after success, the board refreshes, the modal closes, and the card appears in its committed destination.

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

Marks Photo must not depend on the legacy Workstreams table, Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, or Merchandise Resolution.

Planning is Merchandise-driven. The active Planning contract is:

- Merchandise `Deliverables`
- Merchandise `Intake Status`
- Merchandise verification fields
- derived Required to Shoot blockers
- shared Ready for Photo handoff
- Merchandise-owned release fields

Products and Jobs remain supporting data. Product-level `Workstream` is obsolete and must not be written by import, product update, readiness, or Planning code.

Product-level operational state is obsolete. Products must not carry physical receipt, storage location, condition, photo, shipment, issue, export, or production-status fields in active code. Those facts belong to Merchandise, Shipments, Issues, History, external production systems, or downstream reporting integrations as appropriate.

This decision removed the old workflow-engine architecture. It does not prohibit the current scoped workstream-card concept for Ecomm and Packaging child work. THR3D must not be recreated as a Work Order, legacy Workstream, workflow template, workflow stage, or standalone workspace.

The 2026-07-22 cleanup cleared legacy workflow table records and obsolete field values in Airtable after backup. A later live metadata audit no longer listed the legacy workflow tables. Remaining obsolete Product fields are manual deletion targets and should not be treated as compatibility aliases.

## 2026-07-22 - Minimal Status Model

Marks Photo uses workspace-owned states instead of one overloaded global status.

Canonical persisted Intake Status values are:

- `Needs Review`
- `Waiting on Information`
- `Ready for Photo`
- `Complete`

Planning uses local PM queue placement for daily organization:

- `New`
- `Planning`
- `Waiting`
- `Ready for Photo`

The Planning queue is not a second Airtable workflow status. Production state should come from Creative Force or a minimal future sync field, not from Product status or hidden Planning gates. Physical movement/state belongs to Shipments, Merchandise storage/location data, and Merchandise status.

## 2026-07-22 - Intake Uses Deliverables Only

This decision described the pre-split intake model and is refined by the 2026-08-05 Received Merch split decision.

The current Intake/Planning workflow must not depend on a separate physical-routing field.

Current implementation routing is represented by:

- `Deliverables`
- `Intake Status`
- derived Required to Shoot blockers

In the clarified target model, Ecomm and Packaging become separate workstream cards after `Confirm & Assign`, and THR3D becomes a shipping item rather than a production deliverable card.

Do not add compatibility aliases, API payload fields, validation rules, schema utility creation, or UI controls for a separate physical-routing field unless a future approved schema decision introduces a new current field with a clear owner and lifecycle.

## 2026-07-22 - Shipments THR3D Outgoing Uses The Merchandise Read Model

This decision describes the current implementation and is refined by the 2026-08-05 Received Merch split decision.

Shipments `THR3D / Outgoing` is a real queue over Merchandise, not a placeholder and not a separate THR3D workflow.

The current implementation's canonical THR3D designation is Merchandise `Deliverables = Thr3d`.

THR3D-only Merchandise uses a minimal Planning path. It does not require Product linkage, Product verification, artwork, Required to Shoot photo fields, Packaging fields, Ecomm fields, or photo-production gates. Its required basics are the current intake facts already captured by the app:

- Client
- at least one merchandise photo
- Quantity
- `Deliverables` containing `Thr3d`

A THR3D-only Merchandise record appears in Shipments `THR3D / Outgoing` only when:

- `Deliverables` includes `Thr3d` and does not include `Packaging` or `Ecomm`
- `Intake Status` is `Ready for Photo`
- `Released` is false
- `Merch Status` still represents a physically present sample

Target model: Ecomm and THR3D are mutually exclusive GS1 paths, Packaging can pair with either, and THR3D appears in Shipments as a shipping item with quantity-to-ship and outbound tracking.

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

`Ready for Photo` is the shared handoff queue between Planning and Production. Under the split model it applies to Ecomm and Packaging workstream cards linked to Received Merch; it is not a duplicated physical Merchandise record or a separate Production Request.

## 2026-07-21 - Required To Shoot Is The Public Gate

`Required to Shoot` is the PM-facing production gate language.

Required to Shoot is calculated from underlying Merchandise, Product, Deliverables, artwork, and activation/campaign facts. It is not a generic manually maintained status.

Do not create a public Readiness field unless a later reporting/performance decision proves a cached value is necessary.

## 2026-07-20 - R2 Is The Image Storage Layer

Cloudflare R2 is the source of truth for Marks Photo images.

Airtable must not store image files, image attachments, base64 image data, duplicate image copies, permanent public URLs, or signed URLs for merchandise, shipment, product, review, production, or delivery images.

Airtable may store lightweight image references and structured metadata only.
