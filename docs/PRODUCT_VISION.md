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
Receiving
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

Ownership: logistics and receiving context.

A Shipment represents the inbound package, delivery, or transfer that brings merchandise into the studio. It answers where the physical goods came from, when they arrived, and what receiving context belongs to them.

### Receiving

Ownership: Receiving.

Receiving captures reality. It records what physically arrived, including observed identifiers, quantity, condition, storage location, photos, and notes. Receiving does not decide production intent. It creates trustworthy operational evidence.

### Inventory

Ownership: operations and warehouse visibility.

Inventory answers what the studio physically has. It is a shelf and storage perspective over merchandise, not a decision workflow. Inventory helps people locate, age, inspect, purge, or answer client inventory questions about physical samples.

### Planning

Ownership: Project Management and operations readiness.

Planning is where uncertainty is resolved before production. It identifies the product, evaluates client requirements, determines deliverables, decides merchandise resolution, requests replacement when needed, and establishes whether the work is ready for photo production.

Planning is the PM preparation perspective. Its board is a freeform PM workspace organized by Queue, not an automatic workflow engine.

The PM-facing Planning experience should guide Merchandise Verification step by step. The interface should show `Required to Shoot` and the next business outcome rather than asking PMs to manage a generic readiness gate.

Queue is separate from Merchandise Status. Queue organizes PM work; Merchandise Status describes the physical or operational state of the sample.

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

The application presents different perspectives of the same merchandise:

- Receiving perspective: what arrived?
- Inventory perspective: what do we physically have?
- Planning perspective: what must be decided before production can accept the work?
- Production perspective: how will we execute?
- PhotoTrack perspective: was production successful?

New workspaces should be rare. New views inside existing workspaces should be common.

The product should grow by adding better perspectives, clearer readiness signals, and better handoffs, not by multiplying duplicate records or administrative workflows.
