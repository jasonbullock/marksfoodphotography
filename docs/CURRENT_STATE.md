# Current State

## Current Focus

Aligning the application with the updated Marks Photo product vision: an Operations Readiness Platform centered on Merchandise.

Marks Photo should transform incoming merchandise into production-ready work. It should remove uncertainty before production begins and should not become a workflow engine, project management tool, Creative Force replacement, or PhotoTrack replacement.

## Foundational Architecture Documents

The current foundational architecture documents are:

- `docs/PRODUCT_VISION.md`
- `docs/WORKSPACES.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DESIGN_PRINCIPLES.md`

These documents define the long-term operating model:

- Workspace means business question.
- Views are different ways to visualize the same merchandise.
- Merchandise is the center of the operational model.
- Readiness matters more than workflow mechanics.
- Inventory is a warehouse perspective.
- Intake is a decision perspective.
- Production is an execution perspective.
- There should be one Release to Production concept.
- Configuration should exist only when multiple clients genuinely require different behavior.

## Confirmed Decisions

- Merchandise is the core operational object.
- Products are supporting information.
- Jobs are supporting information.
- Client requirements determine readiness.
- Operational Readiness is the heart of the product.
- Product Information supports Operational Readiness, Production Execution, and Production Reporting.
- Marks Photo owns operational information needed to execute production and report completed work, but not upstream project management.
- Receiving remains focused on logging physical merchandise.
- Merchandise receipt is the main workflow trigger.
- PMs must not manually create Jobs or Projects.
- Imported product data may be incomplete.
- Review must support Photo, THR3D, Replacement, Waiting, and No Production.
- Ready for Photo must mean that merchandise, data, artwork, and production instructions are complete.
- Activation emails should eventually become structured production instructions.
- Products, Shipments, and Merchandise are the canonical physical Airtable table names.
- Legacy Items, Receipts, and Receipt Entries language may remain only in compatibility code, historical notes, or rollback documentation.
- Cloudflare R2 is the only supported image storage layer; Airtable stores image references and metadata only.
- Merchandise is one physical object. Intake is currently Merchandise-driven; Work Orders and workflow configuration tables are legacy compatibility data, not active PM workflow requirements.

## Current Questions

- How should the Merchandise Workspace merge "match Product" and "enter missing Product information" into one continuous readiness experience?
- Which client requirement fields are authoritative enough today to drive readiness?
- Which reporting references are required for production execution and completed-work reporting?
- How should activation emails become structured readiness inputs?
- What is the smallest Planning workspace that answers "What are we photographing?"
- What is the smallest Production workspace that answers "Where is the work now?"
- What explicit field or event should eventually prove Merchandise has left the studio?

## Next Step

The Intake workspace is now driven by Merchandise state, Product data, Production Type, and Merchandise Resolution. The likely next product step is to define real Production Readiness requirements and the single Release to Production handoff without reintroducing workflow-engine configuration or Work Order creation as a PM prerequisite.

## 2026-07-20 Intake Workflow Simplification

Intake no longer depends on Work Orders, Work Order Types, Workflow Templates, or Workflow Stages for normal user-facing behavior.

What is now true:
- Intake board cards are derived from Merchandise records returned by `GET /api/merchandise/review`.
- The canonical active Intake state is Merchandise-owned:
  - `Merch Status` remains the primary status field, using existing values `Received`, `Matched`, `Validated`, and `Issue`.
  - `Notes` with `[Waiting for Product Data]` remains the existing marker for the Waiting for Information queue.
  - `Production Type = THR3D` drives the Send to THR3D queue.
  - `Production Type` and `Merchandise Resolution` remain the persisted Intake decision fields.
- `PATCH /api/merchandise/<entry_id>/intake-state` and `/api/merchandise/review/<entry_id>/intake-state` update active Intake state from Merchandise fields.
- New Intake actions do not create Work Orders.
- Intake no longer calls frontend Work Order APIs such as `listWorkOrders`, `saveMerchandiseReviewWorkOrders`, or `updateWorkOrder`.
- Admin no longer exposes Workflow Templates or Work Order Types.
- Frontend Workflow Template and Work Order Type API methods and Admin form components were removed from the active client.
- Existing backend Work Order, Workflow Template, Workflow Stage, Work Order Type, and Workstream services/routes remain for historical compatibility.
- The live Airtable schema still contains `Work Orders`, `Workflow Templates`, `Workflow Stages`, `Work Order Types`, and `Workstreams`; no destructive table or field cleanup was run.

What did not change:
- Merchandise Review V1 did not change.
- Merchandise inventory did not change.
- Receiving did not change.
- Product linking, Product editing, Production Type, Merchandise Resolution, board columns, filters, selected-card behavior, detail surfaces, and sticky actions remain in place.
- Readiness rules and Release to Production were not implemented.

Migration artifact:
- `docs/migrations/2026-07-20-workflow-simplification.md`

Validation:
- Read-only Airtable metadata verification confirmed the Merchandise state fields and preserved legacy workflow tables.
- `backend/.venv/bin/python -m py_compile backend/routes.py`
- `backend/.venv/bin/python -m unittest tests.test_intake_decisions`
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing`
- `backend/.venv/bin/python -m unittest tests.test_intake_decisions tests.test_merchandise_review tests.test_frontend_routing tests.test_job_item_schema tests.test_workflow_templates tests.test_work_order_types`
- `backend/.venv/bin/python -m unittest discover -s tests`
- `npm run build` in `frontend/`
- `git diff --check`
- Local route smoke returned HTTP 200 for `/intake`, `/admin`, `/clients`, and `/merchandise` on the running Vite server at port 5175.

Unresolved risks:
- Backend compatibility APIs for Work Orders, Workflow Templates, Workflow Stages, Work Order Types, and Workstreams still exist intentionally. A later cleanup pass must verify historical data and external callers before removing them.
- `workflowEngine.js` still contains compatibility naming such as Work Orders and Workstreams because the active board uses its static gate/card/readiness helpers. A later naming cleanup can simplify those internals after readiness is defined.
- Production Readiness and Release to Production remain unimplemented.

## 2026-07-20 Intake Production Type And Merchandise Resolution

Intake now has its first real persisted decision capability.

What is now true:
- `Production Type` is a single-select field on Merchandise.
- Allowed Production Type values are `eCommerce`, `Packaging`, and `THR3D`.
- `Merchandise Resolution` is a single-select field on Merchandise.
- Allowed Merchandise Resolution values are `Keep at Walnut`, `Ship to Kentucky`, `Hold`, `Replacement Requested`, `Return to Client`, and `Dispose`.
- Live Airtable field IDs are `fldSwUluDDqwe6MVs` for `Production Type` and `fldbZ64EUZdWZS5nW` for `Merchandise Resolution`.
- `backend/ensure_intake_decision_fields.py` is idempotent. The first live run created both fields; the second live run reused both and created nothing.
- Merchandise API serialization includes `production_type`, `productionType`, `merchandise_resolution`, and `merchandiseResolution`.
- `PATCH /api/merchandise/<entry_id>/intake-decisions` and `PATCH /api/merchandise/review/<entry_id>/intake-decisions` save Intake decisions with server-side validation.
- Empty values remain allowed.
- Unknown values are rejected.
- Setting Production Type to `THR3D` defaults Merchandise Resolution to `Ship to Kentucky` only when the current resolution is blank.
- Existing resolutions are not overwritten, and changing away from THR3D does not erase the resolution.
- Intake UI decision surfaces now show editable `Production Type` and `Merchandise Resolution` selects.
- The New Items modal no longer creates Work Orders; Production Type remains a Merchandise-level Intake decision.

What did not change:
- No new configuration tables were created.
- Workflow Templates, Workflow Stages, Work Order Types, Work Orders, and Workstreams were not removed or expanded.
- Backend Work Order API routes did not change.
- Readiness rules, Release to Production, replacement records/chains, client-specific options, workflow transitions, workflow actions, scheduling, resources, and Production workspace behavior were not implemented.
- `Replacement Requested` is only a Merchandise Resolution value in this phase.

Migration artifact:
- `docs/migrations/2026-07-20-intake-production-type-resolution.md`

Validation:
- `backend/.venv/bin/python backend/ensure_intake_decision_fields.py` created both fields on first run.
- `backend/.venv/bin/python backend/ensure_intake_decision_fields.py` reused both fields and created nothing on second run.
- Live schema read-back confirmed both fields and exact allowed options.
- `backend/.venv/bin/python -m unittest tests.test_intake_decisions tests.test_merchandise_review tests.test_frontend_routing tests.test_workflow_templates tests.test_work_order_types tests.test_job_item_schema`
- `backend/.venv/bin/python -m unittest discover -s tests`
- `npm run build` in `frontend/`
- `git diff --check`

## 2026-07-20 Intake Workspace Alignment

The former user-facing Work workspace is now framed as Intake, matching the Operations Readiness Platform model.

What is now true:
- Primary navigation is Dashboard, Import, Receiving, Merchandise, Intake, Jobs, and Products.
- `/intake` is the canonical frontend route for the PM readiness workspace.
- `/work` redirects to `/intake` for compatibility.
- `/merchandise-review-v2` redirects to `/intake` for compatibility.
- `/merchandise/review` remains routable for the V1 Merchandise Review workflow and is not the Intake workspace.
- Merchandise at `/merchandise` remains the read-only physical inventory browser.
- This alignment phase originally reused the existing Merchandise Review V2 board implementation, Work Order APIs, workflow stages, filters, drag/drop behavior, and save behavior. The later Intake Workflow Simplification phase supersedes that active Work Order dependency.
- Work Orders, Workflow Templates, Workflow Stages, and Work Order Types remain backend/Airtable compatibility infrastructure and were not renamed or removed.
- The Intake detail surfaces now group existing information around Product, Production, Merchandise, and Readiness.
- Production Type and Merchandise Resolution were placeholder areas during this alignment pass, then became real persisted Merchandise fields in the Intake decision phase documented above. Production Readiness remains a restrained placeholder.

What did not change:
- No backend routes changed.
- No Airtable schema changed.
- No Work Order API contract changed during this alignment phase.
- No workflow transition logic changed.
- No Production workspace behavior was added.

Validation:
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing`
- `backend/.venv/bin/python -m unittest discover -s tests`
- `npm run build` in `frontend/`
- `git diff --check`

