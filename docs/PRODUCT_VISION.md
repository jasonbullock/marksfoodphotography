# Product Vision

Marks Photo is an Operations Readiness Platform.

Its mission is to transform incoming merchandise into production-ready work.

Marks Photo exists to remove uncertainty before production begins. It helps Walnut Studio understand what arrived, what is physically present, what must be decided, and what is ready to release into production.

## What Marks Photo Is Not

Marks Photo is not:

- a workflow engine
- a project management tool
- a replacement for Creative Force
- a replacement for PhotoTrack

Workflow, planning, production systems, and reporting systems may connect to Marks Photo, but they do not define it. Marks Photo's job is readiness: turning real merchandise and incomplete information into clear production intent.

## Operating Principle

The core operating question is:

> What must be true before this merchandise can enter production?

Marks Photo should make the answer visible, actionable, and reliable.

It should not ask users to maintain records for their own sake. It should not ask project managers to create administrative containers before work can begin. It should not duplicate the systems that already run production or report final output.

## Operational Lifecycle

Marks Photo sits in the operational handoff between merchandise arrival and production execution.

```text
Shipment
↓
Shipments
↓
Inventory
↓
Planning
↓
Ready for Photo
↓
Production
↓
Creative Force
↓
PhotoTrack
```

## Phase Ownership

### Shipment

Ownership: logistics and shipment context.

A Shipment represents the inbound package, delivery, or transfer that brings merchandise into the studio. It answers where the physical goods came from, when they arrived, and what shipment context belongs to them.

### Shipments

Ownership: merchandise team.

Shipments captures physical movement. It records what physically arrived, including observed identifiers, quantity, condition, storage location, photos, and notes, and it will also support outbound movement such as THR3D shipments. Shipments does not decide production intent and is not a workflow engine. It creates trustworthy operational evidence for merchandise entering and leaving the studio.

Shipment photos are shipment-owned evidence for boxes, labels, delivery context, and damage. Originals belong in R2 with metadata on the Shipment, and downstream workspaces should display them through the Shipment relationship rather than copying them onto Merchandise.

Shipments may contain lightweight internal views such as `Incoming` and `Outgoing`. `Outgoing` initially means THR3D shipments: merchandise that Planning assigned to THR3D, with quantity-to-ship and outbound tracking, so the merchandise team can box and ship it.

### Inventory

Ownership: operations and warehouse visibility.

Inventory answers what the studio physically has. It is a shelf and storage perspective over merchandise, not a decision workflow. Inventory helps people locate, age, inspect, purge, or answer client inventory questions about physical samples.

### Planning

Ownership: Project Management and operations readiness.

Planning is where uncertainty is resolved before production. It identifies the Received Merch, matches Expected Product when available, captures manual product information when no Expected Product exists, assigns the Ecomm/Packaging workstreams or THR3D shipping item, records blockers or exceptions, and establishes whether each child work item is ready for handoff.

Planning is the PM preparation perspective. Its New Merch intake list is where unsplit Received Merch is confirmed and assigned. After `Confirm & Assign`, separate child work exists for Ecomm and Packaging because they have different dependencies; THR3D remains a shipping item owned by Shipments. The implementation must not revive the legacy workflow-engine tables or Product-level workstream routing.

The PM-facing Planning experience should guide Merchandise Verification step by step. The interface should show `Required to Shoot` and the next business outcome rather than asking PMs to manage a generic readiness gate.

Planning should feel like polished operations software: fast to scan, calm to use, and clear about age, comments, deliverables, and what is still required to shoot.

Queue is separate from Merchandise Status. Queue organizes PM work; Merchandise Status describes the physical or operational state of the sample.

Intake Status is intentionally small: `Needs Review`, `Waiting on Information`, `Ready for Photo`, and `Complete`. Planning Queue is PM organization, not a second persisted workflow state.

### Ready for Photo

Ownership: Project Management.

Ready for Photo is the shared handoff queue between Planning and Production. It means the required merchandise facts, product facts, client requirements, deliverables, and production instructions are complete enough for Production to accept the work.

There should be one shared Ready for Photo queue. Readiness paths may differ by client or deliverables, but the handoff should remain clear and should not duplicate Merchandise records.

### Production

Ownership: Production coordination.

Production determines how the work will be executed: schedule, resources, studio, pre-production, planning, and integration with Creative Force. Marks Photo may prepare and display production intent, but it should not become the system that manages every production task.

Production begins by accepting shared `Ready for Photo` work. A future move from `Ready for Photo` to `Scheduled` should transfer ownership from Project Management to Production, remove the card from the Planning board, show it on the Production board, and log Activity.

### Creative Force

Ownership: Creative Force and production execution teams.

Creative Force owns detailed production execution. Marks Photo may send production-ready work to Creative Force and receive production status metadata, but it does not replace Creative Force.

### PhotoTrack

Ownership: production success, asset status, and downstream reporting context.

PhotoTrack answers whether production succeeded and where produced assets stand after execution. Marks Photo should hand off clean production-ready work and consume only the information needed to understand completion, exceptions, or reporting readiness.

## Long-Term Direction

Marks Photo should be organized around merchandise readiness, not around database tables or workflow mechanics.

The prior workflow-table experiment is not part of the product direction. Legacy Workstreams tables, Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, Product-level production/storage state, and Merchandise Resolution should not be required to receive, plan, release, or ship merchandise. Current workstream cards are scoped Ecomm or Packaging child work, not that legacy workflow engine.

Products are Expected Product records imported from the master spreadsheet. They are not an operations workspace. They carry durable reference and reporting facts only; manual intake facts, physical facts, workstream state, and outbound shipping facts belong to Received Merch, Workstream Cards, Shipments, Issues, History, Creative Force, PhotoTrack, or reporting integrations.

The application presents different perspectives of the same merchandise:

- Shipments perspective: what is entering or leaving the studio?
- Inventory perspective: what do we physically have?
- Planning perspective: what must be decided before production can accept the work?
- Production perspective: how will we execute?
- PhotoTrack perspective: was production successful?

New workspaces should be rare. New views inside existing workspaces should be common.

The product should grow by adding better perspectives, clearer readiness signals, and better handoffs, not by multiplying duplicate records or administrative workflows.
