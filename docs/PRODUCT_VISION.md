# Product Vision

Marks Photo is an Operations Readiness Platform.

Its mission is to transform expected product data and incoming merchandise into production-ready work.

Marks Photo exists to remove uncertainty before production begins. It helps Walnut Studio understand what products are expected, what physical merchandise has arrived against those products, what exceptions must be resolved, and what work is ready to hand off to production.

## What Marks Photo Is Not

Marks Photo is not:

- a workflow engine
- a project management tool
- a replacement for Creative Force
- a replacement for PhotoTrack

Workflow, planning, production systems, and reporting systems may connect to Marks Photo, but they do not define it. Marks Photo's job is readiness: turning real merchandise and incomplete information into clear production intent.

## Operating Principle

The core operating question is:

> What must be true before this expected product can enter production?

Marks Photo should make the answer visible, actionable, and reliable.

It should not ask users to maintain records for their own sake. It should not ask project managers to create administrative containers before work can begin. It should not duplicate the systems that already run production or report final output.

## Operational Lifecycle

Marks Photo sits in the operational handoff between expected product data, merchandise arrival, and production execution.

```text
Expected Products
↓
Shipment
↓
Shipments
↓
Inventory
↓
Planning
↓
Awaiting Photo Release
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

Shipments captures physical movement. It records what physically arrived, including observed identifiers, quantity, condition, storage location, photos, and notes, and it will also support outbound movement such as THR3D shipments. Shipments checks merchandise in against expected Product data when possible, but it does not decide production intent and is not a workflow engine. It creates trustworthy operational evidence for merchandise entering and leaving the studio.

Shipment photos are shipment-owned evidence for boxes, labels, delivery context, and damage. Originals belong in R2 with metadata on the Shipment, and downstream workspaces should display them through the Shipment relationship rather than copying them onto Merchandise.

Shipments may contain lightweight internal views such as `Incoming` and `Outgoing`. `Outgoing` initially means THR3D shipments: merchandise that Planning assigned to THR3D, with quantity-to-ship and outbound tracking, so the merchandise team can box and ship it.

### Inventory

Ownership: operations and warehouse visibility.

Inventory answers what the studio physically has. It is a shelf and storage perspective over merchandise, not a decision workflow. Inventory helps people locate, age, inspect, purge, or answer client inventory questions about physical samples.

### Planning

Ownership: Project Management and operations readiness.

Planning is where uncertainty is resolved before production. It starts from expected Product data when available, verifies whether usable merchandise has arrived, captures exceptions when merchandise cannot be matched, assigns the Ecomm/Packaging work units or THR3D shipping item, records blockers, and establishes whether each work item is ready for handoff.

Planning is the PM preparation perspective. Product data is the normal operating spine; unmatched Received Merch is an exception lane. After readiness/work assignment, separate child work exists for Ecomm and Packaging because they have different dependencies; THR3D remains a shipping item owned by Shipments. The implementation must not revive the legacy workflow-engine tables.

The PM-facing Planning experience should guide Merchandise Verification step by step. The interface should show `Required to Shoot` and the next business outcome rather than asking PMs to manage a generic readiness gate.

Planning should feel like polished operations software: fast to scan, calm to use, and clear about age, comments, deliverables, and what is still required to shoot.

### Products

Ownership: Project Management and product data readiness.

Products is the main PM product-data workspace. It is where PMs import, paste, edit, map, validate, and maintain expected product records before and during merchandise verification.

Products should feel familiar to PMs who live in spreadsheets: dense rows, inline editing, copy/paste-friendly flows, Excel upload, preview/validation, saved client mappings, and commit. It should go beyond Excel by showing merch matching, readiness, client-aware views, and created/related work units.

Products should not become one massive universal table. Stable Product fields, Match Keys, Client References, Naming / Path Tokens, import-only client-specific reference data, and derived readiness/work summaries should be treated as different categories of information.

Topco is the complex starting client, but the Product workspace must support clients with fewer fields, pickup imagery, different naming conventions, different output needs, and different handoff references.

Queue is separate from Merchandise Status. Queue organizes PM work; Merchandise Status describes the physical or operational state of the sample.

Planning Status is intentionally small: `New`, `Needs More Information`, and `Awaiting Photo Release`.

### Awaiting Photo Release

Ownership: Project Management.

Awaiting Photo Release is the PM-owned queue for work that has the required merchandise facts, product facts, client requirements, deliverables, and production instructions complete enough for the final photo release.

There should be one clear release point. Readiness paths may differ by client or deliverables, but the handoff should remain explicit and should not duplicate Merchandise records.

### Production

Ownership: Production coordination.

Production determines how the work will be executed: schedule, resources, studio, pre-production, planning, and integration with Creative Force. Marks Photo may prepare and display production intent, but it should not become the system that manages every production task.

Production begins after Planning performs the explicit `Release to Photo` handoff. That handoff should transfer ownership from Project Management to Production-facing systems, remove the card from active Planning, show it on Production/Creative Force surfaces, and log Activity.

### Creative Force

Ownership: Creative Force and production execution teams.

Creative Force owns detailed production execution. Marks Photo may send production-ready work to Creative Force and receive production status metadata, but it does not replace Creative Force.

### PhotoTrack

Ownership: production success, asset status, and downstream reporting context.

PhotoTrack answers whether production succeeded and where produced assets stand after execution. Marks Photo should hand off clean production-ready work and consume only the information needed to understand completion, exceptions, or reporting readiness.

## Long-Term Direction

Marks Photo should be organized around product-led readiness verified by physical merchandise, not around database tables or workflow mechanics.

The prior workflow-table experiment is not part of the product direction. Legacy Workstreams tables, Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, Product-level production/storage state, and Merchandise Resolution should not be required to receive, plan, release, or ship merchandise. Current workstream cards are scoped Ecomm or Packaging child work, not that legacy workflow engine.

Products are Expected Product records maintained from client product-data sources. They are the normal operating records for expected work. Product data says what should exist and what production outcomes may be needed; Received Merch verifies whether usable physical samples are present. Physical facts, check-in evidence, storage, condition, and outbound shipping facts still belong to Received Merch, Shipments, Issues, History, Creative Force, PhotoTrack, or reporting integrations.

The application presents different perspectives of expected products and their supporting merchandise:

- Products perspective: what work is expected, missing, blocked, or ready?
- Shipments perspective: what physical merchandise is entering or leaving the studio?
- Inventory perspective: what do we physically have?
- Planning perspective: what must be decided before production can accept the work?
- Production perspective: how will we execute?
- PhotoTrack perspective: was production successful?

New workspaces should be rare. New views inside existing workspaces should be common.

The product should grow by adding better perspectives, clearer readiness signals, and better handoffs, not by multiplying duplicate records or administrative workflows.