## 2026-07-20 Primary Navigation Label Polish

The primary navigation now uses the singular label `Import` for the existing `/imports` workspace.

What changed:
- The primary navigation order from this polish pass was Dashboard, Import, Receiving, Merchandise, Work, Jobs, and Products. The later Intake alignment supersedes the Work label and route ownership.
- Admin remains separated as the right-side utility navigation item beside the logged-in user.
- Primary navigation icon mapping is Dashboard unchanged, Import uses Lucide `Download`, Receiving uses Lucide `PackageOpen`, Merchandise uses Lucide `ClipboardList`, Work uses Lucide `Workflow`, Jobs uses Lucide `Layers`, Products uses Lucide `Tag`, and Admin unchanged.

What did not change:
- Routes did not change.
- Backend behavior did not change.
- Workflow logic did not change.
- Import page headings and route titles were not renamed in this polish pass.

Validation:
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `npm run build` passed in `frontend/`.

## 2026-07-20 Import Step Badge Polish

The Import page wizard step badges are visually larger and more prominent.

What changed:
- Import wizard status badges now have larger text, taller pill height, wider horizontal padding, and a stronger active border.

What did not change:
- Import routes did not change.
- Backend behavior did not change.
- Import workflow logic did not change.

## 2026-07-20 Work Workspace And Work Orders

This section records the earlier Work naming phase. The later Intake alignment supersedes Work as the user-facing workspace name and `/work` as the canonical frontend route. Work Orders remain the internal/backend work item.

What is now true:
- Primary navigation during this phase was Dashboard, Import, Receiving, Merchandise, Work, Jobs, and Products.
- Admin remains a utility navigation item on the right side of the top navigation.
- Merchandise at `/merchandise` remains the read-only physical inventory browser.
- Work at `/work` was the experimental PM workflow board during this phase.
- `/merchandise-review-v2` redirected to `/work` for compatibility during this phase.
- `/merchandise/review` remains routable for the V1 Merchandise Review workflow but is hidden from primary navigation.
- Primary navigation active-state matching was intentionally scoped so only one primary tab could be active at a time. `/merchandise/review` did not activate Merchandise, and `/work` or `/merchandise-review-v2` activated only Work during this phase.
- The first visible Work board stage was `Review`. The stable internal stage ID remains `new-review` for compatibility.
- Work cards represent Work Orders and display linked Merchandise information plus the Workstream prominently.

Live Airtable schema:
- `Work Orders` table: `tbl9EkXDtQSc8CEyL`, renamed in place from `Workstream Assignments`.
- Primary field `Work Order`: `fldAiYGCELRCY3bYh`, renamed in place from `Assignment`.
- `Current Stage`: `flddqh4KN4j6FflKW`, renamed in place from `Current Gate`.
- Merchandise reciprocal linked field `Work Orders`: `fldkhfsFwylhVxLOc`.
- Workstreams reciprocal linked field `Work Orders`: `fldELg7iuoGAiCIe9`.
- Jobs reciprocal linked field `Work Orders`: `fldBhvmbf2p3sW4Wk`.

Backend/API:
- Canonical table constant is `WORK_ORDERS_TABLE`, defaulting to `Work Orders`.
- `WORKSTREAM_ASSIGNMENTS_TABLE` remains a deprecated one-cycle alias.
- Canonical endpoints are `GET /work-orders`, `POST /merchandise/review/<entry_id>/work-orders`, and `PATCH /work-orders/<work_order_id>`.
- Deprecated endpoints for `workstream-assignments` remain as compatibility aliases for one cycle.
- The backend accepts `currentStage` and the deprecated `currentGate` payload key, then writes Airtable `Current Stage`.

Current caveats:
- Some internal Workflow Engine compatibility names still use `gate`/`currentGate` to avoid changing every existing transition helper at once. User-facing Work language uses Stage.
- Deprecated Airtable photo attachment fields still physically exist but remain empty/protected under the R2-only migration. They were not deleted in this navigation/domain rename.

Validation:
- `backend/.venv/bin/python -m unittest discover -s tests` passed.
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `backend/.venv/bin/python -m unittest tests/test_job_item_schema.py` passed.
- `npm run build` passed in `frontend/`.
- `git diff --check` passed.
- Local route smoke checks returned HTTP 200 for `/merchandise`, `/work`, `/merchandise-review-v2`, `/merchandise/review`, and `/admin` on the running Vite server at port 5175.
- Raw unauthenticated API smoke for `/api/work-orders` returned HTTP 401, as expected without the browser session cookie.
- Read-only Airtable metadata verification confirmed `Work Orders` table/field IDs and reciprocal links.
- Read-only Airtable record verification confirmed the `Work Orders` table is readable; it currently contains 0 returned records.

## 2026-07-20 Merchandise Review V2 New Items for Review Workspace

The experimental Merchandise Review V2 `New Items for Review` gate now has a more operational image-first modal for the first PM workflow decision.

What is now true:
- The large modal remains the workspace for `New Items for Review`; this gate was not moved to a drawer.
- The left side stays image-first with the R2-backed main image, thumbnail strip, previous/next image navigation, zoom controls, image counter, and lightbox.
- The right side now follows the intended decision order: Merchandise Summary, Product Identification, Workstreams, Assignment Preview, Readiness Summary, Notes.
- Merchandise Summary is read-only and shows Shipment, Client, Observed Package Name, Observed Identifier, Quantity, Storage, Condition, and Time Here.
- Product Identification shows the linked Product, product summary fields, Product search, Product linking, and the ability to create and link an incomplete Product when an identifier is available.
- Product Identification uses existing Product and Merchandise Review linking endpoints. It does not duplicate Product data onto Merchandise.
- Workstreams remain multi-select and are limited to the active V2 Workstreams loaded from the backend, with the code registry as fallback.
- Assignment Preview is generated from the Workflow Engine and shows the selected Workstream, Workflow, Initial Stage, and an `Already Assigned` indicator for existing active Workstream Assignments.
- Readiness Summary is shown independently for each selected Workstream Assignment being created or reused. Each selected Workstream displays the Product Information, Artwork, and Activation readiness requirements.
- Saving persists Workstream Assignments, reuses existing Merchandise + Workstream assignments, avoids duplicate assignment creation, refreshes Merchandise Review V2 data, refreshes readiness/transition recommendations, and remains on the current Merchandise by selecting the saved assignment.
- Save & Continue saves, then opens the next Merchandise in the same current queue while preserving the board filters and position.
- Existing active Workstream Assignments are preserved during save even if they were already present before this modal opened.

What did not change:
- Merchandise Review V1 did not change.
- Merchandise Inventory did not change.
- Receiving did not change.
- Products page behavior did not change.
- Existing backend schema did not change.
- Packaging, THR3D downstream workflows, production synchronization, and assignment audit logging remain future work.

Validation:
- `npm run build` passed in `frontend/`.
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `git diff --check` passed.

