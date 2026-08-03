# Marks Photo Instructions

Before changing code, always read:

1. docs/PRODUCT_VISION.md
2. docs/WORKSPACES.md
3. docs/DOMAIN_MODEL.md
4. docs/DESIGN_PRINCIPLES.md
5. docs/CURRENT_STATE.md
6. docs/DECISIONS.md
7. Any documentation for the specific feature being changed

Do not implement a request that conflicts with PRODUCT_VISION.md without explicitly identifying the conflict.

Never require PMs to manually create Jobs, Projects, Production Requests, or administrative containers to begin work.

Prefer the smallest safe change. Do not redesign unrelated navigation, routes, styles, schema, or behavior.

Planning polish passes must preserve the canonical PM queue (`New`, `Planning`, `Waiting`, `Ready for Photo`) and the future Production separation. Improve density, clarity, accessibility, and responsiveness without adding workflow states or placeholder Production features. Treat those queue columns as PM organization, not a workflow engine or Airtable status model. Internal Planning board code should use Planning/Merchandise language such as `planningCard`, `currentQueue`, `queues`, `deliverableRoute`, and `requiredToShoot`, not legacy `workOrder`, `currentGate`, `workstream`, workflow assignment, or public Readiness naming.

Planning modals follow the Draft -> Commit contract. The board is committed state; the modal is draft state; the footer is the single commit area. Selecting Deliverables, identifying information, or changing modal fields must not optimistically reroute, refresh, or move a board card. While a modal is open, freeze background board interaction and animation. `Finish & Move` is the only action that commits draft routing changes, sends the intake-state transaction, refreshes data, moves the card, and closes the modal. Closing or canceling the modal discards uncommitted draft changes and leaves the board unchanged.

Shipments is the canonical merchandise-team workspace. It replaces the old Receiving label and is responsible for physical merchandise entering and leaving the studio. Keep `/receiving` and `/receipts` as compatibility redirects/routes only; new user-facing copy, navigation, permissions, and docs should use Shipments. THR3D is an outbound shipment queue inside Shipments, not its own workspace or workflow. THR3D-only Merchandise uses a minimal Planning path: Client, at least one merchandise photo, Quantity, and `Deliverables` containing `Thr3d`. The THR3D queue derives from existing Merchandise records where `Deliverables` is Thr3d-only, `Intake Status` is `Ready to Release`, `Released` is false, and the Merchandise is still physically present; do not add a parallel THR3D flag or duplicate Merchandise record. Mixed photo + Thr3d Merchandise stays on the full photo path and must not appear in Shipments `THR3D / Outgoing` before a reliable production-complete signal exists.

Do not reintroduce Workstreams, Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, Product-level production/storage state, or Merchandise Resolution. The 2026-07-22 cleanup removed active backend dependencies, cleared legacy workflow records/field values, and removed Product operational fields from active code. Live Airtable metadata no longer lists the legacy workflow tables; remaining obsolete Product fields are manual deletion targets, not compatibility surfaces.

Shipment-level photos belong to Shipments, use R2 originals plus Shipment metadata, and should be displayed in Planning/Production only through the linked Shipment. Do not duplicate Shipment Photo metadata onto Merchandise records. The current Shipments Airtable table does not have `Photo Metadata`; until a schema migration is explicitly approved, store the shipment photo manifest in the existing Shipments `Notes` field using the backend's private metadata block and strip that block from user-visible notes.

Before implementation:
- Inspect the current code and schema.
- Summarize the relevant current state.
- Identify any conflicts with the documented vision.
- State the exact files and data structures that would change.
- Wait for approval when the request involves schema or workflow architecture.

After implementation:
- Run relevant tests and builds.
- Update docs/CURRENT_STATE.md.
- Add durable decisions to docs/DECISIONS.md.
- Report files changed and any unresolved risks.

## Session Start

Begin Codex sessions with this prompt:

```text
Resume work on Marks Photo.

First read AGENTS.md and every document it requires. Then inspect the repository and compare the code to docs/CURRENT_STATE.md.

Do not make changes yet.

Report only:

1. Current implementation state
2. What was completed in the last documented session
3. Any code that conflicts with the product vision
4. Open decisions
5. The single best next step
6. Exact files likely involved

Do not rely on previous chat history. Treat the repository documentation and current code as the source of truth.
```

## Session Close

End meaningful Codex sessions with this prompt:

```text
Before ending this session:

1. Update docs/CURRENT_STATE.md with what is now true.
2. Add any durable product or architecture decisions to docs/DECISIONS.md.
3. Confirm whether PRODUCT_VISION.md or DOMAIN_MODEL.md needs revision.
4. Record tests run and unresolved risks.
5. Give me a compact prompt that can resume from this exact point in a future Codex session.

Do not leave important context only in your response. Put it in the repository documentation.
```
