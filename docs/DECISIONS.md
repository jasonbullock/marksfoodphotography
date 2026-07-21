# Product Decisions

## 2026-07-21 - Planning Replaces Intake As The PM Workspace

The PM-owned board is now the `Planning` workspace.

Planning is an architecture refinement of the previous Intake board, not a visual redesign. The existing dark board, compact cards, variable-height columns, unified modal, Conversation, Activity, and Required to Shoot interaction patterns should be preserved unless a later design decision changes them.

Canonical routes:
- `/planning` is the active Planning route.
- `/intake`, `/work`, and `/merchandise-review-v2` are compatibility redirects to `/planning`.

Planning owns planning states only:
- New
- Planning
- Waiting
- Ready for Photo

Cards must not automatically move because fields are completed. PMs explicitly choose where Planning work sits.

`Ready for Photo` is the shared handoff queue between Planning and Production. It is not a duplicated record or a separate Production Request.

While a card is in `Ready for Photo`:
- Planning work is complete.
- PM ownership remains until Production accepts the work.
- The card remains visible on the Planning board.
- The same Merchandise should later become visible on the Production board.

Future Production board states are:
- Ready for Photo
- Scheduled
- In Production
- QC
- Complete

When Production later moves a card from `Ready for Photo` to `Scheduled`, that acceptance should:
- remove the card from the Planning board
- show it on the Production board
- transfer ownership from PM to Production
- log Activity

Do not build scheduling or a full Production board until the next phase. The current requirement is to keep the model clean enough for that expansion.

## 2026-07-21 - Intake Is A PM Operations Board

Superseded for the active workspace by `2026-07-21 - Planning Replaces Intake As The PM Workspace`.

The Intake board is a PM Operations Board, not an automatic workflow engine.

The board organizes PM work. It does not define the physical state of merchandise.

User-facing language:
- Use `Queue` for the board placement concept.
- Use `Merchandise Status` for physical or operational merchandise state.
- Use `Required to Shoot` for the production-start checklist.
- Do not use `Readiness` as public PM-facing language.

Queue rules:
- `New` is the automatic entry queue.
- `Ready for Photo` is the only gated queue.
- PMs control every middle queue.
- Cards must not move automatically because fields were completed.
- The application may block a move into `Ready for Photo` when Required to Shoot is incomplete.

Target PM queues:
- New
- Working
- Waiting on Client
- On Hold
- Ready for Photo

The first implementation may store middle-queue overrides locally while the live Airtable base is audited. The durable target is a Merchandise `Queue` field that is separate from `Merch Status` / Merchandise Status and from release state.

## 2026-07-21 - Required To Shoot Is The Public Production Gate

`Required to Shoot` replaces public `Readiness` language in the active Intake experience.

Required to Shoot is calculated from source facts, not manually maintained as a generic status:
- Merchandise Verified
- Deliverables selected
- Product linked for photo deliverables
- Product Name for photo deliverables
- Identifier for photo deliverables
- Artwork for Packaging Photo and Ecomm Photo
- Activation or campaign information for Ecomm Photo

The frontend and backend must enforce the same Required to Shoot rules before a card can move to Ready for Photo or be released to production.

Do not create a public `Readiness` Airtable field unless a later reporting/performance decision proves a cached value is necessary.

## 2026-07-21 - Intake Uses One Card Editor

Every active Intake card should open the same editor regardless of queue.

The editor should prioritize:
- compact image review with fullscreen visual review available on click
- Product
- Deliverables
- Required to Shoot
- Conversation
- Activity

Do not maintain separate PM edit experiences for New, Waiting, Working, and Ready cards.

Scattered note fields should be consolidated into a single Conversation model where practical. Conversation is human discussion. Activity is system-generated audit context. They are separate concepts even if a later schema stores them in one physical table.

## 2026-07-21 - Thr3d Leaves Intake Through A Shipping Workspace

Thr3d work should not be forced onto the PM Operations Board.

The PM board prepares merchandise. Once Thr3d is selected and Required to Shoot is complete, the clean target is a dedicated Thr3d Shipping workspace that answers:

> What needs to be boxed and shipped?

Thr3d shipping must stay separate from PM `Queue` and from physical `Merchandise Status`.

## 2026-07-21 - Airtable Cleanup Must Be Staged

The Airtable base should be reduced, but cleanup must be audit-first and delete-second.

Before deleting tables, fields, or records:
- export or snapshot affected data
- audit repository dependencies by table name, table ID, field name, and field ID
- inspect formulas, lookups, rollups, linked records, imports, tests, and docs
- manually inspect Airtable Interfaces, Automations, Forms, shared views, scripts, extensions, and external syncs
- migrate required data
- run tests, build, import checks, and live schema read-back

The live audit on 2026-07-21 classified Products, Jobs, Clients, Shipments, Locations, Users, Issues, Imports, and Merchandise as keep tables. History, Workstreams, Work Orders, Workflow Templates, Workflow Stages, and Work Order Types are archive-review candidates, not approved deletions.

No ambiguous data should be deleted. Ambiguous tables or fields must be flagged for review.

## 2026-07-20 - Marks Photo Is An Operations Readiness Platform

Marks Photo is an Operations Readiness Platform.

The mission is to transform incoming merchandise into production-ready work by removing uncertainty before production begins.

Marks Photo is not a workflow engine, project management tool, Creative Force replacement, or PhotoTrack replacement.

The foundational operating model is documented in:
- `docs/PRODUCT_VISION.md`
- `docs/WORKSPACES.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DESIGN_PRINCIPLES.md`

Long-term product architecture:
- Merchandise is the center of the operational model.
- The application presents different perspectives of the same merchandise.
- Workspace means business question.
- Views are different ways to visualize the same data.
- New workspaces should be rare; new views should be common.
- Build perspectives, not duplicate data.
- Readiness is the product concept; workflow is implementation scaffolding.
- Inventory is a warehouse perspective.
- Intake is a decision perspective.
- Production is an execution perspective.
- There is one Release to Production handoff.
- Prefer fields over tables.
- Configuration should exist only when multiple clients genuinely require different behavior.

The intended lifecycle is Shipment -> Receiving -> Inventory -> Intake -> Release to Production -> Production -> Creative Force -> PhotoTrack.

