# Working Domain Model

This model is intentionally provisional.

## Canonical Architecture Direction

Marks Photo revolves around Merchandise.

Merchandise is the operational object moving through Walnut Studio. Products, Jobs, Shipments, Issues, client requirements, artwork, activation emails, and production/reporting references exist to answer what should happen to the Merchandise next and how completed production should be reported.

Marks Photo is not the system of record for Products, Jobs, or external project management. It is the operational readiness system that consolidates enough supporting information to receive, understand, prepare, photograph, route, and dispose of Merchandise.

The core question is:

> What do we need to do with this Merchandise right now?

Operational Readiness is the heart of the model. Readiness is evaluated against client requirements and should communicate blockers in plain operational terms, not implementation workflow jargon.

Marks Photo owns operational information required to execute production and report production. It does not own upstream project planning, client communication, budgeting, approvals, or project task management.

## Application Workspace Model

The application shell presents Marks Photo as an operational command center.

Primary navigation is organized around the core operational questions:
- Dashboard: what needs attention?
- Receiving: what arrived?
- Merchandise: what information is missing and what should happen next?
- Planning: what are we photographing?
- Production: where is the work now?

Products, Jobs, Clients, Imports, Issues, and Airtable diagnostics remain supporting surfaces. They may remain routable for compatibility, administration, reporting, or incremental migration, but they are not the primary domain hierarchy.

Shared workspaces should use three contextual regions when appropriate:
- Queue: what needs attention within this workspace
- Canvas: the main work surface
- Inspector: details, decisions, or supporting information for the selected Merchandise or production work

This workspace model is a frontend shell/layout decision. It does not change Airtable table names, backend payloads, compatibility routes, or the underlying provisional domain model.

## Product Data

Imported reference data from MySGS or client files.

It may be incomplete and does not initiate PM work by itself. Product information is supporting information for Merchandise, not the center of the application.

Product Information has three responsibilities:
- Operational Readiness
- Production Execution
- Production Reporting

Product Information may come from any source. Marks Photo does not care where it originated.

If Product data exists, the system should reuse it. If it does not exist, the user should be able to enter only the minimum missing information needed to make the Merchandise operationally ready. Users should not experience "match Product" and "create Product" as separate workflows; the application should present one continuous Merchandise readiness experience.

Minimum operational information may include reporting references such as Job Number, Client Project Number, External Reference, Service Type, Activation, and Deliverable Type. These are not project-management fields in Marks Photo. They are operational references used to execute production and associate completed production activity with the correct reporting identifiers.

Current implementation note:
- The live Airtable `Products` table represents Products.
- Backend table access uses the canonical `PRODUCTS_TABLE` constant, which defaults to `Products`.
- The canonical frontend route is `/products`; legacy `/items` redirects there.
- The frontend vocabulary layer translates recurring product-facing labels while preserving deprecated compatibility payload names such as `itemIds` where needed.

## Merchandise

A physical sample received by the studio.

Merchandise is the core operational object in Marks Photo.

Merchandise can:
- Arrive with or without matching product data
- Be damaged or incorrect
- Require replacement
- Be photographed
- Be shipped to THR3D
- Be received multiple times for the same product

Merchandise receipt initiates review work.

Everything exists to move Merchandise toward the correct next operational step: waiting for missing information, ready for photography, THR3D, replacement, no production, production, or disposition.

Current implementation note:
- The live Airtable `Merchandise` table represents Merchandise.
- Backend table access uses the canonical `MERCHANDISE_TABLE` constant, which defaults to `Merchandise`.
- Airtable now stores package-facing fields as Observed Package Name and Observed Identifier.
- The canonical inventory route is `/merchandise`. It is a current physical inventory view, not a review workflow.
- The canonical review route is `/merchandise/review`; legacy `/verification` redirects there.
- `GET /api/merchandise` returns current inventory records enriched from existing Shipment, Product, Client, and Location data.
- Deprecated `Receipt Entries` terminology may appear only in historical documentation, compatibility code names, or rollback notes.

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

Shipments support Receiving, but they are not the operational center for PM review or readiness. They answer what arrived and when; Merchandise answers what Walnut must do next.

Current implementation note:
- The live Airtable `Shipments` table represents Shipments.
- Backend table access uses the canonical `SHIPMENTS_TABLE` constant, which defaults to `Shipments`.
- The canonical frontend route is `/shipments`; legacy `/receiving` and `/receipts` URLs redirect there.
- Deprecated `Receipts` terminology may appear only in historical documentation, compatibility code names, or rollback notes.

## Review Work

Automatically generated when merchandise is received.

