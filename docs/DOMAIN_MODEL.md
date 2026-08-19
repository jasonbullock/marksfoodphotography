# Domain Model

This document describes concepts, not tables.

It does not define Airtable schema, API routes, implementation classes, or UI components. Those may change. The conceptual model should stay stable.

## Core Concept

Marks Photo is product-led and merchandise-verified.

Expected Product data is the normal operating spine. It describes what the client expects Walnut to prepare for production. Physical merchandise verifies whether those expected products can actually move forward.

Marks Photo exists because expected products and physical merchandise rarely line up perfectly without inspection. The application should reveal what products are expected, what merchandise has arrived against them, what exceptions exist, and what work is ready for production.

The application presents different perspectives of the same expected product and physical merchandise relationship. Products, Shipments, Inventory, Planning, Production, and PhotoTrack should not duplicate facts. They should reveal different operational truths about the same readiness problem.

## Product / Expected Product

Product is Expected Product: descriptive, client, production, and reporting information aggregated from client product-data sources.

Products are expected work records and the normal operating spine of Marks Photo. PMs may create and maintain them through Excel upload, copy/paste rows, client-specific column mappings, preview/validation, inline editing, and commit flows.

Product is the normal operating record. It says what work is expected. Received Merch proves whether physical samples have arrived, whether they are usable, and whether quantity/condition/storage creates any blocker.

Product should not carry raw physical facts such as storage location, condition, shipment photos, or check-in notes. Those facts belong to Received Merch, Shipments, Issues, History, Creative Force, PhotoTrack, or reporting integrations.

If Expected Product information already exists, Marks Photo should reuse it. If it does not exist, Marks Photo should treat the received merchandise as an exception and collect only the minimum missing information required to move work forward. Manual exception facts should not pollute imported Product truth unless a later approved import/reconciliation process promotes them.

Products should not be modeled as one massive universal table that permanently promotes every client spreadsheet column to a first-class Product field. Product data has categories:

- Core Product fields: durable, cross-client facts such as product name/description, client, brand, category, size, pack, or other stable descriptive data.
- Match Keys: fields used to match Received Merch to Expected Product, such as UPC, GTIN, TCIN, SKU, item number, or client-specific equivalents.
- Client References: values used to connect the product to client systems, reporting, jobs, campaigns, activations, Creative Force, or other handoff contexts.
- Naming / Path Tokens: structured values used to generate filenames, folder paths, upload locations, or production labels.
- Import-only extra data / client-specific reference data: source columns retained for traceability or specialized client operations without forcing all clients into the same schema.
- Derived readiness/work status: calculated summaries from related Received Merch, Activations, workstream cards, THR3D shipping items, artwork, and client requirements.

Avoid vague `Identifier` language in product design. Say `Match Keys` when a field is used to match physical merchandise to expected products. Say `Client References` when a field exists for client/reporting/handoff systems. Say `Naming / Path Tokens` when a field is used to compose filenames, folder paths, or upload locations.

Topco is the complex starting client because it has activation-driven readiness, path conventions, SKU details, and multiple photo work needs. The model must also support clients with fewer fields, pickup imagery, different naming conventions, different output requirements, and different Creative Force/reporting references.

## Merchandise

Merchandise is the physical sample or physical goods moving through Walnut Studio.

Merchandise can be known or unknown, complete or incomplete, ready or blocked, stored or in motion. It may have product information, client requirements, photos, notes, storage information, and production intent associated with it.

Merchandise is not the same as Product. Product is the expected item and primary operating record; Merchandise is physical evidence/inventory attached to that Product when matched.

Merchandise Status describes the physical state of the sample only:

- `Received`
- `Issue`
- `Ready to Ship`
- `Shipped`
- `Disposed`

Product information being linked, imported, or confirmed is not a Merchandise Status. Planning progress and photo-readiness belong to the Planning perspective.

### Received Merch

Received Merch is the physical lot created from a Shipment.

It records what arrived: quantity, photos, observed identifiers, storage, condition, notes, and physical status. Normally it is checked in against an Expected Product. If it cannot be matched, it becomes an unmatched merchandise exception.