## 2026-07-20 - Primary Navigation Uses Singular Import Label

The primary navigation label for the existing `/imports` workspace is `Import`.

This decision originally used Dashboard, Import, Receiving, Merchandise, Work, Jobs, and Products. The later Intake alignment decision supersedes the Work label while preserving the Import label and icon decision.

Primary navigation icons are a visual system cue: Dashboard and Admin keep their existing icons, Import uses Download, Receiving uses PackageOpen, Merchandise uses ClipboardList, Work uses Workflow, Jobs uses Layers, and Products uses Tag.

This is a visual/navigation polish decision only. It does not rename the route, backend endpoints, Airtable tables, import history, or import workflow behavior.

## 2026-07-20 - Work Orders Are The Experimental Workflow Work Item

Superseded for active Intake by `2026-07-20 - Active Intake Is Merchandise-Driven`.

The experimental V2 PM workflow was named Work in user-facing navigation during this phase, and Work Orders remain the domain/backend work item. The later Intake alignment decision supersedes the user-facing Work workspace name.

Work Order replaces the previous Workstream Assignment terminology. A Work Order is the operational work item connecting one Merchandise record to one Workstream. One Merchandise record may have many Work Orders. Work Orders may link to Jobs for reporting or production grouping, but Jobs are not required before work can begin.

The canonical domain chain is:
- Shipment
- Merchandise
- Work Order(s)
- Workstream
- Workflow Template

The live Airtable table was renamed in place from `Workstream Assignments` to `Work Orders`, preserving table ID `tbl9EkXDtQSc8CEyL`. The primary field is now `Work Order` (`fldAiYGCELRCY3bYh`), and the workflow position field is now `Current Stage` (`flddqh4KN4j6FflKW`). Reciprocal linked fields on Merchandise, Workstreams, and Jobs are named `Work Orders`.

Canonical backend/API terminology should use Work Orders. One-cycle compatibility aliases may remain for old `workstream-assignments` endpoints, constants, and payload names where removing them would break existing clients. New code should prefer `WORK_ORDERS_TABLE`, `/work-orders`, and `currentStage`.

## 2026-07-20 - Intake Is The Canonical PM Readiness Workspace

The experimental PM readiness workspace is now user-facing `Intake`.

`/intake` is the canonical frontend route. `/work` and `/merchandise-review-v2` remain compatibility redirects to `/intake`.

Intake answers the business question: "What still needs to happen before this can be produced?"

The existing Work Order table, Work Order APIs, Workflow Templates, Workflow Stages, Work Order Types, internal workflow IDs, and backend route contracts remain in place as compatibility infrastructure. This decision changes user-facing workspace terminology and frontend route ownership only.

The primary navigation is:
- Dashboard
- Import
- Receiving
- Merchandise
- Intake
- Jobs
- Products

Admin remains a utility navigation item on the right side of the top navigation, adjacent to the user/profile control.

The Merchandise tab is active only for the inventory workspace route `/merchandise`. It must not become active for `/merchandise/review`, `/merchandise-review-v2`, `/work`, `/intake`, or any review/intake route. Intake is active for `/intake` and compatibility review/work routes. Only one primary navigation item may be active at a time.

The first visible Intake board stage is `Review`. The stable internal stage ID may remain `new-review` during compatibility.

Production Type, Merchandise Resolution, Readiness, and Release to Production are product concepts for upcoming phases. This alignment pass may reserve UI space for them, but it must not create schema, persisted placeholder values, fake readiness percentages, workflow actions, production-planning behavior, or configurable transition systems.

## 2026-07-20 - Active Intake Is Merchandise-Driven

Active Intake is centered on Merchandise and Product data, not Work Orders or workflow configuration.

Canonical active Intake state lives on Merchandise:
- `Intake Status` is the canonical Intake state field with exactly `Needs Review`, `Waiting on Information`, `Ready to Release`, and `Closed`.
- `Merch Status` remains a separate compatibility/status field for Received, Matched, Validated, and Issue.
- Deliverables including `Thr3d` represent the Send to THR3D branch.
- `Deliverables` and `Merchandise Resolution` remain Merchandise-level Intake decisions.

`Merch Status` was not reused for canonical Intake Status because it already drives inventory and Merchandise Review compatibility behavior. Reusing it would blur physical/status compatibility values with PM Intake state.

Notes are not state. The temporary `[Waiting for Product Data]` marker was migrated out of active Intake behavior and must not be written by new application code.

Newly received Merchandise enters Intake as `Needs Review`. Once a PM starts the Merchandise Verification wizard, incomplete progress is a normal working state. If verification cannot be completed, the system may route the record to `Waiting on Information` and preserve derived missing-information reasons so the PM can resume.

The active PM experience is a guided wizard, not a long form or manual status board. The wizard steps are:
- Verify Merchandise
- Identify Product
- Choose Deliverables
- Complete Required Information
- Finish

PMs do not manually choose the final Intake status in the happy path. `Finish Verification` computes the outcome from Merchandise, Product, Deliverables, and derived required information.

The UI should not expose `Readiness`, `Observed`, `Storage Location`, `Merchandise Resolution`, manual status selection, `Save`, `Save & Continue`, or `Release to Production` in the primary wizard path. Those may remain in compatibility code, historical docs, secondary detail, or exception flows when explicitly needed.

New Intake user actions must not create Work Orders, require Work Order Types, require Workflow Templates, or require Workflow Stages.

Workflow Templates, Workflow Stages, Work Order Types, Work Orders, and Workstreams remain in Airtable and backend compatibility services for historical records and rollback safety. They are not exposed in Admin and are not required by the active PM Intake experience.

Admin should not expose Workflow Templates or Work Order Types unless a future documented decision reintroduces configuration after real multi-client variation proves it is needed.

No destructive Airtable cleanup is approved by this decision.

## 2026-07-20 - Intake Uses Deliverables

PMs choose required Deliverables during Intake. They are not choosing a workflow.

Deliverables live on Merchandise using the Airtable field `Deliverables`.

Exactly three Deliverables are currently supported:
- `Packaging Photo`
- `Ecomm Photo`
- `Thr3d`

