# Current State

Marks Photo is an Operations Readiness Platform centered on Merchandise.

The app transforms incoming physical merchandise into production-ready work. It should not become a workflow engine, project management tool, Creative Force replacement, or PhotoTrack replacement.

## Canonical Architecture

Active business concepts:

- Shipments: physical merchandise entering or leaving the studio
- Received Merch: the physical lot from a Shipment and operational center for what arrived
- Expected Product: pure imported reference data from the master spreadsheet
- New Merch: focused PM intake list for unsplit Received Merch
- Workstream cards: child Ecomm or Packaging work created after `Confirm & Assign`
- THR3D shipping items: outbound physical movement items, not production cards
- Planning: PM-owned preparation through New Merch intake and workstream readiness
- Products: imported Expected Product reference and reporting data only
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
- Workstream Cards
- THR3D Shipping Items

History remains present as existing audit data, but it is not a workflow engine.

## Planning

Planning is Merchandise-driven.

Clarified target operating model:

- Received Merch is the original physical lot captured from a Shipment. It keeps physical facts such as quantity, photos, storage, observed identifiers, notes, and `Merch Status`.
- Expected Product remains pure/imported from the master spreadsheet. The Product page should stay limited to imported Expected Product records and should not be updated from manual intake facts.
- New Merch is a focused intake list for unsplit Received Merch where PMs confirm identity and assign production intent.
- `Confirm & Assign` removes the original Received Merch from New Merch and creates child work: separate Ecomm and Packaging workstream cards, plus a THR3D shipping item when needed.
- Ecomm and THR3D are mutually exclusive GS1 paths. Packaging can pair with either Ecomm or THR3D.
- Packaging and Ecomm are separate workstream cards because they have different dependencies.
- THR3D is a shipping item only. It needs quantity-to-ship and outbound shipment tracking, not a production card.
- Workstream cards link back to Received Merch and to Expected Product when matched.
- Manual product information can live on Received Merch when no Expected Product exists, but it must not create or update Product records.

Canonical Intake and Planning fields:

- Merchandise `Deliverables`
- Merchandise `Intake Status`
- Merchandise `Merch Status`
- Merchandise verification fields
- derived Required to Shoot blockers
- release fields: `Released`, `Released At`, `Released By`

Client-level Required to Shoot configuration is stored on `Clients.Required to Shoot`; active app code uses `requiredToShoot`.

Canonical Deliverables values are:

- `Packaging`
- `Ecomm`
- `Thr3d`

Older labels `Packaging Photo` and `Ecomm Photo` are compatibility input aliases only. Backend validation normalizes them to `Packaging` and `Ecomm`, the frontend renders only the canonical labels, and live Airtable Merchandise records were normalized on 2026-08-05 so saved rows no longer use the old photo-suffixed labels. Airtable's public metadata update endpoint returned 422 when asked to prune the old `Deliverables` dropdown choices, so those unused options may still appear in Airtable field configuration until removed manually.

Canonical Merch Status values are physical-state only:

- `Received`
- `Issue`
- `Ready to Ship`
- `Shipped`
- `Disposed`

`Matched` and `Validated` are no longer active Merchandise physical statuses. Product information can be linked or imported without changing `Merch Status`; photo/THR3D readiness is handled by Planning state and deliverables. Live Airtable Merchandise records were normalized on 2026-08-05 so existing records use `Received`, and the new `Ready to Ship`, `Shipped`, and `Disposed` choices exist. Airtable's public field-update endpoint did not allow pruning old unused `Matched`/`Validated` select choices, so those may still appear in Airtable configuration until removed manually, but active app code does not write them.

The clarified New Merch schema is now present in Airtable. Merchandise has `New Merch Status` with `Needs Review` and `Workflows Created`, plus `Manual Product Info` for minimum facts that should not be written to Products. Existing Merchandise records were initialized to `Needs Review` on 2026-08-05.