### New Merch

New Merch is the exception-focused Planning intake list for received merchandise that still needs identity, match, or routing decisions.

PMs use New Merch to resolve unmatched or unclear arrivals, confirm identity, match an Expected Product when possible, capture minimum manual product information when no Expected Product exists, and assign the required production/shipping paths. New Merch is not the default operating list for all expected work.

### Workstream Card

A Workstream Card is child work created for an expected product/work need once enough product and merchandise facts exist.

Active workstream card types are Ecomm and Packaging. Ecomm and Packaging must be separate cards because they have different dependencies and handoff requirements. Workstream cards link back to their parent Received Merch and to Expected Product when matched.

This is not the legacy Workstreams/Work Orders architecture. Workstream cards are scoped child work items, not workflow templates, workflow stages, work orders, Product-level routing, or a generic workflow engine.

### THR3D Shipping Item

A THR3D Shipping Item is outbound physical movement work created when the expected product/work need requires THR3D and physical samples must leave Walnut.

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

Canonical Planning Queue values are New, Needs More Information, and Awaiting Photo Release.

New is automatic. Needs More Information is PM-controlled. Awaiting Photo Release is gated by Required to Shoot and means the work is ready but waiting for the explicit photo-release handoff.

Awaiting Photo Release is the shared Planning-to-Production handoff queue. In the split model it applies to Ecomm and Packaging workstream cards that link back to one Received Merch record; it should not duplicate the physical Received Merch or create separate Production Request records.

Queue presentation is a user-experience concern, not a separate domain concept. Better card density, aging emphasis, comment signals, drag feedback, and checklist presentation should make Planning easier to use without creating new Queue values. Implementation names should preserve the distinction by using Queue and Planning Card terminology rather than Work Order, Workstream, or workflow-gate terminology.

## Required to Shoot

Required to Shoot is the user-facing production gate.

It answers:

> What is still required before production can begin?

Required to Shoot is calculated from underlying Merchandise, Product, Deliverables, artwork, and activation/campaign facts. It is not a generic manually maintained status.

In Planning UI, Required to Shoot may be summarized with compact checklist indicators, but those indicators must remain derived from the same source facts.

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

Client requirements answer what must be true before merchandise can be released to production. Different clients may require different Match Keys, Client References, artwork, activation information, deliverables, or reporting references.

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

## Photo Release Handoff

Awaiting Photo Release is the shared Planning-to-Production handoff queue.

It asks whether required Received Merch facts, Expected Product facts when matched, client requirements, workstream-specific dependencies, artwork, activation information, replacement decisions, and other blockers have been resolved.

Awaiting Photo Release is not the same as workflow. It is a business truth:

> Can Production accept this work with confidence?

If the answer is no, Marks Photo should explain what is missing.

`Release to Photo` is the action that transfers ownership from Project Management to Production-facing systems and removes the workstream card from active Planning.

## Production

Production is the planned and executed work that happens after release.

Production involves scheduling, resources, studios, pre-production, Creative Force integration, and execution tracking.

Marks Photo prepares merchandise for production and may display production context, but it does not replace the systems that perform detailed production execution.

## Concept Relationships

Expected Product data defines what work is expected.

Shipment brings Merchandise into the studio.

Merchandise is checked in, stored, identified, evaluated, resolved, and attached to Expected Product when possible.

Client defines what information and conditions are required.

Job provides production or reporting grouping when needed.

deliverables describes the kind of production work required.

Awaiting Photo Release determines whether an expected product/work unit can bridge from Planning into Production through the explicit `Release to Photo` action.

Production executes the released work.

## Perspective Model

The same Product/Merch relationship appears differently depending on the workspace:

- Products perspective: expected work, missing merch, blockers, and readiness
- Shipments perspective: physical movement into or out of the studio
- Inventory perspective: physical presence and storage
- Planning perspective: decisions, blockers, and Required to Shoot
- Production perspective: acceptance, scheduling, and execution
- PhotoTrack perspective: production success

These are perspectives over one operational object. They should not become duplicate records or disconnected workflows.