One Merchandise record may require multiple Deliverables. `Packaging Photo + Ecomm Photo` is common, and `Thr3d + Ecomm Photo` is allowed.

Application code must normalize legacy values such as `Packaging`, `Ecomm`, `eCommerce`, and `THR3D` to the canonical values above. Airtable multi-select objects, arrays, nested arrays, JSON-stringified arrays, quote-wrapped values, quote-only strings, nulls, and comma-separated strings must be handled gracefully.

The active Deliverables payload contract is strict: Airtable receives only a plain array of canonical strings in the Merchandise `Deliverables` field, or an empty array when cleared. Active code must not send JSON-stringified arrays, select-option objects, comma-delimited strings, empty strings, quote-only strings, null values, or use Airtable `typecast` to mask malformed Deliverables payloads. Unknown values should be rejected or discarded at the normalization boundary before Airtable is called.

The Deliverables selector should behave like a compact multi-select form control, not a status badge. Native checkbox semantics are preferred for this control. In the Merchandise Verification wizard, Deliverables autosave after a short debounce and must not require a separate `Save Deliverables` action.

Future Deliverables will only be added when real operational requirements exist. No `Other`, `Lifestyle`, `Video`, `Social`, `CGI`, or `360` option is approved.

Deliverables remain a field, not a table. No Deliverables table, Client Deliverables table, workflow routing table, transition table, or configuration surface is approved by this decision.

Required Information is derived only after Merchandise is verified and Deliverables are selected. `Thr3d`-only merchandise does not require photo readiness items; it can route to the Thr3d shipping workflow once the Merchandise verification requirements are satisfied. `Packaging Photo` and `Ecomm Photo` may have different required information, and combined deliverables use the union of applicable requirements.

When `Thr3d` is selected and Merchandise Resolution is blank, Merchandise Resolution defaults to `Ship to Kentucky`. This default must not overwrite an existing PM-selected resolution, and removing `Thr3d` must not clear Merchandise Resolution.

The older Merchandise field named `Production Type` is legacy data and must not be used by active application code. Active code reads and writes `Deliverables`.

Legacy `Production Type` cleanup must preserve historical intent by migrating any remaining legacy values into `Deliverables` before field deletion. The `Packaging` legacy value maps to `Packaging Photo`, `eCommerce` and `Ecomm` map to `Ecomm Photo`, and `THR3D` or `3D` map to `Thr3d`.

Legacy Merchandise fields may be deleted only after Airtable-side dependencies are confirmed clear. On 2026-07-21, manual Airtable inspection confirmed no references to `Production Type` or `Deprecated Airtable Photos - Do Not Use` in Automations, shared views, scripts, or extensions. Connector inspection confirmed no Interfaces, interface pages, record detail pages, or standalone Forms in the live base. The legacy Merchandise fields `Production Type` (`fldSwUluDDqwe6MVs`) and `Deprecated Airtable Photos - Do Not Use` (`fldtTr7eNQrT6iVrS`) were deleted after migration and dependency verification.

## 2026-07-20 - Release To Production Is A Merchandise-Owned Handoff

Production Readiness is a baseline server-side evaluation over existing Merchandise and Product data.

The universal baseline requirements are:
- Package Name confirmed
- Package ID / Barcode / SKU confirmed
- At least one Deliverable selected

Photo deliverables additionally require:
- Product linked
- Product Name present
- Product Identifier present, using the existing Product `Identifier` field

`Merchandise Resolution` is no longer a universal happy-path readiness requirement. It remains a physical disposition concept for exceptions, compatibility, or later physical-routing work.

Artwork, activation, job numbers, client-specific rules, approvals, scheduling, resources, and workflow transitions are intentionally excluded from the baseline. They may become future client-specific readiness rules only after real operating variation requires them.

Release to Production is represented on Merchandise with:
- `Released`
- `Released At`
- `Released By`

`Released` is not an `Intake Status` value. `Intake Status` remains the four-state Intake model: `Needs Review`, `Waiting on Information`, `Ready to Release`, and `Closed`. Release sets `Intake Status` to `Closed` and records release ownership through the dedicated release fields.

Released Merchandise leaves active Intake but remains visible in Inventory. Release changes ownership from PM Intake to Production; it does not change whether the physical merchandise is still in the warehouse.

Release must not create Work Orders, Production records, workflow transitions, schedules, resources, Creative Force records, approval flows, or configuration tables.

Release is idempotent. Releasing already released Merchandise returns success without changing the original `Released At` or `Released By`.

## 2026-07-20 - Intake Decisions Start As Merchandise Fields

Production Type and Merchandise Resolution are the first persisted Intake decisions.

They live on the existing `Merchandise` table as single-select fields:
- `Production Type`
- `Merchandise Resolution`

Production Type answers: "What are we producing?"

Allowed initial values:
- `eCommerce`
- `Packaging`
- `THR3D`

Merchandise Resolution answers: "What happens to the physical merchandise?"

Allowed initial values:
- `Keep at Walnut`
- `Ship to Kentucky`
- `Hold`
- `Replacement Requested`
- `Return to Client`
- `Dispose`

Fields were chosen over tables because these option sets are small, shared, and do not yet have independent lifecycle, ownership, permissions, relationships, or client-specific behavior.

No Production Types table, Merchandise Resolutions table, Client Production Types table, Stage Requirements table, Workflow Actions table, or Transition table is approved by this phase.

The Product `Workstream` field is not reused for Production Type because it is Product-level import/routing compatibility data with legacy values, not the Merchandise-level PM Intake decision.

When Production Type is set to `THR3D`, Merchandise Resolution defaults to `Ship to Kentucky` only if the Merchandise Resolution is currently blank. The default must not overwrite an existing PM-selected resolution, and changing Production Type away from THR3D must not clear resolution.

`Replacement Requested` is only a Merchandise Resolution value in this phase. It does not create replacement records, version chains, parent-child merchandise links, replacement receiving flows, or client communication tracking.

The Intake UI should show Production Type as the PM-facing production decision. Existing Workstream/Work Order behavior may remain as internal compatibility plumbing, but the UI should avoid presenting Workstream as a duplicate PM-facing decision when Production Type can drive the existing workstream selection.

