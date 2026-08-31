# Product Decisions

## 2026-08-19 - A Scan That Resolves To One Row Matches Itself

A scanned UPC links merchandise on its own only when it is unambiguous: at least eight digits, resolving to exactly one candidate by whole-value equality. Prefix and substring hits never auto-link, because prefix matching is what makes the suggestion list ambiguous in the first place. Anything short, absent or ambiguous leaves the merchandise unmatched for a PM to resolve, and is reported as an ordinary outcome rather than an error so a receiver never sees a failure because a barcode did not resolve.

The rule lives server-side in `_resolve_unambiguous_upc` and is shared by two endpoints so a scan means the same thing regardless of when it happens. `GET /api/products/resolve-upc` answers without linking, which receiving needs because merchandise is staged before a record exists. `POST /api/merchandise/:id/auto-match` resolves and links for merchandise that already exists. Both report `candidateCount` on ambiguity, which distinguishes an unknown barcode from duplicate UPCs in the client sheet.

Manual matching stays on both surfaces. `docs/proposals/2026-08-19-where-merchandise-matching-belongs.md` weighed removing it from receiving and that half was deliberately not done: receiving works well as it is. `2026-08-18 - Shipments Can Activate A Source Row While Matching Merchandise` therefore still stands.

## 2026-08-19 - Observed Package Values Are Evidence; The Matched Product Is Authoritative

The package name and UPC / ID captured at receiving exist to find the Expected Product and to record what physically arrived. They are retained on the Merchandise record and are never used downstream.

Once a Product is linked, the Product's name and UPC are the operating values. `_creative_force_handoff` builds its payload from the linked Product record, so the Creative Force feed, file naming, folder path tokens, and photo-production readiness all read Product fields. Observed values reach downstream systems only through `_manual_product_from_fields`, the fallback used when no Product is linked.

The two are therefore not competing versions of one fact and must not be reconciled by copying Product values onto the Merchandise record. A mismatch is a real signal with real causes — the wrong item shipped, a mislabelled box, incorrect client data, or a receiver typo — and overwriting the observed value destroys the only evidence that the discrepancy existed. `Use Product Name` and `Use Product UPC` stay explicit actions so correcting captured evidence is always a deliberate human decision, taken for the typo case.

Because this is invisible in the interface, the mismatch warning states the consequence rather than only the discrepancy: production uses the Product values and package values are kept as received. Without it the warning reads as an unresolved problem the PM is expected to fix.

## 2026-08-19 - Planning Matches Against The Same Source As Shipments

Product matching in Planning now uses the read-only client source sheet for clients with Source Check rules, the same suggestions Shipments has used since the Topco source slice. Selecting a row runs the existing idempotent activation, which creates or updates one local Product from that row and links it to the Merchandise.

Previously Planning searched local Products only. That meant the two surfaces answered the same question differently: a receiver in Shipments could find a product straight from the client sheet, while a PM in Planning could only find rows that had already been activated by someone else. Typing a word from the package into Planning would return nothing for a product the client had clearly listed.

Clients without Source Check rules keep local Product search unchanged, so this adds a capability for configured clients rather than replacing the general path.

Linking a Product no longer writes the match search fields back onto the Merchandise record. The search inputs are seeded from the observed values, so selecting a suggestion used to save whatever was currently typed as the observed package name and identifier — searching for "Cheese" replaced a recorded name of "CT Asiago Cheese 8oz", and clearing the identifier box to search by name alone blanked the recorded UPC. Observed values are the receiver's evidence of what physically arrived and now change only through the explicit `Use Product Name` and `Use Product UPC` actions. This supersedes the earlier behaviour where selecting a suggestion saved the typed values first.

`No clear match` is removed from Planning. Shipments had already dropped it; saving without choosing a match leaves the Merchandise unmatched for later review without recording an explicit no-match state.

## 2026-08-19 - Comment Read State Is Per Person, Server Side

Unread comment state lives in an app-owned JSON map on `Users.Comment Reads`, keyed by merchandise id with an ISO read-through timestamp. It was previously `localStorage`, which made "new" a property of the browser rather than the person: reading a thread on a laptop left the badge showing on a phone, and clearing site data silently marked everything unread again.

It is a field rather than a table because read state has no independent lifecycle, ownership, or relationships — the same reasoning that put Product Import Profiles and Photo Production Requirements on Clients. Both endpoints fail soft: if the read map cannot be fetched or written, comments show as unread rather than the Planning board failing to render. Losing read state is recoverable; a blank board is not.

Comment timestamps come from Airtable, not the app. The shaper prefers the `Comment Created` field and falls back to the record's `createdTime` metadata. Because an Airtable `createdTime` field is a computed mirror of that same metadata, the two values are identical — the field buys visibility and sorting inside Airtable, not correctness in the app.

Planning cards carry a comment signal with three steps in a single hue: a quiet outline when a conversation exists and the reader is caught up, a blue tint when unread, and solid blue when unread and posted within the last four hours. Recency previously had its own amber treatment, which collided with the age chip's aging colour and made a comment count the loudest element on the card. Amber and red stay reserved for age and blockers; conversation escalates by weight within blue.

Inside the modal, individual comments are marked against a read-through captured when the card was opened, not the live value. Opening a card stamps everything read immediately, so marking against live state would mean no comment is ever shown as new.

## 2026-08-19 - Planning Has One View

The Planning List view is removed, along with the grid/list toggle. Planning renders the Release view only.

A list exists to trade richness for density. This one did not: its rows showed a product name, client, and a status word in roughly the height the Release card uses for a photo, UPC, match state, age, and shipment grouping. It was less information per pixel than the view it was supposed to be the compact alternative to.

It had also drifted. It labelled the first queue `New Merch` where the board said `Newly Received Merch`, said `No cards in this queue.` where the board said `No cards here.`, and kept an older header treatment. Every card refinement landed on the Release view only, so the gap widened with each change while both surfaces still had to be kept compiling and threaded with the same props.

A genuinely dense table is still worth building when queue volume makes card scrolling painful — sortable columns, compact rows, no thumbnails. That is a different artifact from what was removed, and it should be built when the volume proves the need rather than maintained speculatively in the meantime. `tests/test_frontend_routing.py` asserts `PlanningListView` is absent so it cannot return without a deliberate decision.

## 2026-08-19 - The Routing Module Models Only What The Board Renders

`frontend/src/merchandiseRouting.js` described a five-column planning board and a second production board while the app rendered three sections. Queue ids, board columns, and a two-board state model existed for surfaces that were never built.

Only the three canonical Planning queues are modelled: `new-review`, `waiting-info`, and `ready-production`. `sendThr3d` and `waitingActivation` are gone, along with the four production queue ids and the `BOARD_IDS` / `BOARD_STATE_MODEL` pair, which nothing imported.

THR3D is not a queue. THR3D work becomes a shipping item and its parent leaves the board structurally, so a Thr3d column would be a second way to express something the record graph already answers. `send-thr3d` survives as a backend API stage name; that is a transition verb, not a board position.

Production queues stay unmodelled until Production is built. `docs/WORKSPACES.md` says not to add placeholder navigation for architected-but-unbuilt workspaces, and the same reasoning applies to placeholder queue ids: they invite code to route work into columns that cannot be rendered.

V1 Merchandise Review vocabulary — `Needs Review`, `Waiting for Product Data`, `Validated`, `Issue` — belongs to the V1 `/merchandise/review` page and must not appear in the Planning path. It had leaked into three Planning call sites, where it was threaded into queue derivation as a parameter that was never read.

## 2026-08-19 - Planning Board Membership Is Structural

A parent Received Merch record belongs on the Planning board until child work actually exists for it. Board membership is decided by whether a Packaging or Ecomm workstream card links to that merchandise, not by a status flag that claims work was created.

This replaces filtering on `New Merch Status = Workflows Created`. A flag can be set while no card exists, which hid merchandise in Planning with no route back onto the board. Record existence cannot drift from itself, so the structural check is self-correcting where the flag was not.

Deriving from record existence or link fields is acceptable. Deriving planning state by inferring from a combination of flags such as `Merchandise Verified`, `Deliverables`, and `New Merch Status` is what produced competing sources of queue placement, and it should not be reintroduced.

Child work means a Packaging or Ecomm workstream card **or** a THR3D shipping item. THR3D-only merchandise never produces a workstream card, so a board that checks only cards will pull THR3D-only merchandise back into New Merch after assignment.

A consequence: removing a workstream card must not rewrite the parent's `Planning Status` while sibling cards remain, because the parent is off-board and its status is not what the board is reading. Only removing the last card returns the parent, and that reset writes `Needs More Information` with `Merchandise Verified` cleared. For the same reason, no path that creates child work may write `New` to the parent — it is accepted merchandise, and `New` is where it would land if the child work is later removed.

`New Merch Status` is retired as of 2026-08-19. Its `Workflows Created` value only restated "a child record exists", which the link fields already answer directly, and a flag can drift from the records it claims to describe while a link field cannot. Planning-status derivation was collapsed at the same time: `Planning Status` is authoritative, and inference happens only when the field is completely empty.

Workstream cards are created only after the merchandise is physically validated and deliverables are defined. Physical acceptance is the first PM step and must not create work; deliverable review is the second.

### Resolved 2026-08-19

- **Workstream cards cannot be `New`.** A card is created only after merchandise is accepted and deliverables are known, so it is born at `Needs More Information`; `New` was unreachable. `Workstream Cards.Planning Status` now offers two values, tracked separately from merchandise as `WORKSTREAM_CARD_PLANNING_STATUS_OPTIONS`, and the update endpoint rejects `New` for cards. `New` remains a parent-merchandise concept.
- **THR3D-only merchandise never claims a photo-release status.** It stops at `Needs More Information` and leaves Planning because its THR3D shipping item exists; the physical hand-off is expressed by `Merch Status = Ready to Ship`. Previously it wrote `Awaiting Photo Release`, which made the shared release queue mean two different things. The only consumer of that write was `GET /shipments/thr3d-outgoing`, a merchandise-based read model with no frontend caller, superseded by `/thr3d-shipping-items`; that endpoint and its helpers were removed.

### Still open

- Whether a PM may enter Deliverables in the application when the client source sheet has no Request Type, or whether the source document must be corrected first. `Products.Request Type` is source-owned and `Merchandise.Deliverables` is app-owned, so these are two different facts rather than two sources for one fact, but the operating rule has not been chosen. If in-app entry is allowed, disagreement between the two fields should be flagged rather than auto-resolved, and the application must still never write `Request Type`.

## 2026-08-19 - Planning Status Is The Only Persisted Queue Field

`Intake Status` is gone as a name in the codebase. It survived as `F_RECEIPT_ENTRY_INTAKE_STATUS`, an alias assigned to the same `"Planning Status"` string, which meant paired writes silently discarded one value: `{INTAKE: "New", PLANNING: "Needs More Information"}` is one key, and the later assignment won. Dead writes therefore read as intentional in review. The alias is removed and every call site uses `F_RECEIPT_ENTRY_PLANNING_STATUS`.

The API surface follows the same rule. Responses expose `planningStatus` (the slug used for queue placement) and `planningStatusLabel` (the stored Airtable label); the `intakeStatus` and `intake_status` aliases are gone from both requests and responses. Request payloads accept `planningStatus` or `planningStatusLabel`.

Merchandise writes deliberately do **not** use Airtable `typecast`. Planning Status values are normalized before write, so a rejection means something produced a value outside the canonical set and should fail loudly. `typecast` would silently create the option instead, which is how stray choices accumulated on `Workstream Cards.Planning Status`.

## 2026-08-19 - Reset Test Data Clears Products

This supersedes `2026-08-09 - Reset Test Data Preserves Products`.

Products are re-importable, not authored in Marks Photo. They are aggregated from client product-data sources through Excel upload, paste, and the Topco source sheet, so a cleared Products table can be rebuilt from the source of truth. That makes them test data for the purposes of a development reset, not reference data.

`Reset Test Data` therefore deletes every `Products` record along with the workflow and shipment tables. Clients, Users, Locations, Airtable schema, field options, and client configuration remain preserved, because those are configured in Marks Photo and have no upstream source to restore from.

The typed confirmation phrase is `DELETE TEST DATA AND PRODUCTS`. It names the wider blast radius explicitly so the prompt cannot be cleared by muscle memory from the previous `DELETE TEST DATA` phrasing.

## 2026-08-18 - Planning Status Moves Forward To Photo Release

The persisted `Planning Status` dropdown should have three active values: `New`, `Needs More Information`, and `Awaiting Photo Release`. `Needs Product / Work`, `Awaiting Info`, `Awaiting Info/Activation`, and `Ready for Photo` are retired Planning labels, not active app values.

`Awaiting Photo Release` means the item is ready but waiting for the final official green light. The explicit `Release to Photo` action is the Creative Force handoff. Entering `Awaiting Photo Release` by itself must not be treated as the downstream Production state, and raw workstream-card status updates must not create Creative Force feed rows.

Release completion is owned by the release audit fields (`Released`, `Released At`, `Released By`) and Creative Force feed projection, not by writing a fourth Planning Status such as `Complete`. The active Planning surface should hide released work through those release fields.

Airtable may still show retired choices in the single-select dropdown until they are removed through Airtable's own field configuration UI. The metadata API rejected live choice-pruning requests with a 422 response, so the application must not depend on pruning being complete.

Resolved 2026-08-19: the retired choices were removed manually from both `Merchandise.Planning Status` and `Workstream Cards.Planning Status`, which now offer only the three canonical values. The rule above still stands as a design constraint — app code must keep normalizing retired labels on input rather than assuming a clean dropdown, because pruning is a manual step that cannot be enforced from code.

## 2026-08-17 - Source Check Is Read-Only Evidence

Topco tracker integration should begin as reversible Source Check mode, not replacement sync. The shared Google Sheet remains read-only from Marks Photo, and existing Product import/edit behavior stays available. The first implementation compares current in-application Product Data with source sheet row data already preserved in Product `Reference Data`, limited to identity fields needed to confirm the match and fields required by Client settings for the suggested photo deliverable. It ignores non-required source sheet fields and lets PMs recheck the current local Product data without writing Products, routing Merchandise, updating statuses, or writing back to Google Sheets.

Tracker `Request Type` is expected-work intent and may map to suggested Deliverables (`Ecomm only` -> `Ecomm`, `Pack only` -> `Packaging`, `Thr3d only` -> `Thr3d`, `Pack & Thr3d` -> `Packaging + Thr3d`, `Ecomm & Pack` -> `Ecomm + Packaging`). Those suggestions are not committed Deliverables and must not create work, move Planning cards, or send THR3D items until a PM confirms in Planning. Blank UPC and `NO UPC` tracker rows are compare-only until a stronger Topco match key is approved.

Source Check rules should live as client readiness/source configuration rather than one-off panel logic. Topco's Source Check configuration uses Product Name + UPC as source identity, Request Type as the activation field, and required-to-proceed fields by suggested work path. Packaging requires Product Name, UPC, and WKFT Job Number. Ecomm requires Product Name, UPC, and CVID. UPC is required for Topco matching and folder naming, including Ecomm folders; WKFT Job Number is required for Topco folder naming/handoff, especially Packaging; CVID is required for Ecomm file naming. These fields are required to proceed, not narrowly required to shoot.

The first implementation keeps this reversible by seeding Topco Source Check rules in the client readiness profile and exposing them through `/api/clients` as `sourceCheckRules`; Admin > Clients displays those rules read-only. This does not add a new Airtable Client schema field or a general rules editor yet.

For Topco Source Check, `Pack & Thr3d` means Packaging required plus THR3D shipment context. `Thr3d Only` and `Not Needed` mean no normal Walnut production work is expected and should alert if merchandise arrives at Walnut. Missing source values should be corrected in the source sheet; Marks may store local activation/readiness state but must not overwrite source Product data or write back to the Google Sheet from Source Check.

Source Check may read the shared Topco Google Sheet live through a read-only CSV export endpoint so Products can show source-only rows that do not yet have Marks Product records. That live read is evidence only: it may match source rows to Products by UPC first and exact Product Name second, display the match method, and compare required-to-proceed fields, but it must not create Products, update Product fields, write back to Google Sheets, or route Merchandise. The initial live slice is intentionally bounded to the first 20 data rows of `Master Tracker 2026`.

The live Source Check payload should stay narrow. For Topco, return only the source fields currently needed for identity, activation, required-to-proceed checks, and source product/naming context: `Product Name`, `CVID`, `UPC`, `Brand Prefix`, `Request Type`, `WKFT #`, `Mbox #`, `Product Type`, `Prod Descrip`, `Link to Prepro/Overlays`, `Path to Art`, and `Photo Notes`. Physical/noise tracker columns such as merch status, vendor, received date, studio destination, and quantity received remain in the source sheet and should not be part of Source Check unless a real rule needs them later.

For this Topco slice, the source column `Prod Descrip` is the source-owned value used for the packaging `File Name Description` handoff/filename token and the display `Product Description`. Do not add a new Airtable field for this yet. Source Lookup and Admin > Clients should show the mapping clearly as `Prod Descrip` -> `File Name Description` / `Product Description`, and readiness/handoff checks should not report Product Description and File Name Description as unrelated missing values when `Prod Descrip` or Product Description is present.

## 2026-08-18 - Source Snapshot Metadata Lives In Product Reference Data

Topco source-linked Products should remain local/actionable Marks records, not a full mirror of every tracker row. When a PM commits an actionable Product import, the app may store a small `_sourceSnapshot` object inside the existing Product `Reference Data` JSON. The snapshot records source provenance and source identity only: client, source spreadsheet, tab, row number when known, checked timestamp, match method, actionable reason, Product Name, and UPC.

This is metadata only. It must not create a new Airtable table or schema field, must not write to Google Sheets, must not auto-create Products from Source Check preview rows, must not overwrite source Product facts, and must not change Planning routing or status behavior. Missing source facts remain missing in the source sheet until corrected there. Future writeback, if approved, should be narrow status reporting rather than Product/source-fact synchronization.

## 2026-08-18 - Source Lookup Activation Is The One-Row Commit

For Topco, Source Lookup is the source-first Product data path for daily use, while Product Import remains the bulk spreadsheet upload/mapping/validation path. Browsing, searching, previewing, or rechecking Source Lookup remains read-only against the Google Sheet and must not create Products or route Planning.

