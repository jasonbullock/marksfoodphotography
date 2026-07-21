# Design Principles

These principles guide product, UX, architecture, and implementation decisions for Marks Photo.

## 1. Workspace Means Business Question

A workspace exists to answer a business question.

Examples:

- Receiving: What arrived?
- Inventory: What do we physically have?
- Intake: What must be decided before production?
- Production: How will we execute production?
- PhotoTrack: Was production successful?

Do not create a workspace because a table exists, a status exists, or a new workflow state exists.

## 2. Views Are Ways To Visualize The Same Data

Views are different ways to inspect or act on the same operational object.

Cards, lists, queues, boards, filters, drawers, calendars, and reports can all be views. A new view should not imply a new data model.

New views should be common. New workspaces should be rare.

## 3. Build Perspectives, Not Duplicate Data

Marks Photo should present different perspectives of the same merchandise.

Receiving, Inventory, Intake, Production, and PhotoTrack may all show the same merchandise through different lenses. They should not create duplicate merchandise or duplicate product facts to make the UI convenient.

## 4. Readiness Over Workflow

Readiness is the product concept.

Workflow is implementation scaffolding. It may help organize decisions, but users should see what is ready, what is blocked, and what must be resolved.

The application should answer:

> Can this merchandise enter production?

If not:

> What is missing?

## 5. Merchandise Is The Center

Merchandise is the operational center of Marks Photo.

Products, Jobs, Clients, Shipments, production types, and reporting references support the merchandise lifecycle. They should not displace merchandise as the thing the application is helping Walnut move toward production.

## 6. One Release To Production

There should be one clear Release to Production concept.

Different clients or production types may require different readiness checks, but the handoff should remain understandable: the merchandise is either ready to release or it is not.

Avoid fragmenting release into many competing workflow events.

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

## 10. Intake Is A Decision Perspective

Intake answers what must be decided before production.

It owns product identification, client requirements, production type, merchandise resolution, replacement requests, readiness, and release to production.

Intake should make uncertainty actionable.

## 11. Production Is An Execution Perspective

Production answers how the studio will execute released work.

It owns scheduling, resources, studios, pre-production, planning, and Creative Force integration context.

Production should not absorb Intake decisions, and it should not replace Creative Force.

## 12. The Interface Should Remove Uncertainty

Every meaningful interaction should reduce uncertainty:

- identify the merchandise
- explain what is missing
- clarify the required production type
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
- ready to release

Avoid exposing implementation language such as engine, transition, assignment, schema, or table unless the user is in an administrative or developer context.

## 14. Existing Systems Keep Their Jobs

Marks Photo does not replace Creative Force or PhotoTrack.

Marks Photo should create clean handoffs to those systems and consume only the status or outcome information needed to understand readiness, exceptions, and production success.
