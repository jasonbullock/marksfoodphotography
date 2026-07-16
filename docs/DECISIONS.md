# Product Decisions

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