Readiness requirements and Release to Production were future work during this Intake decision phase. The later Release To Production decision supersedes that deferral with a baseline readiness evaluator and Merchandise-owned release handoff.

## 2026-07-20 - Work Was The Primary Experimental PM Workspace Before Intake Alignment

The primary navigation is:
- Dashboard
- Imports
- Receiving
- Merchandise
- Work
- Jobs
- Products

Admin remains a utility navigation item on the right side of the top navigation, adjacent to the user/profile control.

During this phase, `/work` was the canonical route for the experimental workflow board and `/merchandise-review-v2` redirected to `/work` for compatibility. `/merchandise/review` remained routable for the V1 Merchandise Review workflow but hidden from primary navigation.

This decision was superseded by the Intake alignment decision above. Work Orders remain the backend work item, but Work is no longer the canonical user-facing workspace name or route.

The first visible Work board stage is `Review`. The stable internal stage ID may remain `new-review` during compatibility.

## 2026-07-16 - Marks Photo Is the Operational Readiness System

Marks Photo is not a project management system, PIM, or system of record.

Marks Photo is the operational readiness system for Walnut Studio. It consolidates enough information to receive, understand, prepare, photograph, route, and dispose of Merchandise.

The application revolves around Merchandise. Products, Jobs, Shipments, Imports, Issues, client requirements, artwork, activation emails, and production references are supporting information.

The application should answer: "What do we need to do with this Merchandise right now?"

Operational Readiness is the core product concept. Readiness is evaluated against client requirements and should tell Walnut whether Merchandise can be photographed now, or what blocker must be removed.

Product Information has three responsibilities: Operational Readiness, Production Execution, and Production Reporting.

Product information may come from any source. Marks Photo does not care where it originated.

Product information may be reused when it exists. When it does not exist, users should enter only the minimum missing information required to make the Merchandise operationally ready, execute production, and report completed work. Users should not be forced into separate "Match Product" versus "Create Product" workflows.

Product Information may include reporting references such as Job Number, Client Project Number, External Reference, Service Type, Activation, and Deliverable Type. These are operational references, not project-management fields.

Marks Photo is expected to become the operational reporting source for Walnut Studio. Reports may include Client, Job Number, Product, Service Type, Production Dates, Photographer, Production Status, Deliverables, Time, and Disposition.

This reporting requirement does not expand Marks Photo into project management. Marks Photo does not own project planning, client communication, budgeting, approvals, or project task management. It consumes operational references from those systems.

Everything before Merchandise exists belongs in another system. Everything after production completion belongs in another system. Marks Photo owns the operational middle.

Guiding principle: capture only the operational information Walnut Studio needs to determine readiness, execute production, and report completed work. Nothing more. Nothing less.

## 2026-07-20 - R2 Is The Only Image Storage Layer

Cloudflare R2 is the single source of truth for all Marks Photo images.

Airtable must not store image files, image attachments, base64 image data, duplicate image copies, permanent public URLs, or signed URLs for merchandise, shipment, product, review, production, or delivery images.

Airtable may store lightweight image references and structured metadata only. Preferred fields are R2 object-key manifests such as `Photo Metadata`, `Primary Image Key`, `Thumbnail Key`, `Image Count`, or similarly explicit R2 reference fields.

The canonical manifest key is `object_key`. Optional metadata may include `thumbnail_key`, `sort_order`, `filename`, `original_filename`, `stored_filename`, `content_type`, `size_bytes`, and `uploaded_at`.

The application resolves image display URLs from stored R2 object keys at read time. This keeps delivery domains, signed URL policy, and access rules changeable without rewriting Airtable records.

Receiving uploads must write to R2 before Airtable is updated. Airtable updates for image changes must write only R2 manifests or reference fields.

Application code must not:
- upload images to Airtable attachments
- create Airtable attachment-array payloads
- read Airtable attachments as durable image storage
- copy Airtable attachment URLs between records
- fall back to local image storage for receiving uploads

Deprecated Airtable attachment fields may remain temporarily when field deletion is unsafe or unavailable, but they must be empty, clearly marked deprecated, and protected by write guards.

## 2026-07-16 - Application Shell Uses Operational Top Navigation

Marks Photo uses a top-navigation shell centered on operational work, not database tables.

Primary navigation is:
- Dashboard
- Receiving
- Merchandise
- Planning
- Production

Products, Jobs, Clients, Issues, Imports, and technical Airtable surfaces are supporting or administrative destinations. They remain routable where needed, but they should not be the default primary navigation model for normal production operations.

Admin is separated from the operational nav for authorized users. Settings, Profile, and Sign Out live in the authenticated user menu.

The shared workspace structure beneath the top navigation is:
- contextual Queue panel
- main Workspace canvas
- contextual Inspector panel

The left panel is contextual to the current workspace and must not become a second global navigation system.

The shell includes responsive behavior:
- desktop supports top navigation plus multi-panel workspaces
- tablet/mobile collapses navigation into a drawer
- queue and inspector regions stack or collapse rather than compressing the main work area until unusable

This shell decision does not rename routes, Airtable tables, backend objects, or workflow states. It is a frontend navigation and layout architecture decision.

## 2026-07-16 - Merchandise Triggers Work

Physical merchandise receipt initiates PM review, whether the merchandise was expected or unexpected.

PMs will not manually create Jobs, Projects, or Production Requests.

## 2026-07-16 - Marks Photo Is an Operations Inbox

Work appears automatically. Users make decisions and resolve blockers.

## 2026-07-16 - Receiving Scope

Receiving documents shipments and merchandise, captures photos and observations, and performs an obvious match when possible. It does not perform full production review.

## 2026-07-16 - Jobs and Items Are Under Review

Do not make major schema changes to Jobs or Items until the revised domain model is approved.

## 2026-07-16 - Compatibility Aliases Before Airtable Renames

The application will migrate to the new business language without renaming Airtable tables first.

Current physical Airtable tables are treated as implementation details:
- Receipts are Shipments.
- Receipt Entries are Merchandise.
- Items are Products.

New API and UI names may be added beside existing routes, but old routes stay available during the compatibility period.

Do not duplicate records to support the vocabulary change.

## 2026-07-16 - Canonical Frontend Routes Use Business Language

