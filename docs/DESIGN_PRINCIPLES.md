# Design Principles

These principles guide product, UX, architecture, and implementation decisions for Marks Photo.

## 1. Workspace Means Business Question

A workspace exists to answer a business question.

Examples:

- Receiving: What arrived?
- Inventory: What do we physically have?
- Planning: What must be decided before Production can accept the work?
- Production: How will we execute accepted work?
- PhotoTrack: Was production successful?

Do not create a workspace because a table exists, a status exists, or a new workflow state exists.

## 2. Views Are Ways To Visualize The Same Data

Views are different ways to inspect or act on the same operational object.

Cards, lists, queues, boards, filters, drawers, calendars, and reports can all be views. A new view should not imply a new data model.

New views should be common. New workspaces should be rare.

## 3. Build Perspectives, Not Duplicate Data

Marks Photo should present different perspectives of the same merchandise.

Receiving, Inventory, Planning, Production, and PhotoTrack may all show the same merchandise through different lenses. They should not create duplicate merchandise or duplicate product facts to make the UI convenient.

## 4. Readiness Over Workflow

Readiness is the product concept.

Workflow is implementation scaffolding. It may help organize decisions, but users should see what is ready, what is blocked, and what must be resolved.

The application should answer:

> Can this merchandise enter production?

If not:

> What is missing?

## 5. Merchandise Is The Center

Merchandise is the operational center of Marks Photo.

Products, Jobs, Clients, Shipments, deliverabless, and reporting references support the merchandise lifecycle. They should not displace merchandise as the thing the application is helping Walnut move toward production.

## 6. One Shared Ready For Photo Handoff

There should be one clear Ready for Photo handoff queue.

Different clients or deliverabless may require different checks, but the handoff should remain understandable: the merchandise is either ready for Production to accept or it is not.

Avoid fragmenting the handoff into many competing workflow events or duplicate records.

## 7. Prefer Fields Over Tables

Prefer adding fields or structured configuration to existing concepts over creating new tables or new record types.

Create a new table only when the concept has independent lifecycle, ownership, permissions, relationships, or repeated records that cannot be represented safely as fields.

## 8. Configuration Must Be Earned

Configuration should exist only when multiple clients genuinely require different behavior.

Do not add configuration because future variation is imaginable. Add configuration when repeated real variation is present and a hardcoded rule would create maintenance risk or client-specific forks.

## 9. Inventory Is A Warehouse Perspective

Inventory answers what the studio physically has.

It should emphasize physical presence, storage location, age, condition, identification uncertainty, purge readiness, and client inventory requests.

Inventory should not become the PM decision workflow.

## 10. Planning Is A PM Preparation Perspective

Planning answers what must be decided before Production can accept the work.

It owns product identification, client requirements, deliverables, merchandise resolution, replacement requests, Required to Shoot, and movement into the shared Ready for Photo queue.

Planning should make uncertainty actionable.

The primary PM Planning experience should guide verification rather than expose a database form. Use progressive steps when the PM must first verify Merchandise, identify Product, choose Deliverables, then resolve only the required missing information for those Deliverables.

## 11. Production Is An Execution Perspective

Production answers how the studio will execute accepted work.

It owns scheduling, resources, studios, pre-production, planning, and Creative Force integration context.

Production should not absorb Planning decisions, and it should not replace Creative Force.

Production should begin by accepting shared `Ready for Photo` work. The future move from `Ready for Photo` to `Scheduled` should transfer ownership from PM to Production without creating duplicate Merchandise.

## 12. The Interface Should Remove Uncertainty

Every meaningful interaction should reduce uncertainty:

- identify the merchandise
- explain what is missing
- clarify the required deliverables
- resolve the physical merchandise path
- release work cleanly to production

Avoid interactions that merely maintain administrative records.

## 13. Operational Language Beats System Language

Use language that reflects the user's business question.

Prefer:

- ready
- blocked
- missing artwork
- awaiting identification
- required information
- still needed
- ready to release

Avoid exposing implementation language such as readiness, engine, transition, assignment, schema, or table unless the user is in an administrative or developer context.

For the Planning board, prefer:

- Queue
- Required to Shoot
- Conversation
- Activity
- Ready for Photo

Avoid public board labels such as Board Status, Readiness, workflow gate, transition, and assignment.

The PM board should feel like a workspace. Cards should not disappear or change queues merely because a PM completed a field.

## 14. Existing Systems Keep Their Jobs

Marks Photo does not replace Creative Force or PhotoTrack.

Marks Photo should create clean handoffs to those systems and consume only the status or outcome information needed to understand readiness, exceptions, and production success.