## 2026-07-20 Merchandise Review V2 Waiting for Information Workspace

The experimental Merchandise Review V2 `Waiting for Information` gate now has a focused assignment workspace in the existing right-side drawer.

What is now true:
- The `Waiting for Information` drawer operates on the selected Workstream Assignment, not on Merchandise as the workflow object.
- The drawer header and summary show Workstream, Merchandise, Client, Current Gate, Current Readiness, and linked Product state.
- The drawer contains focused sections for Missing Information, Product Information, Artwork, Activation, Notes, and Readiness Summary.
- Missing Information lists only unresolved readiness requirements and explains why each requirement blocks progression.
- Product Information can search existing Products, link a Product through the existing Merchandise Review match endpoint, update existing Product fields, and create/link an incomplete Product only when an identifier is available.
- Product edits use existing Product fields and endpoints. Product data is not duplicated onto Merchandise.
- Artwork shows whether artwork is required, whether it is available, and the current artwork status. Artwork override remains intentionally unimplemented in this drawer pass.
- Activation shows existing Job, Activation, Campaign, and activation readiness information from supported Product/reference data fields.
- Notes shows existing Merchandise Notes and Product Notes. No new assignment-notes schema was introduced.
- Readiness Summary preserves the Product Information, Artwork, and Activation indicators and displays current color, reason, missing fields, and suggested resolution.
- The sticky footer supports Save, Save & Continue, and Workflow Engine-provided valid next gates.
- Save updates the existing Workstream Assignment current status, readiness metadata, and blocking requirements, then reloads V2 data. If another gate is valid, the drawer reports `Ready for: <Next Gate>` but does not automatically move the assignment.
- Save & Continue saves the current assignment and opens the next Workstream Assignment in the same current gate queue.
- The Workflow Engine configuration for `Waiting for Information` now declares Notes instead of Issues as the drawer section for this gate.

What did not change:
- Merchandise Review V1 did not change.
- Merchandise Inventory did not change.
- Receiving did not change.
- Backend routes, Airtable schema, Workflow Engine infrastructure, Packaging workflow, THR3D downstream workflow, and Creative Force integration did not change.

Current caveats:
- Assignment audit logging is still future work.
- Assignment-specific editable notes are not available because no such Airtable field exists yet.
- Product creation still follows the existing Product API validation rules, so an identifier is required before creating an incomplete Product.

Validation:
- `npm run build` passed in `frontend/`.
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `git diff --check` passed.

## 2026-07-20 R2-Only Image Storage Migration

The approved R2-only image storage migration has been completed.

What is now true:
- Cloudflare R2 is the single source of truth for merchandise, shipment, product, review, production, and delivery images.
- Airtable image-bearing records store lightweight references only, primarily in `Photo Metadata`.
- Canonical image manifest entries store stable R2 `object_key` values plus ordering and file metadata.
- The backend resolves display URLs from R2 object keys when records are loaded.
- The application no longer writes Airtable image attachment arrays.
- The application no longer reads Airtable image attachments as durable image storage.
- Receiving photo upload storage mode is R2-only; local receiving-photo storage is rejected.
- Shipment-level Airtable photo attachment payloads are no longer created.
- Merchandise photo uploads update `Photo Metadata` only.
- Product photo merges copy R2 metadata references only.
- Issue creation no longer copies Merchandise attachments into Issues.
- The Airtable write client strips `Photos` and `Deprecated Airtable Photos - Do Not Use` from create/update payloads as a final guard.

Live Airtable cleanup:
- Products `Photos` attachment field: 1 record / 4 attachments verified in R2, metadata canonicalized, attachment values cleared.
- Merchandise `Photos` attachment field: 3 records / 6 attachments verified in R2, metadata canonicalized, attachment values cleared.
- Shipments `Photos` attachment field: 0 records / 0 attachments.
- Issues `Photos` attachment field: 0 records / 0 attachments.
- Post-migration audit confirmed 0 attachment values in Products, Shipments, Issues, and Merchandise.
- The former attachment fields were renamed to `Deprecated Airtable Photos - Do Not Use` and described as deprecated.

Migration artifacts:
- `docs/migrations/2026-07-20-r2-only-image-storage.md`
- `docs/migrations/2026-07-20-r2-only-image-storage-report.json`

Verification:
- `backend/.venv/bin/python -m unittest tests/test_receiving.py tests/test_merchandise_review.py tests/test_merchandise_inventory.py`
- Authenticated API smoke checks for `/api/merchandise`, `/api/merchandise/review`, `/api/products`, and `/api/receiving/photo-storage/status`.

Current caveats:
- The deprecated Airtable attachment fields still physically exist because destructive field deletion is not reliable through the Airtable API in this environment. They are empty, renamed, documented as deprecated, and protected by backend write guards.

## 2026-07-20 Workstream Assignment Foundation

The V2 workflow model now separates the physical Merchandise record from operational Workstream Assignments.

What is now true:
- Workstream is a configured kind of production work.
- Workstream Assignment is the operational work item connecting one Merchandise record to one Workstream.
- One Merchandise record may have multiple Workstream Assignments.
- Merchandise is not duplicated when it needs Ecomm Photo and Packaging Photo work.
- The initial active Workstreams are exactly Ecomm Photo, Packaging Photo, and THR3D.
- Merchandise Review V2 reads Workstream definitions from the backend and falls back to the code registry only if the table is unavailable.
- The New Items for Review modal uses a multi-select Workstreams control.
- The assignment preview is generated from Workflow Engine configuration and shows Workstream label, workflow name, and initial gate.
- Saving from the V2 modal creates or updates durable Workstream Assignment records.
- Deselected persisted assignments are cancelled rather than silently deleted.
- V2 board cards can represent Workstream Assignments and display both linked Merchandise information and the Workstream label.
- Assignment movement updates the Workstream Assignment current gate/status/owner/readiness/blocker metadata.
- Browser-local V2 Workstream decisions are legacy fallback hints only and are replaced by durable assignments on save.
- The Product `Workstream` single-select field remains a compatibility bridge for imported Product routing values, not the final V2 workflow state.

Live Airtable schema added:
- `Workstreams` table: `tblnLXigd19VBMFcz`
- `Workstream Assignments` table: `tbl9EkXDtQSc8CEyL`

Seeded Workstream records:
- Ecomm Photo: `receJrKONodoL97kh`
- Packaging Photo: `reck5ZjD9Flay990T`
- THR3D: `rec8ChTv3qARXrJus`

What did not change:
- Merchandise Review V1 did not change.
- Merchandise Inventory did not change.
- Receiving behavior did not change.
- Creative Force integration did not change.
- R2-only image storage did not change.
- Full downstream Ecomm, Packaging, and THR3D production workflows were not built.

Current caveats:
- Admin configuration for client-specific Workstream availability is not built yet.
- Audit logging for Workstream Assignment changes is not built yet.
- Readiness is assignment-aware in the V2 architecture, but the first implementation still reuses the existing Merchandise/Product readiness evaluators where applicable.
- Creative Force synchronization and Job creation remain future work.

Migration artifact:
- `docs/migrations/2026-07-20-workstream-assignments.md`

## 2026-07-20 Workstream Domain Rename

The foundational domain-language refactor from Output/Production Path to Workstream has been applied.

What is now true:
- Workstream is the first-class Workflow Engine concept for production routing decisions.
- The live Airtable Products field `Output Type` was renamed in place to `Workstream`.
- The Airtable field ID was preserved: `fldSl0Ctmp7dWtJUO` on Products table `tblC9Tu69BEOIy6Q4`.
- Existing single-select choices and existing record values were preserved.
- Backend configuration now maps `F_ITEM_WORKSTREAM` to `Workstream`; `F_ITEM_OUTPUT` remains a compatibility alias to the same field.
- Product API payloads expose `workstream` while preserving the legacy `output` alias for compatibility.
- Merchandise Review V2 no longer uses a single-select Primary Workstream decision as durable workflow state.
- The V2 Workstream registry was superseded by exactly Ecomm Photo, Packaging Photo, and THR3D in the Workstream Assignment foundation.
- Required Outputs and Production Path are no longer modeled in the V2 review UI or Workflow Engine.
- Deliverables remain downstream production concepts and are intentionally not modeled in this iteration.

Current caveats:
- The Product `Workstream` single-select field preserves legacy imported Product values as compatibility data.
- Durable V2 workflow state now lives in Workstream Assignment records.
- Airtable rejected a Metadata API attempt to extend the single-select choices with the new Workstream choices. The in-place field rename succeeded and existing values remain intact.

Migration artifact:
- `docs/migrations/2026-07-20-output-to-workstream.md`

