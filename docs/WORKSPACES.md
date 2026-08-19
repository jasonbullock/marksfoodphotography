# Workspaces

Workspace means business question.

A workspace exists when the business needs a distinct operational perspective. Views inside a workspace can change often; workspaces should change rarely.

Marks Photo should not create a new workspace for every table, status, workflow state, or implementation idea. It should create workspaces only when the user is asking a meaningfully different question.

## Information Architecture

Primary navigation should conceptually represent departments and major operational surfaces rather than workflows:

- Dashboard
- Import
- Products
- Shipments
- Planning
- Production
- Inventory
- Jobs
- Clients
- Settings

The implemented navigation may expose only active workspaces for the current phase. Do not add placeholder navigation entries solely because a future workspace has been architected.

## Products

Business Question:

> What expected products are complete, missing, blocked, or ready for work?

Purpose:

Products is the primary PM product-data workspace and expected-work view.

Products are expected work and product-data aggregation records. They describe what Walnut expects to prepare, what Match Keys and Client References belong to that item, what Naming / Path Tokens are needed, and what production outcomes may be required.

Products should feel Excel-like where PMs need dense editing, but it should add operational value that a spreadsheet cannot provide. PMs should be able to:

- upload Excel files
- paste rows copied from a spreadsheet
- map source columns to Product fields
- save and reuse client-specific mappings
- preview imports before committing
- validate required fields, duplicate Match Keys, malformed references, and unsupported values
- correct data inline before or after commit
- commit expected Product records without creating Jobs, Projects, Production Requests, or administrative containers

Products should behave like an operational reference grid, import workbench, and readiness surface. It should help users see:

- expected products with received merchandise
- expected products still missing merchandise
- products with incomplete imported facts
- products blocked by artwork, activation, quantity, or mismatch issues
- products ready to create or advance Ecomm, Packaging, or THR3D work
- products grouped or filtered by client-specific production needs

Products should not store raw physical check-in facts. Storage location, condition, shipment photos, quantity received, damage, and observed arrival notes belong to Shipments/Received Merch. Products should show those facts through relationships, not duplicate them.

Unmatched merchandise is an exception to the product-led path. It should be visible as an exception needing match or manual minimum facts, not treated as the normal center of the application.

Products should not become one massive universal Product table. The Product workspace should distinguish stable Product fields from client-specific reference data and derived readiness summaries. Topco is the complex starting client, but the model must support clients with simpler field needs, different naming conventions, pickup imagery, different output needs, and different handoff references.

Product fields should be understood in these categories:

- Core Product fields: stable cross-client facts used to describe expected work.
- Match Keys: values used to match Received Merch to Expected Product.
- Client References: references used for naming conventions, folder paths, reporting, Creative Force, and client systems.
- Naming / Path Tokens: structured tokens used to generate filenames, folders, upload paths, or production labels.
- Import-only extra data / client-specific reference data: source facts retained without promoting every client column to the universal grid.
- Derived readiness/work status: calculated from related Received Merch, Activations, workstream cards, THR3D shipping items, artwork, and client requirements.

## Shipments

Business Question:

> What physical merchandise is entering or leaving the studio?

Purpose:

Manage physical merchandise movement.

Shipments records the physical truth of merchandise entering and leaving the studio. It captures shipments, merchandise observations, quantity, condition, storage, photos, notes, and observed identifiers.

Shipments should check merchandise in against expected Products when possible. It should not decide the full production path. Its job is to make physical movement trustworthy and visible.

Shipment-level photos are physical evidence owned by the Shipment. Use them for box labels, delivery context, damage, carton or pallet context, and other images that apply to the shipment as a whole. Store originals in R2 and keep only metadata on the Shipment; do not duplicate shipment photo metadata onto individual Merchandise records.

Typical Shipments work:

