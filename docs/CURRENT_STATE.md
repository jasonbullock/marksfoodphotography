# Current State

## Current Focus

Redesigning the post-receiving workflow around automatically generated merchandise review work.

## Confirmed Decisions

- Receiving remains focused on logging physical merchandise.
- Merchandise receipt is the main workflow trigger.
- PMs must not manually create Jobs or Projects.
- Imported product data may be incomplete.
- Review must support Photo, THR3D, Replacement, Waiting, and No Production.
- Ready for Photo must mean that merchandise, data, artwork, and production instructions are complete.
- Activation emails should eventually become structured production instructions.
- Existing Items and Jobs concepts require reconsideration.
- Do not rename or rebuild them until the domain model is agreed upon.

## Current Questions

- What is the smallest new record needed to represent automatically generated review work?
- Should Receipt Entries themselves carry the review lifecycle initially?
- When and how should related merchandise become a production grouping?
- Which information is required before Photography versus THR3D?
- How will activation-email information enter the application?

## Next Step

Inspect the existing schema and code read-only. Recommend the smallest safe transition from the existing Items/Jobs model toward merchandise-triggered review work. Do not implement yet.

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
