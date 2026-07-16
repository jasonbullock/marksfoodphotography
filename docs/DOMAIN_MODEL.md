# Working Domain Model

This model is intentionally provisional.

## Product Data

Imported reference data from MySGS or client files.

It may be incomplete and does not initiate PM work by itself.

Current implementation note:
- The existing Airtable `Items` table represents Products during the compatibility period.
- UI and new APIs should use Product language even while the physical table name remains `Items`.
- The canonical frontend route is `/products`; legacy `/items` redirects there.
- The frontend vocabulary layer translates recurring product-facing labels while preserving Airtable field names such as `Item Name` and `Item Job Number` for imports and backend payloads.

## Merchandise

A physical sample received by the studio.

Merchandise can:
- Arrive with or without matching product data
- Be damaged or incorrect
- Require replacement
- Be photographed
- Be shipped to THR3D
- Be received multiple times for the same product

Merchandise receipt initiates review work.

Current implementation note:
- The existing Airtable `Receipt Entries` table represents Merchandise during the compatibility period.
- UI should describe package-facing fields as Package Name and Barcode or ID Number, even if the stored field names remain Product Name and SKU / ID.
- The canonical inventory route is `/merchandise`. It is a current physical inventory view, not a review workflow.
- The canonical review route is `/merchandise/review`; legacy `/verification` redirects there.
- `GET /api/merchandise` returns current inventory records enriched from existing Shipment, Product, Client, and Location data.
- Admin/developer surfaces may show `Receipt Entries` only when clearly identified as the technical Airtable table behind Merchandise.

Inventory implementation note:
- Merchandise Inventory answers what physical goods are currently held by the studio.
- Merchandise Inventory is read-only shelf visibility. It shows what is here, where it is, how old it is, and current status.
- Inventory supports Card and List views with shared filters.
- The selected inventory view persists as a user preference in localStorage.
- Card view is the visual shelf scan: thumbnail, Package Name, one large age badge, Barcode or ID Number, Client, and Quantity.
- Card view intentionally omits Date Received, Matched Product, Condition, Shipment, Storage Location, and separate status text.
- List view is the detailed table view and includes the full available Merchandise detail set, including storage location, status, age, date received, matched Product, Shipment, and condition.
- Inventory can export the currently filtered/sorted visible table data to `.xlsx` through the shared table export pattern, regardless of whether the user is currently in Card or List view.
- Merchandise Review actions and review-oriented summary metrics belong in `/merchandise/review`, not `/merchandise`.
- Time Here is derived from the linked Shipment received date/time.
- Time Here is Unknown when the Shipment received date/time is missing or invalid.
- Inventory age groups are 0-7 days, 8-14 days, 15-30 days, More than 30 days, and Unknown.
- Merchandise Inventory sorts oldest physical merchandise first by default, with Unknown ages last.
- Current inventory status is derived from existing Merchandise status, linked Product status/readiness, and client disposition timing when available.
- Current inventory status priority is Issue, Disposition Due, Needs Review, In Production, Complete, Ready for Photo, Validated, Matched, then Received.
- The current schema does not have a single authoritative "removed from shelf" field. During the compatibility period, explicit removal-like Merchandise statuses and cancelled linked Products are excluded; otherwise Merchandise is treated as physically present.
- Complete linked Products are not enough to remove Merchandise from inventory because completed physical samples may still be on the shelf.

## Shipment

The logistics parent for received merchandise.

A Shipment stores carrier, tracking, received time, receiver, location, shipment photos, and shipment notes.

Shipments support Receiving, but they are not the operational center for PM review.

Current implementation note:
- The existing Airtable `Receipts` table represents Shipments during the compatibility period.
- The canonical frontend route is `/shipments`; legacy `/receiving` and `/receipts` URLs redirect there.
- Admin/developer surfaces may show `Receipts` only when clearly identified as the technical Airtable table behind Shipments.

## Review Work

Automatically generated when merchandise is received.

Review determines:
- What the merchandise is
- Whether it is usable
- Whether additional data is required
- Whether artwork or instructions are missing
- Whether it goes to Photography, THR3D, Replacement, Wait, or No Production

Current implementation note:
- Merchandise Review uses existing Receipt Entry / Merchandise records as the review work surface.
- Review currently derives one of four operational states: Needs Review, Waiting for Product Data, Validated, or Issue.
- Needs Review is the default for newly received or matched Merchandise until a PM makes a review decision.
- Waiting for Product Data means the Merchandise is identifiable but the matching Product is not imported or complete enough to link. During the compatibility period this is represented in the existing Merchandise Notes field with a marker, not a new Airtable field.
- Validated means the Merchandise has a linked Product and has passed the current review gate.
- Issue means the Merchandise itself has been flagged or has an unresolved Merchandise-type Issue.
- Merchandise validation requires a linked Product and should not create Product records.
- Product search and matching must remain client-filtered by the current authenticated user's allowed Clients.
- Receiving photos belong to Merchandise and are used as review context.

Issue implementation note:
- The current Issues table links to Products and Jobs, not directly to Merchandise.
- For matched Merchandise, review-created Issues link to the matched Product and can include Merchandise photos.
- For unmatched Merchandise, the Merchandise can be marked as Issue, but the Issue record cannot carry a direct Merchandise relationship until a future schema decision adds one.

Workspace implementation note:
- The `/merchandise/review` frontend is a visual review station composed of a queue rail, Merchandise photo inspection area, and decision rail.
- This workspace composition does not introduce a new Review table or workflow object.
- The right decision rail compares the physical Merchandise with the matched or searched Product, while the center area remains focused on Merchandise photos and physical facts.
- The left queue represents operational review states derived from existing Merchandise and Issue data.

## Work Group

A system-generated or system-suggested grouping of related merchandise and products.

PMs do not create work groups from scratch.

Possible grouping signals:
- Client
- Receipt or shipment
- Imported references
- Workfront number
- MediaBox number
- MySGS number
- Activation information
- Similar arrival timing

## Production Instructions

Structured information currently communicated through activation emails.

May include:
- Priority
- Due date
- Scope
- SKU/CVID/UPC references
- GS1 bundle requirements
- Required views
- Artwork
- Special instructions
- File destinations

## External References

Workfront, MediaBox, MySGS, structure-form numbers, and other identifiers are references. None should automatically become the application's primary workflow hierarchy.