- create or update a Shipment
- record merchandise in the shipment
- photograph incoming merchandise
- capture shipment-level photos such as boxes, labels, and damage
- capture observed package information
- note damage, quantity, storage, or uncertainty
- create enough evidence for later readiness decisions
- prepare outbound THR3D shipments
- support future physical outbound movements

Shipments may support lightweight internal views:

- `Incoming`: receive deliveries, photograph merchandise, assign storage, and complete inventory intake.
- `Outgoing`: box and ship merchandise that needs to leave the studio. The first intended Outgoing use is THR3D shipments.

THR3D is not its own workspace and not a production workstream. It is an outbound shipment queue inside Shipments. Planning determines whether THR3D is required and creates a THR3D shipping item; Shipments handles the physical boxing and shipping.

THR3D shipping needs quantity-to-ship and outbound shipment tracking. If Packaging is also required, Packaging should be represented by a separate workstream card while THR3D remains a shipping item.

## Inventory

Business Question:

> What do we physically have?

Purpose:

Warehouse visibility.

Inventory is a warehouse perspective over merchandise. It answers what is here, where it is, how old it is, and what broad operational condition it appears to be in.

Merchandise `Merch Status` is physical state only: `Received`, `Issue`, `Ready to Ship`, `Shipped`, or `Disposed`. Product information being imported or linked does not change this physical status.

Inventory is not the PM decision workspace. It should not become a review board or production workflow.

Examples:

- unknown merchandise
- long-term storage
- ready for purge
- awaiting identification
- client inventory requests
- physical shelf checks
- age and location visibility

Inventory views may include cards, lists, filters, exports, age groupings, storage groupings, or physical-status perspectives. These are views over the same merchandise, not new data models.

## Planning

Business Question:

> What must be resolved before Production can accept this work?

Purpose:

Resolve uncertainty and prepare work for the final photo release handoff.

The primary Planning board is a freeform PM workspace organized by Queue, not an automatic workflow engine.

Queue answers:

> Where is this PM work sitting today?

Queue is separate from Merchandise Status. Queue does not describe whether the physical sample is in house, at Thr3d, returned, disposed, or in production.

The only system-owned Queue is `New`. The only gated Queue is `Awaiting Photo Release`. Middle planning queues are PM-controlled.

Merchandise `Planning Status` is the persisted planning state. Its active values are `New`, `Needs More Information`, and `Awaiting Photo Release`.

The public checklist language is `Required to Shoot`, not `Readiness`.

Planning is the PM preparation perspective. It is where Project Management resolves product/work readiness: whether the expected Product has usable merchandise, whether client-required facts are complete, what kind of production or shipment is needed, and whether anything blocks Production from accepting the work.

The Planning board should feel like high-quality operations software: dense, responsive, clear, and calm. Cards should quickly show what the merchandise is, the client, quantity, deliverables, Required to Shoot progress, age, comments, and unread signals without changing the underlying Planning state model.

Active Planning state should be derived from Expected Product, linked Received Merch, and child work created for Ecomm/Packaging or THR3D movement. Planning should not require PMs to create Work Orders, choose Workflow Templates, maintain Workflow Stages, or manage Work Order Types before work can move toward readiness.

Legacy workflow tables and records are not part of the active Planning workspace. Product-level Workstream routing is obsolete. The current workstream-card concept means child Ecomm or Packaging work created from Received Merch after `Confirm & Assign`, not the removed workflow-engine architecture.

Product-level operational fields are also obsolete. Planning must not read or write Product `Received`, `Rec Date`, `Location`, `Condition`, `Status`, Product photos, shipment links, issue links, export flags, or Product photo metadata as workflow facts.

The canonical Intake state field is Merchandise `Intake Status`. Supporting Merchandise fields such as `Deliverables` and existing matched/validated compatibility status may create specialized views, but they should not multiply workflow-specific status values.

Planning includes:

- product identification
- client requirements
- production/shipping assignment
- Ecomm and Packaging workstream readiness
- required information
- exception handling
- replacement requests
- release to photo