`Activate in Marks` is the explicit commit point. It may create or update exactly one local Product from one selected source row, using the approved Topco Product fields plus the existing Product `Reference Data` `_sourceSnapshot`. It must not create Planning cards, assign Deliverables, move queues, update statuses, or write to Google Sheets. A selected source row is sufficient identity for activation even when UPC is blank; UPC remains required-to-proceed for downstream naming/readiness and can update the same local Product later by `_sourceSnapshot`.

Activation must be idempotent. For the same Topco client, the app first reuses a Product whose `_sourceSnapshot` points at the same source row. If no snapshot match exists, it reuses a Product with the same UPC. Product Name may support human review but is not the activation key. A new Product is created only after both checks fail.

Source-linked refresh is allowed to clear source-owned activation data when the source row is blank. In this slice, Topco Request Type is the activation field that drives suggested Deliverables, so clearing Request Type in the Google Sheet must clear the local Product Request Type on the next source-linked refresh/open. This prevents Planning from suggesting work from stale source data. Regular Product Import keeps its existing behavior where blank import cells do not wipe existing Product values.

Topco source-linked Product refresh may run on a backend interval as long as it calls the same narrow helper as the manual/admin operation. The refresh may update only local Products that already carry `_sourceSnapshot` for the Topco source sheet. It must not ingest every sheet row, create Products for unmatched rows, write to Google Sheets, change Merchandise committed Deliverables, route Planning cards, create workstreams, or create THR3D records. Planning cards should not refresh source rows individually on open once the backend refresher exists.

The source refresh timer is a Client source/readiness setting, not a Product workspace control. Admins edit it under Admin > Clients as `Source sync`, and the saved override lives in the existing Client Photo Production Requirements JSON under `sourceRefresh` until a broader client-settings schema is approved. This avoids adding a new Airtable field for the current Topco slice while keeping the setting visible and reversible.

## 2026-08-18 - Shipments Can Activate A Source Row While Matching Merchandise

Daily Topco source matching should start where the physical sample is being handled: Shipments. A Product does not need to exist before a receiver or PM reviews a saved Merchandise item. The match UI may show read-only source-backed Product matches beside the existing local Product suggestions, using observed package clues such as Product Name on Package and UPC / ID.

Viewing source suggestions is evidence only. It must not create Products, write Google Sheets, route work, or change Planning state. For saved Merchandise, selecting `Match` on one source row is the commit point: Marks creates or updates exactly one local Product through the same idempotent Source Lookup activation helper, stores `_sourceSnapshot` in Product `Reference Data`, and links the Merchandise record to that Product through the existing Product match behavior.

For new Add Merchandise drafts, source rows should be selectable before a Merchandise record exists. The draft action is also `Match`, which stages the source row locally. Product activation still waits until `Save Merchandise`: the app first creates the Merchandise record, then activates/updates the Product from the selected source row, stores `_sourceSnapshot`, and links the new Merchandise to the Product.

This remains reversible and narrow. It does not replace Product Import, does not create Planning cards, does not assign Deliverables, and does not create THR3D shipping items. If no source row is chosen, the Merchandise stays unmatched.

In Add Merchandise, matching suggestions are the preferred path. For clients with source rules, including Topco, Shipments should use source-backed Product matches as the suggestion source and should not run local Product lookup for suggestions. Local Products remain the activation result and linked record after a source row is selected, but they are not the discovery source for source-backed clients. Source-backed Product matches should stay focused on product identity; request/work readiness belongs later in Planning and Source Lookup details, not on each candidate row during merchandise matching. If the receiver does not choose a match while adding Merchandise, they can simply save the Merchandise and leave it unmatched for later review instead of clicking a separate `No clear match` action.

## 2026-08-17 - Newly Received Merch Is Acceptance And Triage

`Newly Received Merch` is a merchandise acceptance/triage surface, not a Product-data completion surface. The PM's first decision is whether the physical received item is acceptable to continue. Product matching remains available inside that check, but it should not feel like the only job of the column.

The primary forward action for newly received merchandise is `Confirm Merch`. The footer preview explains whether confirmation will move the item to `Needs More Information` or `Ready to Release`. `Raise Issue` is the paired exception action and begins as a blocking Issue layer attached to the Merchandise. Full replacement, relink, supersession, and corrected-merch workflows are deferred until the Issue model is intentionally designed.

Ecomm/Packaging separation should be visually deferred until release/handoff so PMs can keep one merchandise card through `Newly Received Merch` and `Needs More Information`. Current backend support for child Ecomm/Packaging workstream cards remains available for compatibility, but the Planning Release view should not make PMs feel that confirming merchandise immediately fragments the card.

## 2026-08-18 - Newly Received Merch Does Not Choose Work

`Newly Received Merch` now answers only whether the physical merchandise is acceptable and whether the Product match looks correct enough to continue. It must not ask the PM to choose Deliverables, show Product-data-for-photo requirements, or preselect Product Request Type suggestions while the item is still in the first review column.

Accepting newly received merchandise moves the item forward for later product/work planning. A source-linked Product may still suggest expected work after the item leaves the first column, but the work declaration and required-to-proceed checks belong in the later Planning sections. This keeps column 1 distinct from column 2: column 1 is physical acceptance and match confidence; column 2 is Product/work readiness.

`No clear match` in the first-column modal is a draft intake choice, not an immediate status change. It should only persist, clear the Product link, and move the card when the PM uses the footer action to accept the merchandise.

## 2026-08-17 - Planning Actions Use Stable Business Intent

Planning action buttons should describe the user intent, not the backend mechanism or changing implementation outcome. Newly received merchandise uses a stable `Confirm Merch` action, and workstream/detail cards use `Save Details`. The footer preview carries the variable outcome language, such as moving to Needs More Information, moving to Ready to Release, or blocking on an open issue/missing required information.

Ready-to-Release remains release-focused. Batch selection opens the release composer through `Create Release`, and Ecomm/Packaging selections remain mutually separated for release package clarity. Card-level actions should stay consistent: the card body selects in batch mode, the pencil opens details, and state-changing workflow commits happen in the modal footer. Do not add more per-card workflow buttons. The current frontend continues to use existing backend endpoints; backend transaction cleanup for a single save/review/release commit boundary is a follow-up.

## 2026-08-17 - Dashboard Newly Received Merch Mirrors Planning

The Dashboard `Newly Received Merch` section must reflect the same card eligibility used by the Planning Release view's `Newly Received Merch` section. Dashboard should not independently infer “new” from Shipment completion fields alone, because that can drift from Planning's current PM queue/section logic. The Dashboard remains a visibility slice and entry point into Planning; it does not add a workflow status, duplicate Planning queues, or create a separate dashboard-only definition of newly received merchandise.

## 2026-08-18 - Planning Kanban View Removed

Planning no longer exposes the Kanban board as a user-facing view. The active Planning views are Release and List. Kanban-only card/column components, the Kanban toolbar button, and Kanban drag/drop queue movement logic are removed from the frontend. Planning routing still follows the Draft -> Commit contract: opening or selecting cards does not reroute work, and committed movement happens through the shared Planning modal or release flow.

## 2026-08-14 - Planning Release View Is A Reversible View

Planning may use the Release view as the default Planning scanning surface for PMs. The Release view must reuse the same Planning cards, filters, shared modal, Draft -> Commit behavior, and Ready for Photo handoff. It must not add Airtable fields, routes, workflow states, or a parallel queue model. The former Kanban fallback was removed on 2026-08-18; Release/List are now the supported Planning views.

The Release view names the first presentation section `Newly Received Merch` to keep the surface grounded in what physically arrived, while preserving the underlying New/Needs Review data contract. Newly received merchandise must be viewed and acknowledged before it leaves this section, even when captured data is already complete. After acknowledgement, cards with any outstanding validation belong in `Needs More Information`; cards that satisfy the same checks used by the modal's `Ready for Photo` action belong in `Ready to Release` because they only need activation/release information before being committed to `Ready for Photo`. `Ready to Release` is not a persisted status and must not replace the canonical `Ready for Photo` handoff. The default Release view should not show a full `Ready for Photo` work section: once Planning commits that handoff, the item leaves the active Planning surface and downstream status belongs on Production-facing surfaces. The List view may still expose the canonical queue model for inspection.

`Ready to Release` is a batching surface. PMs may select multiple ready cards and open one activation/release package with those items prelinked. Selection should feel like choosing cards, not filling out a form: use the card's selected state instead of visible checkboxes, and keep a secondary details action for opening the review modal. This must reuse the existing activation/release persistence and must not create a separate batch table or workflow state.

The photo release modal is a release composer, not a second validation surface. Item/Product data that made a card eligible for release should be visible as read-only confirmation context inside the release package. PMs should edit only release-specific details there, such as Project name, Walnut Scope, image counts, artwork path, upload location, notes, and optional Structure. Corrections to validated Product or Merchandise data belong back in Planning.

Photo releases are scoped to one photo deliverable. Because the selected deliverable is already established before the release composer opens and appears in the modal header, the composer should not expose an internal Deliverables selector. Ready-to-release batching must prevent selecting Ecomm and Packaging together; PMs release each deliverable type separately so the release package, item requirements, and email preview stay unambiguous.

## 2026-08-12 - Planning Cards Share One Opened-Card Surface

New Merch, Received Merch, and Ecomm/Packaging workstream cards are the same PM planning-card experience at different queue steps. Opening any of them uses the shared review modal with the same merchandise, Product match, Deliverables, Product data, comments, and history sections. Queue position changes the available action, not the visual anatomy. Only New Merch provides Previous/Next Merchandise navigation and creates work; existing workstream cards use the same modal and may move to Ready for Photo after validation. This keeps the card focused on readiness rather than exposing implementation-specific workstream drawers.

Expected Product matching is optional for unmatched merchandise exceptions. If no Expected Product exists or no clear match is found, Planning should let the PM manually enter the Product data required for the selected photo deliverable and continue toward release. Those manual fields live on Received Merch or child Workstream Cards as `Manual Product Info` and may satisfy Photo Production Requirements and Creative Force feed projection. Planning must not create or mutate a Product record as a side effect of this manual path; later Product creation or labeling on the Products page is a separate reconciliation decision.

In the unmatched/manual path, merchandise identity fields are not duplicated as editable Product data fields. Product Name and UPC / Product ID entered in the Match Product step should satisfy the corresponding Product data for photo requirements and be inherited into the handoff payload. The Product data step should show only the remaining missing handoff fields, with a small note that package name and UPC are being reused from merchandise identity.

An existing Ecomm or Packaging workstream may be changed to the other photo deliverable. The PM edits the draft Deliverables selection and commits it with `Save workstream`; the backend updates the existing Workstream Card type and display name in place, preserves its queue/status, and does not create a duplicate child card.

When both photo child cards exist for one Received Merch, their deliverable types are locked to prevent one card from becoming a duplicate of the other. The PM can remove either card using a confirmed `Remove workstream` action. Removal affects only that child card, recalculates the parent Deliverables, and returns the parent to Waiting on Information if no photo child remains. Creative Force-handoff and In Production cards are protected from removal.

## 2026-08-12 - Product Photo Data Uses Live Product Fields

The Product Data editor may expose compatibility labels such as Job Number, but writes must target fields that exist in the live Products table. `itemJobNumber` maps to `WKFT Job Number`; the retired `Product Job Number` field must not be written. `Valid Artwork Path` is a user-facing label for the plain-text `Path to Art` field; the value is saved as entered, while readiness validation decides whether the reference is usable.

Workstream cards and merchandise review use one shared Product Data editor. A workstream card shows only the mandatory fields for its selected deliverable, and edits persist to the linked Expected Product rather than to a duplicate card-specific copy.

## 2026-08-10 - Planning Cards Use A Shared Recognition Anatomy

Planning board cards should use the same core visual hierarchy across New Merch, Planning, Waiting, and Ready for Photo: photo, subtle additional-photo count in the upper-left, client eyebrow, one-line product name, and a compact `UPC / ID` plus `Qty` row with quantity floated right.

New Merch cards should show the two first-review criteria directly on the card: Product match and Deliverables. Product match should read `Matched` with a green check when linked and `Unmatched` when not linked. Deliverables should read as a green checked line when defined, naming the chosen deliverables, and as a quiet missing line when undefined. This keeps the card focused on what the PM must decide without adding new Queue values or status badges.

## 2026-08-10 - Needs Review Modal Uses Quiet Progress Guidance

The Planning Needs Review modal should avoid repeating the same workflow state as multiple high-emphasis badges. The modal header should identify the client and product, while the surrounding board context provides the queue.

The top checklist is guidance, not a second board or status model. It should summarize remaining review work compactly (`Needs N`, `Ready`, or `Issue flagged`) and use short step labels (`Product`, `Deliverables`, `Info`). Detailed actions remain inside each step.

Step status text may remain visible, but it should be styled as quiet inline state instead of rounded warning badges. The PM's focus should be on the open action controls and the bottom `Confirm & Assign` commit area, preserving the Draft -> Commit contract.

The Planning modal should not have a separate `Verify Merchandise` step. Shipments captures the observed physical item and required photos; Planning should start by matching that merchandise to the expected Product or marking that there is no clear match. The Product matching UI in Planning should mirror Shipment intake for matched, possible, and no-clear-match states.

Matching suggestions are the preferred path, so suggested Product rows should look clickable and `No clear match` should remain a quiet fallback. Creating an incomplete Product is deferred and should stay hidden from the normal Planning review UI until that exception path is intentionally reintroduced.

## 2026-08-09 - First Planning Column Displays As Needs Review

The canonical Planning queue value remains `New`, preserving the four PM-owned queues: `New`, `Planning`, `Waiting`, and `Ready for Photo`.

The user-facing first-column label is `Needs Review` because cards in that queue are not always simply new or unidentified. A card may already have a matched Product but still need merchandise verification, deliverables, activation, or another first PM decision.

Cards in this column should stay sparse and avoid repeating obvious workflow state as badges. The card should prioritize item photo, subtle remaining-image count, age, quiet client eyebrow, product name, UPC / ID, and one match marker. The image count badge means additional images beyond the visible thumbnail, so two total images displays `+1`. Do not show separate `Verify Merchandise` or `Needs Activation` badges on the first-column card. Matched state should be quiet: `Matched` with a green check when linked to a Product, and `Unmatched` without a check when no Product is linked.

## 2026-08-09 - Reset Test Data Preserves Products

Superseded by `2026-08-19 - Reset Test Data Clears Products`. Retained for history; the Products exclusion described below is no longer the behavior.

The development-only admin reset is a clean-slate tool for testing operational flows, not a catalog wipe.

`Reset Test Data` deletes workflow/testing records from Shipments, Merchandise, Workstream Cards, THR3D Shipping Items, Activations, Issues, Comments, History, Imports, and Jobs. It may also delete uploaded photo objects from R2, but only when those object keys are referenced by the Shipment or Merchandise records being deleted.

Products are intentionally excluded because they are Expected Product reference data and the normal operating spine. Clients, Users, Locations, Airtable schema, field options, and client configuration are also preserved.

## 2026-08-09 - Product Request Type Uses Topco Tracker Choices

Product `Request Type` is expected-work metadata imported from the Topco tracker, not a Planning workflow action.

The controlled app vocabulary follows the spreadsheet choices:

- `Ecomm only`
- `Pack only`
- `Thr3d only`
- `Pack & Thr3d`
- `Ecomm & Pack`

The live Airtable `Products.Request Type` single-select field should carry the same five choices so Product imports, inline Product edits, and Airtable manual edits use one shared vocabulary.

Imports, validation-row edits, and inline Product grid edits normalize common aliases such as `Ecomm`, `Packaging`, `ThreeD`, `Pack and Thr3d`, and `Ecomm and Pack` to those labels. The original source value remains preserved in Product `Reference Data` through the existing import behavior.

Saving a Product Request Type must not create Planning `Deliverables`, workstream cards, or THR3D shipping items. Planning remains the place where PMs commit deliverables and routing through the Draft -> Commit flow.

In the New Merch Planning modal, a linked Product `Request Type` may preselect draft `Deliverables` only when the Merchandise has no committed Deliverables. The mapping is:

- `Ecomm only` -> `Ecomm`
- `Pack only` -> `Packaging`
- `Thr3d only` -> `Thr3d`
- `Pack & Thr3d` -> `Packaging` + `Thr3d`
- `Ecomm & Pack` -> `Ecomm` + `Packaging`

Committed Merchandise `Deliverables` always win over the Product suggestion. The PM may edit the draft selection before clicking `Confirm & Assign`; closing the modal discards the suggested draft if it was not committed.

## 2026-08-06 - Product Imports May Omit Jobs

Expected Product data can arrive before a Job exists. The import wizard therefore offers `Import Products Only`, which skips Job validation and creates or updates Products without a Job link. Job-based import modes remain available when the source data represents a specific production grouping.

## 2026-08-06 - Spreadsheet Imports Support Explicit Header Rows

The import wizard defaults to automatic header detection but allows a PM to select the 1-based spreadsheet row containing column names directly on the Preview page. This is required for client workbooks such as the temporary Topco tracker, which has title/setup rows before its actual header row. The selected header row is applied during preview parsing before mapping or validation.

Automatic detection now selects the most populated row among the opening spreadsheet rows, which skips sparse title/setup rows while preserving explicit PM row selection when needed.

## 2026-08-06 - Product Mapping Follows Expected Product Fields

The Product import dropdown includes the newer expected-data fields already present on Products, including Request Type, Project Status, WKFT Job Number, Mbox Number, Product Type, Product Description, Prepro/Overlays, Ecomm Photo Notes, and Path to Art. Physical receiving fields such as Vendor, Merch Status, Date Received, and Studio/Qty Received remain owned by Received Merch or Shipments and are intentionally not offered as Product destinations.

## 2026-08-06 - Hide Internal Product Matching Terminology

`Primary Match Key` and the Airtable `Identifier` compatibility field are implementation details, not PM import destinations. The mapping UI presents `UPC` instead and translates legacy saved `Identifier` mappings to that user-facing label. Backend compatibility for existing profiles and merchandise matching remains in place.