## 2026-07-20 Live Airtable Domain Rename

The approved live Airtable physical schema migration has been completed.

What is now true:
- `Items` was renamed in place to `Products`.
- `Receipts` was renamed in place to `Shipments`.
- `Receipt Entries` was renamed in place to `Merchandise`.
- Table IDs were preserved:
  - Products: `tblC9Tu69BEOIy6Q4`
  - Shipments: `tblnDJYWtYvgEunVM`
  - Merchandise: `tblWALCoKwvT6Nl8A`
- Core relationship fields were renamed to Product, Products, Shipment, Shipments, and Merchandise where they reflect those canonical entities.
- Merchandise observation fields now use `Observed Package Name`, `Observed Identifier`, and `Storage Location`.
- Application defaults now point to the renamed physical tables:
  - `PRODUCTS_TABLE = "Products"`
  - `SHIPMENTS_TABLE = "Shipments"`
  - `MERCHANDISE_TABLE = "Merchandise"`
- Deprecated compatibility aliases remain for one migration cycle:
  - backend constants such as `ITEMS_TABLE`, `RECEIPTS_TABLE`, and `RECEIPT_ENTRIES_TABLE`
  - frontend/API payload names such as `listItems`, `listReceipts`, `itemIds`, and `receiptIds`
  - Airtable single-select choices that still physically exist, including `Unknown Item` and `Item Created`

Pre-migration baseline:
- Products/Items: 18 records.
- Shipments/Receipts: 2 records.
- Merchandise/Receipt Entries: 3 records.

Post-migration verification:
- Products, Shipments, and Merchandise still have 18, 2, and 3 records after cleanup of smoke-test records.
- Primary fields retain their field IDs:
  - Products `Product Name`: `fld96N7hMpncFfXhJ`
  - Shipments `Shipment`: `fldmc1GLRF7aADXQJ`
  - Merchandise `Observed Package Name`: `fldXCqOarj5rBAYyj`
- Linked-record fields retain linked table IDs and inverse field IDs.
- Products calculated fields remain valid:
  - `Identifier Type`
  - `CF Product Name`
  - `CF Category`
- Airtable webhooks remain empty.
- Photo attachments have been migrated to R2-only metadata. Deprecated attachment fields remain empty.
- Local route smoke checks returned HTTP 200 for `/shipments`, `/merchandise`, `/merchandise/review`, `/merchandise-review-v2`, `/products`, `/imports`, `/settings`, and `/clients`.
- Live application smoke tests created a temporary Shipment and Merchandise record, matched the Merchandise to an existing Product, read the Receiving/Merchandise/Review endpoints, imported one temporary Product row, and deleted the temporary Shipment, Merchandise, Product, Job, Import, and History records.

Migration artifact:
- `docs/migrations/2026-07-20-airtable-domain-rename.md` records the audit, table and field IDs, verification checklist, and rollback procedure.

Current caveats:
- Airtable Metadata API access in this environment did not expose full Interfaces, Automations, embedded scripts, or external integrations. Repository code and environment settings did not reference Airtable automation/interface IDs.
- Stored Airtable choice values such as `Unknown Item` and `Item Created` were not renamed in this pass because they are data choices, not table/field schema names, and changing them requires a separate compatibility review.

## 2026-07-16 Product Vision Update

`docs/PRODUCT_VISION.md` now defines Marks Photo as Walnut Studio's operational readiness system.

New canonical direction:
- Marks Photo is not project management, a PIM, or a system of record.
- Marks Photo begins when Merchandise exists.
- Merchandise is the operational object moving through the studio.
- Products and Jobs support Merchandise readiness; they are not the center of the app.
- Product Information has three responsibilities: Operational Readiness, Production Execution, and Production Reporting.
- Reporting references such as Job Number, Client Project Number, External Reference, Service Type, Activation, and Deliverable Type are operational references, not project-management fields.
- Marks Photo is expected to become the operational reporting source for Walnut Studio.
- Users should not perform database work such as matching, linking, importing, or deciding whether to create versus reuse Product records.
- If supporting information exists, reuse it automatically.
- If supporting information does not exist, collect only the minimum missing operational information needed for readiness, execution, and reporting.
- Client requirements define operational readiness.
- Status should communicate blockers, not workflow jargon.
- Marks Photo owns the operational middle: Receiving, Merchandise Workspace, Planning, Production, Photography / THR3D, and Disposition.
- Marks Photo does not own project planning, client communication, budgeting, approvals, or project task management. Those systems may provide operational references that Marks Photo consumes.

## 2026-07-16 Gap Analysis Against Product Vision

### 1. Features Already Aligned

- Merchandise receipt is already the main workflow trigger.
- `/shipments` focuses on receiving physical goods.
- `/merchandise` gives read-only visibility into physical Merchandise currently believed to be on the shelf.
- `/merchandise/review` is already Merchandise-centered and visually oriented around Merchandise photos and physical facts.
- Backend aliases and frontend vocabulary have moved the user-facing model toward Shipments, Merchandise, Products, and Merchandise Review without Airtable renames.
- Inventory and Review are separate surfaces, preserving the distinction between shelf visibility and decision work.
- Client records already exist and include operational settings/requirements that can become the readiness rule source.
- Existing readiness logic already evaluates Product readiness and blockers, even though it is still Product-shaped.
- Excel export and shared table foundations support operational reporting without turning cards/queues into spreadsheets.
- Product and Job fields already carry some reporting references that can be reinterpreted as operational reporting identifiers instead of project-management ownership.

### 2. Features That Should Be Renamed

- `/merchandise/review` should likely become the broader Merchandise Workspace in navigation and page identity once it supports information completion, not only review.
- "Products" should remain available as supporting reference data, but should not feel like a primary workflow destination for normal operations.
- "Jobs" should be reframed as supporting production/reporting reference context or eventually hidden from primary navigation unless it directly answers a production or reporting question.
- Import labels should deemphasize creating Jobs/Products and emphasize bringing in supporting information for Merchandise readiness.
- Readiness/status labels should move away from workflow jargon such as Validated, Matched, or Waiting for Product Data where a blocker label would be clearer.

### 3. Features That Should Be Redesigned

- Merchandise Review should become a continuous Merchandise Workspace where users identify Merchandise, reuse existing Product information when available, enter missing information when needed, and see readiness blockers in one flow.
- The current Product search/match panel still exposes matching as a user task; the future experience should make reuse/create feel automatic and continuous.
- Import flow currently creates and reuses Jobs and Products explicitly. It should be redesigned as supporting-information ingestion, not a workflow prerequisite.
- Client Requirements should become the visible readiness rule editor for each client.
- Production reporting should be designed around operational references attached to Merchandise/Product information and production activity, not around full project-management ownership.
- Dashboard should be redesigned around "What needs attention?" with Merchandise readiness blockers as the primary queue model.
- Planning should be introduced or reshaped around "What are we photographing?" rather than Jobs as administrative containers.
- Production should be introduced or reshaped around "Where is the work now?" rather than generic Product or Job status maintenance.
- Disposition needs an authoritative physical-presence mechanism before Inventory can claim exact shelf accuracy.

### 4. Features That Are Out of Scope

- Complete project management.
- Full Product Information Management.
- Full Product or Job system of record ownership.
- Project planning, client communication, budgeting, approvals, and project task management.
- Work before Merchandise exists.
- Work after production completion, except enough disposition data to know whether Merchandise remains in the studio.
- Manual administrative record creation solely to make the application understand work.
- Separate user-facing workflows for "Match Product" versus "Create Product."

### 5. Recommended Navigation And Workspace Changes

Future navigation should be organized around operational questions:
- Dashboard: What needs attention?
- Receiving: What arrived?
- Merchandise: What information is missing and what should happen next?
- Planning: What are we photographing?
- Production: Where is the work now?
- Inventory: What physical Merchandise is here?
- Clients: What rules determine readiness?
- Settings: System/user administration.

Products, Jobs, Imports, and technical Airtable diagnostics should become supporting or administrative surfaces, not primary workflow anchors, unless a user role specifically needs them for readiness, production execution, or reporting.

The next workspace investment should be the Merchandise Workspace. It should combine the current review station with readiness blockers and minimal missing-information entry, while keeping Inventory read-only and preserving the existing compatibility schema until the operating model is proven.

The next reporting investment should define the minimum production reporting dataset: Client, Job Number, Product, Service Type, Production Dates, Photographer, Production Status, Deliverables, Time, and Disposition.

## 2026-07-16 Application Shell Implementation State

The frontend now uses a top-navigation application shell aligned to the product vision.

Primary desktop navigation is operational rather than database-oriented:
- Dashboard
- Receiving
- Merchandise
- Planning
- Production

