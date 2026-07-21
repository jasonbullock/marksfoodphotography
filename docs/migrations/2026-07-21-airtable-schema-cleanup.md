# Airtable Schema Cleanup Audit

This is the staging document for the Planning workspace schema cleanup.

No destructive Airtable changes are approved in this pass.

## Cleanup Principle

The base should become small enough for a new administrator to understand without knowing the project's full history. Fields and tables are kept only when they are proven to support current operations, reporting, imports, or integrations.

## Required Staging Order

1. Export affected tables before deletion or field removal.
2. Run `backend/audit_airtable_schema.py` to inventory tables, fields, records, and repository dependencies.
3. Review Airtable-only dependency surfaces manually: Interfaces, Automations, Forms, shared views, scripts, extensions, and external syncs.
4. Update code away from obsolete fields/tables.
5. Migrate required historical data.
6. Run tests, frontend build, import verification, and live schema read-back.
7. Delete only fields or tables with clear evidence and rollback coverage.

## Canonical Target Tables

- Clients
- Shipments
- Merchandise
- Products
- Jobs
- Users
- Locations
- Issues, until issue handling is replaced or intentionally retained
- Imports
- Conversation, proposed
- Activity, proposed

## Tables Requiring Archive/Delete Review

- Work Orders
- Workstreams
- Workflow Templates
- Workflow Stages
- Work Order Types
- History

These tables are legacy compatibility or audit structures unless a current route, import, report, or integration still depends on them. They must not be deleted until code and Airtable-side dependencies are proven clear.

## Products Cleanup Categories

Core fields:
- Product Name
- Client
- Identifier
- Identifier Type
- Product or File Name
- Description
- Brand
- Artwork Received
- Reference Data
- Active, if present

Reporting and integration review:
- Job
- Product Job Number
- Pickup Job Number
- Workstream
- Master or Variant
- Category
- Status
- Exported
- Exported On
- Export Error

Obsolete review:
- Any Product field with no records, no repository reference, no import mapping, no formula/link dependency, and no documented integration purpose.

## Planning Queue And Merchandise Status

`Queue` is the PM-owned Planning board organization field. It is separate from physical or operational `Merchandise Status`.

Target Planning Queue values:
- New
- Planning
- Waiting
- Ready for Photo

`Ready for Photo` is a shared handoff queue. It should remain visible to Planning until Production accepts the work, and it should also be the first future Production board column.

Target Merchandise Status values require a separate Airtable decision, but should describe the physical or operational state, such as:
- In House
- At Thr3d
- In Production
- Returned
- Disposed

## Required To Shoot

Required to Shoot is calculated from source facts:
- Merchandise Verified
- Deliverables
- Product linked, for photo deliverables
- Product Name, for photo deliverables
- Identifier, for photo deliverables
- Artwork, for Packaging Photo or Ecomm Photo
- Activation Information, for Ecomm Photo

Do not create a public `Readiness` field. A cached completion field may be added only if reporting or performance proves it necessary.

## Conversation And Activity

Conversation should become the single human comment stream for a Merchandise card. It replaces scattered PM, receiver, shipment, review, and resolution note fields where migration quality is acceptable.

Activity should remain separate from Conversation. It records system-generated changes such as queue moves, deliverables changes, product linking, artwork upload, and release actions.

The first UI pass stores Conversation and Activity locally while the Airtable schema is being audited. The durable schema recommendation is a separate `Conversation` table and a separate `Activity` table unless record volume testing proves a single event table is simpler.

## Thr3d Recommendation

Do not force Thr3d work onto the Planning board.

The PM board prepares merchandise. Once Thr3d is selected and Required to Shoot is complete, the record should leave the PM board and appear in a dedicated Thr3d Shipping workspace that answers only:

> What needs to be boxed and shipped?

The future schema should represent Thr3d shipping separately from `Queue` and from physical `Merchandise Status`.

## Current Status

- Audit script added: `backend/audit_airtable_schema.py`
- Audit output generated: `docs/migrations/2026-07-21-airtable-schema-cleanup-audit.json`
- Live base audited: `appE30EGZv8OzssDx`
- Live table count: 15
- Keep recommendations: Products, Jobs, Clients, Shipments, Locations, Users, Issues, Imports, Merchandise
- Archive review recommendations: History, Workstreams, Work Orders, Workflow Templates, Workflow Stages, Work Order Types
- Work Orders currently reported no records in the audit sample.
- Products currently has 32 fields and its `Notes` field is flagged for Conversation-consolidation review.
- Notes fields on Shipments, Locations, Issues, and Merchandise are also flagged for Conversation-consolidation review.
- No tables deleted.
- No fields deleted.
- No live Airtable data migrated in this pass.