Shipment and Merchandise Review capture should use physical, receiver-facing labels: `Product Name on Package` for the observed name and `UPC / Product ID` for the scanned or typed match value. Shipment capture should present the product name first because it is the human-readable anchor for the physical item. Matching should still search `UPC / Product ID` first because it is the strongest identity signal, and use product-name search only as fallback/context. Match suggestions should describe the result as `Matched by UPC` when the value is UPC-like, `Matched by Product ID` for other identifiers, and `Matched by product name` for fallback name matches. Technical Airtable names such as `Observed Package Name` remain schema/internal language, not normal UI copy.

Name-only matches are not evidence of a best Product when the query is broad. The UI must not show a `Best` badge for broad name-only suggestions. Use neutral `Possible products` language until there is identifier evidence or a much stronger matching signal.

When both `Product Name on Package` and `UPC / Product ID` are entered, match suggestions should respect both fields. Partial UPC/Product ID matches must not replace the name signal; they should intersect with name matches. Exact identifier matches can still stand on their own because they are stronger evidence than the observed package-name text.

Partial UPC/Product ID matching should behave like prefix matching before generic contains matching. A receiver typing the visible start of a UPC, such as `368`, expects Products whose UPC starts with `368` to rank above unrelated Products whose UPC merely contains those digits later, such as `0368...`. Combined name + identifier matching may fetch a larger hidden candidate pool and then show only the strongest visible results, so the AND logic is not defeated by a small generic search cap.

Combined partial name + UPC/Product ID matches should be presented as possible candidates, not confident matches. Use neutral `Possible products` language and `Possible` badges until the user selects the correct Product or enters an exact identifier. The copy should explain that the rows match the typed name and identifier prefix.

Selecting a suggested Product match should confirm the Product link, not rewrite observed package evidence. The selected state should clearly label the linked Expected Product and show the Product name and Product UPC/Product ID for comparison. Saved/editing Merchandise must rehydrate this selected state from the linked Product record, not from the observed package-name or observed identifier fields. If the observed package name or UPC/Product ID is blank, the UI may offer explicit `Use Product Name` or `Use Product UPC/Product ID` actions. If either observed value differs from the Product value, the UI should warn instead of silently replacing it.

The Planning Needs Review modal should use this same Product validation model in its Identify Product step. A PM should not have to relearn matching rules between Shipment capture and Planning review.

Shipment capture may let receivers stage Merchandise details before the Shipment exists, but it must not commit Merchandise without a saved Shipment context. Do not hard-lock the visible Add Merchandise form. Instead, block `Save & next` with a clear Step 2 validation message that tells the receiver to add Shipment Photos in Shipment Details first. Shipment Photos remain the current path that creates/saves the Shipment context.

Item-level `Merchandise Photos` are mandatory evidence for saving Merchandise. Step 2 should visibly label that requirement before the camera/library controls and show whether photos are still Required or already Added, so receivers do not discover the requirement only after clicking save.

## 2026-08-06 - Preserve The Full Imported Row In Reference Data

The Product import UI temporarily hides `Reference Data` as a manual destination and hides the older duplicate destinations below `Path to Art`. Every source column/value from the original imported row is automatically stored in the Product `Reference Data` JSON field. This keeps the Product table lean while preserving the complete client source record for later field promotion or mapping decisions.

Saved Client mappings are managed as shared configuration: administrators can edit or delete profiles, and deleting the default selects the first remaining profile as the new default.

The configured default saved Client mapping is automatically loaded when the Map Fields step opens. If the stored default name is missing or stale, the first saved profile is used, so the profile shown in the dropdown matches the mappings applied to the import.

## 2026-08-06 - Defer UPC Format Validation

UPC values are accepted as provided during the current import phase. The importer does not require 12 digits and accepts `NO UPC`; stricter UPC/identifier validation remains a later product-data quality pass.

UPC storage must remain text, not numeric. Airtable `Products.UPC` is a single-line text field, and spreadsheet parsing should preserve leading zeroes whenever the workbook provides enough information to do so, including numeric XLSX cells formatted with zero-padded UPC masks such as `000000000000`.

## 2026-08-06 - Remove The Deleted Identifier Field From Product Writes

The old Airtable Products `Identifier` field has been removed. The backend keeps a temporary internal compatibility alias for existing code paths, but that alias resolves to the real `UPC` field. New Product writes and imports must target UPC rather than recreating or referencing the deleted Identifier column.

## 2026-08-06 - Topco UPC And CVID Import Into Product Fields

The Topco import profile maps `Product Name`, `CVID`, `UPC`, and `Brand Prefix` to their corresponding Product fields. UPC also populates the existing `Products.Identifier` compatibility field because current merchandise matching still uses that field. This does not make UPC the Product's identity; Airtable's Product record ID remains the internal identity and UPC/CVID remain client Match Keys.

Receiving facts such as Vendor, Date Received, Studio/Qty Received, and Merch Status are not promoted into this Product import path. They belong to Received Merch or Shipment context. Other tracker columns can remain mapped to Reference Data until their ownership and operational behavior are confirmed.

## 2026-08-06 - Product Identity Is Separate From Client Match Keys

Products have an internal, immutable Product record ID. Client values such as UPC, CVID, GTIN, SKU, or item number are Match Keys and may be multiple, optional, or client-specific. They are never the sole identity of the Product record.

Client references used for naming, folder paths, jobs, or reporting remain a separate category from Match Keys.

## 2026-08-06 - Vendor Belongs To Received Merch

Vendor is a physical receiving fact and belongs on Received Merch or the associated Shipment context. It should not be required on Expected Product records because the vendor may be unknown when the Product record is imported and may only become known when merchandise arrives.

`Studio Destination` remains unpromoted while its meaning is unresolved. If it describes expected production routing, it belongs with requested work; if it describes where received physical merchandise was sent, it belongs with Merchandise/Shipments. Until that distinction is confirmed, retain it as client-specific Reference Data.

## 2026-08-06 - Saved Product Import Mappings Live In The Existing Import Wizard

The first saved-mapping UI belongs inside the existing spreadsheet import wizard's `Map Fields` step. PMs can load a named mapping for the selected Client, review or adjust it against the current source headers, and save the current mapping back to `Clients.Product Import Profiles`. Saving makes that profile the Client default for subsequent imports.

Profiles are applied only when at least one saved target maps to a column in the current spreadsheet. Otherwise the wizard falls back to its existing client-name/header heuristics so an unrelated spreadsheet is not silently treated as mapped.

This pass does not add a separate mapping workspace, import-profile table, or Product schema fields. The UI uses the existing admin-only Client update API; expanding write permissions for non-admin PMs remains an explicit follow-up decision.

Successful imports also save the active mapping automatically. This keeps a PM's first successful client import useful as the starting profile without requiring a second hidden administrative step. The import remains successful if the separate profile write is rejected; the UI reports that mapping persistence failed.

## 2026-08-06 - Client Product Import Profiles Use One JSON Field

Saved Product import mappings belong to the Client configuration, not to a new table and not to many new Product columns.

The app expects a multiline JSON field on `Clients` named `Product Import Profiles`. It stores named profiles per client with this shape:

```json
{
  "defaultProfile": "Topco",
  "profiles": {
    "Topco": {
      "sourceHeaders": {},
      "targetMapping": {},
      "referenceDataTargets": {},
      "requiredTargets": []
    }
  }
}
```

Active backend code exposes this as `productImportProfiles`, preserves the raw string as `productImportProfilesRaw`, and returns an empty profile object plus `productImportProfilesError` when saved Airtable JSON is malformed. Writes through the client create/update API validate the JSON and reject malformed or structurally invalid profiles before Airtable is updated.

This is intentionally a small Product-led Products slice. It does not create a Client Import Profiles table, add Product fields, implement multi-match-key Product JSON, or build the full Product import UI.

## 2026-08-06 - Product Identifier Is Exposed As Primary Match Key

The live Airtable `Products.Identifier` field remains the storage field for the first Product match value. No Airtable schema change is required for this terminology slice.

The app should expose this value to PMs as `Primary Match Key` unless a client-specific label such as `UPC` is configured. API responses should include `primaryMatchKey` and `primaryMatchKeyLabel` while preserving existing `identifier`, `productId`, `gtinUpc`, and `identifierLabel` aliases for backward compatibility.

Import mapping may continue using `Identifier` as the internal/Airtable target key, but user-facing import labels, validation copy, Product grid headers, and Product panels should describe it as the Primary Match Key concept.

## 2026-08-06 - Products Is The PM Product-Data Workspace

The Product workspace is the main PM workspace for expected work and product data. It is not merely a passive table fed by Excel.

PMs should be able to import Excel files, paste spreadsheet rows, map columns, preview and validate rows, correct data inline, save client-specific mappings, and commit expected product records. The experience should feel Excel-like where editing density matters, but it should add operational value that Excel cannot provide: merchandise matching, readiness summaries, client-aware views, and creation/visibility of Ecomm, Packaging, and THR3D work.

Products should not become one massive universal table where every possible client field becomes a permanent first-class column. Product data should be organized into categories:

- Core Product fields: stable cross-client facts needed to recognize and describe expected work.
- Match Keys: values used to match Received Merch to Expected Product, such as UPC, GTIN, TCIN, SKU, item number, or client-specific equivalents.
- Client References: client/job/reporting/production references used for naming conventions, folder paths, reporting, Creative Force, and external handoff.
- Naming / Path Tokens: structured values used to generate file names, folder paths, upload locations, or production labels.
- Import-only extra data / client-specific reference data: source columns retained for traceability or client-specific needs without forcing every client into the same schema.
- Derived readiness/work status: summaries calculated from related Received Merch, Activations, workstream cards, THR3D shipping items, artwork, and client requirements.

Topco is the complex starting client, but the model must support other clients with different naming conventions, pickup imagery, output needs, and smaller data footprints. Client mappings and views should let each client expose the fields that matter without bloating the universal Product surface.

Products may show related merchandise, readiness, and work-unit state through relationships and derived summaries. They must not duplicate raw physical merchandise facts such as storage location, condition, shipment photos, received quantity, damage notes, or outbound tracking directly onto Products.

## 2026-08-05 - Marks Photo Is Product-Led, Merch-Verified

Marks Photo's target operating model is product-led and merchandise-verified.

Expected Product records maintained from client product-data sources are the normal operating spine. They describe what work is expected, what Match Keys, Client References, Naming / Path Tokens, and reporting facts belong to the item, and what production outcomes may be needed. Received Merch verifies whether usable physical samples have arrived against those expected products.

Unmatched merchandise is an exception path, not the default organizing center. It should be resolved by matching to Expected Product when possible or by collecting minimum manual facts when no product data exists.

Workflow/work units such as Ecomm, Packaging, and THR3D are created from product/work need once enough product and merchandise facts exist. Ecomm and Packaging can become production work units; THR3D remains an outbound Shipments movement. Creative Force handoff should align to these work units rather than to raw received merchandise.

Physical facts such as check-in quantity, storage location, condition, shipment photos, and arrival notes belong to Received Merch/Shipments. Product records should show those facts through relationships and readiness summaries, not store duplicated physical truth.

## 2026-08-05 - Products Page Is An Editable Reference Grid

Products remain Expected Product records, not containers for raw physical check-in facts or production execution state. The Products page may behave like a spreadsheet for imported/reference facts and as the primary expected-work view: sortable columns, per-column filtering, Excel export, and inline editing for Product text fields. Linked context such as Client and Job should be displayed for scanning but remain linked-record context rather than free-text editable cells.

Product grid display preferences such as hidden columns, column order, and adjusted column widths are user-interface preferences and should be stored per browser user rather than added to Airtable. PMs can reorder Products grid columns by dragging visible headers or by dragging rows inside the Columns popover. Deleting a Product from the grid is a destructive reference-data action and must require a warning/confirmation.

## 2026-08-05 - Activation Creation Method Removed

Activation creation source is not operational project data. The Airtable `Activations` field `Creation Method` was removed from active schema expectations and app code. Activations keep only the facts needed to define and move photo work: client, type, status, project/package details, due/urgency, Walnut scope, paths, SKU details, deliverables, linked Merchandise, and notes.

## 2026-08-05 - Client Required Field Label Is Required To Shoot

Client-level photo blocker configuration should use the same PM-facing language as Planning. The Airtable `Clients` field is `Required to Shoot`, and active app code uses `requiredToShoot` for this client configuration.

## 2026-08-05 - Activation Type Removed

Activation type is redundant with Activation `Deliverables`. Active app code no longer reads, validates, or writes `Activations.Activation Type`; Ecomm and Packaging intent should be represented by the Activation `Deliverables` field.

## 2026-08-05 - Deliverable Labels Are Literal

Canonical `Deliverables` values are `Packaging`, `Ecomm`, and `Thr3d`.

The old labels `Packaging Photo` and `Ecomm Photo` are too wordy and blur the distinction between deliverable intent and the actual photo-production work. They are now compatibility aliases only. Backend input normalization accepts the old labels but writes `Packaging` and `Ecomm`; frontend selectors render only the canonical labels; live Airtable Merchandise records were normalized on 2026-08-05 so saved rows no longer use the old photo-suffixed labels.

Airtable's public metadata update endpoint returned 422 when asked to prune the old dropdown choices from `Deliverables`, so old unused choices may remain visible in Airtable configuration until removed manually. App code must not write them.

## 2026-08-05 - Received Merch Splits Into Workstream Cards

Received Merch is the physical lot captured from a Shipment. It remains the operational evidence of what arrived, including quantity, photos, storage, observed identifiers, notes, and physical status.

Expected Product remains the curated product-data record for expected work. The Product workspace should own imported, pasted, edited, validated, and committed Expected Product records plus supporting reporting/reference facts. Manual product information captured during unmatched-merch intake may live on Received Merch for readiness and handoff, but it must not create or update Product records unless a later approved reconciliation/import process promotes it.

New Merch is a focused Planning intake list for unsplit Received Merch. Its purpose is identity confirmation and production-intent assignment, not long-running production management.

After `Confirm & Assign`, the original Received Merch leaves New Merch and creates child work:

- one Ecomm workstream card when Ecomm is selected
- one Packaging workstream card when Packaging is selected
- one THR3D shipping item when THR3D is selected

Ecomm and THR3D are mutually exclusive GS1 paths. Packaging can pair with either Ecomm or THR3D. Packaging and Ecomm must be separate workstream cards because they have different dependencies, readiness checks, and downstream production handling.

THR3D is not a production workstream card in this model. It is a shipping item that needs quantity-to-ship and outbound shipment tracking. Shipments owns the physical outbound movement.

Workstream cards link back to the parent Received Merch and to Expected Product when a match exists. They may carry workstream-specific readiness/dependency state, but they must not recreate the old workflow-engine tables or Product-level workstream routing. The word `Workstream` in this decision means a scoped child work item for Ecomm or Packaging only, not the legacy Workstreams/Work Orders architecture removed on 2026-07-22.

Planning must make child workstream cards visibly distinct from the parent Received Merch. Ecomm and Packaging cards should show their workstream type, assigned quantity, and workstream status while continuing to use the parent Received Merch for photos and physical context.

Planning movement for Ecomm and Packaging child cards belongs to the child record. Moving a workstream card updates `Workstream Cards.Status` instead of parent Merchandise `Intake Status`. Active child statuses are intentionally small: `New`, `Planning`, `Waiting`, `Ready for Photo`, and `In Production`. Airtable metadata updates may not be able to pre-prune or pre-add select choices through the public metadata endpoint; app writes use `typecast` so valid statuses can still be saved.

The first implementation slice creates only the minimum schema and API needed to make this real:

- Merchandise `New Merch Status`: `Needs Review`, `Workflows Created`
- Merchandise `Manual Product Info`
- `Workstream Cards` table for Ecomm and Packaging child work
- `THR3D Shipping Items` table for outbound THR3D movement
- `POST /api/merchandise/:id/confirm-assign`

`Confirm & Assign` creates child records and then marks the parent Received Merch `Workflows Created`. It rejects Ecomm + THR3D together because those are alternate GS1 paths. Manual product info may be copied to the parent and child records for handoff context, but the endpoint must not create or update Product records.

The first UI wiring keeps the existing New Merch modal shell and changes only the commit behavior. The footer action is `Confirm & Assign`, it previews created child records, calls the backend assignment endpoint, and removes parent Merchandise from the active New Merch board once `Workflows Created` is saved. Packaging + THR3D quantity allocation is explicit: PMs enter the THR3D quantity and Packaging automatically receives the remaining quantity. The backend rejects Packaging + THR3D assignments whose quantities do not add up to the parent Received Merch quantity.

Shipments `THR3D / Outgoing` should read from `THR3D Shipping Items`, not from legacy Merchandise rows filtered by `Deliverables = Thr3d`. A THR3D shipping item is the actionable outbound unit; it carries `Quantity to Ship` and `Shipping Status`, while the linked Received Merch supplies photos, client, location, identifiers, and original shipment context.

Shipping a THR3D item creates an outbound Shipment row for carrier/tracking context, links that row to the THR3D shipping item, and marks the shipping item `Shipped`. Shipped THR3D items are hidden from the active outgoing queue. The parent Received Merch is marked `Shipped` only when the shipped quantity covers the full parent quantity; partial shipments preserve the parent physical status.

## 2026-08-05 - Merch Status Is Physical State Only

Merchandise `Merch Status` describes the physical state of the sample only.

Canonical values:

- `Received`
- `Issue`
- `Ready to Ship`
- `Shipped`
- `Disposed`

`Matched` and `Validated` are no longer valid product-facing meanings for `Merch Status`. Product information may be linked/imported behind the scenes, but that is not a physical state. Planning readiness may move a card toward photo work or THR3D, but it should not write `Matched` or `Validated` into `Merch Status`.

For THR3D-only Merchandise in the current implementation, completing the Planning decision marks the physical sample `Ready to Ship` so Shipments can box and send it. In the clarified split model, THR3D should be represented by a shipping item linked to Received Merch; once the shipped quantity leaves the studio, Shipments should mark the relevant physical movement `Shipped`; disposed samples should be marked `Disposed`.

Live Airtable data was normalized on 2026-08-05 so all existing Merchandise records use `Received`; new choices `Ready to Ship`, `Shipped`, and `Disposed` were added through Airtable typecast. Airtable's public field-update endpoint did not allow pruning old unused select choices, so `Matched` and `Validated` may remain visible in the Airtable field configuration until removed manually, but app code must not write them.

## 2026-08-04 - Shipment Deletion Is Empty-Only

