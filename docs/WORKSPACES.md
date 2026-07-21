# Workspaces

Workspace means business question.

A workspace exists when the business needs a distinct operational perspective. Views inside a workspace can change often; workspaces should change rarely.

Marks Photo should not create a new workspace for every table, status, workflow state, or implementation idea. It should create workspaces only when the user is asking a meaningfully different question.

## Receiving

Business Question:

> What arrived?

Purpose:

Capture reality.

Receiving records the physical truth of inbound merchandise. It captures shipments, merchandise observations, quantity, condition, storage, photos, notes, and observed identifiers.

Receiving should not decide the full production path. Its job is to make the physical arrival trustworthy and visible.

Typical Receiving work:

- create or update a Shipment
- record merchandise in the shipment
- photograph received goods
- capture observed package information
- note damage, quantity, storage, or uncertainty
- create enough evidence for later readiness decisions

## Inventory

Business Question:

> What do we physically have?

Purpose:

Warehouse visibility.

Inventory is a warehouse perspective over merchandise. It answers what is here, where it is, how old it is, and what broad operational condition it appears to be in.

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

Resolve uncertainty and prepare work for the shared Ready for Photo handoff.

The primary Planning board is a freeform PM workspace organized by Queue, not an automatic workflow engine.

Queue answers:

> Where is this PM work sitting today?

Queue is separate from Merchandise Status. Queue does not describe whether the physical sample is in house, at Thr3d, returned, disposed, or in production.

The only system-owned Queue is `New`. The only gated Queue is `Ready for Photo`. Middle queues `Planning` and `Waiting` are PM-controlled.

The public checklist language is `Required to Shoot`, not `Readiness`.

Planning is the PM preparation perspective. It is where Project Management determines what a piece of merchandise is, what the client requires, what kind of production is needed, and whether anything blocks Production from accepting the work.

The Planning board should feel like high-quality operations software: dense, responsive, clear, and calm. Cards should quickly show what the merchandise is, the client, quantity, deliverables, Required to Shoot progress, age, comments, and unread signals without changing the underlying Planning state model.

Active Planning state should be derived from Merchandise and supporting Product data. Planning should not require PMs to create Work Orders, choose Workflow Templates, maintain Workflow Stages, or manage Work Order Types before merchandise can move toward readiness.

The canonical Intake state field is Merchandise `Intake Status`. Supporting Merchandise fields such as `deliverables`, `Merchandise Resolution`, and existing matched/validated compatibility status may create specialized views, but they should not multiply workflow-specific status values.

Planning includes:

- product identification
- client requirements
- deliverables
- required information
- exception handling
- replacement requests
- release to production

Planning should collapse "match product", "create product", and "enter missing information" into one continuous verification experience. Users should not experience database maintenance as the work.

The primary PM experience is the Merchandise Verification wizard:

1. Verify Merchandise
2. Identify Product
3. Choose Deliverables
4. Complete Required Information
5. Finish

The wizard determines what should happen next. PMs do not need to complete every item in one sitting; saved, incomplete verification belongs in Waiting for Information with explicit missing-information reasons.

Planning decisions should produce one clear answer:

> Is this merchandise ready to release to production?

If not, Planning should explain what is missing.

`Ready for Photo` is the shared Planning-to-Production handoff queue. Moving a card there means Planning work is complete, but PM ownership remains until Production accepts it.

When Production later moves a card from `Ready for Photo` to `Scheduled`, that acceptance should remove the card from Planning, show it on Production, transfer ownership to Production, and log Activity. This should happen without duplicating Merchandise records.

## Production

Business Question:

> How will we execute production?

Purpose:

Plan and coordinate execution.

Production begins by accepting shared `Ready for Photo` work. It is concerned with how ready work becomes scheduled, staffed, staged, and executed.

Production includes:

- accepting Ready for Photo work
- scheduling
- resources
- studios
- pre-production
- planning
- Creative Force integration

Future Production board states should be `Ready for Photo`, `Scheduled`, `In Production`, `QC`, and `Complete`. Planning and Production are related by the shared handoff queue, but they should not be modeled as one tightly coupled continuous workflow.

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

- Receiving sees merchandise as newly arrived physical reality.
- Inventory sees merchandise as something physically held.
- Planning sees merchandise as decisions, blockers, and Required to Shoot.
- Production sees merchandise as production intent and execution planning.
- PhotoTrack sees merchandise through production success and asset outcome.

These perspectives must not duplicate merchandise. They should help users see the same merchandise through the question they are trying to answer.