The backend now supports `POST /api/merchandise/:id/confirm-assign`. It creates Ecomm and/or Packaging records in `Workstream Cards`, creates a THR3D record in `THR3D Shipping Items` when needed, links those records to Received Merch and Expected Product when supplied, stores manual product info on Received Merch/child records, and marks the parent Received Merch `New Merch Status = Workflows Created`. The endpoint rejects Ecomm + THR3D together because they are alternate GS1 paths. The backend also exposes `GET /api/workstream-cards` and `GET /api/thr3d-shipping-items` for the child records.

The Planning New Merch modal now uses `Confirm & Assign` for its footer commit. It previews the child work/shipping records that will be created, calls the confirm-assign backend endpoint, refreshes the board, and hides parent Merchandise whose `New Merch Status` is `Workflows Created`. Ecomm and Packaging child workstream cards now appear on the Planning board after they are created. THR3D shipping items now feed the Shipments `THR3D / Outgoing` panel so the merchandise team sees quantity-to-ship records created from New Merch. When Packaging + THR3D are both selected, the modal shows explicit quantity allocation: PMs enter the THR3D quantity and Packaging automatically receives the remaining quantity. The backend rejects Packaging + THR3D assignment payloads whose quantities do not add up to the parent Received Merch quantity.

Ecomm and Packaging workstream cards are visually distinct from parent Received Merch cards on the Planning board. Child cards show `Workstream Card`, workstream status, workstream type, and assigned quantity while still linking back to the parent Received Merch facts for photos, product identity, client, location, and original quantity.

Moving an Ecomm or Packaging workstream card on the Planning board updates that child card's own `Workstream Cards.Status` through `PATCH /api/workstream-cards/:id`. The active child statuses are `New`, `Planning`, `Waiting`, `Ready for Photo`, and `In Production`; board placement currently maps `New`/`Planning` to Planning, `Waiting` to Waiting, and `Ready for Photo` to Ready for Photo. Moving a child workstream card does not rewrite the parent Received Merch `Intake Status`. The backend writes status updates with Airtable `typecast` enabled. Airtable's public metadata update endpoint returned 422 when asked to pre-add the new `Workstream Cards.Status` dropdown options, so the visible Airtable field configuration may still need manual adjustment.

Shipments `THR3D / Outgoing` now includes a direct ship action on each active THR3D shipping item. The user enters carrier and tracking, the backend creates an outbound Shipment record, links it to the THR3D shipping item, sets `Shipping Status = Shipped`, and removes the item from the active outgoing queue. If the shipped THR3D quantity equals or exceeds the parent Received Merch quantity, the parent Merchandise `Merch Status` is set to `Shipped`; partial THR3D shipments leave the parent physical status unchanged because remaining samples may still be at Walnut for Packaging.

Canonical Intake Status values:

- `Needs Review`
- `Waiting on Information`
- `Ready for Photo`
- `Complete`

Planning queue columns are local PM organization, not a second Airtable status:

- `New`
- `Planning`
- `Waiting`
- `Ready for Photo`

The implemented Merchandise Verification wizard is the predecessor to the clarified New Merch intake UI:

1. Verify Merchandise
2. Identify Product
3. Choose Deliverables
4. Complete Required Information
5. Finish

Target New Merch intake should call the implemented `Confirm & Assign` endpoint, creating Ecomm and Packaging workstream cards and THR3D shipping items from the original Received Merch.

The Planning modal now follows the Draft -> Commit interaction model. The board is committed state; the modal is draft state; the footer is the single commit area. Deliverable selections update local modal state and the `Will move to ...` preview only. They do not autosave Deliverables, refresh the Planning board, move the card, or animate background card changes. `Finish & Move` commits the selected Deliverables and routing stage through one intake-state transaction, then refreshes the board and closes the modal after success. Closing or canceling the modal discards uncommitted draft Deliverables. The background board is frozen while the modal is open.

The wizard uses business-language outcomes:

