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

Merchandise Status describes the physical state of the sample only:

- `Received`
- `Issue`
- `Ready to Ship`
- `Shipped`
- `Disposed`

Product information being linked, imported, or confirmed is not a Merchandise Status. Planning progress and photo-readiness belong to the Planning perspective.

### Received Merch

Received Merch is the physical lot created from a Shipment.

It is the parent record for what arrived: quantity, photos, observed identifiers, storage, condition, notes, and physical status. A Received Merch record may represent an unsplit lot before PM intake assigns production intent.

### New Merch

New Merch is the focused Planning intake list for unsplit Received Merch.

PMs use New Merch to confirm identity, match an Expected Product when possible, capture manual product information when no Expected Product exists, and assign the required production/shipping paths. New Merch is not a long-running production board.

### Workstream Card

A Workstream Card is child work created from Received Merch after `Confirm & Assign`.

Active workstream card types are Ecomm and Packaging. Ecomm and Packaging must be separate cards because they have different dependencies and handoff requirements. Workstream cards link back to their parent Received Merch and to Expected Product when matched.

This is not the legacy Workstreams/Work Orders architecture. Workstream cards are scoped child work items, not workflow templates, workflow stages, work orders, Product-level routing, or a generic workflow engine.

### THR3D Shipping Item

A THR3D Shipping Item is outbound physical movement work created from Received Merch when THR3D is selected.

It is not a production card. It needs quantity-to-ship and outbound shipment tracking, and belongs under the Shipments physical-movement perspective.

## Merchandise Verification

Merchandise Verification is the PM decision process that turns newly received Merchandise into a routed operational outcome.

Verification asks:

- Is the physical Merchandise correct?
- Can it be matched to an Expected Product?
- Which child work or shipping items are required?
- What information is still missing for those Deliverables?
- Should the Merchandise wait, route to photo production, require a THR3D outbound shipment, or become an Issue?

Verification does not require every fact to be known in one sitting. If a PM has started verification but cannot finish, the Merchandise can wait for information with the current progress and missing reasons preserved.

Verification is not represented by the legacy Workstreams, Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, or Work Order Types. Those were legacy implementation experiments and are not current domain concepts. The current Workstream Card concept means a child Ecomm or Packaging work item created after intake assignment.

Ecomm and THR3D are mutually exclusive GS1 paths. Packaging can pair with either Ecomm or THR3D.

## Queue

Queue is the PM-owned board placement for Planning work.

Queue is not Merchandise Status. Queue describes where the PM wants the card to sit while work is being organized. Merchandise Status describes the physical or operational condition of the sample.

Canonical Planning Queue values are New, Planning, Waiting, and Ready for Photo.

New is automatic. Ready for Photo is gated by Required to Shoot. Planning and Waiting are PM-controlled and should not be changed automatically because data was entered.

Ready for Photo is shared with the future Production board. In the split model it applies to Ecomm and Packaging workstream cards that link back to one Received Merch record; it should not duplicate the physical Received Merch or create separate Production Request records.

Queue presentation is a user-experience concern, not a separate domain concept. Better card density, aging emphasis, comment signals, drag feedback, and checklist presentation should make Planning easier to use without creating new Queue values. Implementation names should preserve the distinction by using Queue and Planning Card terminology rather than Work Order, Workstream, or workflow-gate terminology.

## Required to Shoot

Required to Shoot is the user-facing production gate.

It answers:

> What is still required before production can begin?

Required to Shoot is calculated from underlying Merchandise, Product, Deliverables, artwork, and activation/campaign facts. It is not a generic manually maintained status.

In Planning UI, Required to Shoot may be summarized with compact checklist indicators, but those indicators must remain derived from the same source facts.

## Product / Expected Product

Product is Expected Product: imported descriptive and reporting information from the master spreadsheet.

Product information may include name, identifier, brand, size, category, reporting references, artwork expectations, activation references, or other client-required facts.

Product supports readiness. It does not replace Merchandise as the operational center.

Product must not carry operational workflow, physical storage, receipt, photo, issue, export, or production-status fields in active code. Those facts belong to Merchandise, Shipments, Issues, History, Creative Force, PhotoTrack, or reporting integrations.

If Expected Product information already exists, Marks Photo should reuse it. If it does not exist, Marks Photo should collect only the minimum missing information required to make the Received Merch production-ready. That manual information may live on Received Merch or child workstream cards, but it should not create or update Product records.

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

Shipments is not a workflow engine. It does not decide whether merchandise is production-ready. Planning decides whether THR3D is required and creates a THR3D Shipping Item; Shipments receives that item in an `Outgoing` view so the merchandise team can box and ship the sample.

For THR3D Merchandise, the shipping need is intentionally minimal: quantity-to-ship and outbound tracking. Product linkage and photo-production requirements do not apply to the THR3D shipping item. If Packaging is also selected, Packaging is represented by a separate workstream card while THR3D remains an outbound shipping item.

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

Ecomm and THR3D are mutually exclusive GS1 paths. Packaging can pair with either path. Ecomm and Packaging become separate workstream cards after `Confirm & Assign`; THR3D becomes a shipping item.

## Ready for Photo Handoff

Ready for Photo is the shared Planning-to-Production handoff.

It asks whether required Received Merch facts, Expected Product facts when matched, client requirements, workstream-specific dependencies, artwork, activation information, replacement decisions, and other blockers have been resolved.

Ready for Photo is not the same as workflow. It is a business truth:

> Can Production accept this work with confidence?

If the answer is no, Marks Photo should explain what is missing.

Production acceptance is a later action. When Production eventually moves shared `Ready for Photo` work to `Scheduled`, ownership should transfer from Project Management to Production and the workstream card should leave the Planning board.

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
