# Design Principles

These principles guide product, UX, architecture, and implementation decisions for Marks Photo.

## 1. Workspace Means Business Question

A workspace exists to answer a business question.

Examples:

- Shipments: What physical merchandise is entering or leaving the studio?
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

Shipments, Inventory, Planning, Production, and PhotoTrack may all show the same merchandise through different lenses. They should not create duplicate merchandise or duplicate product facts to make the UI convenient.

The same rule applies to media. Item photos belong to Merchandise. Shipment-level photos belong to Shipments. Planning and Production may display Shipment Photos through the linked Shipment, but they should not duplicate that metadata onto each item.

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

Products are imported Expected Product reference records. Do not put manual intake facts, physical movement, storage, condition, photos, issue state, export state, production state, or Planning routing on Products to make a view easier to build.

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

## 9. Shipments Is A Physical Movement Perspective

Shipments answers what physical merchandise is entering or leaving the studio.

It owns incoming delivery capture, merchandise photos, storage assignment, inventory intake, outbound THR3D shipments, and future physical outbound movement. It should not become a planning or production workflow.

Shipment-level photos should feel like quick operational evidence capture. Keep capture controls simple, support camera and library input, show compact thumbnails, and make larger review available without turning Shipments into an image-management workspace.

THR3D should be handled as an outbound shipment queue inside Shipments, not as a standalone workspace or a multi-state workflow. The queue should read from canonical Merchandise readiness fields instead of introducing a parallel THR3D status.

## 10. Inventory Is A Warehouse Perspective

Inventory answers what the studio physically has.

It should emphasize physical presence, storage location, age, condition, identification uncertainty, purge readiness, and client inventory requests.

Inventory should not become the PM decision workflow.

## 11. Planning Is A PM Preparation Perspective

Planning answers what must be decided before Production can accept the work.

It owns product identification, client requirements, deliverables, blockers or exceptions, Required to Shoot, and movement into the shared Ready for Photo queue.

Planning should make uncertainty actionable.

The primary PM Planning experience should guide New Merch intake rather than expose a database form. Use progressive steps when the PM must first confirm Received Merch, match Expected Product when possible, capture manual product information when needed, then assign Ecomm, Packaging, or THR3D.

Planning should feel polished through density, responsiveness, hierarchy, and clarity rather than through new architecture. Refine cards, drag feedback, empty columns, comments, Activity, aging badges, and focus states before adding new workflow concepts.

## 11a. Draft -> Commit Is The Workflow Pattern

Workflow boards show committed business state. Modal workspaces hold draft state.

For Planning and future workflow modals:

- Board = committed state.
- Modal = draft workspace.
- Footer = single commit area.
- `Finish & Move` = the only commit action for routing changes.
- Field edits update only the modal draft and any in-modal preview.
- Do not optimistically route, refresh, resort, badge-flash, or move board cards while a modal is open.
- Freeze background board interaction while a modal is active: no drag, hover-driven movement, drop targets, or background card actions.
- Closing, canceling, pressing Esc, or clicking outside discards uncommitted draft changes.
- Cards animate or visibly move only after the commit save succeeds and fresh data is loaded.

The footer should preview the outcome in business language, for example `Will move to Thr3d Shipment` or `Will move to Ready for Photo`, while keeping the primary button label stable as `Finish & Move`.

## 12. Production Is An Execution Perspective

Production answers how the studio will execute accepted work.

It owns scheduling, resources, studios, pre-production, planning, and Creative Force integration context.

Production should not absorb Planning decisions, and it should not replace Creative Force.

Production should begin by accepting shared `Ready for Photo` work. The future move from `Ready for Photo` to `Scheduled` should transfer ownership from PM to Production without creating duplicate Merchandise.

Production state should come from Creative Force or a deliberately scoped production sync, not from Product `Status` or hidden Planning gates.

## 13. The Interface Should Remove Uncertainty

Every meaningful interaction should reduce uncertainty:

- identify the merchandise
- explain what is missing
- clarify the required deliverables
- identify any physical handling blockers
- release work cleanly to production

Avoid interactions that merely maintain administrative records.

## 14. Operational Language Beats System Language

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

Do not expose or rebuild legacy workflow architecture language such as Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, Work Order Types, or Merchandise Resolution in normal product UI. When using `workstream card`, mean only the current scoped child work item for Ecomm or Packaging, not the removed workflow-engine architecture.

For the Planning board, prefer:

- Queue
- Required to Shoot
- Conversation
- Activity
- Ready for Photo

Avoid public board labels such as Board Status, Readiness, workflow gate, transition, and assignment. Active Planning implementation naming should follow the same direction: `planningCard`, `currentQueue`, `queues`, `deliverableRoute`, and `requiredToShoot` are acceptable; `workOrder`, `currentGate`, Product `workstream`, workflow assignment, and public Readiness naming are not.

The PM board should feel like a workspace. Cards should not disappear or change queues merely because a PM completed a field.

Premium Planning polish means the board is easy to scan and act on: compact cards, obvious Required to Shoot status, clear aging and comment signals, readable Conversation, and system Activity that stays separate from human discussion.

## 15. Existing Systems Keep Their Jobs

Marks Photo does not replace Creative Force or PhotoTrack.

Marks Photo should create clean handoffs to those systems and consume only the status or outcome information needed to understand readiness, exceptions, and production success.