- incomplete verification routes to Waiting for Information
- photo deliverables route toward Ready for Photo when Required to Shoot is complete
- `Thr3d`-only routes to Shipments `THR3D / Outgoing` when the minimal intake basics are complete, Intake is finished, and the sample is physically present

Current THR3D-only Merchandise behavior does not require Product linkage, Product verification, artwork, Required to Shoot photo fields, Ecomm fields, Packaging fields, or photo-production gates. Its required basics are:

- Client
- at least one merchandise photo
- Quantity
- `Deliverables` containing `Thr3d`

When a PM finishes a Thr3d-only Planning decision, the primary modal action changes to `Ship to Thr3d` and confirms: `This item will be removed from the Walnut work queue and be shipped to Thr3d.` The confirmation protects the handoff because this path removes the item from Walnut photo work and sends it to the Shipments THR3D queue.

Implemented model refinement: Ecomm and THR3D are mutually exclusive GS1 paths, while Packaging can pair with either. Packaging + THR3D creates a Packaging workstream card plus a THR3D shipping item rather than a mixed photo + THR3D production card.

Planning must not create or require the legacy Workstreams, Work Orders, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, Product-level production state, or Product-level storage state. The newly clarified Ecomm/Packaging workstream card concept is a scoped child work item, not the removed workflow-engine architecture.

Topco now has an activation-driven client readiness profile exposed through the Clients/Admin area and `/api/clients`.

Topco readiness is documented as:

- activation-driven
- activation row links to received Merchandise by UPC
- Ready for Photo requires Merchandise received, Activation confirmed, Activation row linked, and Deliverables confirmed
- Ecomm activation data requires UPC, CVID, Description, Structure, Walnut Scope, and Upload Location
- Packaging activation data requires UPC, Job Number, Brand, and Coordinator Description
- Quantity received, storage location, individual file names, and post-photo tracking statuses are not activation requirements

Activation is the client/project readiness package created in Marks, not an inbound email. For Topco, the Activation package is the source of truth for the facts needed to validate whether the project is ready to shoot. Any email or notification is an output generated from the stored Activation package, not the source of truth.