The primary frontend routes use business language:
- `/shipments` for the receiving/logistics workspace.
- `/merchandise/review` for PM merchandise review.
- `/products` for imported product records.
- `/clients` and `/settings` for administrative entry points.

Legacy URLs remain as redirects during the compatibility period so bookmarks and existing links do not break.

The frontend may keep localized implementation names where they protect compatibility with existing Airtable table names, backend response shapes, or tests.

## 2026-07-16 - User-Facing Vocabulary Is Centralized

The frontend uses a lightweight shared vocabulary layer for recurring domain labels.

Canonical user-facing language is:
- Items are Products.
- Receipts are Shipments.
- Receipt Entries are Merchandise.
- Verification is Merchandise Review.
- Package-facing received fields use Package Name and Barcode or ID Number.
- Imported product fields use Product Name, Product Job Number, Matched Product, and Product Details.

Physical Airtable names remain unchanged during the compatibility period. When technical Airtable table or field names are shown in admin/developer surfaces, they must be clearly labeled as technical metadata rather than ordinary user-facing language.

Do not rename backend payload keys, Airtable fields, or Airtable tables solely for vocabulary alignment.

## 2026-07-16 - Merchandise Inventory Is a Separate Operational View

Merchandise Inventory lives at `/merchandise` and answers what physical merchandise is currently on the shelves.

It is separate from Merchandise Review at `/merchandise/review`, which answers what merchandise needs matching, validation, or issue resolution.

Inventory uses existing Receipt Entry / Merchandise records and existing linked Shipment, Product, Client, and Location data. It does not introduce new Airtable tables, duplicate records, or add a new inventory subsystem.

Time Here is calculated from the linked Shipment received date/time. Missing or invalid received dates display as Unknown and remain filterable as Unknown. Age groups are 0-7 days, 8-14 days, 15-30 days, More than 30 days, and Unknown. The default sort is oldest merchandise first, with unknown ages last.

Operational status is derived from existing Merchandise status, linked Product status/readiness, and client disposition timing when available.

Status priority is deterministic:
1. Explicit Issue
2. Disposition Due
3. Needs Review
4. In Production
5. Complete
6. Ready for Photo
7. Validated
8. Matched
9. Received

The current schema does not provide a single reliable "removed from inventory" field. Until such a field exists, inventory excludes only explicit removal-like Merchandise statuses and cancelled linked Products, then documents the limitation instead of guessing. Completed merchandise is included unless existing data clearly proves the physical sample has left the studio.

Merchandise Inventory is read-only shelf visibility, not an action workspace. The page should emphasize what is here, where it is, how old it is, and current status. It should not use review-oriented summary metrics such as Needs Review or Issues, and it should not place Merchandise Review actions on the inventory cards.

Inventory supports Card and List views, with the selected view persisted through the app's stored preference helper. Card view is the visual shelf scan and intentionally stays minimal: thumbnail, compact over-image age badge, Package Name, operational Status badge, Barcode or ID Number, Client, and Quantity. Card age badges use compact day labels such as `1d`, `5d`, and `45d`; unknown age displays as `—`. Card view must not show Date Received, Matched Product, Condition, Shipment, Storage Location, or a separate status field.

List view is the detailed inventory table and may show the full Merchandise detail set. It should be readable, sortable where practical, and exportable.

Shared CSS foundations should be introduced incrementally as pages are touched. The current reusable primitives include polished inputs, selects/dropdowns, filter bars, and cards so future graphical work can reuse common styling instead of adding page-specific controls.

Persistent data tables should use the shared Excel export pattern backed by the maintained frontend `xlsx` package. Exports should default to the currently filtered and visible table data, use meaningful headers and timestamped filenames, and export underlying table data rather than card-only presentation fields. Import preview and validation tables are editing/mapping surfaces and are not treated as persistent exportable data tables until there is a specific reporting need.

The physical merchandise inventory page uses Inventory as its user-facing navigation label and page title. This is a navigation clarity label only; the compatibility route remains `/merchandise`, and the domain model still treats the underlying records as Merchandise.

Settings is accessed exclusively from the persistent bottom user/profile area rather than the primary navigation. This keeps the primary navigation focused on operational workspaces and avoids duplicate Settings entries.

## 2026-07-16 - Merchandise Review Uses Operational Queues

Merchandise Review lives at `/merchandise/review` and is separate from Merchandise Inventory.

Review work is organized into four operational queues:
- Needs Review
- Waiting for Product Data
- Validated
- Issue

PMs do not manually move Merchandise into production. They answer review questions by matching Products, validating Merchandise, marking Product data as missing, raising Issues, or skipping for later.

Validation requires a linked Product and blocks when unresolved Merchandise Issues exist.

Waiting for Product Data is stored with the existing Merchandise Notes field during the compatibility period. No new Airtable field or workflow table is added for this phase.

Review-created Issues use the existing Issues table. Matched Merchandise Issues link to the matched Product and carry Merchandise photos as context. The current schema does not have a direct Merchandise link on Issues, so unmatched Merchandise Issues cannot yet be linked authoritatively to the Merchandise record without a future schema change.

## 2026-07-16 - Merchandise Review Is a Visual Review Station

The Merchandise Review frontend should be a focused visual review workspace, not a stacked form page.

The preferred layout is:
- A narrow, persistent queue rail for selecting Merchandise.
- A dominant center inspection area for Merchandise photos and physical details.
- A right decision rail for Product comparison, Product search, review state, and actions.

The queue should stay compact and should not become a dense admin table or full-detail record card.

The primary action is Validate Merchandise. Secondary actions such as Waiting for Product Data, Raise Issue, Remove Match, and Skip for Now should be visually subordinate.

The visual rebuild does not change the underlying domain model, Airtable schema, or Phase 5 backend behavior.

## 2026-07-20 - Merchandise And Merchandise Review Stay Separate In Primary Navigation

Merchandise and Merchandise Review are separate primary navigation destinations.

Merchandise at `/merchandise` is the read-only inventory browser for physical merchandise currently believed to be on the shelf. It may expose filters, list/card views, export, and a read-only detail drawer, but it should not expose workflow actions on cards.