Admin is visually separated from the primary operational navigation for authorized users. Settings, Profile, and Sign Out live in the authenticated user menu. Products, Jobs, Clients, Issues, Imports, and Airtable-oriented tables are not primary navigation destinations, though existing routes remain available for compatibility, administration, support, and incremental migration.

The current shell implementation adds shared workspace primitives in `frontend/src/App.jsx` and `frontend/src/styles.css`:
- `TopNavigation`
- `WorkspaceHeader`
- `WorkspaceLayout`
- `QueuePanel`
- `WorkspaceCanvas`
- `InspectorPanel`
- `PanelCollapseButton`
- `SearchControl`
- `FilterControl`
- `ViewSwitcher`
- `StatusBadge`
- `CountBadge`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `CardShell`
- `MediaThumbnail`
- `MetadataRow`
- `ActionBar`

The shared workspace layout establishes the target three-region pattern:
- contextual Queue panel
- main Workspace canvas
- contextual Inspector panel

The left panel is now a contextual queue area, not global navigation.

Responsive behavior:
- desktop uses top navigation and can show queue, canvas, and inspector regions together
- tablet/mobile collapses primary navigation into a drawer
- workspace panels stack or collapse rather than compressing into unreadable columns

New placeholder routes exist for `/planning` and `/production` so the primary operational navigation resolves without fabricating backend workflow data. These placeholders use the shared workspace shell but do not implement planning or production business logic yet.

Preserved compatibility:
- `/merchandise` remains the physical Inventory route.
- `/merchandise/review` remains the current Merchandise Review workspace.
- `/products`, `/jobs`, `/clients`, `/imports`, and admin routes remain available.
- legacy redirects remain available.
- Airtable tables, backend payloads, readiness logic, and workflow states were not renamed or changed.

## 2026-07-16 Implementation State

Phase 1 of the in-place domain migration has started.

What is now true:
- The existing Airtable table names remain unchanged.
- Backend compatibility aliases describe the current tables as:
  - Receipts = Shipments
  - Receipt Entries = Merchandise
  - Items = Products
- Additive API route names were introduced beside old routes:
  - `/api/shipments`
  - `/api/merchandise`
  - `/api/merchandise/review`
  - `/api/merchandise/products`
  - `/api/products`
- `/verification` remains available in the frontend as a redirect to `/merchandise/review`.
- The PM review surface is now presented as Merchandise Review.
- Core user-facing receiving/review language now uses Shipments, Merchandise, Products, Package Name, and Barcode or ID Number.

What did not change:
- Airtable tables or fields were not renamed.
- Jobs/import behavior was not made optional yet.
- History writes were not removed.
- The full Merchandise Review decision tree was not implemented.
- No new workflow tables were created.

Current implementation caveat:
- Some code variables, tests, import mappings, and admin/developer copy still use legacy names where they map directly to physical Airtable fields or existing implementation details.

## 2026-07-16 Phase 2 Implementation State

Phase 2 continued the in-place migration by making the primary frontend workflow use canonical business language and routes.

Canonical frontend routes are now:
- `/dashboard`
- `/imports`
- `/imports/history`
- `/shipments`
- `/merchandise/review`
- `/products`
- `/jobs`
- `/jobs/new`
- `/clients`
- `/settings`

Legacy redirects retained for compatibility:
- `/receiving` redirects to `/shipments`
- `/receipts` redirects to `/shipments`
- `/verification` redirects to `/merchandise/review`
- `/items` redirects to `/products`
- `/intake` redirects to `/imports`
- `/intake/import-history` redirects to `/imports/history`

Primary navigation language now uses:
- Dashboard
- Imports
- Shipments
- Merchandise Review
- Products
- Jobs
- Clients
- Settings

Migrated frontend pages now use additive API aliases where practical:
- Shipment listing uses `/api/shipments`.
- Product listing/detail uses `/api/products`.
- Merchandise Review listing/search/match/validate uses `/api/merchandise/*` aliases.

Compatibility details:
- Airtable table and field names remain unchanged.
- Old backend routes remain available.
- Jobs/import behavior is unchanged.
- Existing response shapes are unchanged.
- Some internal variable names still reference receipts, items, SKUs, or verification where they reflect physical Airtable tables, old backend compatibility routes, or a future refactor boundary.

## 2026-07-16 Phase 3 Implementation State

Phase 3 added a centralized frontend vocabulary layer for user-facing domain language while preserving Airtable and backend compatibility.

What is now true:
- `frontend/src/domainVocabulary.js` defines shared labels for Products, Shipments, Merchandise, Merchandise Review, Package Name, Barcode or ID Number, Product Job Number, and related field/table helpers.
- Primary navigation and page titles consume the shared vocabulary for Shipments, Merchandise Review, and Products.
- Import mapping still preserves internal Airtable field keys such as `Item Name` and `Item Job Number`, but the UI now presents the user-facing meaning as Product Name and Product Job Number.
- Import mapping distinguishes source spreadsheet columns, destination fields, and Airtable technical field names.
- Admin/developer tools distinguish business meaning from physical Airtable table names, for example Products with `Airtable table: Items`.
- Receiving, dashboard, product, import, and Merchandise Review messages were tightened toward Product, Shipment, and Merchandise vocabulary.

What did not change:
- Airtable tables or fields were not renamed.
- Backend payload keys were not renamed.
- Old compatibility routes remain available.
- Jobs/import behavior remains unchanged.
- Internal variable names and CSS class names may still reference receipts, items, SKUs, or verification where they protect compatibility or indicate a future refactor boundary.

Current implementation caveat:
- The vocabulary layer is intentionally lightweight and only covers recurring domain terms. It is not a localization framework.

## 2026-07-16 Merchandise Inventory Implementation State

Added a simple Merchandise Inventory surface for physical goods currently held by the studio.

What is now true:
- The canonical inventory route is `/merchandise`.
- Primary navigation shows Inventory between Shipments and Merchandise Review.
- Inventory is the user-facing navigation label and page title for the physical Merchandise Inventory page; the route remains `/merchandise`.
- `/merchandise` is distinct from `/merchandise/review`.
- The backend exposes `GET /api/merchandise` as an inventory endpoint over existing Receipt Entry / Merchandise records.
- The inventory endpoint enriches Merchandise with existing Shipment, Client, Product, Location, received date/time, age, and derived operational status data.
- The page supports Card and List views.
- The selected Merchandise Inventory view persists in localStorage through the shared stored-state helper.
- Card view shows only Merchandise thumbnail, compact over-image age badge, Package Name, operational Status badge, Barcode or ID Number, Client, and Quantity.
- Card age badges use compact labels such as `1d`, `5d`, and `45d`; unknown age displays as `—`.
- Card view intentionally does not show Date Received, Matched Product, Condition, Shipment, Storage Location, or a separate status field.
- List view shows the full inventory detail set: Package Name, Barcode or ID Number, Client, Quantity, Storage Location, Status, Days Here, Time Here, Date Received, Matched Product, Matched Product ID, Shipment, Tracking, and Condition.
- Time Here is calculated from the linked Shipment received date/time and is never fabricated when the date is missing or invalid.
- Time Here labels use Today, day counts, week counts for the 15-30 day window, or Unknown.
- Inventory age groups are 0-7 days, 8-14 days, 15-30 days, More than 30 days, and Unknown.
- Default inventory sorting is oldest merchandise first, with unknown ages last.
- Inventory filtering supports search, client, status, storage location, and age groups.
- The page includes a restrained shelf summary for Total on Shelf, More Than 30 Days, Storage Locations, and Unknown Age.
- Merchandise records are compact read-only cards in Card view and detailed rows in List view.
- Merchandise Inventory exports the currently filtered and sorted visible table data to `.xlsx` from either Card or List view.
- The inventory page intentionally does not show review actions or action-oriented summary metrics. Review and issue work remains in `/merchandise/review`.
- Shared CSS primitives have started for reusable inputs, selects, filter bars, and cards through `ui-input`, `ui-select`, `ui-filter-bar`, and `ui-card`.
- Shared frontend table foundations now include a `ViewToggle`, `DataTableToolbar`, `ExcelExportButton`, sortable table affordance, and reusable Excel export utility backed by the maintained `xlsx` package.
- Persistent data tables with reusable Excel export buttons now include Merchandise Inventory, Jobs, Products, Import History, Client Requirements, and Users list view.
- Import preview and validation tables remain editing/mapping surfaces and were not converted to exportable persistent data tables in this pass.
- Settings is no longer duplicated in primary navigation. It is accessed from the persistent bottom user/profile area.

