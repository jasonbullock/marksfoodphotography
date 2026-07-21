# Domain Model

This document describes concepts, not tables.

It does not define Airtable schema, API routes, implementation classes, or UI components. Those may change. The conceptual model should stay stable.

## Core Concept

Merchandise is the center of the operational model.

Marks Photo exists because physical merchandise arrives, creates uncertainty, and must be transformed into production-ready work.

The application presents different perspectives of the same merchandise. Receiving, Inventory, Intake, Production, and PhotoTrack should not duplicate merchandise. They should reveal different operational truths about it.

## Merchandise

Merchandise is the physical sample or physical goods moving through Walnut Studio.

Merchandise can be known or unknown, complete or incomplete, ready or blocked, stored or in motion. It may have product information, client requirements, photos, notes, storage information, and production intent associated with it.

Merchandise is not the same as Product. Merchandise is the physical thing in the studio. Product is supporting information about what that thing is.

## Product

Product is descriptive and reporting information that helps the studio understand merchandise and execute production.

Product information may include name, identifier, brand, size, category, reporting references, artwork expectations, activation references, or other client-required facts.

Product supports readiness. It does not replace Merchandise as the operational center.

If Product information already exists, Marks Photo should reuse it. If it does not exist, Marks Photo should collect only the minimum missing information required to make the Merchandise production-ready.

## Shipment

Shipment is the inbound logistics context for merchandise.

Shipment explains how merchandise arrived, when it arrived, who received it, and what physical receiving context belongs to it.

Shipment supports Receiving. It does not own the lifecycle after merchandise has been captured.

## Client

Client defines operational expectations.

Client requirements answer what must be true before merchandise can be released to production. Different clients may require different identifiers, artwork, activation information, production types, or reporting references.

Configuration should exist only when multiple clients genuinely require different behavior.

## Job

Job is a production or reporting reference.

Jobs may help group production, connect work to external systems, or support reporting. A Job should not be required before work can begin unless it is truly necessary for production readiness or reporting.

Marks Photo is not a project management tool. Jobs are supporting context, not the center of the product.

## Production Type

Production Type describes what kind of production work is needed.

Examples may include photography, packaging photography, THR3D, or other production modes, but the model should not seed speculative types until the operating need is proven.

Production Type helps determine readiness requirements, planning needs, resources, and downstream handoff expectations.

## Merchandise Resolution

Merchandise Resolution describes what should happen to the physical merchandise.

Examples may include proceed, wait, request replacement, hold, purge, return, no production, or send through a specific physical path.

Merchandise Resolution is about the physical object and its operational fate. It is separate from Product information and separate from production execution status.

## Production Readiness

Production Readiness is the determination that merchandise can be released into production.

Readiness asks whether required merchandise facts, product facts, client requirements, production type, artwork, activation information, replacement decisions, and other blockers have been resolved.

Readiness is not the same as workflow. Readiness is a business truth:

> Can production begin with confidence?

If the answer is no, Marks Photo should explain what is missing.

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

Production Type describes the kind of production work required.

Merchandise Resolution describes what should happen to the physical sample.

Production Readiness determines whether Merchandise can leave Intake and enter Production.

Production executes the released work.

## Perspective Model

The same Merchandise appears differently depending on the workspace:

- Receiving perspective: arrival and observation
- Inventory perspective: physical presence and storage
- Intake perspective: decisions, blockers, and readiness
- Production perspective: execution planning
- PhotoTrack perspective: production success

These are perspectives over one operational object. They should not become duplicate records or disconnected workflows.