Merchandise Review at `/merchandise/review` is the PM workflow for identifying, matching, validating, waiting, and raising issues for Merchandise. Its queue states should behave as in-page navigation, not dashboard cards.

The primary navigation order is Dashboard, Imports, Receiving, Merchandise, Merchandise Review, Products, Jobs, Clients, Settings.

This is a frontend navigation and UI composition decision. It does not change Airtable schema, backend API behavior, review state derivation, or compatibility routes.

## 2026-07-20 - Merchandise Review V2 Is A Duplicate Experimental Workspace

Merchandise Review V2 lives at `/merchandise-review-v2` and renders the same frontend workspace component as the existing Merchandise Review route at `/merchandise/review`.

V2 exists only as an experimental route for future UX exploration. It must use the same backend endpoints, state management, filters, and actions as V1 until a later decision explicitly changes it.

The primary navigation is limited to daily operational workspaces: Dashboard, Imports, Receiving, Merchandise, Merchandise Review, Merchandise Review V2, Products, and Jobs.

Admin is a top-navigation utility entry, not a production workspace. The former Settings workspace is now canonically `/admin`, and Clients is accessed through Admin rather than primary navigation. Compatibility routes such as `/clients`, `/settings`, and `/administration/:section` may remain.

This is a frontend routing and navigation hierarchy decision. It does not change backend behavior, Airtable schema, review workflow behavior, or administrative page functionality.

## 2026-07-20 - Page-Level Sub-Navigation Is Shared

Receiving, Merchandise Review V1, and Merchandise Review V2 should use the same page-level `SubNav` component and shared `.subnav*` CSS.

The Receiving sub-navigation visual treatment is the source of truth for this component: natural-width horizontal tabs, shared count badges, orange active accent, consistent focus and hover states, and component-contained horizontal overflow on narrow screens.

Workspace pages should provide tab data, active state, callbacks, and optional right-side utility actions. They should not copy tab markup or add page-specific equal-width/grid tab styling.

Primary navigation active matching must be intentionally scoped by route. Merchandise at `/merchandise`, Merchandise Review at `/merchandise/review`, and Merchandise Review V2 at `/merchandise-review-v2` are separate primary workspaces and must not be highlighted by broad parent-route prefix matching.

## 2026-07-20 - Merchandise Review V2 Is The Isolated Workflow Experiment

Merchandise Review V2 may diverge from Merchandise Review V1 for UX experimentation.

The V2 experiment is isolated to `/merchandise-review-v2`. Merchandise Review V1 at `/merchandise/review` remains the current production review station, and Merchandise Inventory at `/merchandise` remains read-only shelf visibility.

The first V2 experiment is a rule-driven Kanban workflow board with columns for New Items for Review, Waiting for Information, Send to THR3D, Waiting for Activation, and Ready for Production.

V2 may derive workflow placement from existing Merchandise Review records, linked Product readiness, artwork state, activation/reference information, and browser-local experimental overrides. It must not introduce backend behavior or Airtable schema changes until a separate schema/API decision is made.

Artwork is the only readiness gate that may be manually overridden in the V2 experiment. Product Information and Activation Information may not be manually overridden.

## 2026-07-20 - Waiting For Information Is Assignment-Focused In Merchandise Review V2

The Merchandise Review V2 `Waiting for Information` gate is the first focused gate workspace in the experimental workflow model.

This workspace operates on the selected Workstream Assignment. Merchandise remains the linked physical object and Product remains supporting information, but the current workflow decision belongs to the Workstream Assignment.

The right-side drawer should answer: "What information is preventing this Workstream Assignment from moving forward?"

The drawer sections are:
- Missing Information
- Product Information
- Artwork
- Activation
- Notes
- Readiness Summary

Missing Information must show only unresolved requirements. Resolved or irrelevant data should not compete with blockers.

Product Information in this gate may search and link existing Products, update existing Product fields, or create a minimally incomplete Product when the existing Product API validation allows it. Product data must stay on Product records and must not be duplicated onto Merchandise.

Artwork override remains a future exception path and is not exposed in this gate iteration.

Activation uses only existing Product/reference fields such as Job, Activation, and Campaign until a future schema decision creates stronger activation structures.

Save updates the Workstream Assignment readiness metadata, blocking requirements, and current status, then recalculates readiness and transitions by reloading V2 data. Save must not automatically move the assignment to another gate. If another gate is valid, the UI may show `Ready for: <Next Gate>` so the PM can explicitly confirm.

Save & Continue should stay inside the current Waiting for Information queue and open the next Workstream Assignment there.

No backend routes, Airtable schema, Merchandise Review V1 behavior, Merchandise Inventory behavior, Receiving behavior, Packaging workflow, THR3D downstream workflow, or Creative Force integration are changed by this decision.

## 2026-07-20 - Marks Photo Uses A Workflow Engine Architecture

Marks Photo is an orchestration platform.

It does not replace Creative Force. It orchestrates Merchandise movement from physical receipt through production and delivery.

The system architecture is separated into four major areas:

1. Receiving
2. Workflow Engine
3. Production Engine
4. Delivery

Receiving is physical intake. It records observations about shipments and Merchandise, including observed identifiers, quantity, storage, condition, photos, and notes. Receiving does not make workflow decisions.

The Workflow Engine is the Project Management-owned business decision layer. It determines workflow, current gate, required information, artwork requirements, activation requirements, primary Workstream, Workstream Routing, and production release.

Creative Force owns production execution. Marks Photo must not create dozens of production workflow gates for Creative Force states. Production remains a single Marks Photo workflow gate, while Creative Force statuses are synchronized and displayed as production metadata.

Delivery covers ready-to-deliver, delivered, billing, and reporting follow-through.

Workflow gates represent ownership changes or business decisions. They do not represent every system event.

Workflow and Status are distinct:
- Workflow identifies the current business gate and owner.
- Status describes current data or synchronized external state.

Future work should move page-specific workflow logic into reusable Workflow Engine definitions and services. Pages, including Merchandise Review V2, should consume Workflow, Gate, Transition, Rule, Requirement, Action, Workflow Assignment, Current Gate, Current Owner, and Current Status concepts rather than hardcoding workflow behavior directly.

