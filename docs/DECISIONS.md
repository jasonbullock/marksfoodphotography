# Product Decisions

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

Admin is a top-navigation utility entry, not a production workspace. Settings is labeled Admin, and Clients is accessed through Admin rather than primary navigation. Compatibility routes such as `/clients`, `/settings`, and `/administration/:section` may remain.

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

## 2026-07-20 - Marks Photo Uses A Workflow Engine Architecture

Marks Photo is an orchestration platform.

It does not replace Creative Force. It orchestrates Merchandise movement from physical receipt through production and delivery.

The system architecture is separated into four major areas:

1. Receiving
2. Workflow Engine
3. Production Engine
4. Delivery

Receiving is physical intake. It records observations about shipments and Merchandise, including observed identifiers, quantity, storage, condition, photos, and notes. Receiving does not make workflow decisions.

The Workflow Engine is the Project Management-owned business decision layer. It determines workflow, current gate, required information, artwork requirements, activation requirements, output type, THR3D routing, and production release.

Creative Force owns production execution. Marks Photo must not create dozens of production workflow gates for Creative Force states. Production remains a single Marks Photo workflow gate, while Creative Force statuses are synchronized and displayed as production metadata.

Delivery covers ready-to-deliver, delivered, billing, and reporting follow-through.

Workflow gates represent ownership changes or business decisions. They do not represent every system event.

Workflow and Status are distinct:
- Workflow identifies the current business gate and owner.
- Status describes current data or synchronized external state.

Future work should move page-specific workflow logic into reusable Workflow Engine definitions and services. Pages, including Merchandise Review V2, should consume Workflow, Gate, Transition, Rule, Requirement, Action, Workflow Assignment, Current Gate, Current Owner, and Current Status concepts rather than hardcoding workflow behavior directly.

Client-configurable workflows are a future architecture goal. A Client should eventually own a Workflow template, allowing one Client to include THR3D or Activation gates while another skips them. This decision does not approve or require an Airtable schema change yet.

## 2026-07-20 - Application Code Uses Canonical Domain Table Concepts

Application code should treat Products, Shipments, and Merchandise as the canonical table concepts.

During the Airtable compatibility period:
- Products map to the current physical `Items` table.
- Shipments map to the current physical `Receipts` table.
- Merchandise maps to the current physical `Receipt Entries` table.

Backend code should use `PRODUCTS_TABLE`, `SHIPMENTS_TABLE`, and `MERCHANDISE_TABLE` for table access. Legacy constants may remain as compatibility aliases for old tests, payloads, local scripts, and transitional route names.

The frontend may continue to preserve legacy API names such as `listItems`, `listReceipts`, `itemIds`, and `receiptIds` where changing them would create churn or break compatibility, but new user-facing language should use Product, Shipment, and Merchandise.

Physical Airtable table and linked-field renames are a separate schema migration. That migration must preserve records and links, have a rollback plan, and be explicitly approved before changing the live base. Until then, the canonical table constants should continue to point at the existing physical table names or to environment-configured renamed tables.
