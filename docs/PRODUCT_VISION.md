# Marks Photo Product Vision

Marks Photo is not a project management system.

Marks Photo is not a PIM.

Marks Photo is not a system of record.

Marks Photo is the operational readiness system for Walnut Studio.

Its purpose is to consolidate everything Walnut needs to receive, understand, prepare, photograph, route, and dispose of merchandise in one place.

The application should answer one question:

> What do we need to do with this merchandise right now?

## Core Object

The application revolves around Merchandise.

Not Jobs.

Not Products.

Not Receipts.

Merchandise is the operational object moving through the studio.

Products are supporting information.

Jobs are supporting information.

Everything exists to move merchandise toward production.

## Product Information

Product Information has three responsibilities:

1. Operational Readiness
2. Production Execution
3. Production Reporting

Marks Photo does not attempt to manage the upstream project lifecycle.

However, it does own the operational information Walnut Studio requires to execute work and report on completed production.

Product Information may come from any source.

Marks Photo does not care where it originated.

Product information may already exist.

If it exists, reuse it.

If it does not exist, allow users to enter only the minimum information required to make merchandise operationally ready.

That information may include reporting references such as:

- Job Number
- Client Project Number
- External Reference
- Service Type
- Activation
- Deliverable Type

These are not project-management fields. They are operational references used for production execution and reporting.

Users should never have to think about:

- matching
- linking
- imports
- source systems

Those are implementation details.

The software may automatically reuse existing information when available. Otherwise users simply continue entering information.

There should never be separate "Match Product" versus "Create Product" workflows. It is one continuous experience.

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

This reporting requirement does not expand Marks Photo into a project-management application.

Instead, Product Information contains the references necessary to associate production activity with the correct reporting identifiers.

## Client Requirements

The Clients table defines operational readiness.

Each client specifies the minimum required information Walnut needs before photography can begin.

Examples:

- Product Name
- Identifier
- Brand
- Size
- Artwork Required
- Activation Email Required
- Photography Required versus THR3D

Marks Photo evaluates readiness against client requirements.

It does not care where the information originated.

## Operational Readiness

The heart of Marks Photo is Operational Readiness.

The application should always answer:

> Can Walnut photograph this merchandise?

If not:

> What is missing?

Typical readiness checks include:

- Merchandise Received
- Product Information Available
- Client Required Fields Complete
- Merchandise Verified
- Artwork Available, if required
- Photography Required, otherwise THR3D
- Activation Email Received

Status should always communicate blockers rather than workflow jargon.

## Scope

Marks Photo begins when merchandise exists.

The operational middle is:

1. Merchandise
2. Receiving
3. Merchandise Workspace
4. Planning
5. Production
6. Photography / THR3D
7. Disposition

Everything before merchandise exists belongs in another system.

Everything after production completion belongs in another system.

Marks Photo owns the operational middle.

Marks Photo owns operational information required to execute production and report production.

Marks Photo does not own:

- project planning
- client communication
- budgeting
- approvals
- project task management

Those systems may provide information. Marks Photo consumes operational references from them.

## System Architecture

Marks Photo is an orchestration platform.

It does not replace Creative Force. It orchestrates the movement of merchandise from physical receipt through production and delivery.

The system is organized into four major areas:

1. Receiving
2. Workflow Engine
3. Production Engine
4. Delivery

### Receiving

Receiving is physical intake.

Receiving creates the digital representation of physical merchandise and records observed facts:

- shipment
- merchandise
- observed identifier
- quantity
- storage
- condition
- photos
- notes

Receiving does not make workflow decisions. Completing Receiving creates Merchandise and transfers ownership into the Workflow Engine.

### Workflow Engine

The Workflow Engine is the business decision engine.

Project Management owns this engine.

The Workflow Engine determines:

- workflow
- current gate
- required information
- artwork requirements
- activation requirements
- output type
- THR3D routing
- production release

The Workflow Engine powers Merchandise Review and future readiness workspaces.

### Production Engine

Creative Force owns production execution.

Marks Photo does not manage production tasks. Marks Photo synchronizes and displays production metadata such as:

- Production
- Current Creative Force status
- Last sync
- Assigned photographer

Production remains a single workflow gate in Marks Photo. Creative Force statuses are metadata, not Marks Photo workflow gates.

### Delivery

Delivery covers the downstream work after production:

- Ready to Deliver
- Delivered
- Billing
- Reporting

Delivery is part of the orchestration picture, but it should remain separate from receiving and review decisions.

## Workflow Philosophy

Workflow gates represent ownership changes or business decisions.

Workflow gates do not represent every system event.

The intended workflow remains intentionally small:

1. Receive
2. Review
3. Release to Production
4. Production
5. Ready to Deliver
6. Delivered

Detailed production stages such as queued, assigned, retouch, QC, export, and upload belong to Creative Force production metadata. They should not become Marks Photo workflow gates.

Workflow and status are different concepts:

- Workflow answers who owns the next decision and what gate Merchandise is in.
- Status describes current data or synchronized external state.

Future pages should render workflow from reusable Workflow Engine definitions rather than hardcoding workflow-specific page logic.

## Design Principles

1. Simplicity wins.
2. Never ask users to perform database work.
3. Remove production blockers.
4. Reuse existing information whenever possible.
5. Enter only missing information.
6. Client rules determine readiness.
7. Every screen answers one operational question.
8. Capture only the operational information Walnut Studio needs to determine readiness, execute production, and report completed work. Nothing more. Nothing less.

Screen questions:

- Dashboard: What needs attention?
- Receiving: What arrived?
- Merchandise: What information is missing?
- Planning: What are we photographing?
- Production: Where is the work now?

## Application Shell

The application shell should reinforce the operational model.

Primary navigation should lead with operational workspaces:

- Dashboard
- Receiving
- Merchandise
- Planning
- Production

Database-oriented or supporting surfaces such as Products, Jobs, Imports, Issues, Clients, and Airtable diagnostics should not be the normal primary navigation model. They may exist as supporting, administrative, reporting, or compatibility surfaces.

Workspace pages should favor a contextual Queue, main Workspace canvas, and contextual Inspector pattern where it helps answer the screen's operational question.

## Vision

Marks Photo is the operational command center for Walnut Studio.

It centralizes merchandise information.

It determines operational readiness.

It tells Walnut exactly what to do next.

It intentionally does not attempt to become a complete project management platform.