Client-configurable workflows are a future architecture goal. A Client should eventually own a Workflow template, allowing one Client to include THR3D or Activation gates while another skips them. This decision does not approve or require an Airtable schema change yet.

## 2026-07-20 - Merchandise Review V2 Renders From Workflow Configuration

Merchandise Review V2 is the experimental workspace for proving configurable workflow behavior while Merchandise Review V1 remains the production review station.

The V2 board must render visible columns from Workflow Engine configuration rather than hardcoding page-local columns. Gate configuration owns label, description, order, board visibility, owner role, entry criteria, exit criteria, allowed next gates, transition mode, card field configuration, and workspace section configuration.

Merchandise remains the workflow work item. The V2 workflow does not create separate work-item records and does not duplicate canonical Product data onto Merchandise.

The first default code-configured workflow includes:
- New Items for Review
- Waiting for Information
- Send to THR3D
- Waiting for Activation
- Ready for Production

Workflow assignment, readiness indicators, valid next gates, and blocked transition explanations are centralized in the Workflow Engine. Pages provide records, client/location context, and local experimental state, then render the returned board/workspace model.

Card click opens a right-side workspace over the board. Gate workspace sections are declared by gate configuration. This establishes the shell for gate-specific work without building every future form or action.

Product Information and Activation Information cannot be manually overridden. Artwork remains the only planned PM override path, but durable override storage and audit logging are deferred until a future schema/API decision.

Drag and drop is deferred for this first working board version. Workflow transitions are exposed through centralized validation and button-based moves in the workspace so invalid moves can be explained consistently.

The Admin workflow editor, durable workflow assignments, backend rule evaluation, client-specific workflow configuration UI, and Creative Force production synchronization remain explicitly deferred.

## 2026-07-20 - New Items For Review Uses Image-First Modal

The first Merchandise Review V2 gate, New Items for Review, uses a large modal workspace instead of the standard right drawer.

This is a deliberate workflow decision. New Items for Review is where Project Management answers the primary business question: "What workstream should this Merchandise follow?" That decision benefits from a first-class image review environment, not a compact detail drawer.

Workflow Engine gate configuration owns `workspaceMode`. Supported modes are:
- `modal`
- `drawer`
- `readonly`

The default Merchandise Review V2 workspace modes are:
- New Items for Review: `modal`
- Waiting for Information: `drawer`
- Send to THR3D: `drawer`
- Waiting for Activation: `drawer`
- Ready for Production: `readonly`

Workstream Assignments replace the older singular Output Type, Production Path, and Primary Workstream routing concepts for Merchandise Review V2. A Merchandise record remains one physical object; workflow branches by creating one Workstream Assignment per selected Workstream.

The initial Workstream registry is exactly Ecomm Photo, Packaging Photo, and THR3D. Do not seed Video, Other, Styled Photo, GS1 Ecomm, or Packaging Photography as active V2 Workstreams in this iteration.

Deliverables are separate from Workstream. GS1 bundles, hero images, packaging images, marketing assets, and 3D deliverables are downstream production concepts and are intentionally not modeled in the Workflow Engine yet.

Workflow branching is now implemented at the Workstream Assignment persistence layer for Merchandise Review V2. It does not yet synchronize with Creative Force or implement complete downstream Ecomm, Packaging, or THR3D production workflows.

The New Items modal saves selected Workstreams as durable Workstream Assignment records. Browser-local V2 decisions are compatibility fallback hints only and should be replaced by assignment records on save.

Artwork override remains a future exception path. This iteration does not expose a visible override workflow.

## 2026-07-20 - New Items For Review Creates Or Reuses Workstream Assignments

The Merchandise Review V2 `New Items for Review` modal is the first and most important workflow decision point. The PM is deciding what work must happen to the physical Merchandise.

The modal should prioritize reviewing Merchandise, not filling out an administrative form. The left side remains image-first. The right side should guide the PM through Product Identification, Workstream selection, assignment preview, readiness review, and save.

The right-side sections are:
- Merchandise Summary
- Product Identification
- Workstreams
- Assignment Preview
- Readiness Summary
- Notes

Product Identification uses existing Product records, Product endpoints, and Merchandise Review linking behavior. It may create a minimally incomplete Product when existing Product validation rules allow it, but Product data must remain on Product records and must not be duplicated onto Merchandise.

Workstreams are the primary business decision in this gate. The active V2 Workstreams are Packaging Photo, Ecomm Photo, and THR3D as configured in the Workstreams table or fallback registry. Multiple Workstreams may be selected for one physical Merchandise record.

Assignment Preview must come from Workflow Engine preview data, not duplicated page-local workflow labels. It should show the Workstream, Workflow, Initial Stage, and whether that Merchandise + Workstream assignment already exists.

Saving from this modal must create missing Workstream Assignments, reuse existing active Merchandise + Workstream assignments, and avoid duplicate assignment creation. Existing active assignments should remain preserved during save.

Readiness in this modal is displayed per selected Workstream Assignment using the shared readiness requirements. This prepares the UI for assignment-specific rules while the current implementation still uses the existing Product Information, Artwork, and Activation evaluators.

Save persists assignments, refreshes V2 Merchandise and assignment data, refreshes readiness and transitions, and remains on the current Merchandise. Save & Continue saves and opens the next Merchandise in the same current queue while preserving board filters and position.

This decision does not change Merchandise Review V1, Receiving, Merchandise Inventory, Products page behavior, backend schema, downstream Packaging or THR3D workflow behavior, production synchronization, or audit logging.

## 2026-07-20 - Workstream Is The Routing Domain Concept

Workstream is the first-class business concept for production routing decisions in Marks Photo.

The selected Workstreams determine which Workstream Assignments are created. Each assignment owns its workflow template, current gate, current owner, current status, readiness metadata, blockers, optional Job link, and completion metadata.

The canonical current Workstreams are:
- Ecomm Photo
- Packaging Photo
- THR3D

One Merchandise record may have multiple Workstream Assignments. Merchandise is never duplicated to represent parallel production work.

The Airtable Products field formerly named `Output Type` has been renamed in place to `Workstream`, preserving field ID `fldSl0Ctmp7dWtJUO` and existing values. That single-select Product field is a compatibility bridge for imported Product routing data, not the durable Merchandise Review V2 workflow state. Durable workflow state lives in Workstream Assignment records.

