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

## Intake

Business Question:

> What still needs to happen before this can be produced?

Purpose:

Resolve uncertainty and establish readiness.

Intake is the decision perspective. It is where Project Management determines what a piece of merchandise is, what the client requires, what kind of production is needed, and whether anything blocks release.

Active Intake state should be derived from Merchandise and supporting Product data. Intake should not require PMs to create Work Orders, choose Workflow Templates, maintain Workflow Stages, or manage Work Order Types before merchandise can move toward readiness.

Intake includes:

- product identification
- client requirements
- production type
- merchandise resolution
- replacement requests
- readiness
- release to production

Intake should collapse "match product", "create product", and "enter missing information" into one continuous readiness experience. Users should not experience database maintenance as the work.

Intake decisions should produce one clear answer:

> Is this merchandise ready to release to production?

If not, Intake should explain what is missing.

## Production

Business Question:

> How will we execute production?

Purpose:

Plan and coordinate execution.

Production begins after Release to Production. It is concerned with how ready work becomes scheduled, staffed, staged, and executed.

Production includes:

- scheduling
- resources
- studios
- pre-production
- planning
- Creative Force integration

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
- Intake sees merchandise as decisions and readiness.
- Production sees merchandise as production intent and execution planning.
- PhotoTrack sees merchandise through production success and asset outcome.

These perspectives must not duplicate merchandise. They should help users see the same merchandise through the question they are trying to answer.