Planning should collapse "confirm identity", "match Expected Product when possible", "capture manual product info for unmatched exceptions", and "assign workstreams/shipping" into one continuous exception-resolution experience. Users should not experience database maintenance as the work.

Manual product information captured when no Expected Product exists belongs on Received Merch or child workstream cards. It should not create or update Product records.

Planning image review should show item photos first and dynamically inherited Shipment photos last. Shipment-level photos should be labeled `Shipment Photo` so PMs understand that the photo is shared shipment context rather than item-specific evidence.

New Merch intake remains the PM path for exceptions and unclear arrivals:

1. Confirm Received Merch identity
2. Match Expected Product when possible
3. Capture manual product information when no Expected Product exists
4. Assign Ecomm, Packaging, or THR3D
5. Confirm & Assign

`Confirm & Assign` removes the original Received Merch from New Merch and creates child work: an Ecomm workstream card, a Packaging workstream card, and/or a THR3D shipping item. Ecomm and THR3D are mutually exclusive GS1 paths. Packaging can pair with either.

Planning uses a Draft -> Commit interaction model. The board remains the last committed state of the business, and the modal is a safe draft workspace. Selecting `Thr3d`, `Packaging`, `Ecomm`, or any future Deliverable updates only the modal's draft calculation and footer preview. It must not move a card, refresh board columns, change badges, or reroute the Merchandise behind the modal.

The modal footer is the single commit area. It previews the destination with `Will move to ...`, and `Finish & Move` is the only action that saves draft routing changes, updates `Deliverables`, updates `Intake Status`, refreshes the board, and allows the card to move. Closing or canceling the modal discards uncommitted draft changes and leaves the board exactly as it was. While the modal is active, the background board should behave as a static backdrop with drag/drop, hover actions, and background card clicks frozen.

Planning decisions should produce one clear answer:

> Is this merchandise ready for the final photo release?

If not, Planning should explain what is missing.

`Awaiting Photo Release` is the PM-owned queue for work that is ready but waiting for the final release. The explicit `Release to Photo` action performs the handoff and removes the card from active Planning.

After `Release to Photo`, downstream status belongs on Production/Creative Force surfaces. This should happen without duplicating Merchandise records.

## Production

Business Question:

> How will we execute production?

Purpose:

Plan and coordinate execution.

Production begins from work that Planning has released to photo. It is concerned with how released work becomes scheduled, staffed, staged, and executed.

Production includes:

- accepting released photo work
- scheduling
- resources
- studios
- pre-production
- planning
- Creative Force integration

Future Production board states should start from released photo work, then move through `Scheduled`, `In Production`, `QC`, and `Complete`. Planning and Production are related by the photo release handoff, but they should not be modeled as one tightly coupled continuous workflow.

Production may display Creative Force state, but it should not recreate Creative Force. Marks Photo owns the readiness handoff and production context, while Creative Force owns detailed execution.

## PhotoTrack

Business Question:

> Was production successful?

Purpose:

Understand production completion and downstream asset/reporting readiness.

PhotoTrack is the post-production-success perspective. It answers whether the work made it through production, whether produced assets exist, whether output meets expectations, and what downstream follow-through remains.

Marks Photo should not replace PhotoTrack. It should create clean upstream handoffs and consume the minimum downstream information required for readiness, exceptions, and reporting context.

## Workspace Boundaries

The same merchandise can appear in multiple workspaces because each workspace is a different perspective:

- Shipments sees merchandise as physical movement into or out of the studio.
- Inventory sees merchandise as something physically held.
- Planning sees merchandise as decisions, blockers, and Required to Shoot.
- Production sees merchandise as production intent and execution planning.
- PhotoTrack sees merchandise through production success and asset outcome.

These perspectives must not duplicate merchandise. They should help users see the same merchandise through the question they are trying to answer.