What did not change:
- Airtable tables and fields were not renamed.
- No inventory tables, history tables, or removal tracking fields were added.
- Merchandise Review remains at `/merchandise/review`.
- Legacy verification routes remain available.

Current inventory caveat:
- The current schema does not expose one reliable dedicated field for "removed from shelf," disposed, returned, or shipped out. Inventory excludes explicit removal-like Merchandise statuses and cancelled linked Products when those values exist. Otherwise, it uses the safest existing status logic and treats the Merchandise as physically present.
- Completed merchandise is not excluded merely because the linked Product is complete, because completed physical samples may still remain on the shelf.

## 2026-07-16 Phase 5 Merchandise Review Implementation State

Simplified and completed the first Merchandise Review workspace around the existing Receipt Entry / Merchandise records.

What is now true:
- Merchandise Review remains at `/merchandise/review`.
- Merchandise Inventory remains separate at `/merchandise`.
- The review queue uses four operational states:
  - Needs Review
  - Waiting for Product Data
  - Validated
  - Issue
- The review page shows Package Name, Barcode or ID Number, Client, Shipment, Date Received, Time Here, Quantity, Storage Location, Condition, Notes, and Merchandise-level receiving photos.
- Receiving photos are displayed from the Merchandise / Receipt Entry record, not from the Shipment header.
- The Product Match panel shows the current matched Product when available, including Product Name, Product Code, Product Job Number, Brand, Description, Product Status, and readiness.
- Product search is performed through the additive Merchandise Review Product API and remains client-filtered by existing backend access controls.
- Primary review action is now Validate Merchandise.
- Secondary review actions are Change Product, Remove Match, Mark Waiting for Product Data, Raise Issue, and Skip for Now.
- Validation now requires a linked Product and blocks when unresolved Merchandise issues exist.
- Waiting for Product Data uses the existing Merchandise Notes field with a marker instead of adding a new Airtable field.
- Raising an issue uses the existing Issues table, carries Merchandise photos into the Issue when available, and marks the Merchandise status as Issue.
- Unidentified Merchandise is clearly labeled and can be matched later or flagged as an issue.

What did not change:
- Airtable tables and fields were not renamed.
- No Products are created from Merchandise Review.
- No new workflow tables were added.
- Jobs/import behavior remains unchanged.
- Merchandise Inventory was not redesigned.
- The full production route decision tree is not implemented yet.

Current review caveat:
- The current Issues schema links Issues to Products and Jobs, but not directly to Merchandise. For matched Merchandise, review-created Issues link to the matched Product and include Merchandise photos. For unmatched Merchandise, the Merchandise status can be set to Issue, but the Issue record cannot yet carry an authoritative Merchandise link without a future schema decision.

## 2026-07-16 Phase 6 Merchandise Review Workspace Rebuild

Rebuilt the `/merchandise/review` frontend composition into a purpose-built visual review station while preserving Phase 5 backend behavior.

What is now true:
- `/merchandise/review` uses a full-height three-panel workspace:
  - Left: narrow review queue with queue-state switcher, counts, compact filters, and scrollable Merchandise cards.
  - Center: dominant Merchandise inspection area with large Merchandise photo, thumbnail strip, photo controls, identity bar, and physical details.
  - Right: independently scrollable decision workspace with Product summary, Product search, review state, and sticky action area.
- The queue cards are intentionally compact and show only Package Name, Barcode or ID Number, Client, Time Here, Storage Location, small status indicator, and thumbnail.
- Merchandise photos remain sourced from the Merchandise / Receipt Entry record, not the Shipment header.
- Clicking the primary Merchandise photo opens a simple lightbox for larger inspection.
- The page has a compact header with Merchandise Review context and a Focus Photos / Restore Panels control.
- The primary action remains Validate Merchandise.
- Secondary actions remain available but visually subordinate in a compact sticky action row or compact details sections.
- Validation, matching, remove match, Waiting for Product Data, Issue creation, unresolved issue blocking, client-restricted Product search, and automatic advancement behavior are preserved.

What did not change:
- No backend API behavior changed in this phase.
- Airtable tables and fields were not renamed.
- No Products are created from Merchandise Review.
- Merchandise Inventory at `/merchandise` remains separate and unchanged.
- No new workflow tables were added.

## Continuity Documents

Added repository continuity documents on 2026-07-16:
- AGENTS.md
- docs/PRODUCT_VISION.md
- docs/PRINCIPLES.md
- docs/DOMAIN_MODEL.md
- docs/CURRENT_STATE.md
- docs/DECISIONS.md

docs/PRINCIPLES.md was added on 2026-07-16 to preserve the product principles for the operations-inbox workflow.

No application code changed as part of this documentation setup.

## 2026-07-20 Merchandise And Review UI Cleanup

The frontend now restores Merchandise and Merchandise Review as separate primary navigation destinations.

Primary navigation order is:
- Dashboard
- Imports
- Receiving
- Merchandise
- Merchandise Review
- Products
- Jobs
- Clients
- Settings

What is now true:
- `/merchandise` is the read-only Merchandise inventory browser.
- `/merchandise/review` is the PM Merchandise Review workflow.
- The two workspaces are not combined in primary navigation or active-route highlighting.
- The Merchandise inventory page supports Card/List toggle, search, Client filter, Status filter, Storage Location filter, Condition filter, Time Here age filtering/sorting, and Excel export.
- Merchandise inventory cards show a large image, Time Here badge, Status badge, Package Name, Client and Quantity on one line, Barcode or ID Number, and Storage Location.
- Merchandise inventory cards do not show workflow buttons.
- Clicking an inventory card opens a read-only detail drawer.
- The inventory detail drawer has one navigation action: Open Merchandise Review.
- Merchandise Review no longer repeats the page title or shown-count subtitle above the workspace.
- Merchandise Review queue states now use a full-width horizontal sub-navigation matching the Receiving subnav treatment: Needs Review, Waiting for Product, Validated, and Issues, each with counts.
- Merchandise Review filters sit below the sub-navigation and above the queue/workspace.
- The large queue-state tiles were removed from the left queue panel to recover vertical space.
- Receiving's Create Shipment button now lives inside the Shipment Details form content below Notes, sharing the same content width and spacing as the other form controls.

What did not change:
- No backend API behavior changed.
- Airtable tables and fields were not renamed.
- No workflow tables, inventory tables, or schema fields were added.
- Merchandise Review validation, matching, waiting, issue creation, and Product search behavior remain unchanged.

Validation:
- `npm run build` passed in `frontend/`.
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- Browser smoke check reached the local app but stopped at the PIN login screen, so authenticated visual QA was not completed in-browser during this session.

## 2026-07-20 Merchandise Review V2 And Admin Navigation

The frontend now has a duplicate Merchandise Review workspace for parallel UX experimentation.

What is now true:
- `/merchandise/review` remains the existing Merchandise Review workspace.
- `/merchandise-review-v2` renders the same `MerchandiseReviewPage` component as `/merchandise/review`.
- Merchandise Review V2 uses the same backend endpoints, filters, state management, actions, and behavior as the current Merchandise Review page.
- The primary navigation is limited to daily operational workspaces: Dashboard, Imports, Receiving, Merchandise, Merchandise Review, Merchandise Review V2, Products, and Jobs.
- Clients and Settings were removed from primary navigation.
- The former Settings workspace is now the Admin workspace.
- `/admin` is the canonical Admin route.
- The Admin utility navigation points to `/admin/users`.
- `/admin/:section` renders Admin sections such as Users, Roles, System, Clients, and Developer Tools.
- Admin appears on the far right side of the top navigation, immediately before the logged-in user/profile control.
- `/settings` redirects to `/admin/system`.
- `/administration`, `/administration/:section`, and compatibility `/clients` still route or redirect into the Admin workspace.
- Clients remains available inside Admin as an administrative section.

What did not change:
- No backend API behavior changed.
- Airtable tables and fields were not renamed.
- Merchandise Review V1 behavior was not changed.
- Merchandise Review V2 does not introduce new workflow behavior yet.
- Dashboard, Receiving, Merchandise, Products, Jobs, and Admin page internals were not redesigned.

Validation:
- `npm run build` passed in `frontend/`.
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `git diff --check` passed.
- Local route smoke returned HTTP 200 for `/admin`, `/admin/users`, and `/settings`.

## 2026-07-20 Shared Page Sub-Navigation

The frontend now uses one shared `SubNav` component for page-level workspace navigation.