## 2026-07-20 - Workstream Assignments Are The Durable V2 Workflow Branch

Merchandise is the physical object. Workstream is the configured kind of production work. Workstream Assignment is the operational work item.

Merchandise Review V2 uses additive Airtable tables for the experimental workflow architecture:
- `Workstreams`
- `Workstream Assignments`

The `Workstreams` table stores active Workstream definitions and workflow-template configuration. The `Workstream Assignments` table connects one Merchandise record to one Workstream and owns current workflow state.

Initial seeded Workstream records are:
- Ecomm Photo
- Packaging Photo
- THR3D

This decision intentionally preserves Merchandise Review V1, Receiving behavior, Merchandise Inventory, Product linking, R2 image storage, and Creative Force integration. Full downstream Ecomm, Packaging, THR3D, Admin configuration, audit logging, and production synchronization remain future work.

## 2026-07-20 - Application Code Uses Canonical Domain Table Concepts

Application code should treat Products, Shipments, and Merchandise as the canonical table concepts.

During the Airtable compatibility period:
- Products map to the current physical `Items` table.
- Shipments map to the current physical `Receipts` table.
- Merchandise maps to the current physical `Receipt Entries` table.

Backend code should use `PRODUCTS_TABLE`, `SHIPMENTS_TABLE`, and `MERCHANDISE_TABLE` for table access. Legacy constants may remain as compatibility aliases for old tests, payloads, local scripts, and transitional route names.

The frontend may continue to preserve legacy API names such as `listItems`, `listReceipts`, `itemIds`, and `receiptIds` where changing them would create churn or break compatibility, but new user-facing language should use Product, Shipment, and Merchandise.

Physical Airtable table and linked-field renames are a separate schema migration. That migration must preserve records and links, have a rollback plan, and be explicitly approved before changing the live base. Until then, the canonical table constants should continue to point at the existing physical table names or to environment-configured renamed tables.

## 2026-07-20 - Live Airtable Schema Uses Canonical Domain Names

The physical Airtable schema has been migrated in place to the canonical domain language.

Renamed tables:
- `Items` -> `Products`
- `Receipts` -> `Shipments`
- `Receipt Entries` -> `Merchandise`

The table IDs were preserved:
- Products: `tblC9Tu69BEOIy6Q4`
- Shipments: `tblnDJYWtYvgEunVM`
- Merchandise: `tblWALCoKwvT6Nl8A`

Relationship fields were renamed to Product, Products, Shipment, Shipments, and Merchandise where their business meaning matched the renamed entities. Merchandise observation fields were renamed to Observed Package Name, Observed Identifier, and Storage Location.

Application defaults now point to the canonical physical table names. Deprecated code aliases such as `ITEMS_TABLE`, `RECEIPTS_TABLE`, `RECEIPT_ENTRIES_TABLE`, `listItems`, `listReceipts`, `itemIds`, and `receiptIds` may remain for one migration cycle to protect compatibility and rollback, but new work should not introduce new user-facing Item, Receipt, or Receipt Entry language.

The migration was performed by Airtable Metadata API in-place renames by table ID and field ID. Records were not copied or duplicated.

## 2026-07-20 - Workflow Templates Are Additive Compatibility Configuration

Superseded for active Intake by `2026-07-20 - Active Intake Is Merchandise-Driven`. Workflow Templates may remain only as legacy compatibility infrastructure until a later cleanup decision.

Phase 1 of the configurable workflow engine is additive.

Workflow Templates and Workflow Stages are now the durable configuration layer for Work Order stage metadata, but the existing `Current Stage` string on Work Orders remains the compatibility field for current workflows.

Rules:
- Do not remove or rename `Current Stage` during Phase 1.
- Do not rename the current stage keys: `new-review`, `waiting-information`, `send-thr3d`, `waiting-activation`, or `ready-production`.
- Work Order code should prefer linked `Current Workflow Stage` when present and fall back to legacy `Current Stage`.
- Any Work Order stage change should keep writing `Current Stage` and write the linked Workflow Template / Workflow Stage when the configured default can be resolved.
- Template/stage mutations belong in Admin and require Admin access.
- A stage linked to active Work Orders, including through legacy `Current Stage`, must not be deactivated.
- Duplicating a template creates an inactive, non-default copy with independent stage records.

This phase intentionally does not add Work Order Types, Client Defaults, stage requirements, workflow actions, automation rules, route changes, Work board redesign, or downstream production workflow changes. The recommended next phase is Work Order Types.

## 2026-07-20 - Work Order Types Own Business Purpose

Superseded for active Intake by `2026-07-20 - Active Intake Is Merchandise-Driven`. Work Order Types may remain only as legacy compatibility infrastructure until a later cleanup decision.

Phase 2 adds Work Order Types as the configuration layer above Workflow Templates.

Separation of responsibility:
- Workflow Template owns stages and workflow structure.
- Work Order Type owns the business purpose and configuration for a kind of Work Order.
- Work Order is the individual operational work instance.

The initial seeded Work Order Type is only `Merchandise Review` with key `merchandise-review`. Do not seed Photo Shoot, Retouch, Approval, THR3D, Packaging, Ecomm, or other speculative types until the operating model is approved.

Compatibility rules:
- Existing Work Orders without a Work Order Type must keep working.
- New Merchandise Review Work Orders should receive the active default Work Order Type when it can be resolved.
- Work Order Type resolution must not replace `Current Stage`, `Workflow Template`, or `Current Workflow Stage`.
- Work Order responses may include optional type/template metadata, but existing fields and compatibility aliases must remain.
- The active default Work Order Type cannot be deactivated.
- A Work Order Type referenced by active Work Orders should not be deactivated.
- A Work Order Type key should not be changed while active Work Orders reference that type.
- Duplicating a Work Order Type creates an inactive, non-default copy with a unique key.

This phase intentionally does not redesign the Work board, expose type selection in Work, add Client Defaults, implement stage requirements/actions, or add workflow automation. A likely Phase 3 is explicit configurable Work Order creation rules or configurable workflow transitions/actions, but no Phase 3 behavior is approved by this decision.