Shipments may be deleted from the All Shipments browser only when no merchandise entries are attached. A Shipment that has logged Merchandise must keep its receipt context until those entries are explicitly removed or moved through an approved merchandise-removal flow. This prevents deleting the physical receipt record while leaving received Merchandise orphaned.

## 2026-08-03 - Topco Readiness Is Activation-Driven

Topco Planning should not start from matching newly received Merchandise to previously imported Product records.

Topco starts from received Merchandise plus a Topco Activation. The PM-facing link target is an Activation row linked to received Merchandise, primarily by UPC. Product reference records may still be created or updated in the background when useful for history/reporting, but Product matching should not be the main PM blocker for Topco.

Topco Ready for Photo requires:

- Merchandise received
- Activation confirmed
- Activation row linked
- Deliverables confirmed

Topco Ecomm activation data currently requires UPC, CVID, Description, Walnut Scope, and Upload Location. Artwork Path is optional activation context because it is not an Ecomm requirement; Structure is also optional item-level context. Neither blocks Move to Photo.

Topco Packaging activation data currently requires UPC, WKFT Job Number, Brand Prefix, and File Name Description.

Quantity received, storage location, individual file names, and post-photo tracking statuses are not Topco activation requirements. Quantity and physical handling remain Shipments facts. Creative Force owns detailed production file naming unless Marks Photo explicitly needs a token such as CVID or a folder reference to perform the handoff.

The current implementation exposes this as a Topco client readiness profile in Clients/Admin and `/api/clients`, and stores activation package data in the existing `Activations` table. Activation is the client/project readiness package created in Marks, not an inbound email. Email or notification content may be generated from Activation data later, but it is an output channel and not the source of truth.

Admin > Clients is configuration only for Topco activation readiness: required fields, facts not required from activation, and client-specific path prefixes. It must not become an activation history or creation workspace. Planning exposes the PM-facing `Add Activation` action because PMs should not need Airtable or Admin access to create readiness packages. UPC matching confirmation, notification automation, and automatic movement to Ready for Photo remain future implementation work.

Activation is the readiness package PMs complete before photo work can be accepted. PMs may save an Activation draft without moving linked cards, or use `Move to Photo` once the Activation header and item rows are complete. `Move to Photo` makes the Activation the source of readiness for linked eligible Merchandise and moves those cards to the shared `Ready for Photo` handoff. The UI and Airtable schema should use `Linked Merchandise` language for Activation-to-Merchandise relationships.

If Merchandise was moved to Ready for Photo through an Activation and is later removed from that Activation, the Activation relationship no longer supports readiness. Saving the Activation must move that Merchandise out of Ready for Photo and back to the active Planning/needs-activation area.

The Planning `Edit Activations` utility should list only pending-photo Activation packages. Released, Complete, and Cancelled packages are hidden until the product has an explicit add-on-shot model for changing production work that has already been shot or released. Individual Topco cards may start a new Activation or be added to an existing pending Activation from the card modal, but that action only opens the Activation editor; moving cards to `Ready for Photo` still requires the Activation package to be completed and committed.

Activation is not an individual workstream-card step. A card becomes eligible for photo release when its match, deliverables, and configured Product/photo data are complete. Eligible cards are grouped and released together from a Planning-level photo-group action; the existing Activation record/API is retained as the current persistence and release mechanism while the user-facing name is evaluated. Individual cards must not expose an activation editor, an activation blocker, or a direct Move to Photo action.

## 2026-07-22 - Planning Uses Draft -> Commit Modals

Planning board cards represent committed business state. Planning modals represent draft work.

The canonical interaction contract is:

- Board = committed state.
- Modal = draft workspace.
- Footer = single commit area.
- The footer action is the only commit action for routing changes; current visible language is `Confirm Merch` for newly received merchandise.
- No optimistic routing, board refresh, card movement, badge movement, or background animation while the modal is open.
- Background board interaction is frozen while the modal is active.
- Cancel, Esc, close, and backdrop close discard uncommitted draft changes.
- Cards move or animate only after the finish save succeeds and the board reloads.

For the Merchandise Verification modal, selecting `Thr3d`, `Packaging`, or `Ecomm` updates only local modal state and the footer outcome preview. The frontend must not call the Deliverables save endpoint or reload the Planning board from that selection. The stable footer commit action sends the selected `Deliverables`, destination `stage`, and blocking requirements together through `/api/merchandise/:id/intake-state`; after success, the board refreshes, the modal closes, and the card appears in its committed destination.

## 2026-07-22 - Merchandise Comments Are Lightweight Conversation Records

Merchandise comments are intentionally small human discussion records.

The active model is one `Comments` table linked to Merchandise and Users:

- `Comment`
- `Merchandise`
- `User`

Comments are created only by an authenticated Marks Photo user. The app persists the linked User record ID and renders the current user display name, role, avatar or initials, and timestamp from Users plus the Airtable record timestamp. It must not create anonymous comments or store duplicate author display text on the comment.

Planning cards may show comment count. Unread indication may use local browser last-viewed timestamps only. Do not add Airtable read-state fields for this pass.

Deferred scope for this model:

- Read By
- mentions
- replies
- reactions
- notifications
- deletion state
- system events
- activity types

## 2026-07-22 - Planning Board Contract Uses Queue Terminology

The active Planning board contract must use Merchandise/Planning terminology internally.

Old active frontend contract names were retired:

- `workOrder` -> `planningCard`
- `currentGate` / `gate` -> `currentQueue` / `queue`
- `validNextGates` / `blockedNextGates` -> `validNextQueues` / `blockedNextQueues`
- `workstream` / Product `Workstream` presentation -> `deliverableRoute` derived from Merchandise `Deliverables`
- `workflowForClient` / workflow registry naming -> `planningBoardForClient` / Planning board registry naming
- `workflow-*` Planning drawer CSS -> `planning-*`

The backend `/api/merchandise/:id/intake-state` endpoint may continue accepting `currentGate` as a request-body alias for older clients, but active frontend code must send `stage` with a Planning queue id. No Airtable schema, visible UX, route, status, or routing-rule change is implied by this rename.

## 2026-08-12 - Client Photo Requirements Are the Card Verification Source

The client `Photo Production Requirements` JSON is the single configuration source for Product-data checks shown on Received Merch and Workstream cards. The frontend must not use a separate hard-coded per-card checklist when a client profile is present; the Topco profile is only an initial fallback for clients whose configuration field is empty. Topco Ecomm does not require WKFT Job Number by default. A PM may add WKFT Job Number in Admin > Clients when a client-specific handoff requires it. Matched Product Name and UPC satisfy those identity checks and are not repeated as remaining work.

## 2026-07-22 - Legacy Workflow Architecture Is Removed

Marks Photo must not depend on the legacy Workstreams table, Work Orders, Workstream Assignments, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, or Merchandise Resolution.

Planning is Merchandise-driven. The active Planning contract is:

- Merchandise `Deliverables`
- Merchandise `Intake Status`
- Merchandise verification fields
- derived Required to Shoot blockers
- shared Ready for Photo handoff
- Merchandise-owned release fields

Products and Jobs remain supporting data. Product-level `Workstream` is obsolete and must not be written by import, product update, readiness, or Planning code.

Product-level operational state is obsolete. Products must not carry physical receipt, storage location, condition, photo, shipment, issue, export, or production-status fields in active code. Those facts belong to Merchandise, Shipments, Issues, History, external production systems, or downstream reporting integrations as appropriate.

This decision removed the old workflow-engine architecture. It does not prohibit the current scoped workstream-card concept for Ecomm and Packaging child work. THR3D must not be recreated as a Work Order, legacy Workstream, workflow template, workflow stage, or standalone workspace.

The 2026-07-22 cleanup cleared legacy workflow table records and obsolete field values in Airtable after backup. A later live metadata audit no longer listed the legacy workflow tables. Remaining obsolete Product fields are manual deletion targets and should not be treated as compatibility aliases.

## 2026-07-22 - Minimal Status Model

Marks Photo uses workspace-owned states instead of one overloaded global status.

Canonical persisted Intake Status values are:

- `Needs Review`
- `Waiting on Information`
- `Ready for Photo`
- `Complete`

Planning uses local PM queue placement for daily organization:

- `New`
- `Planning`
- `Waiting`
- `Ready for Photo`

The Planning queue is not a second Airtable workflow status. Production state should come from Creative Force or a minimal future sync field, not from Product status or hidden Planning gates. Physical movement/state belongs to Shipments, Merchandise storage/location data, and Merchandise status.

## 2026-07-22 - Intake Uses Deliverables Only

This decision described the pre-split intake model and is refined by the 2026-08-05 Received Merch split decision.

The current Intake/Planning workflow must not depend on a separate physical-routing field.

Current implementation routing is represented by:

- `Deliverables`
- `Intake Status`
- derived Required to Shoot blockers

In the clarified target model, Ecomm and Packaging become separate workstream cards after `Confirm & Assign`, and THR3D becomes a shipping item rather than a production deliverable card.

Do not add compatibility aliases, API payload fields, validation rules, schema utility creation, or UI controls for a separate physical-routing field unless a future approved schema decision introduces a new current field with a clear owner and lifecycle.

## 2026-07-22 - Shipments THR3D Outgoing Uses The Merchandise Read Model

This decision describes the current implementation and is refined by the 2026-08-05 Received Merch split decision.

Shipments `THR3D / Outgoing` is a real queue over Merchandise, not a placeholder and not a separate THR3D workflow.

The current implementation's canonical THR3D designation is Merchandise `Deliverables = Thr3d`.

THR3D-only Merchandise uses a minimal Planning path. It does not require Product linkage, Product verification, artwork, Required to Shoot photo fields, Packaging fields, Ecomm fields, or photo-production gates. Its required basics are the current intake facts already captured by the app:

- Client
- at least one merchandise photo
- Quantity
- `Deliverables` containing `Thr3d`

A THR3D-only Merchandise record appears in Shipments `THR3D / Outgoing` only when:

- `Deliverables` includes `Thr3d` and does not include `Packaging` or `Ecomm`
- `Intake Status` is `Ready for Photo`
- `Released` is false
- `Merch Status` still represents a physically present sample

Target model: Ecomm and THR3D are mutually exclusive GS1 paths, Packaging can pair with either, and THR3D appears in Shipments as a shipping item with quantity-to-ship and outbound tracking.

## 2026-07-21 - Shipments Replaces Receiving As User-Facing Workspace

The user-facing `Receiving` workspace is now `Shipments`.

Canonical route:

- `/shipments`

Compatibility routes:

- `/receiving` redirects to `/shipments`
- `/receipts` redirects to `/shipments`

New user-facing navigation, permissions, labels, and documentation should use `Shipments`, not `Receiving`.

Shipment-level photos belong to the Shipment, not individual Merchandise records. Store originals in R2. The current live Shipments schema does not have `Photo Metadata`, so shipment photo metadata is stored in a private backend-managed block inside Shipments `Notes` until a deliberate schema migration is approved.

## 2026-07-21 - Planning Replaces Intake As PM Workspace

The PM-owned board is now the `Planning` workspace.

Canonical route:

- `/planning`

Compatibility redirects:

- `/intake`
- `/work`
- `/merchandise-review-v2`

Planning owns planning states only:

- New
- Planning
- Waiting
- Ready for Photo

Cards must not automatically move because fields are completed. PMs explicitly choose where Planning work sits.

`Ready for Photo` is the shared handoff queue between Planning and Production. Under the split model it applies to Ecomm and Packaging workstream cards linked to Received Merch; it is not a duplicated physical Merchandise record or a separate Production Request.

## 2026-07-21 - Required To Shoot Is The Public Gate

`Required to Shoot` is the PM-facing production gate language.

Required to Shoot is calculated from underlying Merchandise, Product, Deliverables, artwork, and activation/campaign facts. It is not a generic manually maintained status.

Do not create a public Readiness field unless a later reporting/performance decision proves a cached value is necessary.

## 2026-08-10 - Hide Required To Shoot From Needs Review Modal For Now

The Needs Review Planning modal should not show a separate Required to Shoot rail or step for now. Its visible first-pass workflow is Product matching and Deliverables. Activation does not belong in this verification modal; it remains a Planning utility/workstream-readiness action after work intent is known. Conversation and Activity may remain available as a persistent right-side support panel, but they must not visually read as required continuation items. `Confirm & Assign` is blocked by the visible prerequisites only: matched Product and at least one Deliverable. Required to Shoot remains a broader production/readiness concept elsewhere and can return to this flow later when the activation/info UX is clearer.

## 2026-08-10 - Operational Times Display In Central Time

Airtable API timestamps remain stored as ISO/UTC values. Marks Photo owns display formatting and should render operational timestamps in the `America/Chicago` timezone so the app reads as Central time year-round, including daylight saving time.

## 2026-08-10 - Received Quantity Belongs To Merchandise

Received quantity is a physical Received Merch lot fact, not Product master data. Planning should show `Qty received` in allocation/split controls where it affects the work being created, not inside the matched Product identity card. Product records should not store shipment-specific quantities. Packaging + THR3D splits require more than one received unit; otherwise the modal must block `Confirm & Assign` and direct the PM to update Qty received in Shipments or choose one deliverable.

## 2026-08-10 - Selected Product Match Warnings Require Exact Agreement

Planning and Shipments may use partial name and UPC/ID matching to find candidate Products, but once a Product is selected the match card should compare captured merchandise values exactly against the linked Product. Any non-empty captured package name or UPC/ID that does not exactly match the Product value should show an advisory warning and a deliberate correction action such as `Use Product Name` or `Use Product UPC`. Candidate search can be forgiving; selected-product verification should be explicit.

When the captured package name and UPC/ID both agree with the linked Product, the matching UI should collapse the duplicate observed-value inputs and let the `Matched Product` card serve as the compact identity display. The observed fields reappear when either value is blank or mismatched, or when the user clicks `Change`. This keeps clean matches dense while preserving the physical evidence model and avoiding silent overwrites.

Clicking `Change` on a matched Product should restart Product selection rather than immediately unlinking the current Product. The current match stays committed until the PM chooses a replacement or marks no clear match, while the modal hides the committed match card and shows matching candidates again. If the captured package name and UPC/ID still exactly match the current Product, that Product should appear as an exact suggestion so the UI does not imply the match disappeared.

## 2026-08-10 - Planning Board Labels Reflect PM Decisions

The Planning board keeps the canonical internal queue values `New`, `Planning`, `Waiting`, and `Ready for Photo`, but the user-facing column labels should describe the PM decision being made: `New Merch`, `Needs Product / Work`, `Awaiting Info/Activation`, and `Ready for Photo`. `New Merch` is the brand-new received-merch inbox. Its cards should open review without a visible `Review Merch` badge. `Needs Product / Work` is reserved for reviewed merchandise whose Product identity or deliverable/workstream intent is unresolved. Ecomm and Packaging workstream cards with known Product/deliverable intent but missing dependencies belong in `Awaiting Info/Activation`, not the product/work exception lane. This supersedes the earlier first-column `Needs Review` display decision and remains a presentation and routing refinement, not a new Airtable status model. The 2026-08-17 stable-action decision supersedes the older dynamic footer-label guidance from this decision.

Cards in `New Merch` and `Needs Product / Work` should summarize the builder checklist, not later activation state: Product matched/missing and Deliverables defined/missing. Activation belongs in the later info/activation readiness layer after the Product and work intent are known.

Client-specific readiness requirements should be defined by deliverable and client, likely as structured configuration on the Client record or a later dedicated configuration surface if the data becomes too large. Packaging and Ecomm can require different Product fields, Activation fields, artwork fields, or path/reference fields. The Product workspace and Planning cards should eventually read from the same configuration so the checklist is reciprocal: Products show what received/work data is missing, and workstream cards show what Product/client data is missing. Do not add ad hoc hardcoded Topco-only requirement checks to cards without approving that configuration shape.

## 2026-07-20 - R2 Is The Image Storage Layer

Cloudflare R2 is the source of truth for Marks Photo images.

Airtable must not store image files, image attachments, base64 image data, duplicate image copies, permanent public URLs, or signed URLs for merchandise, shipment, product, review, production, or delivery images.

Airtable may store lightweight image references and structured metadata only.
Product import UPC is optional for now. The import mapping does not show UPC as required, rows without UPC are allowed through validation, and provided values are still stored. UPC length and format rules remain deferred.

The retired `Product or File Name` destination remains accepted only as a compatibility alias to the live `Product Name` field. Imports must not write the deleted Airtable field name.

Client spreadsheet status values remain in the imported Reference Data JSON rather than creating new Airtable single-select options. This prevents imports from requiring Airtable field-option permissions or changing controlled app status vocabularies.

Product Type is now intentionally controlled at the Product level with five shared options: Shelf Stable, Fresh/Perishable, Refrigeration Req, Freezer Req, and Non-Food. The original imported value remains in Reference Data as well.

The Products workspace mirrors active Product fields as its baseline grid. Client-specific mapping and validation configuration remains on Clients, while row-specific fields that are not promoted to Product fields remain in Reference Data.

Product Job Number and Brand are retired from the Products workspace. Existing compatibility fields may remain in Airtable/code until separately cleaned up, but they are not part of the active Product grid.

## 2026-08-11 - Client-Owned Photo Production Handoff Requirements

Photo production requirements belong to Client configuration, not a universal Product table. The first implementation uses one app-owned multiline JSON field on `Clients`, `Photo Production Requirements`, with separate Packaging and Ecomm blocks. This keeps client variation explicit without a configuration table or many Product columns.

For Topco, Packaging requires Product Name, UPC/Product ID, WKFT Job Number, Brand Prefix, and File Name Description. Its handoff pattern is `{jobNumber}_{brandPrefix}_{fileNameDescription}`. Ecomm requires Product Name, UPC/Product ID, and CVID unless client configuration adds more fields. Its pattern is `{cvid}_{view}` with the standard view set in configuration. `Brand Prefix` is distinct from Brand because it is the packaging filename value.

Creative Force owns final naming convention and execution. Marks Photo verifies that a matched Product has the configured values and that filename tokens/views resolve before handoff. Raw shipment quantity and physical statuses remain on Received Merch/Shipments, and Activation remains separate. The Clients grid calls the identity value `UPC` or `Product ID`; `Primary Match Key` and Airtable `Identifier` remain internal compatibility terminology only.

## 2026-08-12 - Creative Force Reports Work Unit Status