What is now true:
- Receiving and Merchandise Review use the same `SubNav` component and `.subnav*` styling.
- Merchandise Review V2 also uses the same component because it renders the same `MerchandiseReviewPage` component as V1.
- `SubNav` supports item labels, optional icons, optional count badges, disabled state, click handlers, shared active styling, keyboard focus styling, and an optional right-aligned utility/action area.
- The shared sub-navigation uses the Receiving visual treatment as the source of truth: natural-width tabs, orange active accent, shared count badges, and horizontal overflow inside the component on narrow screens.
- Merchandise Review no longer owns equal-width or grid-based tab styling for the queue states.
- Focus Photos remains outside the queue-state tabs as a utility action in the sub-navigation action area.
- Primary navigation active matching is intentionally scoped so `/merchandise` activates only Merchandise, `/merchandise/review` activates only Merchandise Review, and `/merchandise-review-v2` activates only Merchandise Review V2.
- Primary navigation links use React Router `Link` plus the explicit route-ownership matcher as the only source of the `active` class, avoiding `NavLink` prefix matching that could mark both Merchandise and Merchandise Review active at the same time.

What did not change:
- Merchandise Review workflow behavior did not change.
- Queue filtering, Product matching, image viewing, right-side review decisions, and Receiving workflow behavior did not change.
- Backend endpoints, Airtable tables, and Airtable fields did not change.

Validation:
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `npm run build` passed in `frontend/`.
- Local route smoke checks returned HTTP 200 for `/merchandise`, `/merchandise/review`, `/merchandise-review-v2`, and `/shipments` on the running Vite server.
- A follow-up regression test now checks that primary navigation uses `Link`, explicit `aria-current`, and the route-ownership matcher rather than `NavLink` default active behavior.

## 2026-07-20 Merchandise Review V2 Workflow Kanban Board

Merchandise Review V2 is no longer a visual duplicate of Merchandise Review V1.

What is now true:
- `/merchandise/review` continues to render the existing Merchandise Review V1 visual review station.
- `/merchandise-review-v2` now renders the first working isolated Kanban-style workflow board.
- V2 still reads Merchandise Review records from the existing `api.listMerchandiseReviewEntries()` endpoint.
- V2 does not add backend endpoints, Airtable tables, Airtable fields, or schema-backed workflow status.
- The board renders visible columns from `MERCHANDISE_REVIEW_WORKFLOW` configuration, ordered by each gate's configured `order`.
- The default configured workflow has five visible gates:
  - New Items for Review
  - Waiting for Information
  - Send to THR3D
  - Waiting for Activation
  - Ready for Production
- The gate model supports id, label, description, order, board visibility, owner role, entry criteria, exit criteria, allowed next gates, transition mode, card field configuration, and workspace section configuration.
- Gate configuration now also owns `workspaceMode`.
- Workspace modes currently supported by the Workflow Engine are `modal`, `drawer`, and `readonly`.
- The default workspace modes are:
  - New Items for Review: modal
  - Waiting for Information: drawer
  - Send to THR3D: drawer
  - Waiting for Activation: drawer
  - Ready for Production: readonly drawer
- A frontend workflow registry exposes a default workflow and a client workflow assignment seam. No client-specific UI exists yet.
- Cards are assigned to columns through centralized Workflow Engine selectors derived from existing review state, linked Product readiness, Merchandise identity, artwork state, activation/reference data, durable Workstream Assignment state, and compatibility local gate selections for draft cards.
- Cards show a large thumbnail, Package/Product Name, Client, observed identifier, Storage Location, Time Here, optional status badge, and three readiness indicators.
- Readiness indicators represent Product Information, Artwork, and Activation Information and are generated by centralized Workflow Engine evaluators.
- Non-applicable readiness can be returned as neutral/hidden instead of pretending the requirement is complete.
- Clicking a card opens the workspace mode configured for that gate.
- New Items for Review opens a large image-first modal at roughly full-workspace scale while the board is dimmed behind it.
- Later gates continue to use the right slide-over drawer.
- The workspace shell shows Merchandise identity, R2-backed photo preview, thumbnail navigation, current gate, owner, status, readiness summary, shipment/product summaries, gate purpose, configured workspace sections, and a close control.
- The New Items modal is designed for the first PM decision: which Workstreams should be assigned to this Merchandise.
- Workstreams are modeled as a multi-select decision today.
- Initial Workstream options are exactly Ecomm Photo, Packaging Photo, and THR3D.
- Workstream selections are saved as durable Workstream Assignment records.
- The Workflow Engine exposes assignment previews so V2 can create Ecomm Photo, Packaging Photo, or THR3D assignments without page-local branching rules.
- Deliverables are intentionally not modeled in this V2 iteration. GS1 bundles, hero images, packaging images, marketing assets, and similar deliverables remain downstream production concepts.
- The New Items modal includes large R2-backed image review, thumbnail navigation, image counter, zoom controls, keyboard image navigation, and a lightbox.
- The New Items modal footer remains visible and exposes Previous Merchandise, Save, Save & Continue, and Next Merchandise.
- Save & Continue saves durable Workstream Assignments and opens the next Merchandise item in the same filtered workflow gate.
- Gate workspace sections render from gate configuration. The initial section types include Merchandise Observations, Photos, Product Identification, Workstream, Missing Information, Artwork, Activation, THR3D Routing, Shipment, Issues, History, Readiness Summary, Merchandise Summary, and Product Summary.
- Transition validation is centralized in the Workflow Engine. The workspace shows valid next gates as buttons and blocked gates with reasons.
- Drag and drop is deferred in this first working implementation so transition buttons and explanations share one reliable path.
- Artwork remains the only readiness gate architected for a future PM override. The visible override workflow is deferred.
- Existing R2-backed images display through `recordPhotos` and generated API URLs. Deprecated Airtable attachment fields are not used.
- Overridden artwork is visually distinct from automatically satisfied artwork with a marked readiness dot.
- Board-level filters apply across all columns for search, client, storage location, age, and Workstream. Column counts reflect filtered records.

What did not change:
- Merchandise Review V1 behavior, layout, actions, filters, matching, validation, image viewer, and right-side decision panel did not change.
- Merchandise Inventory did not change.
- Receiving, Dashboard, Products, Jobs, Admin, R2 image behavior, and Creative Force integration did not change.

Current V2 caveat:
- V2 Workstream Assignment changes are durable, but audit logging and full downstream production workflows are not implemented yet.

Validation:
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `npm run build` passed in `frontend/`.
- Local route smoke checks returned HTTP 200 for `/merchandise/review` and `/merchandise-review-v2` on the running Vite server.

## 2026-07-20 Workflow Engine Foundation

Marks Photo now has the first frontend Workflow Engine foundation.

What is now true:
- `frontend/src/workflowEngine.js` defines reusable workflow concepts for Workflow, Gate, Requirement, Workflow Assignment, Current Gate, Current Owner, Current Status, Workstream, card field configuration, workspace section configuration, workflow registry, client workflow assignment, and transition validation.
- The initial workflow template is `MERCHANDISE_REVIEW_WORKFLOW`.
- The workflow foundation models the major ownership boundaries:
  - Receiving records physical observations.
  - Project Management owns Workflow Engine decisions.
  - Creative Force owns production execution.
  - Delivery owns ready-to-deliver, delivered, billing, and reporting follow-through.
- Workflow Gates are treated as ownership changes or business decisions, not low-level system events.
- Production remains a single Marks Photo workflow gate concept. Creative Force states such as queued, assigned, retouch, QC, export, and upload are production metadata, not Marks Photo gates.
- The engine exposes gates, allowed next gates, entry criteria, exit criteria, requirement evaluation, workflow assignments, valid next gates, blocked next gates, and transition validation.
- Merchandise Review V2 now consumes the Workflow Engine for gate placement, readiness requirements, board card construction, workspace section rendering, and transition validation.
- V2 no longer owns the Merchandise Review business placement rules directly in the page component.
- The first engine-backed requirements are Product Information, Artwork, and Activation Information.
- Workstream is modeled as a first-class workflow concept with initial active values for Ecomm Photo, Packaging Photo, and THR3D.
- Workstream Assignment is the V2 decision model for the first review gate. Multiple Workstream Assignments can branch from one Merchandise record.
- The Workflow Engine exposes workspace modes and Workstream Assignment previews. Durable branching is implemented for V2 assignments; full downstream workflow execution remains future work.

What did not change:
- Backend Workstream and Workstream Assignment endpoints were added for Merchandise Review V2.
- Airtable Workstreams and Workstream Assignments tables were added.
- Receiving behavior did not change.
- Merchandise Review V1 did not change.
- Merchandise Inventory did not change.
- Production behavior did not change.
- V2 browser-local Workstream decisions remain only as compatibility fallback hints for old experimental state.