The existing Airtable `Activations` table now has the fields needed to store Topco activation packages and SKU details. The live fields previously named `Source Reference`, `Original Message`, and `Matched Merchandise` were renamed to `Project Reference`, `Activation Package`, and `Linked Merchandise`; `Creation Method` and `Activation Type` were removed because creation source and type are redundant with operational Activation facts and `Deliverables`. The backend supports `GET /api/activations`, `POST /api/activations`, `PATCH /api/activations/:id`, and `POST /api/activations/:id/move-to-photo`; the frontend API wrapper exposes list/create/update/move helpers. Admin > Clients exposes the Topco readiness configuration only: required Activation facts by deliverable, facts not required from Activation, and client-specific server path prefixes. It does not show Activation history or create/edit Activation packages. The Planning board exposes Topco Activation actions only: `Edit Activations` opens a modal list of saved Activations, and `Add Activation` opens the Activation editor. The `Edit Activations` list is limited to pending-photo Activation packages and hides Released, Complete, and Cancelled packages so shot/released work is not edited from Planning. The previous inline activation strip was removed so Activations behave like a utility action instead of a dashboard/card section. Topco activation-driven cards now also expose an Activation section with `Add to Activation` and `New Activation` actions, giving PMs a two-way path to link a card into an existing pending package or start a package from the card. The modal title distinguishes adding from editing an Activation. The modal separates Activation-level completion from item-level completion. Activation-level facts are Name, Due/Urgency, Walnut Scope, Artwork Path, Upload Location, and Deliverables. Due/Urgency and Walnut Scope remain free-form with suggestive typing from prior Activation entries; starter suggestions include `ASAP upon receipt` and `Full Set Renders - WALNUT (Photo)`. Activation Deliverables are selected with the shared multi-select control and currently expose only Packaging and Ecomm; Thr3d is intentionally excluded from this Topco photo Activation selector because Thr3d currently means a Shipments outbound/removal path, not a photo-ready activation package. Thr3d-specific Activation behavior is deferred until the shipping exception is explicitly modeled. Each item row owns Linked Merchandise, Description, UPC, CVID, and Structure. Structure is also free-form with suggestive typing from prior Activation SKU rows and includes `Hang Tag / Label` as the starter suggestion; in the modal it sits to the right of the Merchandise picker on wider screens to conserve vertical space. The modal uses the shared field treatment for text inputs, textareas, and merchandise pickers so required data entry controls stay visually consistent; Activation input values render at normal weight, and repeated item cards have visible spacing between rows. The Activation form is visually compacted by keeping Artwork Path and Upload Location in the two-column grid when space allows; their labels show the initial server prefixes so PMs know they are entering the remaining path suffix. A read-only live email preview with subject line sits beside the entry form so PMs can see the familiar Topco email shape; it uses one soft-break block for the request facts, bold labels with normal-weight values, and a closed bottom border on the SKU Details table. Missing values render red and completed values render dark green. Topco artwork and upload paths are composed from client readiness profile prefixes (`smb://gfs-marks/Topco/_CGI/03 PROJECTS/` and `smb://gfs-marks/Topco/`) plus the PM-entered suffix; no Airtable client schema field exists for these prefixes yet. SKU/item rows are stored in the existing `SKU Details JSON` field, and linked Merchandise is saved to the Airtable `Linked Merchandise` field. `Save Draft` stores the Activation without moving linked cards. Item rows can be removed down to zero so PMs can fully unlink Merchandise from a draft; an empty Activation may be saved as a draft, but `Move to Photo` requires at least one linked Merchandise item and complete Activation deliverables. If a previously linked Ready for Photo Merchandise item is removed from an Activation and the Activation is saved, the backend moves that Merchandise out of Ready for Photo and back to the active Planning/needs-activation area. The Planning board also guards against stale orphan state: activation-driven Topco cards with photo-ready Planning state but no linked Activation are displayed back in the active Planning/needs-activation area and cannot be manually moved or finished into `Ready for Photo` until an Activation link exists. `Move to Photo` validates the Activation header and every linked item row, saves the Activation, marks it Released, and moves linked eligible Merchandise into the Planning `Ready for Photo` handoff without changing physical `Merch Status`. Topco cards show a simple activation state chip instead of pre-activation Required to Shoot validation on the card, because Topco readiness cannot be meaningfully judged before the Activation/link step exists. The current implementation does not yet confirm UPC matches or trigger notification automation.

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
- Planning cards remain full-width within their existing board columns rather than spanning across columns. The latest card polish reduces duplicate flags by hiding storage on board cards, showing client only when multi-client context requires it, suppressing duplicated Required-to-Shoot dots/status chips on activation-driven cards, and rendering identifier facts as quiet text instead of field-like mini containers.
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

Products are Expected Product reference records. Active code keeps Product fields for identity, client/job/reporting, descriptive facts, artwork received, and reference-data JSON.

Active Product serializers, imports, forms, tables, and Planning code no longer read or write Product-level workflow/storage fields such as `Workstream`, `Received`, `Rec Date`, `Location`, `Condition`, `Status`, Product photos, shipment links, issue links, export flags, or Product photo metadata.

Target model: manual intake facts captured when no Expected Product exists should stay on Received Merch or downstream workstream cards. They should not create or update Product records, because the Product page should remain pure to imported Expected Product records.

## Shipments

`/shipments` is the canonical workspace for merchandise-team physical movement.

Compatibility routes:

- `/receiving` redirects to `/shipments`
- `/receipts` redirects to `/shipments`

Shipment-level photos belong to Shipments. Originals are stored in R2, and the current live Shipments schema stores the shipment photo manifest in a private backend-managed block inside Shipments `Notes`; API responses strip that private block from visible notes.

The Shipments receipt side panel shows newly logged Merchandise records. `Received` is treated as a confirmed state in this panel: it renders without a warning icon and uses the green badge treatment.