Creative Force status is associated with the Ecomm or Packaging Workstream Card, not with Product or Received Merch. Creative Force Work Unit webhooks provide the stable `WorkUnitId`, Product identifiers, production type, and status. Marks Photo should match callbacks by `WorkUnitId`, retain the raw Creative Force status, and expose a small normalized status summary without overwriting Planning status or physical Merchandise status.

For the first live integration test, the raw Creative Force status is written directly to the app-owned Workstream Cards field `Creative Force Status`. It is intentionally separate from `Planning Status`; Creative Force does not move the Planning card or translate its status. The existing JSON sync field retains the event payload details for reconciliation.

The first backend slice accepts `POST /api/integrations/creative-force/webhook`, verifies the `X-CF-Signature` HMAC-SHA256 header, handles duplicate payload IDs, and stores a compact sync object in the app-owned Workstream Card field `Creative Force Sync`. The webhook is public only in the HTTP-auth sense; signature validation is mandatory. A first event establishes the link from the unique Creative Force Product Feed row and its `Source Key` when possible; later events use the stored Work Unit ID. Product Code/workstream matching remains a fallback. Ambiguous or unmatched events are not written to a card.

The Admin Creative Force view exposes the latest signed webhook payload and handling result for troubleshooting. This is an in-memory diagnostic snapshot only; durable webhook history would require a separate persistence decision.

Creative Force progress is represented with two raw values: `Creative Force Status` for the Work Unit status and `Creative Force Step` for the reported production step. The step status is retained in `Creative Force Sync` until a separate UI or Airtable field is justified. Marks Photo does not translate either value into Planning Status.

Ready for Photo release packages show item-level Artwork Path, Upload Location, and Structure inputs for both photo deliverables because path values can differ by SKU. Item-level activation values remain client-configured: linked Product data prefills the required Ecomm or Packaging fields, while the release retains explicit overrides in its SKU details JSON. Legacy top-level path values remain read-compatible and are copied into item rows when a saved release is reopened.

The release workflow is commit-oriented for now: PMs complete the package and choose `Ready for Photo`. The UI does not expose saved drafts or a Save Draft action. Existing Draft activation records are retained only as backend compatibility data until a cleanup decision is made.

The Clients configuration remains the source of truth for the Creative Force Product Code and Category mappings. PMs do not select those mappings during work. Outbound handoff creation, Airtable field provisioning, and API-based reconciliation are separate follow-up slices.

## 2026-08-12 - Creative Force Handoff Is Configuration-Driven

Before an external Creative Force record is created, Marks Photo must resolve a Workstream Card through the Client's configured Product Code field, Category source, required Product data, and workstream type. The backend now exposes that result as a Creative Force handoff payload and refuses admin linking when the configured handoff is incomplete. The link operation stores the external Work Unit ID on the Workstream Card so later webhook events have an unambiguous target.

This does not make PMs configure or manually map ordinary work. Client configuration remains admin-owned. The current admin-only link endpoint is a temporary integration bridge while the Creative Force API connection is being provisioned; it must be replaced or supplemented by outbound API creation once the Creative Force OAuth app, workspace/client IDs, datasource ID, and Product Code mapping are available.

Open decisions: whether File Name Description should ever become a first-class Product/Client Reference value rather than remain in Product Reference Data; and whether other clients need configurable per-view naming requirements.

The requirements editor should remain a handoff-readiness configuration surface, not a second naming system. PMs select required source values and views; Creative Force remains responsible for executing final file names.

The Clients admin table is intentionally a configuration index, not a general readiness dashboard. It shows Product ID convention, saved Product import mappings, and client-specific photo handoff requirements. Activation readiness and physical merchandise policy belong in their respective workflows rather than repeating in this table.

Artwork belongs inside the client Photo Production requirement block. When selected, a valid artwork reference is a workstream blocker alongside Product data and filename inputs. The old standalone Artwork column is not shown in the Clients table; this keeps the requirement tied to the Packaging or Ecomm handoff that actually needs it.

Filename configuration should be a lightweight recipe builder, not a raw template editor. PMs add Product fields in order, choose a separator, and preview the resulting template. Creative Force remains the execution system; Marks Photo verifies the recipe inputs and the separate Product Code mapping.

Creative Force handoff configuration is client/workstream-specific. PMs choose the Product field that supplies Creative Force `Product Code`; the initial Category mapping is the Client Name. This keeps the external-system mapping explicit without adding Creative Force-specific columns to Products.

Category remains an explicit mapping rather than an implicit hardcoded value. Client Name is the default, with Product fields or a custom fixed category available when a client requires a different Creative Force classification.

View selection is a deliverable-set configuration, not an individual PM verification workflow. Topco defaults to the complete standard Ecomm view set; other clients may later choose a narrower set in the same Client configuration.

Client configuration defines the rules, but validation belongs at the decision surface. Once deliverables are selected, Received Merch shows the relevant Packaging/Ecomm Product and Creative Force checks; child Workstream Cards show the corresponding single-workstream checks. This avoids making PMs leave the merch decision flow to inspect client settings.

## 2026-08-12 - New Merch Shows Configured Product Fields Even With Incomplete Derived Payloads

The New Merch review modal must not become blank merely because a merchandise response is missing its derived photo-production status. For configured Topco photo deliverables, the client requirement defaults are used as a presentation fallback so PMs can edit the linked Expected Product immediately. This fallback does not create work, change routing, or broaden the Product schema; the normal Products API remains the persistence path. Other clients continue to rely on their saved client requirements rather than receiving hardcoded Topco fields.
## 2026-08-11 - Photo Requirements Are Editable At The Planning Card

Once Packaging or Ecomm is selected, the merch card and its child workstream card expose the client-configured Product and Creative Force input fields in the card detail surface. PMs can correct those linked Expected Product values there and save them without leaving Planning. The editor is requirement-driven, so it does not turn the card into a universal Product form. Filename-description values remain import/reference data rather than new Product columns.

## 2026-08-12 - Workstream Card Editors Use The Card Route

An Ecomm or Packaging workstream card is sufficient context to show its configured Product-data editor. The UI must use the card's explicit workstream type when a derived photo-production summary is absent or empty, rather than hiding the editor. This keeps child-card editing consistent with Received Merch editing without adding duplicated Product fields or treating the workstream card as a new Product record.
Existing workstream cards must open their own Planning detail surface. The New Merch review modal is reserved for Received Merch intake and is the only surface that may show Previous/Next Merchandise navigation or a Create Workstream action. A child workstream card may edit and save Product data, but it must not offer to create itself again.
The existing Ecomm/Packaging card opens a dedicated compact workstream detail surface rather than the generic merchandise Waiting workspace. Its footer may move the existing card to Ready for Photo, but it must not expose merchandise navigation or a create action.

## 2026-08-12 - Matched Identity Satisfies Photo Identity Requirements

When Received Merch is linked to an Expected Product, an exact match between the observed package name and linked Product name satisfies the Product Name requirement. The same applies independently to UPC / Product ID. Those values remain visible in the matched-product summary but are not repeated in the editable photo-data checklist. If the observed value is missing or differs, the requirement remains visible so the PM can resolve it.
## 2026-08-11 - Show Photo Requirements Before Deliverable Commit

The New Merch review surface shows Packaging and Ecomm product-data checklists under Deliverables even when no deliverable has been committed or merchandise has not yet been reviewed. This lets the PM see the downstream requirements while deciding the path. Editing is limited to the photo deliverables selected in the current draft; the checklist itself does not create work or change routing.
## 2026-08-12 - No Clear Match Unpairs Merchandise

`No clear match` is a deliberate decision that the current Product link is not trustworthy. It clears the Received Merch to Expected Product link, sets the item to `Waiting on Information`, and leaves the PM able to search and select a different Product later. It must not leave the card visually marked as matched.

## 2026-08-12 - Planning Card Checks Follow The Two-Step PM Flow

Planning card indicators should reflect the PM's current decision, not expose every downstream status at once. New Merch and Needs Product / Work represent step one: match the merchandise to an Expected Product and define deliverables. Awaiting Info/Activation represents step two: supply the required Product data for the selected deliverables and complete Activation. Those cards show only `Photo Data` and `Activation` checks; Ready for Photo is the resulting destination. The upper-right media indicator is reserved for merchandise age, with `New` shown for newly received items.

## 2026-08-12 - Planning Supports Deliverable Filtering And List View

Planning should keep one board and one queue model while offering better ways to scan it. A deliverable filter narrows the existing cards to Ecomm, Packaging, or Thr3d. Ecomm and Packaging use distinct badge colors and icons as a visual separator. The optional List view groups the same filtered cards under the canonical Planning columns and opens the same card detail surface; it does not create another workflow or status model.

The List view should behave like a compact operations table: restrained queue headers, fixed columns for item identity, deliverable, and age, and the same row-to-detail interaction as Kanban. It should not use large decorative panels or add list-specific state.

Product Data edits from Planning are Product workspace edits. The Planning editor must keep its save action visible while the field area scrolls and use the explicit Products API route; client-specific File Name Description remains in Product Reference Data rather than becoming a new Airtable column.

## 2026-08-12 - Workstream Change And Removal Behavior

Received Merch is the parent physical item and Ecomm/Packaging are child photo cards. Selecting deliverables on the parent creates one child per selected photo deliverable. A single existing child may change between Ecomm and Packaging in place; when both children exist, switching is disabled so one cannot become a duplicate of the other. Removing a child never deletes the parent merchandise or its matched Product. If another photo child remains, it continues in its current queue. If the removed child was the last photo child, the parent returns to the Waiting for Deliverable/Product Info queue with its deliverable assignment cleared. Cards already handed to Creative Force or marked In Production cannot be removed. The modal footer must state these consequences before the PM commits the action.
The Products API must expose read, update, and delete operations under `/products/:id`; compatibility aliases may remain, but the product-led UI should use the explicit Products route.

Photo-data and Activation checks belong on every card in Awaiting Info/Activation, including child workstream cards, because both are part of the second PM step. The New Merch queue is the only place that uses the `+1` media count marker; later queues use the age label without that extra image-count signal.

## 2026-08-12 - Product Production Summary Is Derived

Products should provide a quick operational read without becoming the owner of physical or production execution state. The API now derives `productionSummary` from linked Merchandise, Workstream Cards, THR3D Shipping Items, and Creative Force sync data. It can report `No Merchandise`, `Needs Review`, `Work Not Defined`, `Waiting on Information`, `Ready for Photo`, `In Production`, `Complete`, or `Issue`.

The underlying fields remain owned by their source records: Merchandise owns `Merch Status` and `Intake Status`, Workstream Cards own photo-work status, THR3D Shipping Items own outbound status, and Creative Force owns external Work Unit status. The derived Product summary is read-only and must not be persisted as a competing Product workflow field. The obsolete live Products `Merch Status` field is not an active compatibility surface.

## 2026-08-12 - Workstream Card Actions Stay Actionable

An existing workstream card must not offer `In Creative Force` as a dead-end button. Product data is updated through the existing details save action. Add activation opens the shared Activation editor with the current Received Merch item pre-linked. The 2026-08-17 stable-action decision supersedes earlier footer labels that named workstream changes or movement directly.
When one photo child exists, changing its deliverable updates that child in place and the commit action names the destination workstream. When both Ecomm and Packaging children exist, neither child may be added or changed into a duplicate; the card explains that the other workstream is already tied to the merchandise and removal is the only structural action.

Creative Force Airtable ingestion uses a separate flat app-owned Product Feed because the Airtable Connector cannot reliably derive readiness from linked Merchandise or Workstream Card fields. The physical table contains fixed scalar handoff fields plus the union of scalar Product fields required by client Photo Production Requirements. A field required by one client becomes a shared column; rows for other clients leave it blank. It does not contain eligibility, Production Summary, status, or blocker fields. The schema utility adds supported required-field columns as client configuration evolves.

The feed projection is one row per Ecomm or Packaging Workstream Card in `Ready for Photo`, not one row per Product. This preserves separate Creative Force production types when one Product needs both Packaging and Ecomm work. `Source Key` is the Workstream Card ID. Client Photo Production Requirements are the single gate for entering Ready for Photo; the feed writer does not apply a second hard-coded Creative Force validation gate after that status is committed. The feed contains only Airtable handoff fields and never serves as a blocker/status/reporting table.

Creative Force handoff must be visible before it is provisioned. Admin includes a read-only Creative Force section that previews ready handoff rows and reports feed-table provisioning state. When an Ecomm or Packaging Workstream Card enters `Ready for Photo`, the backend upserts that row into the Creative Force Product Feed automatically; there is no manual sync action. Blockers remain in Products and Planning; the Airtable feed remains a single-purpose integration surface, not a PM workflow or reporting table. The physical table was provisioned on 2026-08-12 as `tblxEmSy1xZLHtEWW`.

The Planning-level photo-group release must reconcile every linked Ecomm or Packaging card that is `Ready for Photo`, including cards that were already in that status before the request. This keeps Edit Photo Group -> Move to Photo idempotent and ensures a re-save or group release cannot skip the automatic Creative Force feed projection merely because no child status update was needed.
### Workstream add versus switch

The workstream-card modal uses the selected deliverables to make the intended operation explicit: retaining the current type while selecting the other adds a sibling; deselecting the current type and selecting the other switches the existing card in place. Once both Ecomm and Packaging cards exist for the same Received Merch, neither can be added or changed from its card; removal is the only workstream-structure action. This keeps the UI aligned with the two-card operating model and avoids silently replacing an existing deliverable.

Removing a workstream deletes only the child Workstream Card. The parent Received Merch remains the source record: it keeps its remaining deliverables when another child exists, and returns to merchandise review when the removed card was the last photo workstream.
The removal confirmation is the commit point for the modal. Once the delete succeeds, close the card immediately and refresh the board afterward; refresh failure must not make a successful deletion appear unsuccessful.

Activation is a separate fourth step from Product data. Creative Force handoff configuration and activation must not inflate the Step 3 Product-data missing count; each has its own action surface. Structure is optional activation context and is not part of the Move to Photo completion gate. Client Photo Production Requirements are the single gate for entering Ready for Photo. Once a card is in Ready for Photo, the backend writes or updates its Creative Force Product Feed row without applying a second hard-coded Creative Force validation gate.

### Activation drafts are one-time request packages

An Activation groups specific Received Merch items for one request package. It is not a reusable template. `Save Draft` creates the package once, reopening or continuing it updates the same Airtable Activation record, and each merchandise item may appear only once in that package. `Move to Photo` is the final validation and transition for the complete group; incomplete drafts remain drafts and do not move their items.
### Move to Photo does not require due or urgency

Activation Due / Urgency is optional metadata. It is not part of the completion gate for moving a complete activation package to Ready for Photo. The transition validates the request package and item rows, updates linked Merchandise, and releases the Activation without performing unrelated display enrichment in the same request.

## 2026-08-12 - Artwork Uses Client Requirement Configuration

Artwork is governed by the client Photo Production Requirements configuration as a simple required/not-required decision. The Planning card does not expose a producer-facing Request Artwork action and does not write artwork-request metadata to Workstream Card Notes. When artwork is required, the linked Product must have a nonblank `Path to Art` value; when it is not required, the work can proceed without one. PMs can still enter or update the Product artwork path through the existing Product data editor.

## 2026-08-12 - Activation Is Not An Individual Card Gate

The earlier card-level activation gate is superseded. A workstream card is eligible for `Ready for Photo` when its match, deliverables, and configured Product/photo data are complete. A separate Planning-level photo release may collect one or more eligible items, shared release details, and the optional email request before committing them together.

## 2026-08-13 - Photo Release Is a Group Operation

Grouped photo release updates the parent Merchandise record and each linked Ecomm/Packaging Workstream Card together. THR3D is not a photo workstream and is excluded from that card-status update.

Activation is not a property of an individual workstream card. A card is individually complete when its match, deliverables, and configured Product/photo data are complete. It then exposes one `Ready for Photo` action. That action opens the Planning-level photo release utility with the current item selected; the PM can release it alone or add other eligible ready items, provide shared release details, and commit the group into Ready for Photo. The existing Airtable Activation record and API remain the persistence mechanism for this grouped release for now, but the user-facing workflow is a photo release, not an activation step. Do not add an activation blocker, editor, or direct Move to Photo action to individual cards.

The photo-release utility has one simple commit path: `Ready for Photo`. The current eligible item is selected automatically; additional eligible items can be added to the same group. Shared release details and the generated email preview remain available in that utility. `Save Draft` preserves an unfinished group without moving any item. The final `Ready for Photo` action updates all selected items together and triggers the existing Creative Force feed projection.

## 2026-08-13 - Planning Uses One Normalized Status

Planning queue placement is represented to the UI/API by one normalized `planningStatus` value: `new`, `needs-product-work`, `awaiting-info`, or `ready-for-photo`. Each planning record stores that value in one Airtable `Planning Status` field; the backend mirrors older intake/status fields only for compatibility and falls back to them for records not yet migrated. The board must not use browser-local queue overrides or make PM-visible placement depend on hidden client state. The four columns therefore have clear meanings: New Merch, Needs Product / Work, Awaiting Info, and Ready for Photo. The final Ready for Photo group commit is the only path that releases eligible work and populates the Creative Force Product Feed. The schema utility `backend/ensure_planning_status_fields.py` creates the field on Merchandise and Workstream Cards.

Unreviewed shipment merchandise is identified by `Planning Status = New` and remains `planningStatus = new` even if intake has already captured an item ID or deliverable value. Raw intake values must not bypass PM review. `Awaiting Info`, `Ready for Photo`, and `Workflows Created` are explicit later states and take precedence over the New Merch default. Older `Intake Status` labels are accepted only as inbound API compatibility aliases and are translated to the canonical planning values before writes.

## 2026-08-13 - Retire Merchandise Intake Status

`Merchandise.Intake Status` is retired. `Merchandise.Planning Status` is the sole persisted queue field and is the source for board placement, with `intakeStatus`/`intake_status` retained only as response aliases for older clients. The migration utility backfilled active records and removes the legacy field when the Airtable schema API supports it. The live metadata DELETE request returned `404 NOT_FOUND`, so the field remains a manual Airtable schema cleanup item rather than an active application dependency.

## 2026-08-13 - Ready for Photo Is The Creative Force Feed Gate

