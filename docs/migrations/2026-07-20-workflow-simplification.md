# Intake Workflow Simplification

Date: 2026-07-20

## Purpose

Remove the active workflow-engine and Work Order configuration layers from the PM Intake experience before Production Readiness and Release to Production are designed.

This pass aligns Intake with the product vision: Marks Photo is an Operations Readiness Platform centered on Merchandise, not a workflow engine.

## Active Intake Source Of Truth

Active Intake state is now Merchandise-owned.

Canonical active fields:
- `Merch Status`
- `Notes`
- `Production Type`
- `Merchandise Resolution`
- Product link and existing Product data
- Physical merchandise fields such as observed identifier, quantity, condition, storage location, photos, and receiving context

Column derivation:
- Review: Merchandise that is not otherwise marked as waiting, THR3D, validated, or issue-blocked.
- Waiting for Information: Merchandise whose `Notes` contain `[Waiting for Product Data]`, or whose derived completeness checks place it there.
- Send to THR3D: Merchandise whose `Production Type` is `THR3D`.
- Waiting for Activation: Merchandise with `Merch Status` of `Matched` when not otherwise complete.
- Ready for Production: Merchandise with `Merch Status` of `Validated`.

No new Airtable table or field was created by this simplification pass.

## Application Changes

Frontend:
- Intake board cards are derived from Merchandise records returned by `GET /api/merchandise/review`.
- The active Intake UI no longer calls `listWorkOrders`, `saveMerchandiseReviewWorkOrders`, or `updateWorkOrder`.
- The New Items modal no longer creates Work Orders.
- Admin no longer exposes Workflow Templates or Work Order Types.
- Workflow Template and Work Order Type Admin forms were removed from the active frontend.
- Frontend API methods used only by those Admin forms and active Work Order Intake calls were removed.

Backend:
- Added `PATCH /api/merchandise/<entry_id>/intake-state`.
- Added `PATCH /api/merchandise/review/<entry_id>/intake-state`.
- The new endpoint writes existing Merchandise fields only.
- Existing Work Order, Workflow Template, Workflow Stage, Work Order Type, and Workstream routes/services remain for historical compatibility.

## Airtable Verification

Read-only metadata verification confirmed:
- `Merchandise` contains `Merch Status`, `Production Type`, `Merchandise Resolution`, `Notes`, `Photo Metadata`, and the deprecated Airtable photo attachment field.
- `Work Orders`, `Workflow Templates`, `Workflow Stages`, `Work Order Types`, and `Workstreams` still exist.
- No destructive schema cleanup was performed.

## Deprecated But Preserved

These remain in Airtable/backend compatibility code:
- `Work Orders`
- `Workflow Templates`
- `Workflow Stages`
- `Work Order Types`
- `Workstreams`

They should not be treated as active PM Intake requirements. A later cleanup pass may remove or migrate them only after dependency verification and a separate decision.

## Rollback

To restore the previous Work Order-driven Intake UI:
1. Restore the frontend Work Order loading, save, and update calls.
2. Restore the Admin Workflow Templates and Work Order Types cards/forms.
3. Restore frontend API methods for workflow templates, Work Order Types, and Work Orders.
4. Keep the Merchandise `Production Type` and `Merchandise Resolution` fields; they remain valid Intake decisions.

No Airtable rollback is required because this pass did not delete tables, fields, or records.
