# Domain Model

This document describes concepts, not tables.

It does not define Airtable schema, API routes, implementation classes, or UI components. Those may change. The conceptual model should stay stable.

## Core Concept

Merchandise is the center of the operational model.

Marks Photo exists because physical merchandise arrives, creates uncertainty, and must be transformed into production-ready work.

The application presents different perspectives of the same merchandise. Shipments, Inventory, Planning, Production, and PhotoTrack should not duplicate merchandise. They should reveal different operational truths about it.

## Merchandise

Merchandise is the physical sample or physical goods moving through Walnut Studio.

Merchandise can be known or unknown, complete or incomplete, ready or blocked, stored or in motion. It may have product information, client requirements, photos, notes, storage information, and production intent associated with it.

Merchandise is not the same as Product. Merchandise is the physical thing in the studio. Product is supporting information about what that thing is.

## Merchandise Verification

Merchandise Verification is the PM decision process that turns newly received Merchandise into a routed operational outcome.

Verification asks:

- Is the physical Merchandise correct?
- Can it be matched to a Product?
- Which Deliverables are required?
- What information is still missing for those Deliverables?
- Should the Merchandise wait, route to photo production, require a THR3D outbound shipment, or become an Issue?

Verification does not require every fact to be known in one sitting. If a PM has started verification but cannot finish, the Merchandise can wait for information with the current progress and missing reasons preserved.

Verification is not represented by Workstreams, Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, or Work Order Types. Those were legacy implementation experiments and are not current domain concepts.

## Queue

Queue is the PM-owned board placement for Planning work.

Queue is not Merchandise Status. Queue describes where the PM wants the card to sit while work is being organized. Merchandise Status describes the physical or operational condition of the sample.

Canonical Planning Queue values are New, Planning, Waiting, and Ready for Photo.

New is automatic. Ready for Photo is gated by Required to Shoot. Planning and Waiting are PM-controlled and should not be changed automatically because data was entered.

Ready for Photo is shared with the future Production board. It is one queue over one Merchandise record, not a duplicated Production Request.

Queue presentation is a user-experience concern, not a separate domain concept. Better card density, aging emphasis, comment signals, drag feedback, and checklist presentation should make Planning easier to use without creating new Queue values. Implementation names should preserve the distinction by using Queue and Planning Card terminology rather than Work Order, Workstream, or workflow-gate terminology.

## Required to Shoot

Required to Shoot is the user-facing production gate.

It answers:

> What is still required before production can begin?

Required to Shoot is calculated from underlying Merchandise, Product, Deliverables, artwork, and activation/campaign facts. It is not a generic manually maintained status.

In Planning UI, Required to Shoot may be summarized with compact checklist indicators, but those indicators must remain derived from the same source facts.

## Product

Product is descriptive and reporting information that helps the studio understand merchandise and execute production.

Product information may include name, identifier, brand, size, category, reporting references, artwork expectations, activation references, or other client-required facts.

Product supports readiness. It does not replace Merchandise as the operational center.

Product must not carry operational workflow, physical storage, receipt, photo, issue, export, or production-status fields in active code. Those facts belong to Merchandise, Shipments, Issues, History, Creative Force, PhotoTrack, or reporting integrations.

If Product information already exists, Marks Photo should reuse it. If it does not exist, Marks Photo should collect only the minimum missing information required to make the Merchandise production-ready.

## Shipment

Shipment is the inbound logistics context for merchandise.

Shipment explains how merchandise arrived, when it arrived, who received it, and what physical shipment context belongs to it.

Shipment supports Shipments. It does not own the lifecycle after merchandise has been captured.

Shipment Photo is physical evidence owned by a Shipment.

Shipment Photos capture box labels, delivery context, damage, cartons, pallets, or other shared shipment context. Originals live in R2 under durable shipment-record keys. Airtable stores only metadata on the Shipment.

Merchandise can display Shipment Photos through its linked Shipment, but it should not copy Shipment Photo metadata. Shared image carousels should show item-owned photos first and Shipment Photos last.

## Shipments

Shipments is the merchandise-team workspace for physical movement.

It covers incoming merchandise, including receiving deliveries, photographing merchandise, assigning storage, and inventory intake. It also covers outgoing merchandise, beginning with THR3D shipments and later any other physical outbound movement the studio needs to track.

Shipments is not a workflow engine. It does not decide whether merchandise is production-ready. Planning decides whether THR3D is required and finishes that decision; Shipments receives ready THR3D work in an `Outgoing` view so the merchandise team can box and ship the sample.

For THR3D-only Merchandise, the Planning decision is intentionally minimal: Client, at least one merchandise photo, Quantity, and the `Thr3d` Deliverable. Product linkage and photo-production requirements do not apply. If Merchandise also has Packaging Photo or Ecomm Photo, the photo path remains authoritative and the sample must not enter the THR3D outgoing queue before photo production is complete.

## Client

Client defines operational expectations.

Client requirements answer what must be true before merchandise can be released to production. Different clients may require different identifiers, artwork, activation information, deliverabless, or reporting references.

Configuration should exist only when multiple clients genuinely require different behavior.

## Job

Job is a production or reporting reference.

Jobs may help group production, connect work to external systems, or support reporting. A Job should not be required before work can begin unless it is truly necessary for production readiness or reporting.

Marks Photo is not a project management tool. Jobs are supporting context, not the center of the product.

## deliverables

deliverables describes what kind of production work is needed.

Examples may include photography, packaging photography, THR3D, or other production modes, but the model should not seed speculative types until the operating need is proven.

deliverables helps determine readiness requirements, planning needs, resources, and downstream handoff expectations.

## Ready for Photo Handoff

Ready for Photo is the shared Planning-to-Production handoff.

It asks whether required merchandise facts, product facts, client requirements, deliverables, artwork, activation information, replacement decisions, and other blockers have been resolved.

Ready for Photo is not the same as workflow. It is a business truth:

> Can Production accept this work with confidence?

If the answer is no, Marks Photo should explain what is missing.

Production acceptance is a later action. When Production eventually moves shared `Ready for Photo` work to `Scheduled`, ownership should transfer from Project Management to Production and the card should leave the Planning board.

## Production

Production is the planned and executed work that happens after release.

Production involves scheduling, resources, studios, pre-production, Creative Force integration, and execution tracking.

Marks Photo prepares merchandise for production and may display production context, but it does not replace the systems that perform detailed production execution.

## Concept Relationships

Shipment brings Merchandise into the studio.

Merchandise is received, stored, identified, evaluated, resolved, and released.

Product describes what the Merchandise is and carries supporting readiness and reporting facts.

Client defines what information and conditions are required.

Job provides production or reporting grouping when needed.

deliverables describes the kind of production work required.

Ready for Photo determines whether Merchandise can bridge from Planning into Production.

Production executes the released work.

## Perspective Model

The same Merchandise appears differently depending on the workspace:

- Shipments perspective: physical movement into or out of the studio
- Inventory perspective: physical presence and storage
- Planning perspective: decisions, blockers, and Required to Shoot
- Production perspective: acceptance, scheduling, and execution
- PhotoTrack perspective: production success

These are perspectives over one operational object. They should not become duplicate records or disconnected workflows.
