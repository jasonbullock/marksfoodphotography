# Product Decisions

## 2026-08-12 - Planning Cards Share One Opened-Card Surface

New Merch, Received Merch, and Ecomm/Packaging workstream cards are the same PM planning-card experience at different queue steps. Opening any of them uses the shared review modal with the same merchandise, Product match, Deliverables, Product data, comments, and history sections. Queue position changes the available action, not the visual anatomy. Only New Merch provides Previous/Next Merchandise navigation and creates work; existing workstream cards use the same modal and may move to Ready for Photo after validation. This keeps the card focused on readiness rather than exposing implementation-specific workstream drawers.

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

Topco Packaging activation data currently requires UPC, Job Number, Brand, and Coordinator Description.

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
- `Finish & Move` = only commit action for routing changes.
- No optimistic routing, board refresh, card movement, badge movement, or background animation while the modal is open.
- Background board interaction is frozen while the modal is active.
- Cancel, Esc, close, and backdrop close discard uncommitted draft changes.
- Cards move or animate only after the finish save succeeds and the board reloads.

For the Merchandise Verification modal, selecting `Thr3d`, `Packaging`, or `Ecomm` updates only local modal state and the `Will move to ...` footer preview. The frontend must not call the Deliverables save endpoint or reload the Planning board from that selection. `Finish & Move` sends the selected `Deliverables`, destination `stage`, and blocking requirements together through `/api/merchandise/:id/intake-state`; after success, the board refreshes, the modal closes, and the card appears in its committed destination.

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

The client `Photo Production Requirements` JSON is the single configuration source for Product-data checks shown on Received Merch and Workstream cards. The frontend must not use a separate hard-coded per-card checklist when a client profile is present; the Topco profile is only an initial fallback for clients whose configuration field is empty. Topco Ecomm does not require Job Number by default. A PM may add Job Number in Admin > Clients when a client-specific handoff requires it. Matched Product Name and UPC satisfy those identity checks and are not repeated as remaining work.

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

The Planning board keeps the canonical internal queue values `New`, `Planning`, `Waiting`, and `Ready for Photo`, but the user-facing column labels should describe the PM decision being made: `New Merch`, `Needs Product / Work`, `Awaiting Info/Activation`, and `Ready for Photo`. `New Merch` is the brand-new received-merch inbox. Its cards should open review without a visible `Review Merch` badge; the modal footer is where the primary action reads as the next outcome. Incomplete review uses `Mark Merch Reviewed`; once work can be created, the button should name the creation outcome, such as `Create Packaging Workstream` or `Create THR3D Shipment`. Merchandise navigation belongs together on the footer's left side with previous/next arrows. `Needs Product / Work` is reserved for reviewed merchandise whose Product identity or deliverable/workstream intent is unresolved. Ecomm and Packaging workstream cards with known Product/deliverable intent but missing dependencies belong in `Awaiting Info/Activation`, not the product/work exception lane. This supersedes the earlier first-column `Needs Review` display decision and remains a presentation and routing refinement, not a new Airtable status model.

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

For Topco, Packaging requires Product Name, UPC/Product ID, Job Number, Brand Prefix, and File Name Description. Its handoff pattern is `{jobNumber}_{brandPrefix}_{fileNameDescription}`. Ecomm requires Product Name, UPC/Product ID, CVID, and Job Number. Its pattern is `{cvid}_{view}` with the standard view set in configuration. `Brand Prefix` is distinct from Brand because it is the packaging filename value.

Creative Force owns final naming convention and execution. Marks Photo verifies that a matched Product has the configured values and that filename tokens/views resolve before handoff. Raw shipment quantity and physical statuses remain on Received Merch/Shipments, and Activation remains separate. The Clients grid calls the identity value `UPC` or `Product ID`; `Primary Match Key` and Airtable `Identifier` remain internal compatibility terminology only.

## 2026-08-12 - Creative Force Reports Work Unit Status

Creative Force status is associated with the Ecomm or Packaging Workstream Card, not with Product or Received Merch. Creative Force Work Unit webhooks provide the stable `WorkUnitId`, Product identifiers, production type, and status. Marks Photo should match callbacks by `WorkUnitId`, retain the raw Creative Force status, and expose a small normalized status summary without overwriting Planning status or physical Merchandise status.

The first backend slice accepts `POST /api/integrations/creative-force/webhook`, verifies the `X-CF-Signature` HMAC-SHA256 header, handles duplicate payload IDs, and stores a compact sync object in the app-owned Workstream Card field `Creative Force Sync`. The webhook is public only in the HTTP-auth sense; signature validation is mandatory. Creative Force retries failed deliveries, so the endpoint returns success for valid but currently unknown Work Unit IDs rather than creating an unlinked card.

The Clients configuration remains the source of truth for the Creative Force Product Code and Category mappings. PMs do not select those mappings during work. Outbound handoff creation, Airtable field provisioning, and API-based reconciliation are separate follow-up slices.

