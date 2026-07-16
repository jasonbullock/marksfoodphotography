# Current State

## Current Focus

Redesigning the post-receiving workflow around automatically generated merchandise review work.

## Confirmed Decisions

- Receiving remains focused on logging physical merchandise.
- Merchandise receipt is the main workflow trigger.
- PMs must not manually create Jobs or Projects.
- Imported product data may be incomplete.
- Review must support Photo, THR3D, Replacement, Waiting, and No Production.
- Ready for Photo must mean that merchandise, data, artwork, and production instructions are complete.
- Activation emails should eventually become structured production instructions.
- Existing Items and Jobs concepts require reconsideration.
- Do not rename or rebuild them until the domain model is agreed upon.

## Current Questions

- What is the smallest new record needed to represent automatically generated review work?
- Should Receipt Entries themselves carry the review lifecycle initially?
- When and how should related merchandise become a production grouping?
- Which information is required before Photography versus THR3D?
- How will activation-email information enter the application?

## Next Step

Inspect the existing schema and code read-only. Recommend the smallest safe transition from the existing Items/Jobs model toward merchandise-triggered review work. Do not implement yet.

## Continuity Documents

Added repository continuity documents on 2026-07-16:
- AGENTS.md
- docs/PRODUCT_VISION.md
- docs/DOMAIN_MODEL.md
- docs/CURRENT_STATE.md
- docs/DECISIONS.md

No application code changed as part of this documentation setup.