Client Photo Production Requirements are the single validation source for whether an Ecomm or Packaging card may enter `Ready for Photo`. Once that status is committed, the backend must create or update the corresponding Creative Force Product Feed row. Feed projection must not apply a second hard-coded Creative Force validation gate or silently skip a committed Ready for Photo card. Missing feed values, if any, remain visible in the feed payload and are not a second Planning blocker.

## 2026-08-13 - Add Deliverable Preserves Existing Ready Cards

Adding the missing Ecomm or Packaging deliverable is an explicit `Add Deliverable` action on the shared merchandise/workstream card. It creates only the missing sibling workstream and leaves the current card in its existing queue, including `Ready for Photo`; it must never silently switch or reroute the current card. The action is unavailable once both photo workstreams exist. The new child starts in the waiting path and inherits the parent merchandise quantity, matched Product, and manual product information.

## 2026-08-13 - Card-Scoped Photo Release Preserves Siblings

Launching a Ready for Photo release from an Ecomm or Packaging card releases only that selected child workstream. The parent Received Merch record retains the union of its photo deliverables, and an unselected sibling remains in its current queue. The parent is promoted to Ready for Photo only when all of its photo workstreams have been released. A broader grouped release can still release multiple explicitly selected workstreams together.

## 2026-08-13 - Product Type Is Not A Creative Force Feed Field

`Product Type` remains a valid Product/import field and may be used by client photo requirements. It is not part of the Creative Force Product Feed projection because the live feed table does not contain that column. A stale client requirement must not cause a `Product Type` write or feed-schema expansion.

## 2026-08-13 - Product Schema Audit Uses Live Metadata

The non-destructive Airtable schema audit must distinguish live Products fields from historical compatibility names. A fresh live metadata read confirms that `Merch Status`, `Studio/Qty Rcvd`, and `Shot Date` are not dedicated Products columns; any remaining occurrences are embedded Reference Data values and are not deletion targets until a record-level migration is designed. Retired names such as `Workstream`, `Output Type`, shipment/receipt fields, export flags, and Product-level physical fields are not reported when absent from live Products metadata. Compatibility constants may remain in code until their remaining references are removed safely; this audit does not mutate Airtable.

The audit must exclude its own generated report from dependency scanning. Candidate Product fields are review targets only; no live Airtable field is deleted without confirming its record values, code references, and replacement/retention decision.
## 2026-08-13 - THR3D Outgoing Navigation Signal

Use the live unshipped THR3D shipping-item count as the notification signal. Display it as a yellow badge matching the existing navigation accent both beside `Shipments` in the top navigation and on the `THR3D / Outgoing` Shipments tab. Do not add a second status field or notification table; shipped items disappear from the existing outgoing endpoint and therefore from both badges.

## 2026-08-13 - THR3D Ship Commit and History

Shipping a THR3D item is the commit action: the existing outbound shipment record is created, the shipping item becomes Shipped, and it leaves the active outgoing queue. The active queue badge counts only unshipped items. Shipped items remain visible in a history table at the bottom of the THR3D / Outgoing view; no parallel history table or notification field is introduced.

The `Add Deliverable` action is acknowledged in place. The button shows a pending state during the create request and a success confirmation afterward, preventing duplicate clicks and keeping the card context available for review.

## 2026-08-13 - Keep Planning Vertical Scroll On The Page

The Planning page owns vertical scrolling. The Kanban board may scroll horizontally to reveal columns, but it must not become a competing vertical scroll surface; columns grow with their cards so lower items remain reachable from the page scrollbar.

## 2026-08-13 - Group Sibling Photo Cards Visually

The Planning Kanban presents photo workstream child cards instead of also rendering their parent Received Merch card. It groups Ecomm and Packaging cards only when they belong to the same Received Merch and are in the same queue. This is presentation-only: each Workstream Card remains its own record, retains its own deliverable badge and click target, and can be edited or moved independently. Different merchandise and siblings in different queues are not grouped.

## 2026-08-13 - Photo Release Fields Follow Client Requirements

The Ready for Photo release package is deliverable-aware. Its editable item fields, artwork/upload inputs, and email-preview columns are projected from the selected client's Photo Production Requirements rather than a universal hard-coded Ecomm form. Unconfigured fields are omitted, and inherited matched-product values are shown as subdued autofilled defaults. The release validation uses the same client configuration so the visible modal and final commit do not disagree about what is required.

## 2026-08-13 - Retire legacy Workstream Card Status

Planning queue placement and card updates use the single `Planning Status` field. The older Workstream Card `Status` field is removed from active application behavior to avoid conflicting sources of truth. The Airtable column is not deleted automatically; it can be removed after confirming no external views or automations depend on it.

## 2026-08-18 - Source Refresh Is Client-Configured And Timed

Source-linked Product freshness belongs to client source/readiness configuration, not individual Planning card-open behavior. A background worker may poll enabled client `sourceRefresh` configs and refresh only existing local Products that already have source snapshot metadata. The refresh must not create Products from unmatched source rows, write to Google Sheets, create Planning cards, route work, or create THR3D records. UPC remains required-to-proceed for downstream Topco naming/readiness but is not required to match or refresh a source-linked Product; the source row snapshot is the primary refresh anchor.

Source Request Type may provide the default/suggested Planning deliverable after refresh. That suggestion can appear on the Planning card and in the modal draft, but it is not a committed Merchandise Deliverables value until the PM confirms the card.

The `Newly Received Merch` card should not visually badge source-suggested Packaging, Ecomm, or Thr3d work. Column 1 is an acknowledgement/identity scan, so cards show title, UPC / ID, and matched/unmatched state only. Deliverable badges and missing-info summaries belong after the PM has declared/verified work in the later Planning sections. The `New` pill is limited to the Newly Received section; later sections already imply the merch has been validated or moved forward.

Planning Release grouping is a display option. `Group by shipment` applies to every column, including `Awaiting Photo Release` (superseding the 2026-08-18 position that it should stay ungrouped — see 2026-08-20 below). Group headers show the received timestamp on the right only, without a duplicate left-side timestamp.

## 2026-08-19 - Merchandise History Is A Server Record Of Who And When

Every phase a piece of merchandise passes through writes one History row: the event, the signed-in user, and a timestamp. Nothing richer. The events recorded today are `Merchandise received` (on creation, including each item of a batch receive), `Merchandise accepted` (the transition off `New`), and `Planning status changed` (every later queue move, carrying From and To).

The table carries only what something reads: `Event`, `Date`, `User`, `Merchandise`, `Product`, `Job`, `From`, `To`. `Type`, `Field`, and `Details` are removed. `Type` was written identical to `Event` by every caller and in all nine existing rows, and being a single-select it carried the same option-drift hazard that forced the Workstream Card status cleanup. `Field` was only ever the literal `"Status"`. `Details` restated `Event` in prose and was never displayed. `From` and `To` are kept because they are now rendered — a status change without them says nothing.

History lives in the `History` table, linked to Merchandise through `History.Merchandise`. It is read through `GET /api/merchandise/<id>/history`, resolved from the merchandise record's reverse link so no full-table scan is needed, and loaded only when the workspace modal is open. The former browser-local activity log is removed; it recorded only comment events, which History deliberately filters out.