## 2026-08-12 - Creative Force Handoff Is Configuration-Driven

Before an external Creative Force record is created, Marks Photo must resolve a Workstream Card through the Client's configured Product Code field, Category source, required Product data, and workstream type. The backend now exposes that result as a Creative Force handoff payload and refuses admin linking when the configured handoff is incomplete. The link operation stores the external Work Unit ID on the Workstream Card so later webhook events have an unambiguous target.

This does not make PMs configure or manually map ordinary work. Client configuration remains admin-owned. The current admin-only link endpoint is a temporary integration bridge while the Creative Force API connection is being provisioned; it must be replaced or supplemented by outbound API creation once the Creative Force OAuth app, workspace/client IDs, datasource ID, and Product Code mapping are available.

Open decisions: whether File Name Description should become a first-class Product/Client Reference value rather than remain in Product Reference Data; whether other clients need configurable per-view naming requirements; and whether the new Airtable field should be ensured through the existing schema utility or provisioned in the next migration.

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

An existing workstream card must not offer `In Creative Force` as a dead-end button. Product data is updated through the existing Save product data action. Add activation opens the shared Activation editor with the current Received Merch item pre-linked. The footer primary action is shown only when the PM can change the workstream or move the card to Ready for Photo.
When one photo child exists, changing its deliverable updates that child in place and the commit action names the destination workstream. When both Ecomm and Packaging children exist, neither child may be added or changed into a duplicate; the card explains that the other workstream is already tied to the merchandise and removal is the only structural action.

Creative Force Airtable ingestion uses a separate flat app-owned Product Feed because the Airtable Connector cannot reliably derive readiness from linked Merchandise or Workstream Card fields. The physical table contains fixed scalar handoff fields plus the union of scalar Product fields required by client Photo Production Requirements. A field required by one client becomes a shared column; rows for other clients leave it blank. It does not contain eligibility, Production Summary, status, or blocker fields. The schema utility adds supported required-field columns as client configuration evolves.

The feed projection is one row per eligible Ecomm or Packaging Workstream Card, not one row per Product. This preserves separate Creative Force production types when one Product needs both Packaging and Ecomm work. `Source Key` is the Workstream Card ID. A row exists only when the child card is `Ready for Photo` and the client-configured handoff validation is complete. The feed contains only Airtable handoff fields and never serves as a blocker/status/reporting table.

Creative Force handoff must be visible before it is provisioned. Admin includes a read-only Creative Force section that previews ready handoff rows and reports feed-table provisioning state. When an Ecomm or Packaging Workstream Card enters `Ready for Photo`, the backend upserts that row into the Creative Force Product Feed automatically; there is no manual sync action. Blockers remain in Products and Planning; the Airtable feed remains a single-purpose integration surface, not a PM workflow or reporting table. The physical table was provisioned on 2026-08-12 as `tblxEmSy1xZLHtEWW`.

The Planning-level photo-group release must reconcile every linked Ecomm or Packaging card that is `Ready for Photo`, including cards that were already in that status before the request. This keeps Edit Photo Group -> Move to Photo idempotent and ensures a re-save or group release cannot skip the automatic Creative Force feed projection merely because no child status update was needed.
### Workstream add versus switch

The workstream-card modal uses the selected deliverables to make the intended operation explicit: retaining the current type while selecting the other adds a sibling; deselecting the current type and selecting the other switches the existing card in place. Once both Ecomm and Packaging cards exist for the same Received Merch, neither can be added or changed from its card; removal is the only workstream-structure action. This keeps the UI aligned with the two-card operating model and avoids silently replacing an existing deliverable.

Removing a workstream deletes only the child Workstream Card. The parent Received Merch remains the source record: it keeps its remaining deliverables when another child exists, and returns to merchandise review when the removed card was the last photo workstream.
The removal confirmation is the commit point for the modal. Once the delete succeeds, close the card immediately and refresh the board afterward; refresh failure must not make a successful deletion appear unsuccessful.

Activation is a separate fourth step from Product data. Creative Force handoff configuration and activation must not inflate the Step 3 Product-data missing count; each has its own validation/action surface. Structure is optional activation context and is not part of the Move to Photo completion gate.

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

Planning queue placement is represented to the UI/API by one derived `planningStatus` value: `new`, `needs-product-work`, `awaiting-info`, or `ready-for-photo`. The board must not use browser-local queue overrides or make PM-visible placement depend on hidden client state. Existing Airtable Merchandise intake fields and Workstream Card status remain compatibility storage for this slice; the backend derives and returns the normalized status and accepts it on explicit queue updates. The four columns therefore have clear meanings: New Merch, Needs Product / Work, Awaiting Info, and Ready for Photo. The final Ready for Photo group commit is the only path that releases eligible work and populates the Creative Force Product Feed.