Current architecture caveat:
- Audit logs, client-configurable workflow templates, backend rule evaluation, the Admin workflow editor, and Creative Force production synchronization still require future work.

Validation:
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `npm run build` passed in `frontend/`.

## 2026-07-20 Domain Table Mapping Refactor

Marks Photo now has a backend compatibility layer that treats Products, Shipments, and Merchandise as the canonical application table concepts.

What is now true:
- `backend/config.py` defines canonical `PRODUCTS_TABLE`, `SHIPMENTS_TABLE`, and `MERCHANDISE_TABLE` constants.
- Those canonical constants now default to the renamed Airtable physical table names:
  - Products -> `Products`
  - Shipments -> `Shipments`
  - Merchandise -> `Merchandise`
- The same constants retain deprecated environment-variable fallback aliases for one rollback cycle.
- Legacy constants `ITEMS_TABLE`, `RECEIPTS_TABLE`, and `RECEIPT_ENTRIES_TABLE` remain compatibility aliases to the canonical constants.
- Backend route table access now uses the canonical constants for Products, Shipments, and Merchandise.
- Admin system settings report both canonical and legacy table keys so the current physical mapping is visible.
- The frontend direct-Airtable constants expose canonical `PRODUCTS`, `SHIPMENTS`, and `MERCHANDISE` table names with legacy aliases preserved.

What did not change in the compatibility refactor:
- No backend route behavior changed.
- No frontend workflow, Receiving behavior, Merchandise Review behavior, import behavior, or Product linking behavior changed.
- Existing API payload keys such as `itemIds`, `receiptIds`, and import summary keys remain compatibility payload names for now.

Current architecture caveat:
- The later physical Airtable schema rename is recorded in the "Live Airtable Domain Rename" section above and in `docs/migrations/2026-07-20-airtable-domain-rename.md`.

Validation:
- `python3 -m unittest tests/test_domain_table_mapping.py tests/test_receiving.py tests/test_merchandise_review.py tests/test_merchandise_inventory.py tests/test_frontend_routing.py` passed.
- `npm run build` passed in `frontend/`.

## 2026-07-20 Workflow Templates Phase 1

Superseded for active Intake by the 2026-07-20 Intake Workflow Simplification. Workflow Templates remain only as legacy compatibility infrastructure unless a future decision reintroduces configuration.

Marks Photo now has Phase 1 of the configurable workflow engine.

What is now true:
- Airtable has a `Workflow Templates` table (`tbl9NkpL12DOFbQmV`) and a `Workflow Stages` table (`tbldIcybQWtIi4Te2`).
- `Work Orders` (`tbl9EkXDtQSc8CEyL`) now has two additive linked-record fields:
  - `Workflow Template`
  - `Current Workflow Stage`
- The legacy `Current Stage` string field remains in place and is still written for compatibility.
- The default active Workflow Template is `Merchandise Review` (`recEnCm1E05vQYPN5`).
- The seeded default stages exactly match the existing Work workflow keys and order:
  - `new-review` / Review / order 10 / type `start`
  - `waiting-information` / Waiting for Information / order 20 / type `waiting`
  - `send-thr3d` / Send to THR3D / order 30 / type `active`
  - `waiting-activation` / Waiting for Activation / order 40 / type `waiting`
  - `ready-production` / Ready for Production / order 50 / type `complete`
- Backend Work Order shaping now prefers linked `Current Workflow Stage` when present and falls back to legacy `Current Stage`.
- Work Order creation and stage updates continue writing `Current Stage` and also write `Workflow Template` / `Current Workflow Stage` when the default template can be resolved.
- New compatibility APIs exist:
  - `GET /workflow-templates`
  - `POST /workflow-templates`
  - `GET /workflow-templates/<template_id>`
  - `PATCH /workflow-templates/<template_id>`
  - `POST /workflow-templates/<template_id>/duplicate`
  - `POST /workflow-templates/<template_id>/stages`
  - `PATCH /workflow-stages/<stage_id>`
  - `POST /workflow-stages/<stage_id>/deactivate`
- Workflow template mutations are Admin-only. Reads require the normal authenticated app session.
- Admin now includes a `Workflow Templates` utility section for listing, creating, editing, duplicating, activating, defaulting, ordering, and deactivating template stages.
- `backend/ensure_workflow_schema.py` is the idempotent Airtable schema/seed utility for this phase.

What did not change:
- Merchandise Review V1 did not change.
- Merchandise Inventory did not change.
- The Work board layout, labels, filters, transitions, and workflow behavior did not change.
- Work Order routes and Workstream Assignment compatibility aliases remain.
- No Work Order Types, Client Defaults, stage requirements, workflow actions, automation rules, or downstream production execution behavior were added.

Current architecture caveat:
- Workflow configuration is currently operating through the existing compatibility mapping. Advanced actions, requirements, and automation rules will be configured in later phases.

Validation:
- `backend/.venv/bin/python backend/ensure_workflow_schema.py` created/verified the live workflow schema and seeded the default template.
- Live Airtable metadata was verified after the migration.
- `backend/.venv/bin/python -m unittest tests.test_workflow_templates tests.test_job_item_schema tests.test_frontend_routing` passed.
- `npm run build` passed in `frontend/`.

## 2026-07-20 Work Order Types Phase 2

Superseded for active Intake by the 2026-07-20 Intake Workflow Simplification. Work Order Types remain only as legacy compatibility infrastructure unless a future decision reintroduces configuration.

Marks Photo now has Phase 2 of configurable workflow setup: Work Order Types.

What is now true:
- Airtable has a `Work Order Types` table (`tblteTlJWpGv21bg9`).
- `Work Orders` (`tbl9EkXDtQSc8CEyL`) now has an additive linked-record field:
  - `Work Order Type` (`fldLSsIzX2a1lWood`)
- The seeded active default Work Order Type is:
  - Name: `Merchandise Review`
  - Key: `merchandise-review`
  - Record ID: `recZMtKK3Pw1kOAXC`
  - Workflow Template: `recEnCm1E05vQYPN5`
  - Active: true
  - Is Default: true
  - Sort Order: 10
  - Icon: `clipboard-check`
  - Auto Create: true
  - Allow Multiple Per Merchandise: false
- Workflow Template still owns stage structure.
- Work Order Type owns the business purpose and configuration for Work Orders.
- Work Order remains the individual operational work instance connected to Merchandise.
- Backend Work Order shaping now includes optional Work Order Type and effective Workflow Template metadata while preserving existing response fields.
- Effective workflow resolution order is:
  1. Work Order's linked Work Order Type
  2. Work Order's directly linked Workflow Template
  3. Active default Work Order Type and its Workflow Template
  4. Phase 1 default Workflow Template fallback
  5. Legacy `Current Stage` compatibility behavior
- New Merchandise Review Work Orders receive the active default Work Order Type, its linked Workflow Template, the starting Workflow Stage, and legacy `Current Stage`.
- Legacy Work Orders without `Work Order Type` remain compatible and do not require a bulk migration.
- New Work Order Type API routes exist:
  - `GET /work-order-types`
  - `GET /work-order-types/<record_id>`
  - `POST /work-order-types`
  - `PATCH /work-order-types/<record_id>`
  - `POST /work-order-types/<record_id>/duplicate`
  - `POST /work-order-types/<record_id>/set-default`
  - `POST /work-order-types/<record_id>/activate`
  - `POST /work-order-types/<record_id>/deactivate`
- Work Order Type mutations are Admin-only. Reads require the normal authenticated app session.
- Admin now includes `Work Order Types` adjacent to `Workflow Templates`.
- `backend/ensure_work_order_types_schema.py` is the idempotent Airtable schema/seed utility for this phase.

What did not change:
- Work board columns, routing, filters, card layout, stage ordering, and transitions did not change.
- Merchandise Review V1 did not change.
- Merchandise Inventory did not change.
- Existing Work Order and Workstream Assignment compatibility aliases remain.
- No speculative Work Order Types were seeded.
- No Work Order Types are exposed as Work board controls yet.
- No workflow automation, stage actions, client defaults, or transition configuration was added.

Current architecture caveat:
- Work Order Types are available as configuration and compatibility metadata. The Work board does not yet expose type selection or multiple workflow experiences.

Validation:
- `backend/.venv/bin/python backend/ensure_work_order_types_schema.py` passed.
- The same schema utility was run a second time and created no duplicate table, field, or seeded record.
- Live Airtable metadata was verified after the migration.
- `backend/.venv/bin/python -m unittest tests.test_work_order_types tests.test_workflow_templates tests.test_job_item_schema tests.test_frontend_routing tests.test_merchandise_review` passed.
- `npm run build` passed in `frontend/`.