Every item's history begins with `Merchandise received`. Items recorded before merchandise events existed have no such row, so the read endpoint derives it from the shipment's received date (falling back to the record's creation time) whenever no recorded arrival event is present. It is derived rather than backfilled because the arrival moment is already known from the shipment, while who received it is not — writing an invented actor into the audit trail would be worse than showing none.

Recording a history event never blocks the user action that caused it. A failure to write the audit line is logged and swallowed.

The 120-second duplicate suppression in `_history_exists` compares the linked Merchandise. Without it a batch receive — many identical `Merchandise received` events written seconds apart, distinguished only by their merchandise link — would collapse into a single row.

## 2026-08-19 - The Planning Workspace Does Not Write Back To The Source

Decisions made and data entered in the Planning workspace stay in Marks. They never write back to the client's source sheet. What they do is let the product move into production.

This is stated once, as a quiet line beside the commit action in the modal footer, not as per-step instructions. People hesitate in this screen because they assume they are editing the client's system of record; the answer belongs at the moment of commitment, where the hesitation actually happens.

## 2026-08-19 - Jobs Are Removed

The Jobs table, its page, its endpoints, and every link to it are deleted. Products, Issues, and History no longer carry a Job link, and Clients no longer carries a Jobs link or a Job Prefix.

Jobs was a grouping container from the spreadsheet-import era: an import chose a job (existing, new, grouped-by-column, or none), created or reused Job records, and linked every imported Product to one. Nothing downstream read the link. Planning, workstreams, release, and production are all product-led, and the job identifiers that production actually uses — `WKFT Job Number` and `Pickup Job Number` — are plain text on the Product, unrelated to the Jobs table.

Imports therefore create Products directly. The job-selection step is gone from the import wizard, the "Missing Job" row error no longer exists, and rows are never skipped for lacking a job. The Imports record no longer counts Jobs Created / Jobs Reused.

`Clients.Job Prefix` and `Products.Pickup Job Number` were read and written by code but do not exist as fields in the base. Job Prefix is removed with the rest of Jobs; Pickup Job Number remains referenced and is a live latent bug — writing it would fail the Airtable request.

## 2026-08-19 - Required Product Data Stays Visible; Name And UPC Do Not

The `Product data for photo` section lists every field the client requires, satisfied or not, with its ✓ / ✗ state. Filled fields are not hidden. The section teaches people what the client requires, and a list that only appears when something is wrong never teaches it.

The exception is Product Name and UPC. Those are settled by matching, or by receiving when there is no match — they are never authored in this screen. Showing them as satisfied is noise on the one screen where the question is what still needs doing, so they are dropped from the list entirely and replaced by a single line naming where they came from.

Open, deferred: which fields are required for which deliverable is not yet configurable per client. It belongs on the client admin page alongside `Required to Shoot` and Photo Production Requirements. Until that exists, the required set is whatever the client's Photo Production Requirements projection yields, which is not deliverable-aware.

## 2026-08-20 - A Ready Item Leaves Planning By Splitting Into Work

When every requirement is satisfied, the Planning workspace does not merely change a status. It calls `confirm-assign`, which creates the Workstream Cards (and any THR3D shipping item), links the Product, and opens those cards directly in `Awaiting Photo Release`. The parent Merchandise then leaves the board because child work exists — the structural rule, unchanged.

The footer action names that move: `Move to Awaiting Photo Release` when ready, `Save` when not. An item that is not ready still saves in place, because deliverables are chosen in this screen and dropping the action would leave that choice nowhere to go.

`confirm-assign` accepts an optional `planningStatus`. Requesting `Awaiting Photo Release` is gated by the same `_evaluate_required_to_shoot_from_fields` check the intake-state endpoint enforces, plus the blocking-issue check, so there is one definition of ready rather than two that can drift. Readiness is judged against the state the request is about to write — the Product it links and the deliverables it sets — not the state it found, since confirm-assign is what establishes both.

## 2026-08-20 - Client Settings Define What Must Be Validated

Which Product fields must be present before work can move on is the client's configuration, not a rule in code. `_evaluate_required_to_shoot_from_fields` reads `requiredProductFields` from the client's Photo Production Requirements, per selected deliverable, and builds one requirement per configured field. The Planning modal already read the same config, so the board gate and the screen now answer the same question from the same source.

The gate keeps only the checks that are structural rather than per client: Merchandise Verified, Deliverables, Product Linked, and the Product identity fields that matching supplies.

Artwork is no longer a hard-coded rule. It is `pathToArt` in the client's list — present if the Valid Artwork Path has a value. The old `Artwork Received` checkbox still satisfies it so nothing already flagged that way regresses, but nothing in the app sets that checkbox. A client with no configuration falls back to requiring artwork, which is the previous behaviour.

Reading the client record cannot fail a request: `_client_config` returns an empty config on any lookup error, and readiness falls back to its defaults.

`Merchandise Verified` is set by approving newly received merchandise. That approval is the verification — there is no separate step. An item either has a problem, which raises an issue and routes it elsewhere, or it is approved, and approval records the flag with a timestamp and the person who did it. An item already verified keeps its original timestamp rather than having it overwritten by a later queue move.

The standalone `POST /merchandise/<id>/verify` endpoint and `api.verifyMerchandise` remain but are called by nothing; verification now happens as part of accepting the merchandise.


## 2026-08-20 - Shipment Grouping Is A Scheduling Signal

A shipment is not merely where something came from. Items that arrive together are usually variants of one product — six cheeses in different sizes — and get shot in the same setup. The grouping is therefore a scheduling hint, and it matters most in `Awaiting Photo Release`, where the selected batch becomes the shoot. That column now groups by shipment like the others; the earlier reasoning treated a shipment as provenance and concluded the opposite.

Each shipment group in that column offers `Select all`, because selecting the group is the common move once grouping means "these get shot together". It respects the existing rule that Ecomm and Packaging release separately: it selects only the items matching the deliverable already in play, or the group's own when nothing is selected yet, and says so when it skips the rest.

## 2026-08-20 - Releasing To Photo Writes The Creative Force Feed

Releasing to photo is the hand-off to production, and the row in `Creative Force Product Feed` is what actually reaches Creative Force. The release endpoint now upserts the merchandise's Workstream Cards into that table through the same `_sync_creative_force_product_feed_cards` path the Topco activation flow uses, so there is one way a card reaches the feed rather than two.

The feed is written **before** the `Released` stamp. If the feed write fails the release is not recorded, leaving the item releasable — the alternative is an item that reads as released to production and never arrives there.

Release also records a `Released to photo` History event. It previously wrote `Released`, `Released At`, and `Released By` and nothing else, which made the one action that hands work to production the only lifecycle step absent from an item's history.

## 2026-08-20 - Creative Force Reports Status Back Through A Stable Hostname

Creative Force posts work unit and task events to `POST /api/integrations/creative-force/webhook`, reachable at `https://hooks.walnutcontent.com` through a named Cloudflare tunnel. The tunnel is named rather than a quick tunnel: quick tunnels mint a new random `trycloudflare.com` hostname on every start, so a URL given to Creative Force silently stops resolving and its events vanish with no error on either side. That is what had been happening.

Two payload shapes carry different halves of the same picture. Work unit events (`WorkUnitStatusChanged`, `WorkUnitCompleted`) carry `WorkUnitStatusName` and no step. Task events (`EventGroupName: task`) carry `StepName` and no work unit status, and name the production type `ShootingTypeName` where work unit events say `ProductionTypeName`.

Both are handled: the parser accepts either spelling of the production type, and each event is merged into the stored sync rather than replacing it, so an event that omits a field does not erase what an earlier one recorded. Writing wholesale meant status and step repeatedly blanked each other.

Correlation runs through the `Creative Force Product Feed`: the first event for a card is found by Product Code and production type, and the resulting `WorkUnitId` is stored so later events match directly. This only works because releasing to photo writes the feed row — before that, every event returned `accepted: false`.

Delivery depends on the Flask process being up. The tunnel runs under launchd and returns after a restart; the backend does not, and Creative Force does not retry, so events sent while it is down are lost.

## 2026-08-20 - Only The Main Creative Force Workflow Drives A Card

A SKU can carry more than one Creative Force work unit: a main workflow and a derived one that branches off Capture. Both share a Product Code and even step names — `Asset Delivery` exists in both chains — so nothing about a step distinguishes them. Only the workflow identity does.

Events from a derived workflow are acknowledged and ignored rather than written. Left unfiltered they overwrite the card in both directions: the derived workflow's single step can complete while the main one is still at Final Selection, and the card then reports `Asset Delivery / Done` for an item that is nowhere near delivered.

Creative Force reports an all-zero `WorkflowId` for derived workflows as well as the main one, so the ID cannot separate them — only `WorkflowName` can. `CREATIVE_FORCE_MAIN_WORKFLOW_NAME` names the main workflow when it is known; otherwise Creative Force's own default naming for derived workflows (`Derived Workflow 1`) is used. Renaming a derived workflow in Creative Force without setting that variable would defeat the check.

Events that carry no workflow name are judged against the main `WorkUnitId` a named event has already identified. Before any main unit is known nothing is rejected, otherwise the card would stay blank waiting for a named event to arrive first.

## 2026-08-21 - The Card Shows The Step's Status, Not The Work Unit's

Creative Force reports two statuses. `WorkUnitStatusName` is the unit's lifecycle: it turns `InProgress` when work begins and stays there through every step until the job ends. `StepStatusName` is the current step's own state and moves with it.

`Creative Force Status` shows the step status, falling back to the work unit status when an event carries no step. Paired with `Creative Force Step` the two now read as one fact — "Final Selection · To Do" — where before the step advanced beside a status that could not change until completion, which read as though nothing was happening.

The work unit status is still recorded in `Creative Force Sync` and returned by the webhook as `workUnitStatus`; it is the right signal for "is this unit finished", just not for progress.

## 2026-08-21 - Each Creative Force Step Is Tracked Separately

Creative Force reports one event per step, and a single action fires the whole chain:
resetting a work unit to Capture emits a reset for every downstream step within the same
second. Storing only the newest event made the displayed step whichever happened to arrive
last, which is arbitrary.

Each step is now recorded on the card's sync under its `StepId`, with its status and the
time Creative Force reported it. The displayed step is derived from that record.

Superseded below: choosing that step by `StepId` ordering was wrong.

The per-step record also answers when each step happened, which is what a Shot Date needs.

## 2026-08-21 - Merchandise Verified By Is Text, Not A Link

`Merchandise Verified By` is a `singleLineText` field holding the verifier's display name.
The code wrote `[user_id]` into it, which Airtable rejects outright for a text field, so
accepting merchandise failed on its last write.

The alternative was converting the field to a link to Users, which is what the field's
creation script had declared. That was rejected: verification is a stamp on the
merchandise, and a link would put a Merchandise back-link on every user record — the
same reverse link already slated for deletion.

`Released By` on the same table remains a link to Users, so the two stamps are modelled
differently. Converting it to text would drop another Users back-link, but it is not
blocking anything today.

## 2026-08-21 - One Resolver Decides What Product Data Is Missing

Planning and the Photo Release modal disagreed about File Name Description: Planning
reported it satisfied while the release said Missing. Planning used the shared resolver,
which reads the Product's own value, then Reference Data under several aliases, then
Product Description. The release modal had its own mapping that checked one key.

The value normally lives in `Product Description` — `fileNameDescription` writes land
there too, so the packaging naming token and the description are one value by design.
`_shape_item` now emits it under both names rather than reporting `null` for a value
that exists, and the release modal calls the shared resolver.

Any screen that judges whether product data is complete uses that resolver. A second
opinion about what is missing is worse than no opinion.

## 2026-08-21 - The Project Name Lives On The Product

Structure Forms name their project — `26007267 | CF Ice Cream Scrounds DFA - MI00204` —
but the import kept only the raw string inside the Reference Data blob, so the Photo
Release asked the user to retype a name that had already arrived on the form.

`Products.Project Name` stores the readable remainder, `CF Ice Cream Scrounds DFA`. The
WKFT number and Mbox number are stripped because both already have their own fields, and
storing them again inside a text field would put the same identifier in two places.

The field is on Products, not Merchandise. Merchandise links to a Product and inherits
the project through that link, so one field serves both instead of two that can disagree.

The release prefills the project name only when every item in it carries the same one; a
release can bundle merchandise from more than one project, and guessing would be worse
than an empty field.

## 2026-08-21 - Walnut Scope Follows The Deliverable

Each deliverable has exactly one sensible scope: Ecomm releases are
`Full set renders - WALNUT (PHOTO)` and Packaging releases are `Packaging Shots`. The
release form now opens on the right one instead of presenting an empty required field
whose only valid answer is determined by the badge already shown in the title.

Both remain editable, and both appear in the dropdown, because the scope is a statement
to the vendor rather than a derived value.

## 2026-08-21 - The Release Email Is Sent, And Is The Email That Was Previewed

The release email preview was a rendering with no counterpart: nothing was stored and
nothing was sent. The Activation now records `Email Subject` and `Email Body HTML` as
released, so what went out is auditable rather than re-derived later.

Preview and email are built from the same inputs — the same item rows, the same column
set, and one shared list of summary lines — because two renderings of the same email
drift. They differ in exactly one way, on purpose: the preview marks missing values with
red placeholders to help the author, and an email to a vendor must never contain them.
Release validation already requires those values, so a complete release renders the same
either way.

Delivery is Microsoft Graph with an app registration, chosen over an Airtable automation
because Airtable escapes HTML held in a long-text field, which would send the SKU table
and artwork links as literal markup. Sending from a real Marks address also matters for a
message a vendor replies to.

Sending never blocks the release. It runs after the move is recorded, and any failure is
reported to the user rather than raised: merchandise stuck out of photo because of a mail
outage would be a worse failure than an email nobody received.

With no credentials configured the release records the email and reports that nothing was
sent. `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, and
`PHOTO_RELEASE_FROM_ADDRESS` are read from the environment and are not held in the repo.

Recipients live on the Client, in `Photo Release Recipients`, because they differ per
client and belong beside the rest of that client's configuration. The field accepts lines,
commas, or semicolons; duplicates are dropped case-insensitively and entries without an
`@` are ignored as typos.

## 2026-08-21 - A Release Marks The Card It Released

Releasing to photo closes the modal, but the card stays on the board, so the board looked
unchanged. The deliverable badge now turns green with a check for six seconds.

The mark uses the merchandise IDs the move endpoint actually returns, not the selection
the user made, so only cards that really moved are marked. It honours
`prefers-reduced-motion`.

## 2026-08-21 - Photo Release Email Falls Back To The User's Own Mail Client

SGS will not grant tenant-wide `Mail.Send` to an app registration in the Propelis tenant,
and SGS controls `makemarks.com` DNS, so neither Microsoft Graph app-only sending nor a
transactional service sending from the domain is available.

An unsent release is therefore handed to the user instead of being lost. The release
records the email as before, and the board offers `Open draft`, which opens the mail
client with recipients, subject, and a plain reading of the body, and
`Copy formatted email`, which puts the HTML on the clipboard so pasting into Outlook keeps
the SKU table. The plain rendering is what a `mailto:` can carry; the copy action exists
because the table is the one thing it loses.

Long bodies are not put in the `mailto:` at all. Past 1800 characters some clients drop the
URL silently, so the draft opens with recipients and subject only and says to paste the
body in.

The Graph path is kept, not removed. `mailer.send_photo_release_email` still runs first and
the handoff only appears when it reports that nothing was sent, so consent granted later
turns automatic sending on with no further change.

The app registration remains in place: client `47b02901-8b3e-4b9b-b13b-c6b85e48c00e`,
tenant `8714a216-0445-4269-b96b-7d84bddb6da1`, with `Mail.Send` requested and not consented.

## 2026-08-21 - The Creative Force Feed Projects Only Configured Fields

Releasing a Product that had a Product Description failed with
`Unknown field name: "Product Description"`. The feed table is built by
`ensure_creative_force_product_feed` from the fields client configurations actually
require, but the writer projected every key in `PHOTO_PRODUCTION_REQUIREMENT_FIELDS` and
wrote any that had a value. Two of those nine — `Product Description` and
`Ecomm Photo Notes` — have no column, so any Product carrying one broke the release.

The writer now projects the same list the schema utility builds from: the
`requiredProductFields` configured for that client and workstream. The two sides of the
feed are derived from one source, so a column can no longer be written that does not exist.

This also removes `Valid Artwork Path` from the projection, a column left over from an
earlier configuration that no client requires today and that no feed row had populated.
Adding `pathToArt` back to a client's `requiredProductFields` restores it, which is the
intended way to change what the feed carries.

## 2026-08-21 - The Sent Email Carries The Preview's Styling

The email went out as plain HTML while the preview showed green values and the yellow SKU
table, so the message a vendor received did not look like the one the user approved.

Mail clients strip stylesheets, so the preview's CSS is inlined into the built HTML:
`#166534` for values, `#fffec7` for the SKU table, white uppercase headers, and
`#2563eb` underlined links. Those are the same values `.activation-email-preview-body`
uses on screen, and tests assert both sides so a change to one is visible against the other.

The subject and the body travel separately, because that is how a message is built.
`Open blank message` opens an addressed message carrying the subject; `Copy email` puts the
body alone on the clipboard. A subject pasted with the body would land inside the message
rather than on it, and the stored `Email Body HTML` omits it for the same reason: when
Graph does send, the subject is a header.

No body is put in the `mailto:` at all. It cannot carry the formatting, and past roughly
1800 characters some clients drop the URL outright, so the message opens blank by design
and the body arrives by paste.

## 2026-08-21 - The Release Modal Closes Only When Nothing Is Left To Do

Releasing closed the modal and put the unsent email in a bar at the top of the Planning
board, behind where the user was looking. The send is the last step of the release, so it
belongs in the release, not in a message on the screen the modal was covering.

The modal now closes when the email sends, because then the release is finished. When it
cannot send, the modal stays open and its footer changes from offering the release to
offering the one thing left: copy the email, open a blank message, done. The board bar is
suppressed in that case rather than duplicating it.

`Copy email` also sits on the Email Preview header, so the email can be copied before
releasing and from any release reopened later through Edit Photo Releases. Both call one
`copyPhotoReleaseEmail`, so they cannot copy different things.

## 2026-08-21 - Image Counts Belong To Ecomm Only

`Images/Bundle` and `Total Images` describe an Ecomm bundle. A Packaging release
photographs the package itself, so the counts mean nothing there.

They are hidden from the form, left out of the preview and the email, and written as null
rather than carried at their default of 9. A stored 9 on a packaging release would be a
claim nobody made, and the vendor reading "Number of images per bundle: 9" on a packaging
request would reasonably act on it.

A release covering both deliverables still shows them. Neither field is required, so
hiding them cannot block a release.

## 2026-08-21 - A Released Card Says So Permanently

The green badge flash after a release lasts six seconds and only ever says "this happened
just now". Released cards stay on the board, so a card that was released yesterday looked
identical to one that never was.

Released cards now carry a standing `R` mark on the deliverable badge line, titled with the
release date. The flash remains for the moment of release; the mark is what persists.

The mark shares the badge line rather than taking a row of its own, because the meta column
is a grid and a new row would push the card taller for every released item.

## 2026-08-21 - Releasing Through A Photo Release Stamps The Release

Two paths released merchandise and only one recorded it. The drawer's
`Release to Photo` set `Released`, `Released At`, and `Released By`; the photo release's
`Release to Photo` moved the Planning status and stopped there. Merchandise released
through a photo release therefore read as never released, which is what left the `R` mark
absent on cards that had plainly been released.

The photo release path now writes the same stamp. Two conditions apply. It is written only
once — re-releasing an edited photo release keeps the original date rather than moving it
forward. And it is written only when no sibling workstream is still unreleased, matching
the Planning status beside it: merchandise with a Packaging card released and an Ecomm card
still waiting has not been released, it is half released.

`Released By` is a link to Users on this table, unlike `Merchandise Verified By`, so it
takes a record id rather than a name.

## 2026-08-24 - The Current Creative Force Step Is The Newest Report

Choosing the displayed step as the earliest unfinished one by `StepId` was wrong on both
halves, and the board showed `Photography` for an item Creative Force had already moved to
`External Post Production`.

`StepId` is not workflow order. Real data has `Photo Review` at id 15 finishing at 18:55:15
and `External Post Production` at id 7 starting three seconds later.

Nor can a step be judged finished by its own status. Creative Force never reports a
completion for a step it has moved past — `Photography` sat at `In Progress` from 18:18
onward while three later steps came and went.

What it does report reliably is each transition as it happens. The current step is
therefore the most recently reported one, which is also what Creative Force's own Current
Step column shows.

Timestamps carry microseconds, so a genuine tie means one action fired the whole chain:
a reset, where work resumes from the first step. The workflow is linear but its order is
not derivable from the ids, so `CREATIVE_FORCE_STEP_ORDER` states it:
Photography, Final Selection, Photo Review, External Post Production, External Post QC,
Delivery. A step missing from that list sorts after the named ones by `StepId`, so an
unconfigured workflow still resolves deterministically.

The order is environment configuration rather than code, matching
`CREATIVE_FORCE_MAIN_WORKFLOW_NAME` beside it: both describe the Creative Force workflow,
which can change without this application changing.

Existing cards were recomputed from their stored step history rather than left waiting for
the next event.

## 2026-08-25 - The App Has One Address

The site answers on both `marksfoodphotography.onrender.com` and
`food.walnutcontent.com`. Two live URLs split sessions and bookmarks between them, and a
session cookie set on one is not sent to the other.

`food.walnutcontent.com` is canonical and the other redirects to it. Render's redirect
rules match on path rather than host, so a rule on the service would redirect the canonical
host to itself and loop — both hostnames are the same service. The redirect is therefore in
the app entry, before anything renders, preserving path and query so a shared link still
lands where it meant to.

`VITE_CANONICAL_HOST` names the host and is unset by default, so localhost and any preview
build are untouched. Only the deployed static site sets it.

`CORS_ORIGINS` keeps both origins: the redirect is client-side, so a request can still
arrive from the old host before the redirect runs.

## 2026-08-25 - Production Relays Creative Force Events To Development

Creative Force posts to one URL. Pointing it at production means a development instance
sees nothing; pointing it at the tunnel means production sees nothing. Switching the URL by
hand for every debugging session is the kind of step that gets forgotten and then blamed on
the code.

Production relays a copy instead. `hooks.walnutcontent.com` is the permanent address and
resolves to Render; after an event's signature passes, the raw body and its `X-CF-Signature`
are POSTed verbatim to `CREATIVE_FORCE_FORWARD_URL`, so the receiver validates exactly what
Creative Force sent and behaves as though it had been called directly.

Relaying happens immediately after the signature check rather than at each of the handler's
six exits, because every branch below it is a legitimate outcome a second instance should
also see — including the ones that ignore the event.

It is sent on a daemon thread with a short timeout and every failure swallowed. The event
is already accepted by then, so a sleeping laptop cannot cost production anything.

`X-CF-Forwarded` marks a relay so it is never relayed onward. The forward URL is unset on
development, which is the real guard; the header covers the case where both ends are
configured by mistake.

## 2026-08-25 - A Product Is What We Know So Far, Not The Client's Record

No authoritative source of product data exists, and the evidence is that none is coming.
The shared spreadsheet was meant to be it; the client's producers have said in writing that
maintaining it is not their job and that the studio team should input the data instead.
Structure Forms arrive late, often after the merchandise, sometimes never, and carry only
part of what a shoot needs — the recent ones supply WKFT and supplier but no CVID. The rest
turns up piecemeal in Teams messages.

So the system stops treating a Product as the client's record that merchandise is matched
against, and starts treating it as the accumulating record of what is known about a SKU.
Merchandise arrives first; data catches up.

Three things follow.

Every ingest path is a contributor rather than an authority. Receiving supplies name and
identifier, a Structure Form adds WKFT, Mbox, supplier, studio and request type, a chat
message adds a CVID. Each fills gaps in one record instead of competing to own it. The
Structure Form import and source-row activation already merge on UPC; they simply do not
compose yet.

Completeness is computed, never a precondition. `photoProductionRequirements` already
states per client and per deliverable which fields a shoot needs, and the card already
reports which are absent. That evaluation is the gate, not where the data came from.

The absent list is worth sending. Knowing exactly which fields are missing for which SKUs
is the request the studio currently makes by hand and loses in a chat thread.

The spreadsheet stays connected for now. It is one contributor among several, and the
intent is that disconnecting it later is a configuration change rather than a rewrite:
new ingest paths sit beside `sourceCheckRules` rather than on top of it, and nothing new
assumes a sheet row exists.

## 2026-08-25 - The Source Refresh Stopped Costing More Than It Delivered

The Airtable workspace ran 177,000 API calls against a 100,000 monthly allowance. This base
holds 28 records, so the volume was not data — it was a background loop.

The worker woke every 60 seconds and read the whole Clients table to ask whether a refresh
was due. Topco's interval is 600 seconds, so 97% of those reads answered "not yet" — around
43,000 calls a month to schedule 4,300 refreshes. It now re-reads the schedule at the
cadence the schedule itself names, capped at five minutes so an edit on the Clients page
still takes effect promptly, and sleeps until something is actually due instead of waking
every minute.

The refresh itself scanned Products before looking at the sheet, so it paid the Airtable
cost whether or not anything had changed. That is backwards. The sheet is a public CSV
export: free to fetch, and it offers no ETag or Last-Modified, so a conditional request is
impossible — but fingerprinting the parsed rows achieves the same thing. The sheet is read
first, and Airtable is touched only when the fingerprint moves.

For a sheet the client rarely edits — which is the premise of everything else here — that
is close to zero calls. It also inverts the tradeoff: polling more often now costs nothing,
because frequency is paid in free sheet reads rather than metered Airtable calls.

A manual refresh passes `force`, because a person clicking Refresh means it. A failed sheet
read reports "changed" so the refresh proceeds; skipping work because the check broke would
be worse than doing it twice.

Worth noting for later: each process that starts the worker runs its own loop, so a
multi-worker gunicorn multiplies all of this, and a development server running alongside
production doubles it.

## 2026-08-25 - Airtable Reads Are Cached Because Writes Invalidate Them

The per-base breakdown named this application: 172,790 of the workspace's 177,489 calls,
against a base holding 35 records. So the volume is request shape, not data.

One Planning page load made nine requests and 22 Airtable calls. Six of those read the
Clients table, from five separate call sites each doing its own unfiltered scan, and the
same data tables were re-read across requests a fraction of a second apart — Merchandise
three times, Products, Issues, Shipments and the workstream cards twice each.

Whole-table scans are now cached: sixty seconds for Clients, Locations and Users, which
change perhaps weekly, and ten seconds for everything else, which is long enough to collapse
one page load's burst and short enough to be uninteresting. Every Clients read goes through
one helper rather than five copies of the same call.

This is only safe because writes invalidate. Every create, update and delete through the
Airtable client drops that table's cache first, so anything this application changes is
visible on the next read. The only staleness possible is an edit made directly in Airtable,
bounded by the TTL.

A page load went from 22 calls to 14 with a cold cache. Together with the source refresh
loop, that removes roughly two thirds of what this base was spending.

The cache is process-global, so `create_app()` clears it. That matters most in tests, where
one test's mocked records would otherwise be served to the next — which is exactly what
happened, and thirteen tests caught it.

Filtered reads are never served from the cache. A filter asks a different question, and
answering it from a full scan would return records the caller excluded.

## 2026-08-25 - One Way A Product Comes To Exist

Four paths created Products and each merged differently: the Structure Form import on UPC,
source-row activation on a sheet row, `POST /api/items` on a validated identifier, and the
intake import. That is how one SKU ends up with two records, and no later rule reconciles
them.

`merge_product(client, identifier, values, source)` is now the only way. Given an identifier
it creates a Product or fills that Product's gaps, and it refuses when there is no
identifier at all.

Identifiers compare as digits with leading zeros dropped, because the spreadsheet stores
UPCs as numbers and strips them — `036800120457` and `36800120457` are one product. Nothing
else is relaxed. Dropping the trailing digit would merge five distinct CT cheeses that
differ in that digit alone, measured on the real sheet: fifteen products collapsing into
five buckets.

Existing values are never overwritten. A contribution answers a question the record has not
answered yet, so a Structure Form arriving three weeks late cannot quietly rewrite what
receiving observed off the package, and receiving cannot overwrite the form.

Which source answered which field is recorded in Reference Data under `_contributions`, per
field rather than per record. When a CVID from a chat message turns out wrong, the question
is where that one came from, not whether the Product had a form behind it. Failing to record
provenance never fails the merge.

Provenance is written in the same call as the record, never as a follow-up update. Recording
where a value came from is not worth a second Airtable call, and the merge does not fail if
it cannot be built.

The Structure Form commit is the first caller. Moving it changed two things beyond the
plumbing. Matching is now on the normalized identifier rather than the exact UPC string, so
a form whose code lost its leading zero finds the Product it belongs to. And a Product the
source sheet owns no longer has the form's *proposed* request type written into it even when
that field is empty — the sheet supplies the real one. That rule lives in the caller: the
merge merges what it is given, and deciding what to offer is policy.

The remaining paths move over one at a time, so each move can be verified on its own.

## 2026-08-25 - The Sheet Import Could Not See Products The Forms Made

Two of the four creation paths share the intake plan executor: the source-sheet import and
source-row activation. Neither moved onto `merge_product`, because they are a different
operation — the sheet owns those fields and overwriting them is the point of the refresh.
Merging gaps would have broken the thing the timed refresh exists to do.

Their matching was wrong, though, in a way that produced exactly the duplicates the merge
work exists to prevent.

`_existing_items_by_identifier` indexed `Identifier` alone, and `_apply_item_fields` writes
only `UPC`. So every Product created from a Structure Form was invisible to the sheet
import, which then created a second record for a SKU that already had one. Exact string
matching missed them a second way, whenever the spreadsheet had stripped a leading zero.

The index now covers both fields and keys each in raw and normalized form, and lookups go
through one helper that tries what the sheet said before the comparable form of it. This is
the same keying the merge uses, so the two paths can no longer disagree about whether a
Product exists.

The distinction worth keeping: contributing and syncing are different. A form, receiving or
a chat message *contributes* what it knows and never overwrites. The sheet *syncs* fields it
owns. Both must agree about identity; only one may overwrite.

## 2026-08-25 - Every Product Creation Now Goes Through One Of Two Doors

`POST /api/items` created a Product unconditionally: no lookup, no duplicate check. It is
the endpoint behind the disabled "create an incomplete Product" form, so re-enabling that
without changing it would have made hand entry the fastest way to duplicate a SKU.

It goes through the merge now. A known identifier fills gaps and returns 200 rather than
creating a second record; an unknown one creates and returns 201.

The merge also writes the identifier into both `UPC` and `Identifier` when it creates. That
removes at its source the disagreement patched at the lookup earlier: Products made from a
form carried a UPC and no Identifier, and the sheet import indexes Identifier. Filling both
means the two paths describe the same product the same way from the start.

Two doors remain, and that is the intended shape:

`merge_product` — a Structure Form, `POST /api/items`, and in due course receiving and the
Planning ladder. Contributes what it knows, never overwrites, records which source answered
which field.

The intake plan executor — the source-sheet import and source-row activation. Syncs fields
the sheet owns, and overwriting is the point. It resolves an existing Product first, through
the same identifier index the merge uses.

Nothing else creates a Product. The remaining `create_record` calls against the Products
table are those two.

## 2026-08-26 - Establishing A Product From The Card, Restored

The Planning card once offered "Can't find it? Create an incomplete Product". It was hidden
on 2026-08-13, in the commit that made Planning product-led, by a flag set to false. No
decision recorded it. That removed the only way to establish a Product when none existed,
which is the case that occurs whenever data arrives in a chat with "push it through to
production" and no Structure Form ever follows.

It is back, with three changes.

It creates through `merge_product`, so a known identifier fills gaps rather than making a
second record. That was the real hazard, and it is the reason hiding the form looked
reasonable at the time.

The fields are the client's own `requiredProductFields` for the workstream, plus name and
identifier always — without those two there is nothing to match on later. The old form
asked for a fixed four including "Primary Match Key", a concept being retired, and "Brand",
which nothing requires.

The language changed. A Product established from what is known is not an "incomplete
Product"; it is the record, and every record is incomplete until it is not. The card now
offers "No Product exists yet? Establish one".

An older copy of the fixed-field form survives in `WaitingInformationWorkspace` and still
says "Primary Match Key" and "Product Job Number", a field the base no longer has. Left
alone deliberately: different screen, separate cleanup.

## 2026-08-26 - A Repeat Arrival Of A SKU Says So

Receiving the same SKU twice produces two Merchandise records linked to one Product. That
is correct: a Product is the SKU, and Merchandise is a physical arrival with its own photos,
condition, quantity and path through Planning. A second Product would fork the data and
recreate the duplication the merge exists to prevent.

But the board showed two cards with nothing connecting them, so a SKU already released could
be shot a second time and nobody would know until the files collided.

A card now says when another arrival of the same SKU is further along: released, with the
date, or ready for release. Only when it is *further* along — two cards in the same state
tell each other nothing.

It reports and never blocks. A repeat arrival is often deliberate — more units, or a
replacement for something damaged — so the studio decides. Amber rather than red for the
same reason.

## 2026-08-26 - The Planning Modal Shows One Match List

Receiving stopped separating "products" from "source sheet rows" some time ago, on the
grounds that they are the same thing to whoever is looking. The Planning modal never got the
same treatment and still showed two stacked panels — "From the source sheet — not yet a
Product" above "Possible matches" — which on a search for "Pasta" produced five source rows,
then a divider, then the Products.

One list now. Picking a row that is not yet a Product creates one; that is the component's
problem, not the reader's.

The "Matched by product name" line went with it. How a candidate was found is the search's
business. What the reader needs is what identifies the Product, so the row keeps the UPC and
drops the route the query took to reach it. `itemMatchedByText` was left unused and removed
rather than left to rot.

Instructions above the search went too. "Confirm the matched product below is correct. You
can still proceed without linking right now" was shown even when the status read Unmatched
and there was nothing below to confirm. The unmatched state now says "Find the Product, or
establish one" and the matched state says nothing — the green card with the product name and
a Change button already does.

## 2026-08-26 - The Source Sheet Reassurance Is Obsolete

The merch check footer said "Nothing entered here writes back to the source sheet — it is
what lets this product move into production." It was added deliberately: people hesitated at
that button because they assumed they were editing the client's spreadsheet.

That assumption only existed because the sheet was going to be *the* product data source.
It is not. It is one possible contributor of some data, alongside Structure Forms, chat
messages, receiving, and records established in this application. Where a value came from is
now genuinely ambiguous and often internal.

So the sentence has been removed rather than shortened. Reassuring someone they are not
editing the source sheet reinforces a model where such a sheet governs, and nothing here
does.

`showSourceMatchPanel = false` still gates two dead renders of the separate source-sheet
suggestion panel in receiving, left from merging those lists. Worth removing.

## 2026-08-27 - Choosing A Match Is Staged Until The Step Is Saved

Superseded the decision below, and for a better reason than it was made.

Clicking a suggestion wrote the link to Airtable immediately. For a source-sheet row it did
more: committing that row *creates* a Product. So a mis-click produced a record that then
had to be found and undone, and the undoing was itself a write.

A chosen match is now held as a draft until the step is committed with Accept merchandise or
Save, the same way the No Clear Match flag already was. The card shows the choice as made and
says it links when the step is saved; removing it before then touches nothing.

`Unlink` still exists and still unlinks, for a link that was actually written. The button
says "Remove" for a staged choice and "Unlink" for a written one, because those are different
acts.

## 2026-08-26 - Unlink Means Unlink

Picking a match in the Planning modal writes the link to Airtable immediately. The button
offering to undo it did not: "Change" hid the matched card and showed the search again while
the link stood.

So the record said Matched while the user was choosing a replacement, the option to establish
a Product stayed hidden because something was linked, and walking away at that point left a
link the user believed they had undone.

The button is "Unlink" and it removes the link. The status then reads Unmatched, the search
returns, and establishing a Product is offered again — because all of those follow from the
record rather than from a screen state that disagreed with it.

Choosing a different Product is now unlink, then search. One more step, and each step is
true.

The state that hid the card while keeping the link is removed rather than left unreachable.

## 2026-08-27 - Unlinking A Product Does Not Undo The Review

`remove-match` cleared the Product link and also set Merch Status to "Received" and Planning
Status to "New". So unlinking a Product on an item already accepted threw it back to New:
the modal switched to the acceptance flow, its Deliverables step disappeared, and the card
sat in Needs More Information describing something that no longer matched its state.

Those are different facts. Whether the goods arrived as described, and how far the review
has got, are not claims about which Product this is. Unlinking now clears the link and
nothing else.

## 2026-08-27 - No Clear Match Is Removed

Nothing ever computed it, and it stored nothing that a plain unmatched entry did not
already store: both branches in `_receipt_entry_match_fields` wrote the same Merch Status,
and the extra link-clearing was a no-op when nothing was linked. In receiving the button
had already been switched off at both call sites, so that path was unreachable. In Planning
the card was inherited from the pane the card sat in, which meant accepting merchandise
without a match was being reported back as a decision nobody made.

Unmatched is now simply unmatched. The card, the `noClearMatch` request flag, the receiving
choice and its dead styles are gone; the review state still derives from the Planning status
label as it always did, and `Mark Waiting for Product Data` on the Merchandise Review screen
is untouched because that one is an explicit act.

The entry below records the intermediate step and is kept for the reasoning, not the code.

## 2026-08-27 - No Clear Match Is A Record, Not A Verdict

Nothing computes "no clear match". Both write paths in `backend/routes.py` set it from a
flag in the request body: it is what someone decided at receiving, not the system reporting
that a search came up empty.

The card was rendered instead of the suggestion list, which read as though the two agreed.
They do not. An item parked on No Clear Match in April says nothing about what Products
exist today, and a Product established since would sit hidden behind dismissing the card.

The suggestions now render below the card. The recorded decision stays on screen and stays
honest, and a match that has since appeared is one click away.

Unlinking, or dismissing the card, also marks the panel as searching for the rest of that
item's visit. The record still reads Waiting for Product Data until the step is saved, so
without that the refresh put the card straight back and the search had to be started twice.

## 2026-08-27 - File Name Description Replaces Product Description

The Airtable field's own description already read "Product name or filename from MySGS",
so the label was describing something the field is not. The name invited prose into a
filename token, and the same cell was exposed twice - as `productDescription` and
`fileNameDescription` - and editable under both labels, in the Products grid and in the
planning step.

It is now File Name Description everywhere: the Airtable field, the import destination map,
the Products grid, the source-check config, and the Creative Force feed, which already used
that name. The code key stays `fileNameDescription`, so client Photo Production Requirements
need no migration - Topco's JSON already referenced only that token.

"File Name Description" names the use rather than the thing, which is a real cost if the
value is ever wanted elsewhere. It won anyway: it matches the UI, the naming token and the
CF feed field, and the alternatives that name the thing ("Short Name", "Display Name") are
generic enough to invite the prose the rename is meant to prevent.

Old headings still land: "Product Description" and "Prod Descrip" remain aliases in the
import map so sheets already in circulation keep working.

`F_ITEM_DESCRIPTION` went with it. Products has no Description field and never has, so the
read always returned "" and the write would have failed with 422 had anyone supplied one.

## 2026-08-27 - The Client Says What A Release Needs

Three copies of "what a photo needs" were in play. The Client record's Photo Production
Requirements was one. `TOPCO_READINESS_PROFILE` in `routes.py` was a second, carrying its own
`deliverables.*.requiredFields` that the Admin panel displayed but nothing enforced, and which
did not match the Client record. `_topco_photo_production_requirements()` was a third, handed
out whenever the Client record looked blank, and it had drifted - its Ecomm list was missing
jobNumber. The release form then hardcoded Upload Location as required on top of all that,
while Artwork Path next to it read the Product field list, which answers a different question.

Only the Client record says it now. The two hardcoded copies are gone, and nothing is invented
for an unconfigured client.

Release-form fields are configured separately from Product fields, as `release.requiredFields`
per workstream. They are typed at release and never carried on the Product, so listing them
among `requiredProductFields` would leave Planning asking for a Product field that does not
exist. Both default to not required, so no asterisk, and the email omits a path unless the
client requires it or someone entered one - the preview previously showed a red placeholder
for copy the sent email never contained.

Path prefixes moved from `TOPCO_READINESS_PROFILE.pathPrefixes` to `paths: {artwork, upload}`
in the same Client config, editable in the Admin panel. They sit per workstream, not per
client: packaging artwork and ecomm uploads can live in different places, and one pair for
the whole client would have forced a code exception the first time they diverged. The release
form takes the prefix of the workstream being released. Topco's record now carries the two
smb:// values that used to be in the code, on both workstreams. No new Airtable columns: the
config field already existed, and the standing goal is fewer fields, not more.

Where the values are stored is unchanged - Artwork Path and Upload Location stay on the
Activation, written per release.

## 2026-08-27 - Release Belongs To The Workstream, Not The Arrival

`Released`, `Released At` and `Released By` lived only on Merchandise, so releasing the Ecomm
card marked the whole arrival released and the Packaging card for the same box showed the
released badge too. The release also pushed every ready workstream card on that arrival into
the Creative Force feed, not the one being released - the Packaging card escaped only because
it was missing Brand Prefix and File Name Description and the sync skipped it. Complete that
data and releasing Ecomm would have shipped both.

The unit of release is the workstream card. Workstream Cards now carries its own Released,
Released At and Released By; the release names the workstream it is releasing, the feed sync
covers only that card, and the badge reads the card. Three new Airtable fields, against the
standing goal of fewer - taken because nothing else recorded this and the arrival-level flag
was answering a different question.

The Merchandise flag stays and becomes derived: the arrival is released once every workstream
on it is. Released At and Released By on Merchandise still record the most recent release.

## 2026-08-28 - Release Is The Only Thing That Speaks To Creative Force

Superseded 2026-08-27's automatic feed refresh on edit. That version pushed a Product
change straight to Creative Force, which meant photo production could change under a
photographer with nobody seeing a warning.

Editing a Product now edits the Product and nothing else, and the planning modal says so.
Creative Force hears about it when someone releases again - one deliberate act, in one
place, behind a warning and a confirmation naming the risk to work in progress and file
naming, and asking that the photo producer be contacted first.

Re-releasing does not mean retyping. Reopening the release for merchandise that already
has a release record starts from that record, so the project name, scope and counts carry
over. The item rows are rebuilt from the merchandise rather than the stored snapshot, so
the release carries the Product as it is now, not as it was on the day. The mechanism for
this already existed as `useSavedActivation` and had never been wired to anything.

## 2026-08-27 - A Released Card Stays Editable, And Says So

Locking a card at release would force an unrelease-and-redo for a typo in CVID, and the
feed re-sync already carries corrections through to Creative Force. So editing stays open.

What was missing is that the screen said nothing. A released card looked identical to an
unreleased one: same fields, same Remove workstream button, no mention that a change now
rewrites what Creative Force is holding. The header carries a Released marker with the
date and that sentence now.

Two of the controls are not corrections. Unlinking re-points the card at a different
Product while Creative Force is scheduled against the released one, and Remove workstream
withdraws work CF may already hold - its existing guard is on CF *status*, so a card
released minutes ago is still removable and would leave its feed row behind. Both ask
before acting on a released card. Neither is blocked: a wrong match after release is a
real situation, and refusing it only moves the fix into the base.

## 2026-08-28 - Arrivals Are Announced Through A Teams Webhook, Not Graph

Microsoft Graph is not an option here. `mailer.py` already uses it for the release email
and SGS IT declined the admin consent it needs, so a Graph-posted channel message or a bot
would need exactly the approval that was refused. Worth knowing separately: that means the
release email is very likely not sending either, quietly, by design.

A Power Automate "when a webhook request is received" flow needs no tenant admin. The
channel owner makes it and hands over a URL. Microsoft is retiring the older O365 connector
webhooks, so this is built on Workflows rather than the legacy connector.

One message per shipment, when receiving is finished, listing what came in - not one per
item. A delivery of eight cannot flood the channel, and an arrival is how people think
about it anyway. Long shipments list twelve and say how many more.

The webhook lives on the Clients record beside Photo Release Recipients, which is already
managed straight in Airtable with no UI. That keeps rollout per client - a client with no
webhook is simply not notified - and keeps the URL off the wire: holding it is enough to
post to the channel, so the API reports only `teamsWebhookConfigured`, never the value.

Nothing here can fail a receipt. The goods are recorded before the post is attempted, and
an unreachable channel is logged and reported in the response, not raised.

## 2026-08-28 - Microsoft Graph Is Gone

The photo release called Graph `sendMail` on every release. Graph needs tenant admin
consent, SGS IT declined it, so that call could only ever fail - caught, logged, reported
as not sent. Live behaviour was already "the person sends it": the release view keeps the
rendered email open with Copy, which is the path anyone actually used.

The call, the token exchange, the `MS_GRAPH_*` settings and `PHOTO_RELEASE_FROM_ADDRESS`
are removed. `mailer.py` keeps only `parse_recipients`, which addresses the email for the
person sending it. The response still reports `emailSent: false` with the recipients and
rendered body, so the release view behaves exactly as before.

Credentials for a service that cannot authenticate should not sit in an environment file.
The `MS_GRAPH_*` values need clearing from `backend/.env` and from Render by hand.

## 2026-08-31 - Release Is Stamped On The Path The Form Actually Uses

Per-workstream release was added to `POST /merchandise/<id>/release`. The Release to Photo
button does not go there - it posts to `/activations/<id>/move-to-photo`, which stamped
Released on the Merchandise only. So the R badge and the dashboard count read nothing while
work was in Creative Force and shooting.

The card is stamped in the same write that moves it to Awaiting Photo Release, so it costs
no extra Airtable call.

Creative Force progress is also no longer gated on that flag. CF only reports on work
released to it, so its own report is the proof; requiring the flag hid progress on anything
released before the flag existed or through a path that never set it.

## 2026-08-31 - Show The Creative Force Status That Moves

A work unit carries two statuses. Each step restarts at "To Do" when Creative Force advances
to it, so a card showing the step status alone reads as stuck: Photography can be Done and
the card still says To Do, because that is the new step's status.

The card shows the step name with the work unit's own status - "Final Selection · In
Progress" - which advances rather than resetting. The step's own status and when it was
reported are in the tooltip.

## 2026-08-31 - Merchandise Tags

Tags identify the physical box. The client is the top line because that is how a shelf is
read by eye, then the matched Product's name, a QR at that item's planning card, and the
MP code both large and as a Code128.

The code is minted by Airtable rather than taken from client data. UPC and CVID are often
absent or arrive weeks after the box, and an identifier that is sometimes blank cannot be
printed or trusted. Creative Force receives the same code suffixed per workstream, because
it recovers a card by Product Code and needs exactly one match.

Printers live in the base, not in a file: Render's disk is ephemeral and these addresses
move often. Printing picks the explicit choice, then the person's remembered printer, then
the default.

Printing happens where the box is in hand - Save & print tag on receiving, on both screens -
and from the merch card, because tags get lost and reprinting should not need the shipment
reopening. A missing storage location does not block a tag: most merchandise is shelved
after receiving, and a tag that waits for a location is a tag nobody prints.

The first printed label had the QR too large and too close to the barcode for a handheld to
be sure which it was reading. The QR is now 231 dots square with 0.93 inches of clear label
between the two symbols.
