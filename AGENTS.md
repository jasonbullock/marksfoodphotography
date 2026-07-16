# Marks Photo Instructions

Before changing code, always read:

1. docs/PRODUCT_VISION.md
2. docs/PRINCIPLES.md
3. docs/DOMAIN_MODEL.md
4. docs/CURRENT_STATE.md
5. docs/DECISIONS.md
6. Any documentation for the specific feature being changed

Do not implement a request that conflicts with PRODUCT_VISION.md without explicitly identifying the conflict.

Never require PMs to manually create Jobs, Projects, Production Requests, or administrative containers to begin work.

Prefer the smallest safe change. Do not redesign unrelated navigation, routes, styles, schema, or behavior.

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