Incoming Shipments uses a photo-first autosave path. A PM may enter header details without logging a Shipment; choosing shipment photos is the action that creates/saves the Shipment and uploads those photos. Merchandise entries remain disabled until a Shipment record exists. After creation, header fields save on blur and the panel shows `Shipment saved`.

All Shipments defaults to `List` view for browsing Shipments. The List view now uses compact table-style rows instead of individual shipment cards/containers. Clicking a row opens the Shipment in the Incoming edit view, and empty Shipments can be deleted from the row action. Shipments with merchandise entries cannot be deleted until the merchandise is removed. `Date` view remains available and exposes focused scope controls for `Previous Week`, `This Week`, and `Month`. The previous `By Shipment` / `By Merchandise` grouping toggle was removed because All Shipments should behave as a shipment browser.

Current implementation: Shipments `THR3D / Outgoing` reads THR3D-only Merchandise records where:

- `Deliverables` includes `Thr3d` and does not include `Packaging` or `Ecomm`
- `Intake Status` is `Ready for Photo`
- `Released` is false
- `Merch Status` is `Received` or `Ready to Ship`

Target UI/API follow-up: Shipments `THR3D / Outgoing` should read THR3D shipping items created by `Confirm & Assign`, with quantity-to-ship and outbound tracking, while the parent Received Merch remains the physical lot. The table and create path now exist, but the current outgoing view still reads THR3D-only Merchandise records.

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