Review determines:
- What the merchandise is
- Whether it is usable
- Whether additional data is required
- Whether artwork or instructions are missing
- Whether it goes to Photography, THR3D, Replacement, Wait, or No Production

Review should not require users to perform database work. If supporting Product information exists, the software should reuse it. If it is missing, the user should continue entering only the missing operational information in the Merchandise context.

Current implementation note:
- Merchandise Review uses existing Merchandise records as the review work surface.
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

## Production Reporting

Marks Photo is expected to become the operational reporting source for Walnut Studio.

Production reports may include:
- Client
- Job Number
- Product
- Service Type
- Production Dates
- Photographer
- Production Status
- Deliverables
- Time
- Disposition

This does not make Marks Photo a project-management application. Product Information and production activity should carry enough operational references to report completed work accurately.

## External References

Workfront, MediaBox, MySGS, structure-form numbers, and other identifiers are references. None should automatically become the application's primary workflow hierarchy.

## Client Requirements

The Clients table defines operational readiness.

Each client specifies the minimum information Walnut needs before photography can begin. Examples include Product Name, Identifier, Brand, Size, Artwork Required, Activation Email Required, and whether Photography or THR3D is required.

Marks Photo should evaluate readiness against these client requirements regardless of where the information originated.

## Operational Readiness

Operational Readiness answers whether Walnut can photograph the Merchandise now.

Typical readiness checks include:
- Merchandise Received
- Product Information Available
- Client Required Fields Complete
- Merchandise Verified
- Artwork Available, if required
- Photography Required, otherwise THR3D
- Activation Email Received

Readiness status should explain blockers, such as missing artwork or activation email, rather than expose workflow jargon.

## Workflow Engine

The Workflow Engine is the reusable business decision layer for Merchandise movement.

It sits between Receiving and Production:

- Receiving records physical facts and creates Merchandise.
- The Workflow Engine evaluates what should happen next.
- Creative Force executes production.
- Marks Photo synchronizes Creative Force production metadata.
- Delivery handles ready-to-deliver, delivered, billing, and reporting states.

The Workflow Engine should eventually support client-configurable workflow templates without requiring pages to hardcode business routing rules.

### Workflow

A Workflow is a named template for moving Merchandise through a small set of business gates.

A Workflow may belong to a Client. For example, one Client may use Review, THR3D Decision, Activation, Release to Production, Production, and Delivery gates, while another Client may skip THR3D or Activation.

Workflows should be configuration, not page-specific code.

### Gate

A Gate is a business decision point or ownership boundary.

A Gate should eventually support:

- gate name
- display name
- description
- order
- owner
- current status
- entry rules
- exit rules
- required data
- available actions
- allowed next gates
- permissions
- visible fields
- panel layout

Gates should not represent every system event. Queued, assigned, retouch, QC, export, upload, and similar production details are Creative Force metadata, not Marks Photo gates.

### Transition

A Transition is a move from one Gate to another.

Transitions are allowed only when the destination Gate's requirements and rules are satisfied. The system should explain blocked transitions in operational language.

### Requirement

A Requirement is a readiness condition that can be evaluated independently.

Initial Merchandise Review requirements include:

- Product Information
- Artwork
- Activation Information

Product Information and Activation Information cannot be manually overridden. Artwork is the first planned exception and may support a Project Management override with a reason and audit trail.

### Action

An Action is something a user or system can do at a Gate.

Examples:

- review Merchandise
- choose Output Type
- resolve required data
- override Artwork
- attach Activation
- release to Production

Actions should belong to Gate configuration and permissions rather than scattered page code.

### Workflow Assignment

A Workflow Assignment represents one Merchandise record's current position in a Workflow.

An assignment should expose:

- workflow
- subject type
- subject id
- current Gate
- current Owner
- current Status
- Requirements
- available Actions
- allowed next Gates

During the compatibility period, assignments may be derived from existing Merchandise Review records and browser-local experimental state. Durable schema-backed assignments require a future schema/API decision.

### Owner

Owner identifies who owns the current Gate:

- Receiving owns physical intake.
- Project Management owns Workflow Engine decisions.
- Creative Force owns production execution.
- Delivery owns ready-to-deliver, delivered, billing, and reporting follow-through.

### Status

Status is not the same as Workflow.

Status describes current data or synchronized external state. Workflow identifies the current business decision or ownership gate.

Creative Force production status should be synchronized and displayed as production metadata, not expanded into dozens of Marks Photo workflow gates.

### Output Type

Output Type is an early Review decision.

Examples:

- Photography
- Scan
- THR3D
- Video
- Other

Output Type should eventually influence routing, especially THR3D branching, without forcing pages to hardcode routing logic.
