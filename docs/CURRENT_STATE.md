# Current State

## Current Focus

Aligning the application with the updated Marks Photo product vision: an operational readiness system centered on Merchandise.

Marks Photo should not become a project management system, PIM, or system of record. It should answer what Walnut needs to do with Merchandise right now.

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

## Current Questions

- How should the Merchandise Workspace merge "match Product" and "enter missing Product information" into one continuous readiness experience?
- Which client requirement fields are authoritative enough today to drive readiness?
- Which reporting references are required for production execution and completed-work reporting?
- How should activation emails become structured readiness inputs?
- What is the smallest Planning workspace that answers "What are we photographing?"
- What is the smallest Production workspace that answers "Where is the work now?"
- What explicit field or event should eventually prove Merchandise has left the studio?

## Next Step

The live Airtable schema now uses canonical Products, Shipments, and Merchandise table names. The likely next product step is to continue Merchandise Review V2 experimentation without changing Merchandise Review V1 or the read-only Merchandise inventory workspace.

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
- Photo attachments remain present on Products and Merchandise photo fields.
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
- Settings is now labeled Admin in the top navigation utility area.
- Admin appears on the far right side of the top navigation, immediately before the logged-in user/profile control.
- `/settings`, `/administration`, `/administration/:section`, and compatibility `/clients` still route into the Admin workspace.
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

## 2026-07-20 Merchandise Review V2 Experimental Kanban Board

Merchandise Review V2 is no longer a visual duplicate of Merchandise Review V1.

What is now true:
- `/merchandise/review` continues to render the existing Merchandise Review V1 visual review station.
- `/merchandise-review-v2` now renders an isolated experimental Kanban-style workflow board.
- V2 still reads Merchandise Review records from the existing `api.listMerchandiseReviewEntries()` endpoint.
- V2 does not add backend endpoints, Airtable tables, Airtable fields, or schema-backed workflow status.
- The experimental board has five workflow columns:
  - New Items for Review
  - Waiting for Information
  - Send to THR3D
  - Waiting for Activation
  - Ready for Production
- Cards are assigned to columns with frontend workflow rules derived from existing review state, linked Product readiness, Merchandise identity, artwork state, activation/reference data, and local experimental overrides.
- Cards show a large thumbnail, Package/Product Name, Client, observed identifier, Storage Location, Time Here, optional status badge, and three readiness indicators.
- Readiness indicators represent Product Information, Artwork, and Activation Information.
- Drag and drop is implemented with reusable Kanban components and validation helpers.
- Invalid moves are blocked and explained in the board UI rather than silently failing.
- Artwork is the only readiness gate with a PM override. Overrides require a reason and record user, date/time, reason, and override type in browser-local experimental state.
- Overridden artwork is visually distinct from automatically satisfied artwork with a marked readiness dot.

What did not change:
- Merchandise Review V1 behavior, layout, actions, filters, matching, validation, image viewer, and right-side decision panel did not change.
- Merchandise Inventory did not change.
- Receiving, Dashboard, Products, Jobs, Admin, backend endpoints, and Airtable schema did not change.

Current V2 caveat:
- V2 workflow moves and artwork override audit entries are stored in browser-local experimental state only. They are not durable across browsers and are not backend-audited until a future schema/API decision is made.

Validation:
- `python3 -m unittest tests/test_frontend_routing.py` passed.
- `npm run build` passed in `frontend/`.

## 2026-07-20 Workflow Engine Foundation

Marks Photo now has the first frontend Workflow Engine foundation.

What is now true:
- `frontend/src/workflowEngine.js` defines reusable workflow concepts for Workflow, Gate, Requirement, Action, Workflow Assignment, Current Gate, Current Owner, Current Status, Output Type, and transition validation.
- The initial workflow template is `MERCHANDISE_REVIEW_WORKFLOW`.
- The workflow foundation models the major ownership boundaries:
  - Receiving records physical observations.
  - Project Management owns Workflow Engine decisions.
  - Creative Force owns production execution.
  - Delivery owns ready-to-deliver, delivered, billing, and reporting follow-through.
- Workflow Gates are treated as ownership changes or business decisions, not low-level system events.
- Production remains a single Marks Photo workflow gate concept. Creative Force states such as queued, assigned, retouch, QC, export, and upload are production metadata, not Marks Photo gates.
- The engine exposes gates, allowed next gates, required data, available actions, requirement evaluation, workflow assignments, and transition validation.
- Merchandise Review V2 now consumes the Workflow Engine for gate placement, readiness requirements, and drag/drop transition validation.
- V2 no longer owns the Merchandise Review business placement rules directly in the page component.
- The first engine-backed requirements are Product Information, Artwork, and Activation Information.
- Output Type is modeled as a workflow concept with initial values for Photography, Scan, THR3D, Video, and Other.

What did not change:
- No backend endpoints changed.
- No Airtable schema changed.
- Receiving behavior did not change.
- Merchandise Review V1 did not change.
- Merchandise Inventory did not change.
- Production behavior did not change.
- V2 browser-local experimental workflow moves and artwork overrides remain local-only until a future schema/API decision.

Current architecture caveat:
- The Workflow Engine foundation is frontend-only. Durable Workflow Assignments, audit logs, client-configurable workflow templates, permissions, and backend rule evaluation still require future schema/API work.

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