- Operating model documentation update on 2026-08-05: docs now distinguish Received Merch, Expected Product, New Merch, Ecomm/Packaging workstream cards, and THR3D shipping items; no schema or code implementation has been started for this model.
- `git diff --check` passed.
- Activation/Merch Status alignment on 2026-08-05: the legacy review validate endpoint still accepts `Validated` as a readiness action but no longer describes it as a physical `Merch Status`; the THR3D regression route now reflects the real `Ready to Ship` physical status after THR3D-only Planning completion.
- `backend/.venv/bin/python -m unittest tests.test_merchandise_review tests.test_intake_decisions tests.test_receiving tests.test_frontend_routing` passed, 120 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Merch Status simplification on 2026-08-05: backend and frontend no longer write `Matched` or `Validated` as Merchandise `Merch Status`; product linking/importing leaves physical status alone, ready-for-photo Activation moves leave physical status alone, and THR3D-only Planning completion writes `Ready to Ship`.
- Live Airtable Merchandise data on 2026-08-05: 1 `Matched` and 1 `Validated` record were normalized to `Received`; all 9 live Merchandise records now have `Merch Status = Received`. `Ready to Ship`, `Shipped`, and `Disposed` were added as select choices through typecast. Airtable API rejected pruning old unused select choices, so `Matched` and `Validated` remain manual cleanup targets in Airtable configuration only.
- `backend/.venv/bin/python -m unittest tests.test_intake_decisions tests.test_receiving tests.test_merchandise_review tests.test_merchandise_inventory tests.test_intake_status tests.test_auth tests.test_release_to_production tests.test_frontend_routing` passed, 170 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 199 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Activation/card polish on 2026-08-05: the Planning Activation modal now titles itself as Add or Edit based on context, and `Move to Photo` locally validates that photo Activation deliverables are still selected before calling the backend.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 75 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- Activation flow pass on 2026-08-04: Planning now shows a Topco-only Activations strip for reopening saved Activation drafts, the modal uses Linked Merchandise language, `Save Draft` stores Activation data without moving cards, and `Move to Photo` validates the Activation package before moving linked Merchandise to `Ready for Photo`.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 73 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 195 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Activation UI/removal polish on 2026-08-04: the Planning inline Activations strip was replaced with `Edit Activations` and `Add Activation` actions; `Edit Activations` opens a list modal. Removing a Ready for Photo merchandise item from an Activation and saving now moves that merchandise back to the active Planning/needs-activation area.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 74 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Activation Deliverables selector polish on 2026-08-04: Deliverable buttons now keep a light gray checkmark visible as the click affordance, remove the heavy unselected color outlines, and reserve color/tint for selected state.
- Activation card-linking polish on 2026-08-04: `Edit Activations` now lists only pending-photo packages, and activation-driven Topco cards expose compact `Add to Activation` and `New Activation` actions inside the card modal.
- Activation unlink fix on 2026-08-04: Activation item rows can now be removed down to zero and saved as a draft so linked Ready for Photo cards can be moved back to the active Planning/needs-activation area; `Move to Photo` still requires at least one linked Merchandise item.
- Activation dropdown fix on 2026-08-04: New-item card modals now show pending-photo Topco Activations even when the newly received Merchandise card has incomplete client metadata; Released, Complete, and Cancelled Activations remain excluded.
- Activation save visibility fix on 2026-08-04: saving an Activation draft now confirms the save before list refresh work can fail, merges the saved record into local Planning state immediately, reloads the Activation list, and refreshes Planning board data so newly linked cards and newly created draft Activations appear without a manual page refresh.
- Planning Deliverables selector polish on 2026-08-04: the New-card modal keeps the Deliverables step open after selection so Packaging, Ecomm, and Thr3d remain visible as selectable buttons. The board still changes only through the bottom Finish/Move commit action.
- Activation picker safety on 2026-08-04: the New-card `Pending Activation` dropdown no longer defaults to the first available Activation. PMs must explicitly choose an Activation before `Add to Activation` is enabled.
- Planning Activation action visibility on 2026-08-04: the Planning-board `Edit Activations` and `Add Activation` actions now remain visible whenever Topco exists, instead of disappearing when a non-Topco client filter is active. The action group uses fixed button sizing so the primary `Add Activation` action remains readable.
- Activation orphan guard on 2026-08-04: activation-driven Topco cards without a linked Activation no longer appear in `Ready for Photo` even if their Planning state is stale; manual Ready moves and modal finish now require the Activation link.
- Shipments autosave copy polish on 2026-08-04: the Incoming Shipment details panel removed the unused `Create Shipment` button; adding shipment photos or saving the first merchandise item now starts the Shipment automatically, with visible `Shipment will autosave` / `Shipment autosaved` status.
- Shipments history polish on 2026-08-04: All Shipments now defaults to `List`, has a single `List` / `Date` view control, shows `Previous Week` / `This Week` / `Month` scope controls only in Date view, no longer shows the redundant `By Shipment` / `By Merchandise` toggle, and shipment cards open the existing Incoming shipment editor.
- Shipments list/delete polish on 2026-08-04: All Shipments List now uses flatter table-style rows instead of separate card containers. Empty Shipments expose a Delete row action; deletion is blocked while merchandise entries remain attached.
- Topco Activation form polish verification on 2026-08-04: item cards in the Add Activation modal now have explicit row spacing, Activation input/select/textarea values render at normal weight, and the Activation Deliverables selector remains intentionally limited to Packaging and Ecomm while Thr3d-specific Activation exceptions are undefined.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 47 tests.
- `backend/.venv/bin/python -m unittest tests.test_receiving tests.test_frontend_routing` passed, 89 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Planning card density polish on 2026-08-04: cards stay full-width within columns but no longer render storage or duplicated activation/readiness status treatments; identifier facts are quieter inline text rather than mini field containers.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 48 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Shipments create/autosave correction on 2026-08-04: Incoming Shipments now treats shipment photos as the required first save trigger. The camera and library buttons remain normal photo actions before a Shipment exists; choosing photos creates/saves the Shipment, uploads the photos, and unlocks merchandise entry. After creation, header edits continue to autosave.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 48 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Shipments photo-first affordance on 2026-08-04: shipment photo buttons are active before the Shipment exists and keep the familiar `Take Photo` / `Library` labels. The implementation creates the Shipment after files are selected so PMs do not need to understand the technical save boundary.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 48 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Topco Activations schema/API verification on 2026-08-03: the existing Airtable `Activations` table `tbleD3EuIMJTG2OWT` was expanded with activation fields, renamed to Activation Package language, `/api/activations` can list/create/update activation records, and the frontend exposes activation helpers plus a Topco-only Planning-board `Add Activation` modal with repeatable SKU rows. Topco Planning cards use activation-state chips rather than Required to Shoot previews before activation matching exists. No release automation or workflow routing behavior changed.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 70 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Planning New-card polish verification on 2026-08-03: browser check on `http://localhost:5175/__test/planning-thr3d` confirmed a New queue card keeps the simplified recognition presentation: promoted Time Here, item name, client in the unauthenticated regression fixture, no storage location, no Required-to-Shoot overlay indicators, and no `New Arrival`, `Needs PM review`, or `Deliverables not set` badge copy. Source-contract coverage confirms identifiers still render when present.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 42 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Draft -> Commit Planning modal verification on 2026-07-22: selecting `Thr3d` in the modal updates local draft state and the footer preview to `Will move to Thr3d Shipment`; the background board remains frozen with the card disabled in `New`, and Shipments `THR3D / Outgoing` remains empty until `Finish & Move` is clicked. After `Finish & Move`, the regression route closes the modal, unfreezes the board, and displays the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready for Photo` and `Released: false`.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 42 tests. This now includes source-contract coverage that the Planning modal does not autosave Deliverables, does not call the Deliverables save API from draft selection, uses `Will move to` plus `Finish & Move`, and freezes the board while the modal is open.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 109 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 185 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- The 2026-07-22 `Thr3d` modal crash with `TypeError: Cannot read properties of undefined (reading 'currentQueueName')` was traced to the Planning card read model: modal/drawer code expected `item.planningCard.currentQueueName`, while `buildMerchandisePlanningCard` exposed the same object only as `assignment`. `queueLabel` usually masked this mismatch, but the Thr3d deliverables refresh could expose the missing `planningCard` object. The fix now exposes `planningCard: assignment` and hardens queue lookup so malformed or empty board queue inputs fall back to the canonical Planning queues, including `Thr3d Shipment`.
- Browser verification on a freshly restarted Vite server at `http://localhost:5175/__test/planning-thr3d` exercises the Planning card modal, clicks the visible `Thr3d` deliverable control, keeps the modal mounted and usable, recalculates Required to Shoot as complete, routes to `Thr3d Shipment`, finishes verification, and displays the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready for Photo` and `Released: false`. Console capture after the clean run had no error logs.
- The live `/planning` route on `http://localhost:5175/planning` is served by Vite from `/Users/jbullock/Development/Marks Food Photography/frontend`; the backend on `5057` is served from `/Users/jbullock/Development/Marks Food Photography`. In the Codex in-app browser, the real board remains behind the user PIN selector and no authenticated tab was available to claim, so the authenticated live-card click still needs user-session verification.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 41 tests. This includes a Node-imported regression proving a Thr3d Planning card resolves `planningCard.currentQueueName` to `Thr3d Shipment` even when the supplied board queue list is empty.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 108 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- Browser reproduction on `http://localhost:5173/__test/planning-thr3d` first captured the blank-screen stack as `ReferenceError: DELIVERABLE_TONE is not defined` in `DeliverablesSelector`; after fixing the test hook to use `DELIVERABLE_ROUTE_MAP`, the same browser interaction opened a Planning card, selected `Thr3d`, showed `Will move to Thr3d Shipment`, finished verification, and displayed the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready for Photo` and `Released: false`, with no console errors.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 106 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 182 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- `npm run dev` started Vite on `5173`; an existing Flask dev server was already listening on `5057`.
- Read-only Airtable metadata audit passed and wrote `docs/migrations/2026-07-22-minimal-operating-model-airtable-audit.json`.

The 2026-07-22 terminology pass has targeted build coverage green; final full-suite and route-smoke results are recorded in `docs/migrations/2026-07-22-minimal-operating-model-cleanup.md`.
