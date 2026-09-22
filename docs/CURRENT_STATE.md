## 2026-09-22 - Planning and operations checkpoint verified

The accumulated Planning, Activation, Requests, permissions, source-data, filename, navigation, and workspace-polish work is captured as one repository checkpoint. The full backend/frontend unit suite passes 843 tests, the production frontend build passes, and `git diff --check` reports no whitespace errors. The frontend build retains its existing large-chunk warning.

## 2026-09-21 - Activation SKU copy simplified

The Activation item section now uses the instruction `Add an item to activate.` and labels both add controls `Add SKU`. Behavior is unchanged.

Verification: `npm --prefix frontend run build` passed and `tests.test_frontend_routing` passed 175 tests. The existing Vite large-chunk warning remains.

## 2026-09-21 - Activation subject convention restored

Activation email subjects now use the established Topco convention, `Topco eComm Photo Request - [Project Name]`. A blank Project name uses `Photo request` instead of leaving a dangling hyphen. The preview renders the same generated subject that is stored and passed to Compose email.

Verification: `npm --prefix frontend run build` passed and `tests.test_frontend_routing` passed 175 tests. The existing Vite large-chunk warning remains.

## 2026-09-21 - Activation email table stabilized

The copied Activation email now enforces `WKFT #` and `MediaBox #` at final HTML generation, uses a fixed table layout with deliberate SKU column widths, and prevents header wrapping. This keeps pasted messages readable across mail clients even when their table rendering differs from the browser preview.

Verification: `npm --prefix frontend run build` passed and `tests.test_frontend_routing` passed 175 tests. The existing Vite large-chunk warning remains.

## 2026-09-21 - Activation email preview actions simplified

The Activation modal header, deliverable badge, internal headings, and preview typography are smaller, and the body begins closer to the header. Project name no longer displays an Optional helper. Activation email columns use `WKFT #` and `MediaBox #`. The automatic-send checkbox is removed: activation now preserves the manual handoff, with adjacent `Copy email` and `Compose email` actions; Compose opens the user's mail client with the preview subject populated and no body so the formatted clipboard content can be pasted.

Verification: `npm --prefix frontend run build` passed and `tests.test_frontend_routing` passed 175 tests. The existing Vite large-chunk warning remains.

## 2026-09-21 - Activation modal left pane condensed

The Activation modal now gives the form roughly 40% of the two-pane layout and reserves the wider side for the email preview. The form uses shorter controls, tighter section and item spacing, and a single bordered five-column validated-details strip instead of nested detail tiles. A draggable divider now resizes the panes within guarded minimum widths; arrow keys adjust it, double-click restores the default split, and the divider disappears when responsive behavior stacks the panes on narrower windows.

Verification: `npm --prefix frontend run build` passed and `tests.test_frontend_routing` passed 175 tests. The existing Vite large-chunk warning remains.

## 2026-09-21 - Planning Board controls share one height

The Table / Board switcher, deliverable filter, and grouping filter now use an explicit 36px outer height. The segmented switcher uses fixed 28px inner links so font metrics and padding cannot make it taller than the adjacent native selects.

Verification: `npm run build` passed and `tests.test_frontend_routing` passed 175 tests.

## 2026-09-21 - Planning Board control strip uses board navy

The Board view control strip now uses the same dark navy as the board canvas instead of the light gray Table surface. The Table / Board switcher and filters remain light for contrast and retain their fixed shared position.

Verification: `npm run build` passed and `tests.test_frontend_routing` passed 175 tests.

## 2026-09-21 - Shipments badge spacing tightened

The THR3D / Outgoing count badge in the primary Shipments navigation now sits four pixels closer to the Shipments label. Navigation behavior and badge meaning are unchanged.

Verification: `npm run build` passed and `tests.test_frontend_routing` passed 175 tests.

## 2026-09-21 - Deliverable footer actions grouped

The Planning modal now keeps `Add Pack/Ecomm Deliverable` directly beside `Remove This Deliverable` as one compact action group. Add precedes Remove, the pair aligns to the right edge of the image footer, and narrow layouts wrap the controls together rather than pinning Remove independently.

Verification: `npm run build` passed and `tests.test_frontend_routing` passed 175 tests.

## 2026-09-21 - Planning Table and Board share one control anchor

Planning Table and Board now place the Table / Board switcher at the same top-left content inset and in the same control-row position, including both loading states. View-specific filters continue immediately to its right with matching light surfaces, heights, borders, and spacing. The Table summary is compact and trails the same row instead of creating a separate header; Board feedback uses that trailing space while its darker canvas begins below the shared control band.

Verification: `npm run build` passed and `tests.test_frontend_routing` passed 175 tests. The existing Vite large-chunk warning remains.

## 2026-09-21 - Review checkpoint and bulk photo activation

Planning now separates data save, route commitment, and execution authorization. Saving Newly Received Merchandise always moves the parent into Review without creating child work, while saving from Review keeps it there. Review exposes a separately validated `Move to Ready to Activate` command that creates route-specific Ecomm/Packaging cards; THR3D commitment continues to create a Shipments/Outgoing shipping item. Ready photo cards support same-client, same-deliverable multi-selection and open one bulk Activation package. Newly Received never renders Activate, including while a save is in progress.

Verification: frontend `npm run build` passed; `tests.test_intake_decisions` and `tests.test_release_to_production` passed; the updated `tests.test_frontend_routing` suite passed. The existing Vite large-chunk warning remains.

## 2026-09-21 - Workspace view switcher moved into filter rows

Workspace Table and Board now render the shared Table / Board switcher as the first control in their filter rows. The table view places it before the record-type tabs, search, deliverable filter, and Columns menu. The board view places it before the deliverable and grouping filters. The board loading state renders that same compact control row with disabled filters, avoiding the former centered dark header flash. The change is presentation-only and does not change saved view preference behavior, filtering, board queues, schema, or workflow state.

Verification: `npm run build` in `frontend/` passed with the existing Vite large-chunk warning.

## 2026-09-21 - Planning deliverable controls clarified

- Planning deliverable cards now label the destructive action `Remove This Deliverable` instead of using legacy Workstream language.
- The received timestamp sits directly beneath the merchandise image controls.
- The add action names the available photo deliverable explicitly: `Add Ecomm Deliverable` or `Add Pack Deliverable`.


## 2026-09-17 - Workspace client controls removed

Workspace no longer displays a Client column or a page-level client selector. The current operational view is Topco-focused, while linked Client data remains internal for requirement configuration and authorization. Shipments retains its local client selector as the explicit exception.

Resolved on 2026-09-18: repeated page-level client filters are replaced by the session-wide Active Client boundary documented below. Non-admins see one Client at a time; only admins may use an all-client view.

Verification: `python3 -m unittest tests.test_frontend_routing -q` passed 159 tests. `npm run build` passed with the existing Vite large-chunk warning.


## 2026-09-17 - Product match folded into Product Name

Workspace no longer has a separate Product Match column. The Product Name cell carries the linked Product value and shows a green check when the Merchandise is matched. Unmatched rows show `Not matched` in that same Product Name column; matching still opens through the row's Planning action. Product Name remains inline-editable after matching.

Verification: `python3 -m unittest tests.test_frontend_routing -q` passed 159 tests. `npm run build` passed with the existing Vite large-chunk warning.


## 2026-09-17 - Workspace and Admin navigation cleanup

Primary navigation now orders Workspace immediately before Planning and gives Workspace a list icon distinct from Planning's columns icon. Planning's legacy `/work` matcher is exact enough that `/workspace` no longer activates both tabs.

Admin has no desktop or mobile top-navigation shortcut. Users with admin access see Admin only after opening the user menu; non-admin users do not see that option. Admin routes and authorization are unchanged.

Verification: `python3 -m unittest tests.test_frontend_routing -q` passed 159 tests. `npm run build` passed with the existing Vite large-chunk warning.


## 2026-09-17 - Workspace requirement-grid refinement

Workspace now shows the union of a client's configured Packaging/Ecomm Product requirements before deliverables are selected, so early merchandise rows expose the information PMs need to collect instead of appearing empty. After photo deliverables are selected, the row narrows to those deliverables' configured requirements. THR3D-only rows retain their minimal non-Product path and are not marked as missing photo Product data.

The Product-info condition is now an early, prominent table column. Merchandise photo and identity columns remain visible while scrolling horizontally, and inline Product editing continues to use the existing Product endpoint and validation.


## 2026-09-17 - Merchandise removed from primary navigation

The standalone Merchandise/Inventory page is no longer shown in the main top navigation. Workspace is the visible high-volume merchandise surface. The existing `/merchandise` route, page, role permissions, and direct-link behavior remain available for compatibility and physical inventory use.

Verification: `python3 -m unittest tests.test_frontend_routing -q` passed 159 tests. `npm run build` passed with the existing Vite large-chunk warning.


## 2026-09-17 - High-volume Workspace grid

A new top-level `Workspace` page at `/workspace` is available to Admin, Producer, User, and PM roles. It is a dense one-row-per-Merchandise operational grid backed by the existing Merchandise review feed, linked Products, and Client photo-production requirements.

The grid derives its editable Product columns from each row's selected Packaging/Ecomm deliverables and the corresponding `Clients.Photo Production Requirements` configuration. Product Name and the client identifier are included for photo work, while other required columns come only from client configuration. Missing required values are highlighted per cell and summarized per row; the page adds no statuses and does not change Planning queue placement.

Linked Product fields save inline on blur or Enter through the existing Product update endpoint. A matched Merchandise row uses the linked Product name and identifier in its Merchandise summary, so an inline UPC / Product ID edit is reflected immediately in both the editable Product column and the frozen Merchandise column; the original received name remains visible as provenance when it differs. Unmatched rows remain read-only in Product columns and use the shared in-place Merchandise modal for matching or workflow decisions. Search and the summary filters support high-volume review.

The Workspace table no longer carries separate Product Info or Actions columns. Missing Product values are visible in their highlighted field cells, and missing Product match/name also highlights the Merchandise cell. Compact Ecomm, Pack, and THR3D badges sit with the merchandise identity. Clicking the thumbnail opens the shared Merchandise Planning modal over Workspace, keeping the table in place while preserving the existing Product, deliverable, issue, comment, history, and Draft -> Commit behavior. Saving refreshes the Workspace rows; no second quick-view implementation was introduced.

Workspace now has All, Planning, and Production record-type tabs. Planning contains one row per Merchandise record only while it has no Ecomm or Packaging Workstream Card. Production contains one row per Ecomm or Packaging Workstream Card, so Merchandise with both deliverables appears twice with independent Planning Status, Creative Force status, and current step. All combines those sets with explicit Planning and Production section rows; it never shows both a parent Merchandise row and its child photo cards. A Production-row thumbnail opens that exact Workstream Card in the shared modal.

The `Merch received` column remains Merchandise-owned in every tab. Production-card rows inherit the parent Merchandise arrival date, with Shipment received date as a fallback, rather than leaving that lifecycle context blank.

All three Workspace summary segments are interactive filters: All Items restores the full set, Need info shows rows with missing requirements, and Info complete shows rows with no missing requirements. Search continues to narrow the selected segment.

The released timestamp badge in the Planning merchandise record uses explicit white text on its green background for consistent contrast.

Verification: `python3 -m unittest tests.test_frontend_routing -q` passed 159 tests. `npm run build` passed; Vite retains the existing large-chunk warning.

# Current State

## 2026-09-19 - Phase 1 Action model

The live Airtable Workstream Cards table was evolved in place into Actions; no parallel Actions table was created. Its primary field is now Action, Received Merch is now Merchandise, and Workstream Type is now Action Type. The table adds the single lifecycle Status (Proposed, Activated, Executing, Done, Cancelled), Activated At, Activated By, External Reference, and Cancellation / Reversal Reason. Three existing photo records were backfilled and one existing THR3D Shipping Item was imported as an Action. A post-migration dry run reported zero remaining updates or imports.

The compatibility layer still uses the existing photo-specific fields on Actions for Creative Force handoff and the existing THR3D Shipping Items table for outbound carrier/tracking details. New photo assignments are Actions directly. New THR3D assignments create the canonical Action plus a temporary compatibility shipping record. Photo Action activation performs the existing Creative Force feed handoff and stamps the activation/release fields. Creative Force events advance Actions to Executing or Done; shipping a THR3D compatibility record marks its linked Action Done.

Workspace's shared Merchandise modal now shows the derived EXPECTED -> RECEIVED -> REVIEW -> ACTIVATE -> EXECUTE -> DONE lifecycle, explicit Review reasons, and independent Action rows with Activate and Reverse controls. The lifecycle and reasons are API-derived rather than stored as another status model. The Product grid and source-detail UI display the existing Products.Mbox Number value as MediaBox Number; no MediaBox table was created. Dashboard and database infrastructure were not redesigned.

Verification on 2026-09-19: the post-migration Actions dry run reported the table and all fields reused with zero record updates and zero THR3D imports remaining. The backend suite passed 818 tests. The frontend production build passed with the existing Vite large-chunk advisory. Both existing local servers responded successfully at ports 5057 and 5173.

## 2026-09-18 - Active Client workspace boundary

Authenticated sessions now carry an `activeClientId` in addition to the user's durable Client access assignments. A non-admin with one assigned Client enters that Client automatically. A non-admin with multiple assigned Clients must choose one before operational routes render, and backend record filters and mutation checks authorize only that active Client. The Client list remains entitlement-scoped so the chooser can show every Client assigned to the user. Non-admins cannot clear the selection or enter an all-client operational view.

Admins may select a Client or use `All Clients`. The top navigation owns the system-wide selector, and changing it reloads the application so open drafts and cached data cannot cross the Client boundary. This uses signed session state only and adds no Airtable field or schema. Client-specific Product import profiles and photo-production requirements continue to drive the fields shown within the selected Client. A broader explicit capability setting for disabling whole workflows such as THR3D per Client remains a separate configuration slice; it was not inferred from the current photo requirements JSON.

Verification: `backend/.venv/bin/python -m unittest discover -s tests` passed 809 tests; `npm run build` in `frontend/` passed with the existing Vite large-chunk warning; `git diff --check` passed. Automated browser inspection was unavailable because the local workspace path is a symlink that the browser sandbox cannot mount.

## 2026-09-18 - Canonical roles and guarded views

Role navigation now loads from the shared Airtable `Role Policies` table, with the checked-in `ROLE_NAV` matrix as the fallback and initial seed. The former `marks:role-permissions` browser-local setting is no longer read or written; it allowed two browsers to show different permissions for the same user. Admin > Roles edits the operational workspace paths for Producer, Merch, User, and Viewer and saves them centrally. Producer was seeded with Dashboard, Import, Shipments, Workspace, Planning, Production, and Products.

Only Admin and Administrator roles receive the Administration menu, may enter Administration routes, list/create/update Users, request the all-client list, edit Role Policies, or run Developer Tools maintenance actions. Admin access is intentionally fixed and cannot be delegated through the role editor. Operational routes enforce the shared role matrix on direct navigation and redirect an unauthorized user to their first permitted workspace. Profile editing remains available to every authenticated user through `/auth/me`.

The active Client selector was reduced to a compact 150px control aligned with the profile button; the visible `CLIENT` caption was removed while retaining an accessible label.

Verification: `backend/.venv/bin/python -m unittest discover -s tests` passed 815 tests; `npm run build` in `frontend/` passed with the existing Vite large-chunk warning; `git diff --check` passed.

The live Airtable base now contains `Role Policies` with `Role` and `Workspace Paths` fields and seeded rows for Admin, Producer, Merch, User, and Viewer.

## 2026-09-18 - Workspace lifecycle column groups

Workspace now presents one merchandise row across three explicit ownership groups: Merchandise, Planning, and Production. Merchandise contains the physical identity and received age. Planning contains the missing-information summary, client-configured Product fields, human-readable Planning status, and the action into Planning or Production. Production is glance-only and shows derived Creative Force status, current reported step, and time since that step update.

Workspace requests released and unreleased Merchandise. The ordinary Planning/review endpoint remains unreleased-only unless `includeReleased=1` is requested, so expanding Workspace does not return completed/released work to Planning. Production values come from the existing Product production summary built from Workstream Cards, THR3D Shipping Items, and Creative Force Sync; no Product or Merchandise production status field was added. Photo work not yet released says `Not released`. THR3D-only or otherwise non-photo work says `Not applicable` / `No photo workflow`.

Verification: `backend/.venv/bin/python -m unittest discover -s tests` passed 816 tests; `npm run build` in `frontend/` passed with the existing Vite large-chunk warning; `git diff --check` passed.

Marks Photo is an Operations Readiness Platform. The target philosophy is now product-led and merchandise-verified.

The app transforms expected product data and incoming physical merchandise into production-ready work. Expected Products are the normal operating spine; Received Merch verifies physical arrival, quantity, condition, storage, and evidence. Unmatched merchandise is an exception path. Marks Photo should not become a workflow engine, project management tool, Creative Force replacement, or PhotoTrack replacement.

The Topco Product import now recognizes `Product Name`, `UPC`, `CVID`, and `Brand Prefix` as Product data. UPC remains written to the compatibility `Identifier` match field so existing merchandise matching continues to work, while also being stored in the dedicated `UPC` field. CVID and Brand Prefix are stored separately. Vendor, received quantity/date, and merchandise status remain receiving facts and are not imported as Product operational fields.

Topco Product import commits now add reversible source snapshot metadata inside the existing Product `Reference Data` JSON under `_sourceSnapshot`. The snapshot records the client, source spreadsheet name, `Master Tracker 2026` tab, source row number when known, checked timestamp, match method, actionable reason, and source identity values for Product Name and UPC. This is metadata only: it does not add an Airtable table or field, does not write back to Google Sheets, does not overwrite source Product facts, and does not change Planning routing or status behavior. Product Import remains available as the bulk upload/mapping/validation path.

The Products workspace now includes a reversible Source Lookup mode for Topco. It is a Product-grid panel that reads the shared `TOPCO (MARKS) PROJECTS` Google Sheet CSV export for `Master Tracker 2026` range `A5:AE25`, matches those first 20 source data rows to all accessible Marks Product records by UPC first and exact Product Name second, and returns source-only rows when no Product exists. It only returns the source fields Source Lookup currently cares about: `Product Name`, `CVID`, `UPC`, `Brand Prefix`, `Request Type`, `WKFT #`, `Mbox #`, `Product Type`, `Prod Descrip`, `Link to Prepro/Overlays`, `Path to Art`, and `Photo Notes`. Source Lookup search/filter is local to the loaded source rows. Previewing, searching, or rechecking Source Lookup does not write the live Google Sheet, create Products, route Merchandise, create work, or update status. `Activate in Marks` is the only commit point: it creates or updates exactly one local Topco Product from the selected source row, stores `_sourceSnapshot` in Product `Reference Data` with `matchMethod` `Source Lookup` and `actionableReason` `activate_in_marks`, then refreshes Products and Source Lookup so the row shows Product Data found in application. Activation is idempotent: an existing Product with the same Topco `_sourceSnapshot` row is updated first, then an existing same-client UPC Product is updated, and a new Product is created only when neither exists. A selected source row is sufficient to activate the local Product even when UPC is blank; UPC can arrive later from the source sheet and will update the same Product by `_sourceSnapshot` row. The backend now exposes an admin-only manual refresh endpoint for existing source-linked Topco Products: `POST /api/source-check/topco/refresh-linked-products`, and the Flask app starts a background source refresh worker when enabled. The Products toolbar exposes this as `Sync Products` for Admin users; it reads the source sheet and writes changed source-owned values into existing source-linked local Product records, then reloads the Products grid and Source Lookup. Refresh behavior is defined on the client readiness/source profile under `sourceRefresh`; Topco is seeded with provider `topco`, a default 300-second interval, and a 100 Product limit. Admin > Clients displays a compact Source Lookup settings summary with Source sync, match identity, and activation first; detailed request-type mappings and required-to-proceed rules are collapsed behind Details. Admins can edit Source sync enabled/disabled, refresh interval in minutes, and Products per refresh. The saved setting is stored in the existing Client Photo Production Requirements JSON under `sourceRefresh`; no Airtable table or field was added. The worker polls enabled client refresh configs and only updates local Products that already have `_sourceSnapshot`; it does not create Products for unmatched source rows, run Product Import planning, route work, or write to Google Sheets. Planning cards no longer refresh individual source rows when opened; they rely on the backend timed refresh/manual endpoint for local Product freshness.

Shipments now has the first reversible source-match slice for Topco. For clients with Source Check rules, including Topco, Shipments matching no longer performs local Product lookup for suggestions; the match suggestions come from the read-only source sheet. The match UI shows source-backed candidates as `Possible Product Matches`. These suggestions read the Topco source sheet read-only using the Merchandise `Product Name on Package` and `UPC / ID` clues and do not create or update Products while previewing. The visible matching rows stay focused on product identity instead of showing Request Type or required-to-proceed notes. Source-backed suggestions can be found from the UPC / ID field alone, including UPC digit fragments, and rows that match both typed Product Name and UPC / ID rank above rows matching only one clue. Source rows without a usable UPC can still be selected with `Match`, and the receiver sees the normal `Matched Product` card. On save, the app creates or updates one local Product linked to that selected source row, stores `_sourceSnapshot`, and links the Merchandise even if UPC is blank. Saved Merchandise source-backed rows use `Match` and the same idempotent Topco activation path. Add Merchandise source-backed rows also use `Match`: selecting one only stages it on the draft form and shows the normal `Matched Product` card, including the `Use Product Name` / `Use Product UPC` correction actions when observed package values differ or are blank. Those correction actions update the observed package fields without clearing the staged source-backed Product match. When the receiver saves the Merchandise, the app creates the Merchandise record first, then activates/updates the Product from the staged source row. If UPC is added to that Google Sheet row later, the timed source refresh updates the same Product by `_sourceSnapshot` row instead of creating a duplicate. If the source row's Request Type is cleared later, that same source-linked refresh clears the local Product Request Type so Planning no longer suggests deliverables from stale source data. Add Merchandise no longer shows a Product `No matches found` instruction or `No clear match` button; saving without choosing a match keeps the Merchandise unmatched for later review without creating an explicit no-clear-match state. While typing, Topco Add Merchandise shows one product-match search/results surface from the source sheet. Reopening unmatched Merchandise in Shipments keeps matching/search available, including read-only source-backed suggestions. It does not write to Google Sheets, create Planning cards, route work, or create THR3D items. If no source row is selected, Merchandise can still save unmatched through the existing path.

Source Lookup keeps the comparison details from Source Check. It shows `Last checked`, provides a no-write `Recheck source sheet` refresh of the live source rows plus current Marks Product data, displays `In Application` beside `In Source Sheet`, and reports `Result`. It shows whether Product Data was found in the application, the source row number, and match method. Source Lookup reads client `sourceCheckRules` / `readinessProfile.sourceCheckRules` when available and keeps a Topco fallback in the same rules shape instead of hard-coding comparison behavior inside the panel. Admin > Clients still shows the configured Source Check rules as a read-only client setting summary: source identity fields, activation field, Request Type mapping, source field usage, and required-to-proceed fields by expected work. For Topco, source identity is Product Name + UPC, activation is Request Type, and the Request Type mapping suggests expected work only: `Ecomm Only` -> Ecomm required to proceed, `Pack Only` -> Packaging required to proceed, `Ecomm & Pack` -> Ecomm + Packaging required to proceed, `Pack & Thr3d` -> Packaging required to proceed plus THR3D shipment context, and `Thr3d Only` / `Not Needed` -> no Walnut work expected with an alert if merchandise arrives. Required-to-proceed fields are `Product Name`, `UPC`, and `WKFT Job Number` for Packaging, and `Product Name`, `UPC`, and `CVID` for Ecomm. UPC is treated as required for both matching and folder naming including Ecomm folder naming, WKFT Job Number for Topco folder naming/handoff, and CVID for Ecomm file naming. For this Topco slice, source `Prod Descrip` is displayed as Product Description and also satisfies the packaging `File Name Description` filename/handoff token; no Airtable field is added for that mapping. Non-required physical/noise source sheet fields such as merch status, vendor, received date, studio destination, and quantity received are ignored by Source Lookup. Summary language is readiness-focused: rows checked, ready, missing in source sheet, needs review, and ambiguous match. Fixture coverage in `tests/test_source_check.py` verifies the Topco Request Type mappings, required-to-proceed field sets, missing UPC/Job Number/CVID rows, unknown Request Type rows, ignored extra sheet columns, the no-write preview contract, and one-row activation create/update behavior.

Shipment and Merchandise Review capture surfaces use receiver-facing labels `Product Name on Package` and `UPC / ID`, with the human-readable package name shown first in Shipment capture. These labels map to the existing observed merchandise name and identifier fields; technical Airtable names such as `Observed Package Name` remain implementation/schema names only. Product match suggestions use both fields when both are present: exact UPC/ID matches can stand on their own, but partial identifier matches must intersect with product-name results before they are shown. Combined matching requests a larger hidden candidate pool from both searches before intersecting so broad UPC prefixes such as `368` do not lose valid product-name matches to unrelated UPC contains results. Identifier scoring prefers true UPC/ID prefixes over values that merely contain the query later in the string. When no Product matches both fields, the panel says so and asks the receiver to check one of the fields or clear one field to search by the other. Identifier-only results may show `Exact`, `UPC prefix`, or `ID prefix` confidence badges. Combined partial name + UPC/ID results are presented as `Possible products` with `Possible` badges and helper copy explaining that they match the typed name and identifier prefix. Broad name-only results are also presented as `Possible products` without a `Best` badge, with helper copy prompting the receiver to enter or scan UPC / ID to confirm the exact Product. Suggestion cards show `Matched by UPC` when the identifier looks exact or identifier-only, `Matched by Product ID` for non-UPC identifiers, `Matches typed name + UPC/ID prefix` for combined partial matches, and `Matched by product name` for fallback name results. Name-based suggestions also show the candidate Product's UPC/ID so receivers can compare it to the physical package before choosing. Selecting a Product match shows a `Matched Product` card with the linked Product's real name and Product UPC/ID, but it does not silently overwrite observed package fields. Editing saved Merchandise rehydrates that card from the linked Product summary, not from the observed package name. When the observed package name and UPC/ID exactly agree with the linked Product, Shipments and Planning collapse the duplicate identity inputs and use the `Matched Product` card as the compact identity display. If the observed package name or UPC/ID is blank, the selected card offers explicit `Use Product Name` or `Use Product UPC/Product ID` actions; if either observed value differs from the Product value, the card warns without replacing the observed evidence and the editable observed fields remain visible. Clicking `Change` on a matched Product starts replacement selection: the current linked Product card is hidden, the observed fields and matching suggestions appear again, and the current Product may appear as an exact selectable suggestion when the entered package name and UPC/ID still match it.

Shipment capture keeps the `Add Merchandise` panel editable even before the Shipment has been saved, so receivers can stage the item they are holding without the form feeling blocked. For current Topco testing, a blank new Shipment defaults the Client selector to Topco when that client is available; saved Shipments and manual client choices are not overwritten. Shipment Details keeps Tracking Number and Box Quantity on one compact row. Shipment Photos and Merchandise Photos use inline red `* Required` text while empty; the marker disappears once a photo or local preview is present, and the unsaved Shipment photo callout is no longer shown. Merchandise photo thumbnails render under the Take Photo / Library buttons, matching the Shipment Photos column order. The three incoming Shipments columns stretch to the full available workspace height, with each column scrolling internally as needed. Saved merchandise rows use a normal thumbnail / copy / action-column layout: the metadata line shows quantity plus matched/unmatched state, the merchandise status chip sits near the top-right without forcing title truncation, product names can show up to two lines, and removal uses an icon button instead of circled text. `Save & next` still refuses to commit Merchandise until the Shipment exists and shows a Step 2 validation message directing the receiver to add Shipment Photos in Shipment Details first. The current Shipment save path remains adding Shipment Photos, which creates/saves the Shipment context.

Spreadsheet imports now also offer `Import Products Only`. This mode creates or updates Products without requiring a Job, creating a Job, or linking Products to a Job. Existing Job import modes are unchanged.

The Preview page allows the PM to choose the spreadsheet header row, with automatic detection as the default. Automatic detection chooses the strongest populated header-like row in the opening rows instead of blindly using the first non-empty setup row. The selected 1-based row is preserved when the file is re-parsed, including sparse XLSX files whose XML omits blank rows, so workbooks with title or setup rows above the real headers can be mapped correctly. The Topco tracker uses row 4.

Product mapping options now include the newer expected-data fields already present in Airtable: Request Type, Project Status, WKFT Job Number, Mbox Number, Product Type, Product Description, Link to Prepro/Overlays, Ecomm Photo Notes, and Path to Art. Vendor, Merch Status, Date Received, and Studio/Qty Received remain excluded from Product mapping because they describe received physical merchandise.

Product Request Type imports and inline Product grid edits now use the Topco tracker vocabulary: `Ecomm only`, `Pack only`, `Thr3d only`, `Pack & Thr3d`, and `Ecomm & Pack`. The live Airtable `Products.Request Type` single-select field has the same five choices. Common aliases such as `Ecomm`, `Packaging`, `ThreeD`, `Pack and Thr3d`, and `Ecomm and Pack` normalize to those exact labels. Inline Product grid saves typecast controlled Product select fields so the approved Product options can be saved consistently to Airtable. Blank Product select placeholders are display-only: the UI does not offer them as selectable options and the backend ignores blank controlled-select writes so it does not create empty Airtable options or send null select values. Request Type remains Product request metadata only; it does not create Planning deliverables, workstream cards, or THR3D shipping items by itself.

The Planning Release view's `Newly Received Merch` cards stay identity-focused and do not show suggested Packaging/Ecomm/Thr3d badges or deliverables-missing text before PM review. They show the item title plus UPC / ID and matched/unmatched state; deliverable and missing-info messaging belongs after the physical merchandise has been accepted into the later Planning sections. Opening a `Newly Received Merch` card now treats `Merch Check` as physical acceptance and match confirmation only: it shows photos, observed package identity, and the matched/unmatched Product state, but it does not preselect Product Request Type deliverables, render the Deliverables selector, or show Product-data-for-photo requirements. `No clear match` is draft-only in this first-column modal: it changes the open modal state, but it does not clear the Product link or move the card until the PM clicks `Accept merchandise`. The primary action is `Accept merchandise`; accepted items move forward for product/work planning without creating workstreams, routing photo work, or exposing source-sync mechanics in the review step. Planning Release cards show elapsed time since the shipment was received rather than a bucket label: `30m`, `5h`, `1d`, `20d`. The previous bucket label rendered `New` for anything under a day, which only restated the `Newly Received Merch` column title and hid the one fact the card cannot otherwise convey, namely how long the item has been sitting. Tone thresholds are unchanged: amber from 7 days, red from 14. A missing or future received date falls back to the old bucket label rather than rendering negative time. `ageBucketForItem` is still used by other surfaces.

Planning Release cards show the client as an eyebrow above the product name when the signed-in user can see more than one client. `showNewCardClient` was already computed for this and passed into the Release view, but the view destructured it without using it, so client appeared nowhere on the board once the client prefix was also dropped from shipment group headers.

Empty Planning Release columns all render the same `No cards here.` placeholder. The check previously counted shipment groups instead of items; grouped sections produce an empty list when they have no items, but ungrouped sections always produce one pseudo-group, so `Awaiting Photo Release` rendered nothing at all while the grouped columns rendered the placeholder. The Release view has a `Group by shipment` display option that groups only `Newly Received Merch` and `Needs More Information`; `Awaiting Photo Release` remains ungrouped. Group headers show only the right-aligned shipment received date/time, without a duplicate left-side timestamp or repeated client prefix. When a grouped Planning item has a linked Shipment id, that received date/time links to `/shipments?shipmentId=...`; the Shipments page opens that Shipment on load.

Planning now writes only three active Planning Status values: `New`, `Needs More Information`, and `Awaiting Photo Release`. `Awaiting Photo Release` is the PM-owned waiting lane for work that is ready but still needs the final photo release. The explicit `Release to Photo` action performs the Creative Force handoff. Raw status updates no longer populate Creative Force feed rows; the release path does. Released work is tracked by the release audit fields and leaves active Planning through those fields rather than by writing a fourth Planning Status.

Product Type imports normalize wrapping quote characters and write the active Airtable choice `Refridgeration Req`; the active field option still needs to be corrected to `Refrigeration Req` in Airtable.

The import UI no longer exposes the internal `Primary Match Key` or Airtable `Identifier` compatibility field. Existing saved `Identifier` mappings are displayed as `UPC`, and the backend continues to accept the legacy target so merchandise matching is not disrupted.

The visible Product mapping list now ends at `Path to Art`; older duplicate destinations below it are hidden. `Reference Data` is also hidden as a manual choice for now. Every imported source row is automatically preserved as JSON in Product `Reference Data`, including values not mapped to visible Product fields.

Client Product Import Profiles can now be deleted from the mapping editor with confirmation. If the deleted profile was the default, another remaining profile is promoted automatically.

When the Map Fields step opens, the client’s configured default saved Product Import Profile is automatically selected and applied. If the stored default name is missing or stale, the first saved profile is used. PMs can still choose a different saved profile from the dropdown.

UPC validation is intentionally permissive for now: the importer does not enforce 12 digits, and literal `NO UPC` values are accepted. The live Airtable `Products.UPC` field is `singleLineText`, and XLSX imports preserve leading zeroes when Excel stores a numeric UPC with a zero-padded format such as `000000000000`. More specific UPC and identifier validation will be added later.

The live Products table no longer has the old `Identifier` field. Backend compatibility references now resolve to the real `UPC` field, so Product imports and writes do not attempt to use the deleted Airtable column.

Product photo-data edits now write the live Products field `WKFT Job Number` for the compatibility API property `itemJobNumber`; the old `Product Job Number` field is not present in Airtable. `Valid Artwork Path` writes directly to the existing plain-text `Path to Art` field; validation remains a separate readiness check and does not prevent the entered path/reference from being saved.

The Needs More Information workstream-card drawer now renders the same editable Product Data fields as the merchandise review card, scoped to the card's selected deliverable and linked Expected Product. Saving from either surface updates the shared Product record.
Workstream cards now derive that same editor from their explicit Packaging/Ecomm route when the API response does not include a populated photo-production summary. Opening a child card therefore shows its mandatory editable Product fields instead of stopping at the workstream summary.
Existing workstream cards open the shared Planning detail modal rather than presenting New Merch intake controls. They no longer show create-workstream or Previous/Next Merchandise controls. The detail surface keeps Product/photo data editable through `Save Details`; release happens from the Awaiting Photo Release surface.
The workstream drawer now has a dedicated compact card surface: deliverable/client/product context, editable required photo Product fields, merchandise facts, and only the photo-release transition when available. It no longer falls through to the generic Waiting information workspace.
When those checks are complete, `Release to Photo` opens the shared Planning photo-release utility with the current item already selected. The PM can release that item alone or add other eligible ready items, review the shared request details and email preview, save a draft without releasing anything, or commit the selected group with `Release to Photo`. The visible flow no longer presents Activation as an individual-card requirement.
When Received Merch is matched to an Expected Product and the observed package name or UPC / Product ID exactly matches the linked Product, that identity value is considered satisfied and is omitted from the downstream photo-data checklist/editor. The matched-product summary remains visible; a differing or missing observed value remains an editable requirement.

## Canonical Architecture

Active business concepts:

- Products / Expected Products: expected-work records maintained from client product-data sources and the target operating spine
- Shipments: physical merchandise entering or leaving the studio
- Received Merch: the physical lot from a Shipment and evidence/inventory attached to Expected Product when matched
- New Merch: exception-focused PM intake list for unmatched or unclear Received Merch
- Workstream cards: child Ecomm or Packaging work created from product/work need once enough product and merch facts exist
- THR3D shipping items: outbound physical movement items, not production cards
- Planning: PM-owned preparation through product/work readiness and New Merch exception resolution
- Jobs: supporting production/reporting references
- THR3D: a Merchandise `Deliverables` value and an outgoing shipment queue inside Shipments

Active Airtable tables:

- Products
- Jobs
- Clients
- Shipments
- Locations
- Users
- Issues
- Imports
- Merchandise
- Comments
- Workstream Cards
- THR3D Shipping Items

History remains present as existing audit data, but it is not a workflow engine.

Admin > Developer Tools now exposes `Reset Test Data` as the development-only clean-slate action. It deletes workflow/testing records from Comments, Workstream Cards, THR3D Shipping Items, Activations, Issues, History, Imports, Merchandise, Shipments, Products, and Jobs, and it attempts to delete only the R2 uploaded photo objects referenced by the deleted Shipment and Merchandise records. Clients, Users, Locations, Airtable schema, field options, and client configuration are intentionally preserved.

Products are included because they are re-importable from client product-data sources rather than authored in Marks Photo, so a cleared Products table can be rebuilt from the source of truth. Clients, Users, and Locations are configured in the app with no upstream source, so they are preserved. The typed confirmation phrase is `DELETE TEST DATA AND PRODUCTS`.

## Planning

Planning is in transition from a merchandise-driven implementation toward the product-led, merch-verified target model.

Clarified target operating model:

- Expected Product is the normal operating record. It describes what work is expected and what client/reporting facts belong to the item.
- Received Merch is the physical lot captured from a Shipment. It keeps physical facts such as quantity, photos, storage, observed identifiers, notes, and `Merch Status`, and normally attaches to Expected Product at check-in.
- New Merch is an exception-focused intake list for unmatched or unclear Received Merch where PMs confirm identity and assign production intent.
- Workflow/work units are created from product/work need once enough product and merch facts exist: separate Ecomm and Packaging workstream cards, plus a THR3D shipping item when needed.
- Ecomm and THR3D are mutually exclusive GS1 paths. Packaging can pair with either Ecomm or THR3D.
- Packaging and Ecomm are separate workstream cards because they have different dependencies.
- THR3D is a shipping item only. It needs quantity-to-ship and outbound shipment tracking, not a production card.
- Workstream cards link back to Received Merch and to Expected Product when matched.
- Manual product information can live on Received Merch or exception/work records when no Expected Product exists, but it must not pollute imported Product truth unless a later approved reconciliation/import process promotes it.

Canonical Intake and Planning fields:

- Merchandise `Deliverables`
- Merchandise `Intake Status`
- Merchandise `Merch Status`
- Merchandise verification fields
- derived Required to Shoot blockers
- release fields: `Released`, `Released At`, `Released By`

Client-level Required to Shoot configuration is stored on `Clients.Required to Shoot`; active app code uses `requiredToShoot`.

Canonical Deliverables values are:

- `Packaging`
- `Ecomm`
- `Thr3d`

Older labels `Packaging Photo` and `Ecomm Photo` are compatibility input aliases only. Backend validation normalizes them to `Packaging` and `Ecomm`, the frontend renders only the canonical labels, and live Airtable Merchandise records were normalized on 2026-08-05 so saved rows no longer use the old photo-suffixed labels. The live `Deliverables` field was verified on 2026-08-19 to contain only `Packaging`, `Ecomm`, and `Thr3d`; the old photo-suffixed choices are gone.

Canonical Merch Status values are physical-state only:

- `Received`
- `Issue`
- `Ready to Ship`
- `Shipped`
- `Disposed`

`Matched` and `Validated` are no longer active Merchandise physical statuses. Product information can be linked or imported without changing `Merch Status`; photo/THR3D readiness is handled by Planning state and deliverables. Live Airtable Merchandise records were normalized on 2026-08-05 so existing records use `Received`, and the new `Ready to Ship`, `Shipped`, and `Disposed` choices exist. The live `Merch Status` field was verified on 2026-08-19 to contain only the five canonical physical statuses; the old `Matched` and `Validated` choices are gone.

Merchandise has `Manual Product Info` for minimum facts that should not be written to Products.

`New Merch Status` was retired on 2026-08-19. Board membership is answered structurally by whether child work records exist, so a flag restating the same fact was a second source of truth that could disagree with reality. Active code no longer reads or writes it, and the schema utility no longer creates it. The live Airtable field on Merchandise, and the retired `Workstream Cards.Status` field, are both manual deletion targets — Airtable's public metadata API cannot delete fields, so both must be removed through the Airtable UI.

The backend now supports `POST /api/merchandise/:id/confirm-assign`. It creates Ecomm and/or Packaging records in `Workstream Cards`, creates a THR3D record in `THR3D Shipping Items` when needed, links those records to Received Merch and Expected Product when supplied, stores manual product info on Received Merch/child records, and marks the parent Received Merch `New Merch Status = Workflows Created`. The endpoint rejects Ecomm + THR3D together because they are alternate GS1 paths. The backend also exposes `GET /api/workstream-cards` and `GET /api/thr3d-shipping-items` for the child records.

The Planning New Merch modal now uses `Confirm Merch` for its footer commit. It treats Newly Received Merch as merchandise acceptance/triage: the PM can confirm the physical item, move incomplete accepted items to `Needs More Information`, or raise a blocking Issue. Ecomm and Packaging child workstream creation still exists in the backend for compatibility, but the Planning Release view visually keeps one Merchandise card through `Newly Received Merch` and `Needs More Information`; Ecomm/Packaging separation should wait until release/handoff. THR3D shipping items still feed the Shipments `THR3D / Outgoing` panel when the THR3D-only path is committed. When Packaging + THR3D are both selected, the modal shows explicit quantity allocation: PMs enter the THR3D quantity and Packaging automatically receives the remaining quantity. Received quantity is shown in that split/allocation context, not in the matched Product identity card. If only one unit was received, the modal blocks the split and asks the PM to update Qty received in Shipments or choose one deliverable. The backend rejects Packaging + THR3D assignment payloads whose quantities do not add up to the parent Received Merch quantity.

Ecomm and Packaging workstream cards are visually distinct from parent Received Merch cards on the Planning board. Child cards show `Workstream Card`, workstream status, workstream type, and assigned quantity while still linking back to the parent Received Merch facts for photos, product identity, client, location, and original quantity.

Removing one of several workstream cards no longer rewrites the parent Received Merch `Planning Status`. Previously `DELETE /api/workstream-cards/:id` wrote `New` to the parent whenever any sibling card remained, which regressed already-accepted merchandise back to the first queue. The parent is off-board while any child card represents it, so only removing the last card resets the parent, and that reset writes `Needs More Information` with `Merchandise Verified` cleared.

Planning board membership for parent Received Merch is now structural. The board hides a parent when child work actually exists for it: a Packaging or Ecomm workstream card, or a THR3D shipping item. THR3D-only merchandise never produces a workstream card, so the Planning board loads `/thr3d-shipping-items` and checks both sources; checking only workstream cards would return THR3D-only merchandise to New Merch after assignment. Planning client and location filter options are derived from the rendered board items for the same reason.

The `New Merch Status` flag is gone from active code. It is no longer written by workstream-card creation, workstream-card deletion, or `confirm-assign`; it is no longer read by planning-status derivation or frontend queue placement; and it is no longer returned in merchandise API responses or created by the schema utility. `Workflows Created` was only ever a restatement of "a child record exists", which the link fields already answer. The live Airtable field is a manual deletion target.

`_planning_status_for_fields` no longer infers planning state from a combination of flags. `Planning Status` is authoritative: a canonical stored value is returned as-is, a stored value outside the canonical set yields no board placement, and only a completely empty field falls back — to `New`, or to `Needs More Information` when `Merchandise Verified` is set. The previous version also consulted `New Merch Status`, `Deliverables`, linked Product ids, and a re-read of the same Planning Status field through its intake alias, with two branches that returned the same value.

Moving an Ecomm or Packaging workstream card on the Planning board updates that child card's own `Workstream Cards.Status` through `PATCH /api/workstream-cards/:id`. The active child statuses are `New`, `Needs More Information`, and `Awaiting Photo Release`; board placement follows those same three Planning buckets. Moving a child workstream card does not rewrite the parent Received Merch physical status. The backend writes status updates with Airtable `typecast` enabled.

As of 2026-08-19 the live `Planning Status` dropdowns on both Merchandise and Workstream Cards contain exactly the three canonical choices `New`, `Needs More Information`, and `Awaiting Photo Release`, in that order. The retired `Needs Product / Work`, `Awaiting Info`, and `Ready for Photo` choices were removed manually through the Airtable field configuration UI after the metadata API refused automated pruning. `Merchandise.Merch Status` and `Merchandise.Deliverables` are likewise clean, holding only their canonical values.

Shipments `THR3D / Outgoing` now includes a direct ship action on each active THR3D shipping item. The user enters carrier and tracking, the backend creates an outbound Shipment record, links it to the THR3D shipping item, sets `Shipping Status = Shipped`, and removes the item from the active outgoing queue. If the shipped THR3D quantity equals or exceeds the parent Received Merch quantity, the parent Merchandise `Merch Status` is set to `Shipped`; partial THR3D shipments leave the parent physical status unchanged because remaining samples may still be at Walnut for Packaging.

The `Intake Status` vocabulary is gone from active code. `F_RECEIPT_ENTRY_INTAKE_STATUS` was an alias bound to the same `"Planning Status"` string, so any dict that set both keys silently kept only the last one; several writes that appeared to set `New` never did. Every call site now uses `F_RECEIPT_ENTRY_PLANNING_STATUS`, and `INTAKE_STATUS_OPTIONS` was removed as a duplicate of `PLANNING_STATUS_OPTIONS`.

API responses expose `planningStatus`, the slug used for queue placement, and `planningStatusLabel`, the stored Airtable label. The `intakeStatus` and `intake_status` aliases were removed from both requests and responses. Request payloads accept `planningStatus` or `planningStatusLabel`.

Merchandise record writes deliberately omit Airtable `typecast`. Planning Status values are normalized through `_canonical_planning_status_fields` before the write, so an Airtable rejection is the correct loud signal that something produced a non-canonical value; `typecast` would silently create the option instead.

Workstream cards use a smaller status set than merchandise: `WORKSTREAM_CARD_PLANNING_STATUS_OPTIONS` is `Needs More Information` and `Awaiting Photo Release`. Cards are created only after merchandise is accepted and deliverables are known, so they are born at `Needs More Information` and `New` was never reachable. `PATCH /api/workstream-cards/:id` rejects `New`, and the schema utility provisions the card field with the two-value list. The live `Workstream Cards.Planning Status` dropdown was reduced to those two choices on 2026-08-19 and now matches the code contract exactly; `Merchandise.Planning Status` keeps all three, because `New` is a parent-merchandise state.

The active persisted planning field is `Planning Status`, with these canonical values:

- `New`
- `Needs More Information`
- `Awaiting Photo Release`

Planning queue columns are local PM organization, not a second Airtable status. Their internal queue values remain:

- `New`
- `Needs More Information`
- `Awaiting Photo Release`

The canonical first Planning queue remains `New`, and the board displays it as `New Merch` so brand-new received merchandise has a clean inbox before PM review. Cards in that column may need a physical acceptance check, product matching, deliverables, activation, or another first PM decision. The column cards are intentionally sparse: item photo with subtle remaining-image count and age overlays, one-line product name, UPC / ID, and a single match-state marker. The match marker says `Matched` with a green check when linked to a Product and `Unmatched` when not linked. Opening the card enters the review modal, where the first step is `Merch Check`, the primary footer action is `Confirm Merch`, and the footer preview explains whether the item will move to `Needs More Information`, move to `Awaiting Photo Release`, or remain blocked by an Issue.

The legacy Merchandise `Intake Status` field is no longer an active data contract. Backend writes use only `Planning Status`; `intakeStatus`/`intake_status` remain response aliases for older clients. The migration utility backfilled active records, but Airtable's public metadata API returned `404 NOT_FOUND` for deletion of the old field, so the remaining live schema cleanup must be completed through a supported Airtable schema administration path.

The visible Planning status model has been collapsed to three stored values: `New`, `Needs More Information`, and `Awaiting Photo Release`. New Planning writes use `Needs More Information` for reviewed merchandise or work that is not ready yet, and `Awaiting Photo Release` for work that is ready but waiting for the official `Release to Photo` action.

Live Airtable record data has been migrated from the old middle status to `Needs More Information` where found. The retired single-select choices were removed manually in the Airtable field configuration UI on 2026-08-19, so the live `Planning Status` dropdowns now offer only the three canonical values. The app still treats the old labels as input aliases.

The Needs More Information Planning modal uses the same quiet hierarchy. The header shows client and Product title without a separate queue pill. The old separate Verify Merchandise step, modal-level Required to Shoot rail/step, and inline Activation controls have been removed for now; the visible newly received path begins with `Merch Check`, which confirms the physical received item is acceptable to continue. Product matching lives inside that check as evidence, but newly received cards no longer ask the PM to choose deliverables or complete photo Product data before accepting the physical merchandise. Comments and History are available in a persistent right-side panel so they are visible support context without reading as required continuation items. The modal uses a compact three-column layout with merchandise photos, decision controls, and a roomier comments/history rail separated; the footer keeps contextual merchandise information on the left while the right side contains the single commit action. Newly received merchandise exposes `Raise Issue` as the exception action and `Accept merchandise` as the primary forward action; later Planning/detail cards use `Confirm Merch` or `Save Details` when work intent or Product data is being committed. The footer preview names the outcome separately, such as `Will move to Needs More Information.`, `Will move to Awaiting Photo Release.`, or `Issue will keep this item out of release until resolved.` The Awaiting Photo Release batching surface uses `Release to Photo` and still enforces one photo deliverable type at a time. Its Match Product step now uses the same two-field Product validation model and matched/no-clear-match interface as Shipment capture: `Product Name on Package` and `UPC / ID` are searched together when both are present, exact identifiers can stand alone, broad name-only results are possible products, and partial UPC/ID matches must intersect with product-name results before they are shown. Suggested Products use a visible green hover/focus state because selecting a suggestion is the preferred resolution path. `No clear match` is styled as a quiet secondary fallback, and the incomplete Product creation UI remains hidden for now rather than presented as a normal review action. Once a Product is linked, the current observed/package field values are compared exactly against the linked Product name and UPC/ID; clean matches collapse the observed input fields so the matched Product card becomes the compact identity display, while mismatches or blank observed fields keep the inputs visible and show explicit `Use Product Name` and/or `Use Product UPC` actions so PMs can replace the captured merchandise value deliberately. The matched/no-clear-match Product card is shared between Shipments and Planning so the layout, copy hierarchy, right-aligned `Change` action, and correction controls stay consistent across modals. Selecting a suggested Product saves the current observed name and UPC/ID first, so the linked Product warning state reflects what the user actually typed.

The implemented Needs Review modal is the predecessor to the clarified New Merch intake UI:

1. Match Product
2. Choose Deliverables
3. Finish

Target New Merch intake should use the implemented confirm-merch transaction. The Planning Release view now visually keeps one merchandise card through `Newly Received Merch` and `Needs More Information`, with Ecomm/Packaging split deferred until release/handoff. The backend still contains compatibility paths that can create Ecomm and Packaging workstream cards earlier; cleaning that transaction boundary up is a follow-up, not part of this UI pass.

The Planning modal now follows the Draft -> Commit interaction model. The board is committed state; the modal is draft state; the footer is the single commit area. Deliverable selections update local modal state and the outcome preview only. They do not autosave Deliverables, refresh the Planning board, move the card, or animate background card changes. `Confirm Merch` commits the selected Deliverables and acceptance outcome for newly received merchandise through one intake-state transaction, then refreshes the board and closes the modal after success. Closing or canceling the modal discards uncommitted draft Deliverables. The background board is frozen while the modal is open.

Deliverable selection controls use a single primary selected treatment from the main app theme. Packaging, Ecomm, and Thr3d are not color-coded as different button states; unselected options render in quieter gray so selected options are visibly active.

The wizard uses business-language outcomes:

- incomplete verification routes to Waiting for Information
- photo deliverables route toward Awaiting Photo Release when Required to Shoot is complete
- `Thr3d`-only routes to Shipments `THR3D / Outgoing` when the minimal intake basics are complete, Intake is finished, and the sample is physically present

Current THR3D-only Merchandise behavior does not require Product linkage, Product verification, artwork, Required to Shoot photo fields, Ecomm fields, Packaging fields, or photo-production gates. Its required basics are:

- Client
- at least one merchandise photo
- Quantity
- `Deliverables` containing `Thr3d`

When a PM confirms a Thr3d-only Planning decision, the stable primary modal action remains `Confirm Merch`. The confirmation protects the handoff because this path removes the item from Walnut photo work and sends it to the Shipments THR3D queue.

Implemented model refinement: Ecomm and THR3D are mutually exclusive GS1 paths, while Packaging can pair with either. Packaging + THR3D creates a Packaging workstream card plus a THR3D shipping item rather than a mixed photo + THR3D production card.

Planning must not create or require the legacy Workstreams, Work Orders, Workflow Templates, Workflow Stages, Work Order Types, Product-level Workstream routing, Product-level production state, or Product-level storage state. The newly clarified Ecomm/Packaging workstream card concept is a scoped child work item, not the removed workflow-engine architecture.

Topco now has an activation-driven client readiness profile exposed through the Clients/Admin area and `/api/clients`.

Clients now have a Product-led import-profile configuration surface in the backend. The app expects the Airtable `Clients` table to have a multiline JSON field named `Product Import Profiles`; no new import-profile table exists. `/api/clients` shapes that field as `productImportProfiles`, includes the raw Airtable string as `productImportProfilesRaw`, and returns an empty `{ "defaultProfile": "", "profiles": {} }` object with `productImportProfilesError` when saved JSON is malformed. Admin-only `POST /api/clients`, `PUT /api/clients/:id`, and `PATCH /api/clients/:id` can create/update Clients and serialize valid `productImportProfiles` or `productImportProfilesRaw` payloads into the Airtable JSON field. Malformed or structurally invalid profile JSON is rejected before Airtable is updated. This slice does not add Product fields, create a Client Import Profiles table, or build the full Product import UI.

Topco readiness is documented as:

- activation-driven
- activation row links to received Merchandise by UPC
- Awaiting Photo Release requires Merchandise received, Activation confirmed, Activation row linked, and Deliverables confirmed
- Ecomm activation data requires UPC, CVID, Description, Walnut Scope, and Upload Location; Artwork Path is optional activation context, and Structure is optional item context. Neither blocks Move to Photo
- Packaging activation data requires UPC, WKFT Job Number, Brand Prefix, and File Name Description
- Quantity received, storage location, individual file names, and post-photo tracking statuses are not activation requirements

Activation is the client/project readiness package created in Marks, not an inbound email. For Topco, the Activation package is the source of truth for the facts needed to validate whether the project is ready to shoot. Any email or notification is an output generated from the stored Activation package, not the source of truth.

The existing Airtable `Activations` table now has the fields needed to store Topco activation packages and SKU details. The live fields previously named `Source Reference`, `Original Message`, and `Matched Merchandise` were renamed to `Project Reference`, `Activation Package`, and `Linked Merchandise`; `Creation Method` and `Activation Type` were removed because creation source and type are redundant with operational Activation facts and `Deliverables`. The backend supports `GET /api/activations`, `POST /api/activations`, `PATCH /api/activations/:id`, and `POST /api/activations/:id/move-to-photo`; the frontend API wrapper exposes list/create/update/move helpers. Admin > Clients exposes the Topco readiness configuration only: required Activation facts by deliverable, facts not required from Activation, and client-specific server path prefixes. It does not show Activation history or create/edit Activation packages. The Planning board exposes Topco Activation actions only: `Edit Activations` opens a modal list of saved Activations, and `Add Activation` opens the Activation editor. The `Edit Activations` list is limited to pending-photo Activation packages and hides Released, Complete, and Cancelled packages so shot/released work is not edited from Planning. The previous inline activation strip was removed so Activations behave like a utility action instead of a dashboard/card section. Topco activation-driven cards now also expose an Activation section with `Add to Activation` and `New Activation` actions, giving PMs a two-way path to link a card into an existing pending package or start a package from the card. The modal title distinguishes adding from editing an Activation. The modal separates Activation-level completion from item-level completion. Activation-level facts are Name, Due/Urgency, Walnut Scope, Artwork Path, Upload Location, and Deliverables. Due/Urgency and Walnut Scope remain free-form with suggestive typing from prior Activation entries; starter suggestions include `ASAP upon receipt` and `Full Set Renders - WALNUT (Photo)`. Activation Deliverables are selected with the shared multi-select control and currently expose only Packaging and Ecomm; Thr3d is intentionally excluded from this Topco photo Activation selector because Thr3d currently means a Shipments outbound/removal path, not a photo-ready activation package. Thr3d-specific Activation behavior is deferred until the shipping exception is explicitly modeled. Each item row owns Linked Merchandise, Description, UPC, CVID, and optional Structure. Structure is free-form with suggestive typing from prior Activation SKU rows and includes `Hang Tag / Label` as the starter suggestion; in the modal it sits to the right of the Merchandise picker on wider screens to conserve vertical space. Structure is informational context only and does not contribute to the missing count or block `Release to Photo`. The modal uses the shared field treatment for text inputs, textareas, and merchandise pickers so required data entry controls stay visually consistent; Activation input values render at normal weight, and repeated item cards have visible spacing between rows. The Activation form is visually compacted by keeping Artwork Path and Upload Location in the two-column grid when space allows; their labels show the initial server prefixes so PMs know they are entering the remaining path suffix. A read-only live email preview with subject line sits beside the entry form so PMs can see the familiar Topco email shape; it uses one soft-break block for the request facts, bold labels with normal-weight values, and a closed bottom border on the SKU Details table. Missing values render red and completed values render dark green. Topco artwork and upload paths are composed from client readiness profile prefixes (`smb://gfs-marks/Topco/_CGI/03 PROJECTS/` and `smb://gfs-marks/Topco/`) plus the PM-entered suffix; no Airtable client schema field exists for these prefixes yet. SKU/item rows are stored in the existing `SKU Details JSON` field, and linked Merchandise is saved to the Airtable `Linked Merchandise` field. `Save Draft` stores the Activation without moving linked cards. Item rows can be removed down to zero so PMs can fully unlink Merchandise from a draft; an empty Activation may be saved as a draft, but `Release to Photo` requires at least one linked Merchandise item and complete Activation deliverables. If a previously linked Awaiting Photo Release Merchandise item is removed from an Activation and the Activation is saved, the backend moves that Merchandise out of Awaiting Photo Release and back to the active Planning area. The Planning board also guards against stale orphan state: activation-driven Topco cards with photo-release-ready Planning state but no linked Activation are displayed back in the active Planning area and cannot be manually moved or finished into `Awaiting Photo Release` until an Activation link exists. `Release to Photo` validates the Activation header and every linked item row, saves the Activation, marks it Released, and records the Creative Force handoff without changing physical `Merch Status`. Topco cards show a simple activation state chip instead of pre-activation Required to Shoot validation on the card, because Topco readiness cannot be meaningfully judged before the Activation/link step exists. The current implementation does not yet confirm UPC matches or trigger notification automation.

Detailed artifact: `docs/migrations/2026-08-03-topco-activations.md`.

`frontend/src/merchandiseRouting.js` now defines exactly the three queues the board renders. `QUEUE_IDS` was nine entries and `MERCHANDISE_PLANNING_BOARD` had six columns; `sendThr3d` and `waitingActivation` were removed along with the four speculative production queues, and `BOARD_IDS` / `BOARD_STATE_MODEL` — a two-board planning/production state model that nothing imported — were deleted. THR3D is not a queue: THR3D work becomes a shipping item and its parent leaves the board structurally. Production queues stay unmodelled until Production is actually built, per the placeholder-navigation rule in `docs/WORKSPACES.md`.

`reviewStateFor` and `MERCHANDISE_REVIEW_STATES` are V1 Merchandise Review vocabulary (`Needs Review`, `Waiting for Product Data`, `Validated`, `Issue`) and are now confined to the V1 `/merchandise/review` page. They previously leaked into the Planning path from the dashboard, the Planning board, and `intakeRequestedQueueForRecord`, where the value was passed into `deriveMerchandiseReviewQueue` as a parameter that function never read. That dead parameter was removed from all three signatures.

`backend/ensure_intake_status_field.py` and `tests/test_intake_status.py` were deleted. The utility migrated the legacy Airtable `Intake Status` field to `Planning Status`; that field no longer exists in the live base, so the migration is complete.

The active Planning board code now uses Merchandise/Planning terminology internally: `planningCard` for card evaluation, `currentQueue` and `queues` for board placement, `deliverableRoute` for derived deliverable presentation, `requiredToShoot` for blockers, and `planningBoard` for the local board configuration. Photo-production Product-data verification is sourced from the client `Photo Production Requirements` JSON for both Received Merch and Workstream cards; the UI fallback only supplies the initial Topco profile when that client field is empty. Topco Ecomm does not require WKFT Job Number by default. PMs can configure WKFT Job Number in Admin > Clients when a client-specific process requires it. `Product Name` and `UPC / Product ID` are omitted from the remaining work checks when they are already satisfied by the matched Expected Product. Planning records now have one explicit `Planning Status` field with the normalized values `New`, `Needs More Information`, and `Awaiting Photo Release`. The backend reads that field first; migration utilities translate retired Airtable labels into those current values.

Planning comments are lightweight Merchandise conversation records.

Active Comments fields:

- `Comment`
- `Merchandise`
- `User`

The app creates comments through `POST /api/merchandise/:id/comments`, requiring the authenticated Marks Photo user and non-empty text. Comments render from the linked current Users record, including display name, role, avatar or initials, and timestamp. Frontend operational timestamps display in Central time via the `America/Chicago` timezone so daylight saving is handled automatically. `GET /api/merchandise/:id/comments` returns the Merchandise comments oldest-to-newest.

The login screen loads active users from the backend `/auth/users` endpoint. If the backend is not running or users cannot be loaded, the screen now shows a visible error instead of leaving the user chooser blank.

The Planning board displays comment counts on cards. Column headers show a compact comment bubble with the number of cards in that column that have comments, not total comment count. Comment signals use a more prominent recent state when any comment on the card was created within the last four hours. Unread dots are local browser state only, keyed by last viewed timestamp in `localStorage`; there is no Airtable read-state model.

The Dashboard now includes a compact `Newly Received Merch` section aligned to the Planning Release view. It builds the same Planning-style card state for active Shipment merchandise entries and shows only records that resolve to the Release view's `Newly Received Merch` section. It shows item-level cards with photo, client, name, UPC / ID, match state, and a `New` marker, and links users into Planning for review. This is a dashboard visibility slice only; it does not create a new workflow status or duplicate the Planning board.

The Planning `New` card surface has a tightened compact read model:

- Required to Shoot overlay indicators use the shared `required-to-shoot-*` styles.
- Cards with no visible Required to Shoot requirements show `Not started` rather than implying completion.
- Cards can show compact Merchandise detail facts such as observed identifier and storage location when present.
- Planning cards now share a more universal recognition-card anatomy: merchandise photo first, additional photo count in the upper-left overlay, client eyebrow above the product name, one-line product title, and a single `UPC / ID` plus `Qty` row with quantity floated right at the same visual weight.
- New queue cards present two explicit review criteria below the identity row: Product match state and Deliverables state. Matched Product and defined Deliverables use the same green check language; missing Product or missing Deliverables use the quiet unmatched/missing state. When Deliverables are defined, the card names them compactly, such as `Deliverables: Packaging + Thr3d`.
- Planning cards remain full-width within their existing board columns rather than spanning across columns. The latest card polish reduces duplicate flags by hiding storage on board cards, suppressing duplicated Required-to-Shoot dots/status chips on activation-driven cards, and rendering identifier facts as quiet text instead of field-like mini containers.
- The polish is visual/card-level only and does not change Planning queues, routing, Draft -> Commit modal behavior, or Shipments THR3D eligibility.

Deferred comment scope:

- Read By
- mentions
- replies
- reactions
- notifications
- deletion state
- system events
- activity types

## Products

Products are Expected Product records and are now the target operating spine. Active code currently keeps Product fields for identity, client/job/reporting, descriptive facts, artwork received, and reference-data JSON.

Target Product workspace direction:

- Products should become the main PM product-data workspace for expected work, not just a passive Excel-fed table.
- PMs should be able to upload Excel files, paste spreadsheet rows, map columns, save client mappings, preview and validate imports, correct values inline, and commit Product records.
- The Product workspace should feel Excel-like for dense editing while adding operational value through merch matching, readiness summaries, client-aware views, and visibility/creation of related work units.
- Products should not become one massive universal table. Product data should distinguish Core Product fields, Match Keys, Client References, Naming / Path Tokens, import-only/client-specific reference data, and derived readiness/work status.
- Product imports currently treat UPC as optional. A row may create a Product without a UPC, and any UPC supplied is preserved; UPC length/format validation is deferred until client-specific rules are finalized.
- The retired `Product or File Name` import destination is now a compatibility alias for the live `Product Name` Airtable field, so stale saved mappings do not submit an unknown Airtable field.
- Imported source rows preserve client status values such as `complete` in Reference Data; they are not written to the app's single-select Project Status field, which has controlled options and must not be expanded by imports.
- `Products.Product Type` is now a live Airtable single select with five controlled choices: Shelf Stable, Fresh/Perishable, Refrigeration Req, Freezer Req, and Non-Food. Imported values are written to that field and retained in Reference Data as well.
- The Products grid now uses the active Product field vocabulary as its default column set, including UPC, CVID, Brand Prefix, request/project fields, product description/type, artwork references, and job references; retired Product or File Name is no longer a default grid column. Client import rules remain on Clients.
- The Products grid visible UPC column reads and saves through the `primaryMatchKey` API field, which currently resolves to the live Product UPC storage field. This keeps the grid aligned with Product identity language while preserving the PM-facing UPC label.
- Product Job Number and Brand are no longer active Products workspace columns; the grid does not show or offer them in column preferences.
- Avoid vague `Identifier` language in future Product design. Use `Match Keys` for merch matching fields, `Client References` for client/reporting/handoff references, and `Naming / Path Tokens` for values used to build filenames, folder paths, upload paths, and production labels.
- Topco is the complex starting client, but the model must support clients with fewer fields, pickup imagery, different naming conventions, different output needs, and different Creative Force/reporting references.
- Products should show related merch/readiness/work-unit state through relationships and derived summaries without duplicating raw physical merchandise facts onto Product records.

The Products table is now a grid-style expected-work view. It shows Client first by default, followed by Product, Primary Match Key, product/file name, product job number, Brand, and Job, and includes Client in the Excel export. The live Airtable storage field remains `Products.Identifier`, but active Product API/UI now exposes the value as `primaryMatchKey` / `Primary Match Key` while preserving `identifier`, `productId`, and `gtinUpc` as compatibility aliases. Client-specific labels such as `UPC` still appear where configured, but the conceptual Product field is Primary Match Key. The old dashboard queue filter, generic thumbnail/check column, and lower detail panel were removed from Products because they were not Product grid behavior. The Products toolbar keeps the Job selector on the same row as outlined Filter, Columns, Group, and Export actions. Active filters render as removable chips to the left of the Filter button. The visible columns are sortable, filtering is handled through a wider Airtable-style toolbar popover with quick search and addable field conditions, and dropdown-like fields such as Client and Job use dropdown value filters with dropdown-appropriate operators. A Group toolbar popover can group the visible rows by one displayed column. A Columns toolbar popover lets each user hide/show displayed fields, drag columns up/down to change table order, choose row height (`Small`, `Medium`, or `Tall`), toggle alternating row backgrounds, and preserve dragged column widths per browser user. The same stored column order can also be changed by dragging visible grid headers left or right. The grid scrolls horizontally when visible columns exceed the viewport; the final visible data column flexes to fill remaining table width, and the delete action is a sticky right-edge control that stays visible while horizontal data scrolls. Alternating row backgrounds are applied by rendered product-row index so group headers do not break the stripe pattern. Header separators are visible, and resizing a header edge updates only that column's saved width while the table total width adjusts. Product text fields in the grid are editable inline and save through the existing Product/Item update API; editable Product cells show a small lower-right fill handle with a larger grab area when focused or selected, and can be dragged onto another row in the same column to highlight the source-to-target range and copy that value to every Product in the range. Client and Job remain read-only linked-record context. Products can be deleted from the grid action column after a browser confirmation, using `DELETE /api/products/:id`.

Saved client Product import profiles now live on `Clients.Product Import Profiles` as app-owned JSON. They are intended to store named client mappings for future Product import workflows: source headers, target mappings, reference-data targets, and required targets. The backend serializes/deserializes them through Client API responses and admin create/update routes, but the full import UI and structured Product reference-data categories are still future work.

Active Product serializers, imports, forms, tables, and Planning code no longer read or write Product-level workflow/storage fields such as `Workstream`, `Received`, `Rec Date`, `Location`, `Condition`, `Status`, Product photos, shipment links, issue links, export flags, or Product photo metadata.

Target model: manual intake facts captured when no Expected Product exists should stay on Received Merch or downstream exception/work records. They should not create or update imported Product truth unless a later approved reconciliation/import process promotes them.

## Shipments

`/shipments` is the canonical workspace for merchandise-team physical movement.

Compatibility routes:

- `/receiving` redirects to `/shipments`
- `/receipts` redirects to `/shipments`

Shipment-level photos belong to Shipments. Originals are stored in R2, and the current live Shipments schema stores the shipment photo manifest in a private backend-managed block inside Shipments `Notes`; API responses strip that private block from visible notes.

The Shipments receipt side panel shows newly logged Merchandise records. `Received` is treated as a confirmed state in this panel: it renders without a warning icon and uses the green badge treatment.

Incoming Shipments uses a photo-first autosave path. A PM may enter header details without logging a Shipment; choosing shipment photos is the action that creates/saves the Shipment and uploads those photos. Merchandise entries remain disabled until a Shipment record exists. After creation, header fields save on blur and the compact panel footer shows the saved state.

All Shipments defaults to `List` view for browsing Shipments. The List view now uses compact table-style rows instead of individual shipment cards/containers. Clicking a row opens the Shipment in the Incoming edit view, and empty Shipments can be deleted from the row action. Shipments with merchandise entries cannot be deleted until the merchandise is removed. `Date` view remains available and exposes focused scope controls for `Previous Week`, `This Week`, and `Month`. The previous `By Shipment` / `By Merchandise` grouping toggle was removed because All Shipments should behave as a shipment browser.

Current implementation: Shipments `THR3D / Outgoing` reads active `THR3D Shipping Items` created by `Confirm & Assign`, with quantity-to-ship and outbound tracking, while the parent Received Merch remains the physical lot. Shipped items are hidden from the active outgoing queue.

## Legacy Cleanup

On 2026-07-22, legacy workflow table records were backed up and cleared:

- Workstreams: 3 records deleted
- Work Orders: 0 records
- Workflow Templates: 1 record deleted
- Workflow Stages: 6 records deleted
- Work Order Types: 1 record deleted

Obsolete field values were cleared:

- Products `Workstream`: 0 populated records after cleanup
- Merchandise `Merchandise Resolution`: 0 populated records after cleanup
- Merchandise `Work Orders`: 0 populated records after cleanup
- Jobs `Work Orders`: 0 populated records after cleanup

Active backend dependencies were removed:

- workflow service files
- workflow schema creation scripts
- workflow/work-order API routes
- workflow/work-order config constants
- Product `Workstream` import/update/read paths
- frontend `/workstreams` API helper

Current Airtable cleanup state:

- Live metadata audit on 2026-07-22 no longer listed the legacy workflow tables.
- The obsolete Product operational fields were manually deleted after backup and Airtable dependency review.
- Product operational fields are not supported compatibility surfaces.
- The live Airtable base now includes the lightweight `Comments` table. Airtable Metadata API creation does not support `createdTime` fields; the app currently uses Airtable record `createdTime` as the comment timestamp and will also read a `Created At` field if one is added manually.

Detailed artifact: `docs/migrations/2026-07-22-legacy-architecture-cleanup.md`.
Latest schema artifact: `docs/migrations/2026-07-22-minimal-operating-model-airtable-audit.json`.

## Validation

Latest verified commands:

- Match identity model clarified on 2026-08-19: observed package name and UPC / ID are matching evidence retained on the Merchandise record, and the linked Product supplies the values used downstream. Verified by tracing `_creative_force_handoff`, which builds its payload from `_shape_item(product_record)` rather than from merchandise fields. The two per-field mismatch warnings were condensed into one dynamic message that also names which value governs, and the `nameWarningText` / `identifierWarningText` props plus their three caller overrides were removed so Shipments and Planning cannot drift apart. Planning match field labels now read `Name on package` and `UPC / ID on package`, matching the same facts in step 1, using literal strings so the Shipments receiver-facing `DOMAIN_TERMS` wording is unchanged. `backend/.venv/bin/python -m unittest discover -s tests` passed, 279 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.

- Planning source-backed matching on 2026-08-19: the Planning review modal now suggests rows from the client source sheet through `GET /source-check/topco/suggestions` for clients with Source Check rules, and selecting one calls `POST /api/merchandise/:id/activate-source-row` to create or update the local Product and link it. Local Product search via `searchMerchandiseReviewProducts` is skipped for those clients and unchanged for everyone else. The client record is threaded from the Planning board through `NewReviewModal` into `NewReviewProductIdentification` so the capability is resolved per client rather than per surface. Linking no longer writes the search fields back onto the Merchandise record, and `No clear match` was removed from Planning. `backend/.venv/bin/python -m unittest discover -s tests` passed, 279 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.

- Planning card and lane polish on 2026-08-19: cards show elapsed time instead of a bucket label, client moved to the shipment group header with the card eyebrow kept as the ungrouped fallback, the group header carries carrier plus the last four of tracking and an item count and links to the Shipment, match state is neutral with the glyph carrying meaning, the lane background is `#e9edf2` against white header and cards, columns cap at 440px, and the empty-state placeholder now renders in every column. Fixed along the way: `--green-dark` was never a defined token so `✓ Matched` had been rendering as inherited near-black rather than green, and the shipment link failed WCAG AA on the new lane at 4.35 before being darkened to 5.08. The Planning List view, its toggle, `PlanningListView`, the `.planning-list-*` and `.planning-view-toggle` styles, and the orphaned `itemsByColumn` bucketing and `ListIcon` import were removed. `backend/.venv/bin/python -m unittest discover -s tests` passed, 279 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.

- Schema/code contract confirmed on 2026-08-19: live Airtable metadata shows `Workstream Cards.Planning Status` holding exactly `Needs More Information` and `Awaiting Photo Release`, and `Merchandise.Planning Status` holding exactly `New`, `Needs More Information`, and `Awaiting Photo Release`. Both now match their code option lists with nothing left over. Products deletion in `Reset Test Data` was confirmed permanent and the temporary framing was removed from the code comment, the settings description, the test comment, and both docs. `backend/.venv/bin/python -m unittest discover -s tests` passed, 279 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.

- Legacy routing cleanup on 2026-08-19: `QUEUE_IDS` reduced from nine ids to three and `MERCHANDISE_PLANNING_BOARD` from six columns to three; `BOARD_IDS` / `BOARD_STATE_MODEL` removed; the unread `reviewState` parameter dropped from `deriveMerchandiseReviewQueue`, `evaluateMerchandiseReviewAssignment`, and `evaluateDeliverablePlanningCard`; V1 `reviewStateFor` confined to the V1 review page; `backend/ensure_intake_status_field.py` and `tests/test_intake_status.py` deleted. Eight now-obsolete assertions were removed from `tests/test_frontend_routing.py` and the queue-lookup test was retargeted from the removed Thr3d queue to `Awaiting Photo Release`. `backend/.venv/bin/python -m unittest discover -s tests` passed, 279 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed. The live dev-server module was inspected in the browser to confirm it exports `WORKSPACE_SECTIONS` and `CARD_FIELDS`, exposes exactly three queue ids, renders columns `New` / `Waiting` / `Awaiting Photo Release`, and no longer defines `BOARD_STATE_MODEL`.

- Intake alias removal and open-decision closeout on 2026-08-19: removed the `F_RECEIPT_ENTRY_INTAKE_STATUS` alias and `INTAKE_STATUS_OPTIONS`; renamed 38 backend call sites and 24 test references to `F_RECEIPT_ENTRY_PLANNING_STATUS`; replaced the `intakeStatus` / `intake_status` API keys with `planningStatusLabel`; renamed `_validate_intake_status` to `_validate_planning_status_label`. THR3D-only merchandise now finishes at `Needs More Information` with `Merch Status = Ready to Ship` instead of `Awaiting Photo Release`, and the superseded `GET /shipments/thr3d-outgoing` endpoint, its two helpers, its frontend API wrapper, and its test were deleted after confirming no frontend caller. Workstream cards gained a two-value status list and reject `New`. A repo-wide grep for `INTAKE_STATUS` / `intakeStatus` / `intake_status` returns nothing outside local variable names, which were also renamed. `backend/.venv/bin/python -m unittest discover -s tests` passed, 285 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed; the app booted with a clean console.

- Shadow-state removal on 2026-08-19: `New Merch Status` was removed from all active code (config constant, options list, schema utility, three write sites, planning-status derivation, merchandise API response, frontend queue placement) and `_planning_status_for_fields` was collapsed to read `Planning Status` with an empty-field fallback only. A repo-wide grep for `NEW_MERCH_STATUS` / `newMerchStatus` / `new_merch_status` returns nothing. The Planning board now also loads `/thr3d-shipping-items` so THR3D-only parents stay off the board; without it, removing the flag filter returned them to New Merch. The collapsed derivation was exercised directly over six cases covering empty fields, verified merchandise, all three canonical values, and a retired value. `backend/.venv/bin/python -m unittest discover -s tests` passed, 286 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed. The app booted with a clean console; the Planning board itself was not exercised because it is behind PIN login.

- Planning Status dropdown cleanup on 2026-08-19: live Airtable metadata confirmed `Merchandise.Planning Status` and `Workstream Cards.Planning Status` each contain exactly `New`, `Needs More Information`, and `Awaiting Photo Release`, in flow order. `ensure_planning_status_fields.py --dry-run --prune-extra-options` reported zero records on any retired value before removal, so the manual prune was lossless. `Merchandise.Merch Status` and `Merchandise.Deliverables` were confirmed canonical in the same read. Still outstanding: the retired `Workstream Cards.Status` field and `Merchandise.New Merch Status` both still exist in Airtable.

- Workstream card deletion / board membership fix on 2026-08-19: `DELETE /api/workstream-cards/:id` no longer regresses the parent Planning Status to `New` while sibling cards remain, and the Planning board stopped double-filtering parents on `New Merch Status`. Added `test_deleting_one_of_two_cards_keeps_parent_planning_status` and `test_deleting_last_card_returns_parent_to_the_board`; workstream card deletion previously had no test coverage at all. The first new test was confirmed to fail against the pre-fix code before the fix was restored. `backend/.venv/bin/python -m unittest discover -s tests` passed, 286 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed. Local servers were started through `.claude/launch.json` (backend on 5057, frontend on 5173); the app booted, `/api/auth/users` returned 200 and the console was clean, but the Planning board itself was not exercised because it is behind PIN login.
- Reset Test Data Products scope on 2026-08-19: `Reset Test Data` also deletes Products, and the typed confirmation phrase changed to `DELETE TEST DATA AND PRODUCTS`. Introduced as a temporary measure and confirmed as permanent the same day, because Products are re-importable from client source data. `backend/.venv/bin/python -m unittest discover -s tests` passed, 284 tests; `npm run build` in `frontend/` passed; `git diff --check` passed.

- Product match replacement behavior on 2026-08-10: clicking `Change` on a matched Product now restarts Product selection, hides the current matched card, and excludes the currently linked Product from selectable suggestions until another Product or no-clear-match path is chosen. `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- Planning Product match card refinement on 2026-08-10: matched Product identity no longer displays Received Merch quantity; quantity remains in split/allocation controls where it affects created work. Product match warnings use exact comparison after a Product is selected, with explicit `Use Product Name` and `Use Product UPC/ID` correction actions for mismatched captured merchandise values. `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 55 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning.
- Shipments All Shipments list polish on 2026-08-10: the list view no longer shows a Status column, and the item-count pill sizes to its text instead of filling the table cell.
- Planning board lane naming/routing on 2026-08-10: the board now displays `New Merch`, `Needs Product / Work`, `Awaiting Info/Activation`, and `Ready for Photo`; brand-new board cards remain sparse and use the review modal footer, not a visible card badge, for review/create-work decisions. The 2026-08-17 stable-action pass later changed the visible footer button to `Confirm Merch` with outcome preview text. Ecomm/Packaging workstream cards with missing dependencies route to `Awaiting Info/Activation` instead of the product/work exception lane; `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 55 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- Session startup/docs alignment on 2026-08-09: local servers started with `npm run dev`; backend responded at `http://localhost:5057/`, frontend responded at `http://localhost:5173/`; `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 50 tests; `backend/.venv/bin/python -m unittest discover -s tests` passed, 220 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- Product Request Type mapping on 2026-08-09: `backend/.venv/bin/python -m unittest tests.test_job_item_schema tests.test_frontend_routing` passed, 67 tests; `backend/.venv/bin/python -m unittest discover -s tests` passed, 223 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- Product Request Type to New Merch Deliverables suggestion on 2026-08-09: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 51 tests; `backend/.venv/bin/python -m unittest discover -s tests` passed, 223 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- Airtable Product Request Type alignment on 2026-08-09: the live `Products.Request Type` field was verified as `singleSelect` and seeded with the app's five controlled choices through Airtable typecast writes on a temporary Product record, which was deleted after seeding; refreshed Airtable metadata confirmed `Ecomm only`, `Pack only`, `Thr3d only`, `Pack & Thr3d`, and `Ecomm & Pack`.
- UPC text preservation on 2026-08-09: live Airtable metadata confirmed `Products.UPC` is `singleLineText`; `backend/.venv/bin/python -m unittest tests.test_spreadsheet_parsing` passed, 5 tests, including numeric XLSX UPC cells formatted as twelve digits preserving their leading zero in parsed text.
- Product grid column drag ordering on 2026-08-09: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 52 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- Receiver-facing merchandise identity labels on 2026-08-09: `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_release_to_production` passed, 61 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- UPC-first shipment product matching on 2026-08-09: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 53 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- Needs Review modal hierarchy polish on 2026-08-10: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 54 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning.
- Needs Review modal Product validation alignment on 2026-08-10: the Identify Product step now mirrors Shipment capture matching semantics for package name plus UPC/ID; `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 55 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning.
- Needs Review modal verification removal on 2026-08-10: the separate Verify Merchandise step was removed from the Planning modal; Product matching is now the first action and uses the same matched/no-clear-match interface as Shipment intake.
- Needs Review modal side-panel layout on 2026-08-10: notes/history moved to a persistent right rail and the compact modal/footer layout was tightened; `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 55 tests; `npm run build` in `frontend/` passed with the existing Vite chunk-size warning; `git diff --check` passed.
- Client Product Import Profiles slice on 2026-08-06: backend now expects `Clients.Product Import Profiles` as app-owned multiline JSON, shapes it as `productImportProfiles`, safely falls back on malformed saved JSON, and validates admin create/update writes before Airtable updates. No Product fields, import UI, or Client Import Profiles table were added.
- `backend/.venv/bin/python -m unittest tests.test_auth` passed, 32 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 215 tests.
- `git diff --check` passed.
- Product Primary Match Key terminology slice on 2026-08-06: Product API/UI now exposes Airtable `Products.Identifier` as `primaryMatchKey` / `Primary Match Key` with client-specific labels still supported and legacy `identifier`, `productId`, and `gtinUpc` aliases preserved; no Airtable schema changes or multi-match-key JSON work were made.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 210 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Product workspace documentation update on 2026-08-06: docs now define Products as the PM product-data workspace for expected work, with Excel/paste/import mapping, validation, inline editing, client-aware views, field categories, and related merch/readiness/work summaries; no schema or code implementation was started for this pass.
- Operating model documentation update on 2026-08-05: docs now distinguish Received Merch, Expected Product, New Merch, Ecomm/Packaging workstream cards, and THR3D shipping items; no schema or code implementation has been started for this model.
- `git diff --check` passed.
- Activation/Merch Status alignment on 2026-08-05: the legacy review validate endpoint still accepts `Validated` as a readiness action but no longer describes it as a physical `Merch Status`; the THR3D regression route now reflects the real `Ready to Ship` physical status after THR3D-only Planning completion.
- `backend/.venv/bin/python -m unittest tests.test_merchandise_review tests.test_intake_decisions tests.test_receiving tests.test_frontend_routing` passed, 120 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Merch Status simplification on 2026-08-05: backend and frontend no longer write `Matched` or `Validated` as Merchandise `Merch Status`; product linking/importing leaves physical status alone, ready-for-photo Activation moves leave physical status alone, and THR3D-only Planning completion writes `Ready to Ship`.
- Live Airtable Merchandise data on 2026-08-05: 1 `Matched` and 1 `Validated` record were normalized to `Received`; all 9 live Merchandise records now have `Merch Status = Received`. `Ready to Ship`, `Shipped`, and `Disposed` were added as select choices through typecast. Airtable API rejected pruning old unused select choices, so `Matched` and `Validated` remain manual cleanup targets in Airtable configuration only.
- `backend/.venv/bin/python -m unittest tests.test_intake_decisions tests.test_receiving tests.test_merchandise_review tests.test_merchandise_inventory tests.test_intake_status tests.test_auth tests.test_release_to_production tests.test_frontend_routing` passed, 170 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 199 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Activation/card polish on 2026-08-05: the Planning Activation modal now titles itself as Add or Edit based on context, and `Move to Photo` locally validates that photo Activation deliverables are still selected before calling the backend.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 75 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- Activation flow pass on 2026-08-04: Planning now shows a Topco-only Activations strip for reopening saved Activation drafts, the modal uses Linked Merchandise language, `Save Draft` stores Activation data without moving cards, and `Move to Photo` validates the Activation package before moving linked Merchandise to `Ready for Photo`.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 73 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 195 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Activation UI/removal polish on 2026-08-04: the Planning inline Activations strip was replaced with `Edit Activations` and `Add Activation` actions; `Edit Activations` opens a list modal. Removing a Ready for Photo merchandise item from an Activation and saving now moves that merchandise back to the active Planning/needs-activation area.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 74 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Activation Deliverables selector polish on 2026-08-04: Deliverable buttons now keep a light gray checkmark visible as the click affordance, remove the heavy unselected color outlines, and reserve color/tint for selected state.
- Activation card-linking polish on 2026-08-04: `Edit Activations` now lists only pending-photo packages, and activation-driven Topco cards expose compact `Add to Activation` and `New Activation` actions inside the card modal.
- Activation unlink fix on 2026-08-04: Activation item rows can now be removed down to zero and saved as a draft so linked Ready for Photo cards can be moved back to the active Planning/needs-activation area; `Move to Photo` still requires at least one linked Merchandise item.
- Activation dropdown fix on 2026-08-04: New-item card modals now show pending-photo Topco Activations even when the newly received Merchandise card has incomplete client metadata; Released, Complete, and Cancelled Activations remain excluded.
- Activation save visibility fix on 2026-08-04: saving an Activation draft now confirms the save before list refresh work can fail, merges the saved record into local Planning state immediately, reloads the Activation list, and refreshes Planning board data so newly linked cards and newly created draft Activations appear without a manual page refresh.
- Planning Deliverables selector polish on 2026-08-04: the New-card modal keeps the Deliverables step open after selection so Packaging, Ecomm, and Thr3d remain visible as selectable buttons. The board still changes only through the bottom Finish/Move commit action.
- Activation picker safety on 2026-08-04: the New-card `Pending Activation` dropdown no longer defaults to the first available Activation. PMs must explicitly choose an Activation before `Add to Activation` is enabled.
- Planning Activation action visibility on 2026-08-04: the Planning-board `Edit Activations` and `Add Activation` actions now remain visible whenever Topco exists, instead of disappearing when a non-Topco client filter is active. The action group uses fixed button sizing so the primary `Add Activation` action remains readable.
- Activation orphan guard on 2026-08-04: activation-driven Topco cards without a linked Activation no longer appear in `Ready for Photo` even if their Planning state is stale; manual Ready moves and modal finish now require the Activation link.
- Shipments autosave copy polish on 2026-08-04: the Incoming Shipment details panel removed the unused `Create Shipment` button; adding shipment photos or saving the first merchandise item now starts the Shipment automatically, with visible `Shipment will autosave` / `Shipment autosaved` status.
- Shipments history polish on 2026-08-04: All Shipments now defaults to `List`, has a single `List` / `Date` view control, shows `Previous Week` / `This Week` / `Month` scope controls only in Date view, no longer shows the redundant `By Shipment` / `By Merchandise` toggle, and shipment cards open the existing Incoming shipment editor.
- Shipments list/delete polish on 2026-08-04: All Shipments List now uses flatter table-style rows instead of separate card containers. Empty Shipments expose a Delete row action; deletion is blocked while merchandise entries remain attached.
- Topco Activation form polish verification on 2026-08-04: item cards in the Add Activation modal now have explicit row spacing, Activation input/select/textarea values render at normal weight, and the Activation Deliverables selector remains intentionally limited to Packaging and Ecomm while Thr3d-specific Activation exceptions are undefined.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 47 tests.
- `backend/.venv/bin/python -m unittest tests.test_receiving tests.test_frontend_routing` passed, 89 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Planning card density polish on 2026-08-04: cards stay full-width within columns but no longer render storage or duplicated activation/readiness status treatments; identifier facts are quieter inline text rather than mini field containers.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 48 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Shipments create/autosave correction on 2026-08-04: Incoming Shipments now treats shipment photos as the required first save trigger. The camera and library buttons remain normal photo actions before a Shipment exists; choosing photos creates/saves the Shipment and uploads the photos. Receivers may stage merchandise details before that save, but merchandise commit is blocked until the Shipment exists. After creation, header edits continue to autosave.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 48 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Shipments photo-first affordance on 2026-08-04: shipment photo buttons are active before the Shipment exists and keep the familiar `Take Photo` / `Library` labels. The implementation creates the Shipment after files are selected so PMs do not need to understand the technical save boundary.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 48 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Topco Activations schema/API verification on 2026-08-03: the existing Airtable `Activations` table `tbleD3EuIMJTG2OWT` was expanded with activation fields, renamed to Activation Package language, `/api/activations` can list/create/update activation records, and the frontend exposes activation helpers plus a Topco-only Planning-board `Add Activation` modal with repeatable SKU rows. Topco Planning cards use activation-state chips rather than Required to Shoot previews before activation matching exists. No release automation or workflow routing behavior changed.
- `backend/.venv/bin/python -m unittest tests.test_auth tests.test_frontend_routing` passed, 70 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Planning New-card polish verification on 2026-08-03: browser check on `http://localhost:5175/__test/planning-thr3d` confirmed a New queue card keeps the simplified recognition presentation: promoted Time Here, item name, client in the unauthenticated regression fixture, no storage location, no Required-to-Shoot overlay indicators, and no `New Arrival`, `Needs PM review`, or `Deliverables not set` badge copy. Source-contract coverage confirms identifiers still render when present.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 42 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- Draft -> Commit Planning modal verification on 2026-07-22: selecting `Thr3d` in the modal updates local draft state and the footer preview to `Will move to Thr3d Shipment`; the background board remains frozen with the card disabled in `New`, and Shipments `THR3D / Outgoing` remains empty until `Finish & Move` is clicked. After `Finish & Move`, the regression route closes the modal, unfreezes the board, and displays the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready for Photo` and `Released: false`.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 42 tests. This now includes source-contract coverage that the Planning modal does not autosave Deliverables, does not call the Deliverables save API from draft selection, uses `Will move to` plus `Finish & Move`, and freezes the board while the modal is open.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 109 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 185 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- The 2026-07-22 `Thr3d` modal crash with `TypeError: Cannot read properties of undefined (reading 'currentQueueName')` was traced to the Planning card read model: modal/drawer code expected `item.planningCard.currentQueueName`, while `buildMerchandisePlanningCard` exposed the same object only as `assignment`. `queueLabel` usually masked this mismatch, but the Thr3d deliverables refresh could expose the missing `planningCard` object. The fix now exposes `planningCard: assignment` and hardens queue lookup so malformed or empty board queue inputs fall back to the canonical Planning queues, including `Thr3d Shipment`.
- Browser verification on a freshly restarted Vite server at `http://localhost:5175/__test/planning-thr3d` exercises the Planning card modal, clicks the visible `Thr3d` deliverable control, keeps the modal mounted and usable, recalculates Required to Shoot as complete, routes to `Thr3d Shipment`, finishes verification, and displays the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready for Photo` and `Released: false`. Console capture after the clean run had no error logs.
- The live `/planning` route on `http://localhost:5175/planning` is served by Vite from `/Users/jbullock/Development/Marks Food Photography/frontend`; the backend on `5057` is served from `/Users/jbullock/Development/Marks Food Photography`. In the Codex in-app browser, the real board remains behind the user PIN selector and no authenticated tab was available to claim, so the authenticated live-card click still needs user-session verification.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing` passed, 41 tests. This includes a Node-imported regression proving a Thr3d Planning card resolves `planningCard.currentQueueName` to `Thr3d Shipment` even when the supplied board queue list is empty.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 108 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- Browser reproduction on `http://localhost:5173/__test/planning-thr3d` first captured the blank-screen stack as `ReferenceError: DELIVERABLE_TONE is not defined` in `DeliverablesSelector`; after fixing the test hook to use `DELIVERABLE_ROUTE_MAP`, the same browser interaction opened a Planning card, selected `Thr3d`, showed `Will move to Thr3d Shipment`, finished verification, and displayed the record under `Shipments` `THR3D / Outgoing` with `Intake Status: Ready for Photo` and `Released: false`, with no console errors.
- `backend/.venv/bin/python -m unittest tests.test_frontend_routing tests.test_intake_decisions tests.test_receiving tests.test_release_to_production` passed, 106 tests.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 182 tests.
- `npm run build` in `frontend/` passed, with the existing Vite chunk-size warning.
- `git diff --check` passed.
- `npm run dev` started Vite on `5173`; an existing Flask dev server was already listening on `5057`.
- Read-only Airtable metadata audit passed and wrote `docs/migrations/2026-07-22-minimal-operating-model-airtable-audit.json`.

The 2026-07-22 terminology pass has targeted build coverage green; final full-suite and route-smoke results are recorded in `docs/migrations/2026-07-22-minimal-operating-model-cleanup.md`.
- Product import mapping UI on 2026-08-06: the existing spreadsheet wizard now loads a Client's default `Product Import Profiles` mapping when source headers match, lets PMs switch among saved profiles, and saves the current mapping back to the Client JSON field as the new default. The mapping step still supports manual correction before validation; no Product fields or import tables were added. Backend tests passed 215 tests, frontend routing tests passed 48 tests, the frontend Vite build passed with the existing chunk-size warning, and `git diff --check` passed.
- The saved mapping UI currently uses the existing admin-only Client update endpoint. If non-admin PMs need to save mappings, Client configuration write permissions must be broadened deliberately in a separate auth decision.
- Product import behavior on 2026-08-06: a successful spreadsheet import now automatically saves the active column mapping to the selected Client's `Product Import Profiles` JSON. The profile uses the entered mapping name, or the Client name when no name was entered, and becomes the default. Manual load/save controls remain available in Map Fields. Mapping-save failure does not undo a successful Product import; the wizard reports the warning.
- Import modal overlay polish on 2026-08-06: the spreadsheet import backdrop now covers the full viewport, including the left navigation area, instead of beginning at the sidebar edge.
- Topco tracker boundary on 2026-08-06: Vendor is treated as a Received Merch/Shipment fact rather than a Product field. Product identity is separate from client Match Keys such as UPC and CVID. Studio Destination remains client-specific Reference Data until its expected-routing versus observed-destination meaning is confirmed.

## 2026-08-11 - Client Photo Production Requirements

The Admin Clients view now exposes a compact Photo Production Requirements editor backed by the app-owned multiline JSON field `Clients.Photo Production Requirements`. This config verifies a Product/workstream handoff without adding a universal Product schema or workflow table.

Topco defaults are Packaging: Product Name, UPC/Product ID, WKFT Job Number, Brand Prefix, and File Name Description, with `{jobNumber}_{brandPrefix}_{fileNameDescription}`; and Ecomm: Product Name, UPC/Product ID, and CVID, with `{cvid}_{view}` and the standard front, back, left, right, top, bottom, front elevated, left elevated, and right elevated views.

The backend returns a derived `photoProduction` summary on workstream cards. It reports missing Product values and filename tokens/views. Creative Force owns final naming execution; Marks Photo verifies that the configured values exist for handoff. `Brand Prefix` is the packaging token, not generic Brand. Quantity received and physical production statuses remain Received Merch or downstream production data, and Activation remains separate. File Name Description is resolved from Product Reference Data when present; for Topco source-linked Products, `Prod Descrip` / Product Description can also satisfy that filename/handoff token without adding another Airtable field.

The Client Photo Production Requirements modal now explains the PM action directly: select the Product values that must exist before each workstream is handed to Creative Force. The filename pattern is labeled as a Creative Force filename check, and the footer explains that the resulting checks appear on workstream cards as Product data and File naming readiness.

The Clients admin table now focuses on client Product configuration: Product ID convention, Product import mappings, and Photo Production requirements. The former Required to Shoot, Artwork, Merchandise, and Readiness columns were removed from this table because they mixed activation/operational policy with Product handoff configuration. The Airtable `Clients.Photo Production Requirements` multiline field was provisioned on 2026-08-11 as `fldNJyH9EtBXsaodk`.

Artwork is part of Photo Production requirements. A client may require a `Valid Artwork Path` for a workstream; the handoff check accepts URL, SMB, file, absolute-path, or UNC-style references and blocks missing or non-reference text. Topco Ecomm defaults include this artwork check because its tracker includes art-path data. Packaging does not require artwork by default.

The Client Photo Production modal uses a simple filename recipe builder: PMs add Product fields in the desired order, choose a separator, and see the generated preview. It does not require hand-editing template syntax. Creative Force `Product Code` is configured separately from the filename recipe, and Creative Force `Category` is supplied by Client Name.

The first Creative Force return-status slice is now present in the backend. `POST /api/integrations/creative-force/webhook` accepts signed Creative Force Work Unit events using `X-CF-Signature` and `CREATIVE_FORCE_WEBHOOK_SECRET`, matches events by `WorkUnitId` when linked and otherwise by the unique Product Feed `Source Key` for the reported Product Code, then falls back to Product Code/workstream matching. It normalizes the reported status and stores the result in the app-owned Workstream Card field `Creative Force Sync`. It does not change Planning status, Product data, or physical Merchandise status. Outbound handoff creation and reconciliation polling remain future work.

The Workstream Cards Airtable field `Creative Force Status` was provisioned on 2026-08-13 as `fldhkykZsrzfjp1sx`. Creative Force webhook events now write the exact reported `WorkUnitStatusName` value to that plain-text field. A separate `Creative Force Step` field was provisioned on 2026-08-13 as `fldoFUoSno2ZxZePt`; it stores the raw `StepName`, while `StepStatusName` remains in `Creative Force Sync`. `Planning Status` is not normalized or overwritten by Creative Force. The existing `Creative Force Sync` JSON remains available for Work Unit IDs and event details.

Admin now includes a latest Creative Force webhook diagnostics panel. It shows the most recent signed payload, raw status, match result, Work Unit ID, and target Workstream Card. The diagnostic snapshot is held in backend memory for the current process and is intentionally not an Airtable table or long-term event log.

Planning workstream cards now show the reported `Creative Force Step` as a compact badge over the card image when Creative Force has provided a step-level event.

The Awaiting Photo Release form now shows item-level Artwork Path and Upload Location for both Ecomm and Packaging releases, restores Structure for both, and carries client-configured Product requirements into each item row. Ecomm item rows include CVID; Packaging rows include Product Name/Description, Brand Prefix, WKFT Job Number, and File Name Description when configured, with values prefilled from the linked Product. The email preview lists artwork and upload locations in separate per-item sections before SKU Details. Existing shared path values are copied into item rows when older releases are reopened.

The release header now reads `Photo Release:` followed by the selected Ecomm/Packaging deliverable badge. The scoped card flow hides the redundant deliverable selector, while grouped releases retain it. The shared project field is labeled `Project name`.

The photo release UI no longer presents saved drafts or a Save Draft action. The form commits only through `Release to Photo`; existing backend Draft activation records remain readable for old data but are not part of the current creation flow.

New release forms leave Project name and Walnut Scope blank until the PM enters them. Due/Urgency suggestions exclude `Today`; existing saved values remain readable when editing older records.

Creative Force handoff preparation is now explicit: `GET /api/workstream-cards/:id/creative-force-handoff` resolves the admin-owned Client Product Code and Category configuration into a validated handoff payload, and admin-only `PATCH /api/workstream-cards/:id/creative-force-link` can attach a real Creative Force Work Unit ID after the external record exists. This is the linking bridge, not automatic Creative Force record creation; Creative Force OAuth credentials, workspace/client IDs, and datasource configuration are still required before outbound creation can be implemented.

Each configured photo workstream can also map one Product field to Creative Force `Product Code`. Creative Force `Category` currently maps to the Client Name. Workstream readiness verifies the selected Product Code value and Client Name before handoff.

Creative Force Category is now configurable per workstream. It can come from Client Name, Product Name, Brand Prefix, Product Type, or a custom fixed value. Client Name remains the default.

Ecomm views are treated as a configurable handoff set. For Topco, the default set includes all standard views because Topco receives the full set; the modal labels these as `Views included in handoff`, not as PM verification tasks. A future client can select a narrower set without changing the model.

When Packaging or Ecomm is selected on Received Merch, the linked merch card and detail view now show the matching client-configured Product and Creative Force validation summary. Created workstream cards continue to show the single selected workstream's validation.
Photo Production fields are now editable from the Planning card detail surface after Packaging or Ecomm is selected. The editor is driven by the selected client configuration and saves directly to the linked Expected Product, including filename-description values retained in Product Reference Data. Merch cards show the configured fields for each selected photo deliverable; child workstream cards show the fields for their single workstream.
The New Merch review modal now shows a compact two-column Packaging/Ecomm product-data checklist directly under Deliverables. It is visible before deliverables are committed or merchandise is reviewed, marks populated values with checks, and shows missing requirements clearly. The editable Product fields appear only for photo deliverables currently selected in the draft.
The New Merch review modal defensively reconstructs the configured Topco Product-data requirements when a stale or incomplete merchandise payload does not include its derived photo-production status. Selecting Packaging or Ecomm therefore always exposes the editable linked Product fields in the review flow, while unknown clients still require configured client requirements before fields are shown.
Selecting `No clear match` in New Merch is draft-only until the PM clicks `Accept merchandise`; closing the modal discards that draft choice.

Planning cards now use an age label in the upper-right media corner instead of the former status-dot indicators. New Merch cards show only identity and matched/unmatched state. Needs More Information carries missing product/work/detail messaging. Awaiting Photo Release is the final PM waiting lane before release.

Planning now has a deliverable filter for Ecomm and Packaging, with distinct Ecomm and Packaging badge treatments. The active Planning presentation views are Release and List; the previous Kanban board view, Kanban toolbar entry, and Kanban-only drag/drop movement logic have been removed.
The Planning filter is limited to Ecomm and Packaging because Thr3d is a Shipments outbound item rather than a photo workstream. Workstream cards now expose their route ID to the filter.
The Planning page owns vertical scrolling so cards below the longest section remain reachable from the normal page scrollbar.
The optional Planning List view uses compact queue headers and aligned item, deliverable, and age columns; it remains a presentation of the canonical queues rather than a separate workflow.
The Planning Release view is now the default Planning view. It regroups the same filtered active Planning cards into `Newly Received Merch`, `Needs More Information`, and `Awaiting Photo Release` sections. `Newly Received Merch` is the first-review inbox: merchandise there must be viewed and acknowledged before it can leave that section, even when captured data is already complete. Once reviewed, cards with outstanding validation go to `Needs More Information`. Complete accepted cards rise into `Awaiting Photo Release`, where PMs can batch-select cards and click `Release to Photo`. The release action opens the existing photo-release modal with one item row per selected Merchandise record. Released cards leave active Planning through release audit fields; downstream status belongs on Production/Creative Force surfaces.
Workstream card titles now remain the product name; the Ecomm or Packaging path is shown by the deliverable badge instead of being repeated in the title.
Needs More Information cards now show Photo Data checks for both Received Merch cards and child workstream cards. The media `+1` photo-count marker is intentionally limited to New Merch cards; release is handled by the Planning-level photo release action after card data is complete.
Photo deliverable badges now appear once in the media upper-left, replacing the old workstream type/status badge. Workstream cards no longer show the duplicate path badge or the bottom Assigned Qty, Product data, and Filename summary.
Card deliverable badges use compact blue Ecomm and purple Packaging treatments as workstream differentiators, not status indicators.
The Planning review modal now uses the numbered Product data for photo step as the single heading. The editor no longer repeats that heading or adds a redundant divider; it retains the supporting instruction, editable fields, and `Save Details` action.
The Product Data editor now hides its explanatory copy and places `Save Details` below the required fields so the mandatory inputs remain the visual focus.
`Save Details` in the Product data editor explicitly calls the backend `/products/:id` update route for linked Products, or the existing manual-product-info paths for unmatched merchandise/workstream cards. The backend persists mapped values to the Products table when a Product exists, with File Name Description retained in Product Reference Data.
The Products PATCH route alias is now registered alongside the legacy Items/SKUs aliases; Planning Product Data saves therefore reach the Products table correctly.
The local backend on port 5057 was restarted on 2026-08-12 so the active browser session is serving the current Products PATCH route. Route-level tests cover Product Name/ID-adjacent edits, WKFT Job Number, Brand Prefix, and File Name Description persistence.
The Product data step's missing count now recalculates from the live editor draft as fields are completed; Save still controls persistence.
The Product Data save action now sits naturally below the fields without a sticky gradient or overlay, so the final input remains fully visible.
The badge palette was tuned so Packaging uses a softer lavender and Ecomm a clearer sky-blue, with comparable visual weight.

Artwork is controlled by the client Photo Production Requirements configuration as a simple required/not-required check. Workstream cards do not expose a producer-facing Request Artwork action or add artwork-request metadata to Workstream Card Notes. When required, a nonblank Product `Path to Art` value satisfies the check; when optional, the work does not block on artwork. PMs can still enter or update the artwork path through the existing Product data editor.

Planning card detail surfaces are now unified: New Merch, Received Merch, and Ecomm/Packaging workstream cards open the same review modal with the same merchandise photos, Product match, Deliverables, Product data, comments, and history anatomy. Queue position controls the available footer action only. New Merch retains Previous/Next Merchandise navigation and the review/assignment action; existing workstream cards do not show merchandise navigation or a create action and can move to Awaiting Photo Release when their configured Product validation is complete.
Product matching in Planning is optional for unmatched exceptions. Linking an Expected Product is the preferred way to prefill and maintain Product data, but a PM may leave the item as No Clear Match and manually complete the Product data for photo fields. Those manual values are stored as `Manual Product Info` on Received Merch or the child Workstream Card, satisfy the same client Photo Production Requirements as linked Product fields, and are copied into created Ecomm/Packaging workstream cards and Creative Force feed handoff payloads. This keeps unmatched merchandise moving without creating or updating a Product record during Planning; later Product creation/reconciliation remains a separate Product workspace decision.
For unmatched/manual Planning cards, Product Name and UPC / Product ID are entered once in the merchandise identity step and inherited into Product data for photo. The Product data step counts those identity values as complete and hides duplicate editable Product Name / UPC controls, showing only a quiet note plus the remaining configured fields such as CVID, WKFT Job Number, Brand Prefix, File Name Description, or artwork.
Existing Ecomm and Packaging workstream cards can also switch between those two photo deliverables from the shared modal. The change is committed through the footer, updates the existing Workstream Card type and name, keeps the card in its current queue, and refreshes the selected deliverable's Product requirements without creating a duplicate card.
When both Ecomm and Packaging cards exist for the same Received Merch, deliverable switching is disabled on both cards. Each card can still be removed independently with confirmation; removal updates the parent Deliverables set, and removing the last card returns the parent merchandise to Waiting on Information for review. Cards already handed to Creative Force or marked In Production cannot be removed.
The shared Planning card footer now explains the workstream rules in context: selecting Ecomm and/or Packaging on Received Merch creates one photo card per selected deliverable; changing a single existing card updates it in place; removing a child preserves the matched Product and physical merchandise, and removing the last photo child returns the parent to Waiting for Deliverable/Product Info. Workstream removal is blocked after Creative Force handoff or production start.

The Product workspace now exposes a derived `productionSummary` read model. It combines linked Merchandise, Workstream Cards, THR3D Shipping Items, and Creative Force sync data for quick Product-level scanning without adding or writing a Product status field. The Products grid shows this as the `Production` column. Raw physical, intake, workstream, and Creative Force statuses remain owned by their source records.

The live Airtable Products table does not contain dedicated `Merch Status`, `Studio/Qty Rcvd`, or `Shot Date` columns. Those names may still appear inside legacy `Reference Data` JSON, but active Product shaping does not treat them as Product operational fields. Merchandise `Merch Status` remains the only physical status source.

The Airtable schema audit now classifies only fields that are actually present on the live Products table. Historical Product field names such as `Received`, `Rec Date`, `Location`, `Condition`, `Status`, Product photo/receipt/issue fields, export flags, `Workstream`, and `Output Type` remain compatibility references where required by older code, but are not reported as live Product deletion targets. No Airtable fields were changed by this audit correction.

The live metadata audit initially reported `Merch Status`, `Studio/Qty Rcvd`, and `Shot Date` from a stale inventory snapshot. A fresh metadata read confirms none is a dedicated live Products field. Their remaining appearances are embedded Reference Data values and require a separate, record-level migration decision; no Airtable deletion is approved from this audit.

Existing workstream cards no longer show `In Creative Force` as a dead-end action. Product data remains editable through `Save Details`, and the footer preview explains whether details are complete or which required Product fields remain missing. Completed workstream cards are released from the Ready-to-Release batch surface rather than through per-card workflow buttons.
The shared card footer uses stable action language and separates rules from outcome text. When both child workstreams exist, the card explains that the other workstream is already tied to the merchandise and only removal is available.

Creative Force direct Airtable ingestion is separated from the Product workspace. The physical Airtable table `Creative Force Product Feed` was provisioned on 2026-08-12 as `tblxEmSy1xZLHtEWW`. It contains fixed handoff fields plus the union of Product fields required by client Photo Production Requirements. The current live dynamic fields include `Product Name`, `UPC / Product ID`, `CVID`, `WKFT Job Number`, `Brand Prefix`, `File Name Description`, and `Valid Artwork Path`. `Product Type` remains available in Products and client photo requirements, but is not projected into the Creative Force feed. The schema utility adds a new scalar column when a client configuration introduces another supported feed field. It is not a status, blocker, or reporting table.

When an Ecomm or Packaging Workstream Card is released to photo, the backend upserts one flat row into the `Creative Force Product Feed` table. Client Photo Production Requirements are the single gate for entering `Awaiting Photo Release`; the feed writer runs only from the release action, not from raw status updates. The feed contains only Creative Force input fields and is not a status, blocker, or reporting table. The physical table is provisioned; Creative Force Connector configuration remains future work.

The Planning-level photo release path also reconciles every linked Ecomm or Packaging card that is already `Awaiting Photo Release`. Releasing or re-saving a group therefore cannot bypass the automatic Creative Force Product Feed upsert simply because a child card's status did not change during that request.

When a photo release is opened from a specific Ecomm or Packaging card, the release is scoped to that child workstream. The parent Received Merch record keeps its aggregate deliverables, while any unselected sibling remains in its current queue; the parent itself is not moved to Awaiting Photo Release until no photo sibling remains unreleased.

Planning queue placement is now exposed as one normalized API field, `planningStatus`, with the values `new`, `needs-more-information`, and `awaiting-photo-release`. The board no longer reads or writes browser-local queue overrides. Explicit queue writes accept `planningStatus` and translate to the Airtable `Planning Status` field, while `Release to Photo` remains the controlled handoff that populates the Creative Force Product Feed.

New shipment merchandise with `Planning Status` set to `New` remains in the New Merch queue even when raw product or deliverable values are already present from intake. Those values do not count as PM review. Explicit `Needs More Information` and `Awaiting Photo Release` route through their corresponding planning queues. Older status text is handled only by migration utilities, not as active app vocabulary.

The Planning card flow no longer presents Activation as an individual-card step. Workstream cards show and edit only match, deliverables, and configured Product/photo data; when those checks are complete, the card can move to `Awaiting Photo Release`. The PM may release that item alone or add other eligible ready items to the same release, provide the release details, and commit the group with `Release to Photo`. The existing one-time Activation record and `move-to-photo` endpoint remain the persistence mechanism underneath, but the visible workflow is a photo release rather than an activation step.

Admin now has a visible Creative Force section with a live feed preview. It shows that the Airtable feed table is provisioned and previews rows created by photo releases. Refresh is read-only; there is no manual sync control. It does not present blocked items as feed rows; those remain in Products and Planning.

The shared card footer now exposes `Add Deliverable` when exactly one photo deliverable exists and the sibling is missing. It creates only the missing Ecomm or Packaging child and closes the modal; it does not reroute, replace, or downgrade the existing card, including when that card is already Awaiting Photo Release. Once both photo workstreams exist, the add action is unavailable.
### Workstream add/switch actions

Workstream-card review now distinguishes adding a sibling workstream from replacing the current one. Selecting both Packaging and Ecomm on a single existing card exposes `Add Ecomm Workstream` or `Add Packaging Workstream` and creates the missing sibling card. Removing the current deliverable while selecting the alternate exposes `Switch to Ecomm` or `Switch to Packaging` and updates the existing card in place. When both photo workstreams already exist, deliverable editing remains locked and the card can only be removed. The add operation carries the parent Received Merch quantity, matched Expected Product, and manual product information into the new child card.

Removing a photo workstream now deletes that child record from Airtable and synchronizes the parent Received Merch record. If another photo workstream remains, it stays active; if it was the last photo workstream, the parent is reset to Needs Review / Waiting on Information so it returns to the merchandise review queue.
After Airtable confirms removal, the open card closes immediately; the Planning board refresh happens afterward so a slow board reload cannot leave the deleted card open in the modal.
The Planning modal separates required Product data from activation. Product-data completion counts only the Product fields shown in Step 3; activation is shown as Step 4 with its own Add/Edit activation action.
Activations are one-time request packages, not reusable templates. Saving a draft creates or updates one Activation record; continuing a saved draft preserves its record ID, and duplicate merchandise links are removed before persistence. Move to Photo remains the final commit that validates the complete package and advances its linked items together.
Move to Photo treats Due / Urgency as optional, matching the activation editor. The transition also returns a minimal move result instead of re-enriching each Merchandise record, avoiding unrelated linked-record lookups after the Airtable status update.

### 2026-08-13 - Photo Release Is Grouped, Not Card-Level

The Planning review modal no longer presents Activation as a step on individual Received Merch or Ecomm/Packaging workstream cards. Cards expose the same match, deliverables, and configured Product/photo data anatomy; product-data completion is shown on the card and remains editable from the card. Individual cards do not open an activation editor, carry an activation blocker, or release themselves directly to photo.

The Planning board retains the existing Activation persistence and `move-to-photo` API as the current implementation of the group-release operation. Board actions use `Edit Photo Groups` and `Group for Photo` while the final user-facing name is evaluated. Grouping and releasing eligible merchandise remains a separate Planning-level operation, and the Activation table/API has not changed in this slice.
When a photo group is released to photo, the backend updates both the linked Merchandise planning record and its Ecomm/Packaging Workstream Card statuses to `Awaiting Photo Release` and writes the Creative Force feed row. THR3D remains a shipping record and is excluded from photo-card release.
The Shipments navigation now shows a yellow THR3D outgoing count beside Shipments when unshipped THR3D shipping items exist. The in-page `THR3D / Outgoing` count uses the same yellow treatment and the same live `/thr3d-shipping-items` source; the badge is hidden when the queue is empty.

## 2026-08-13 - THR3D Shipping History

The THR3D outgoing Ship action now removes a shipped item from the active queue and its live counts, while the same Shipments view retains shipped items in a `Shipped` table below the active queue. The `/thr3d-shipping-items` response separates active records from shipped history without adding a new table or status model. Tracking remains required by the existing outbound shipment commit.

The workstream-card `Add Deliverable` action now stays visible while the request is pending, shows `Adding...`, and confirms `Added` after the new child card is created instead of closing the modal without feedback.

When the same Received Merch has photo workstream cards, Planning presents those child cards instead of also rendering the parent Received Merch card where compatibility requires child-card visibility. The records remain separate and independently clickable/editable; cards for different merchandise, or siblings in different queues, remain separate.

The photo release modal now derives its visible item fields, artwork/upload fields, and email-preview SKU columns from the selected client's configured photo-production requirements and selected deliverables. Fields that are neither configured nor populated are omitted from the release package. Product values may be inherited from matched merchandise and now render as compact read-only validated details inside each item row instead of editable inputs; Planning remains the place to correct validated item/Product data. Artwork path and upload location are release-package fields and remain editable in the modal. Structure remains available as optional release context. The modal preview uses the selected client and deliverable label rather than a hard-coded Topco Ecomm layout. New photo releases are scoped to one photo deliverable at launch, so the modal no longer shows an internal Deliverables selector. Awaiting Photo Release batching prevents mixed Ecomm and Packaging selection; PMs release those deliverables separately.

### 2026-08-13: Workstream Card status field retired

Workstream Cards now use `Planning Status` as their sole queue/status control in the active app contract. The legacy Airtable `Status` field is no longer read, written, or displayed by the app; it remains untouched in Airtable for deliberate manual cleanup after live-data verification.

The photo release editor marks the same mandatory project and item fields used by its readiness validation with red asterisks. Completed mandatory labels, including configured client fields and path/structure requirements, turn gray as their values are entered.

The release editor places editable `Images/Bundle` and `Total Images` controls beside Walnut Scope. New releases default them to 9 and 9 times the current item count, respectively, while existing Activation values remain unchanged.

The Planning Release view uses three equal-width panels for `Newly Received Merch`, `Needs More Information`, and `Awaiting Photo Release`, each capped at 440px and centred as a group. It is the only Planning view: the List view and the grid/list toggle were removed on 2026-08-19. The Planning toolbar/header band is compact, with reduced top inset and reduced space between the view controls and the cards. On narrow screens the Release view stacks its panels so card text, deliverable badges, and release actions remain readable instead of squeezing into uneven columns.
Planning Release cards keep deliverable badges grouped together at the top-right of each card so Packaging/Ecomm/THR3D indicators read as one compact work-intent cluster. The THR3D card badge uses the same blue treatment as the selected THR3D option in the opened-card Deliverables checklist.
Planning Release sections now group their cards by linked Shipment, using the Shipment received date/name as a compact group header and ordering Shipment groups newest first. This is presentation-only and does not change queue placement, Planning status, or Shipment/Merchandise records.

Planning no longer refreshes Topco source rows when an individual card is opened. Source-linked Product freshness comes from the backend timed refresh and the admin-only manual refresh endpoint. If a refreshed source row has a Request Type, Planning may display the mapped deliverable as the suggested/default deliverable for review when Merchandise has no committed Deliverables yet. That suggestion is not written to Merchandise until the PM confirms the Planning card. The Google Sheet stays read-only, and refresh does not create Planning cards, route work, or create THR3D records.

Structure Form imports store the project on the Product. `Products.Project Name` holds the readable part of the form's Project string — `26007267 | CF Ice Cream Scrounds DFA - MI00204` is stored as `CF Ice Cream Scrounds DFA` — because the WKFT number and Mbox number already have their own fields. The field is on Products only; Merchandise inherits the project through its linked Product. Products imported before the field existed were backfilled from the `_structureForm` Reference Data blob. The Photo Release prefills its Project name from the linked Products, but only when every item in the release carries the same one.

The Photo Release defaults `Walnut Scope` from the deliverable: Ecomm releases open on `Full set renders - WALNUT (PHOTO)` and Packaging releases on `Packaging Shots`. Both values appear in the dropdown and both stay editable.

`Merchandise Verified By` is a plain-text field holding the verifier's display name, not a link to Users. `File Name Description` is read through the shared photo-production resolver everywhere it is judged complete; the value normally lives in the Product Description field, and `_shape_item` returns it under both `productDescription` and `fileNameDescription`.

The Photo Release sends its email. The rendered subject and body are stored on the Activation as `Email Subject` and `Email Body HTML` when the release is made, and the same builder produces both the on-screen preview and the sent message. Delivery uses Microsoft Graph and requires `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, and `PHOTO_RELEASE_FROM_ADDRESS` in the environment; without them the release still records the email and the board reports that nothing was sent. Recipients come from `Clients.Photo Release Recipients`, which accepts addresses separated by lines, commas, or semicolons. Sending happens after the move is recorded and never blocks it.

Released cards mark their deliverable badge green with a check for six seconds, driven by the merchandise IDs the move endpoint returns.

When the release email cannot be sent, the Planning board hands it over rather than losing it: `Open draft` opens the mail client with recipients, subject, and a plain-text body, and `Copy formatted email` places the HTML on the clipboard so a paste into Outlook preserves the SKU table. Bodies over 1800 characters are left out of the `mailto:` because some clients drop an over-long URL silently. Microsoft Graph is still attempted first, so granting `Mail.Send` consent later switches sending back to automatic with no code change.

The sent email carries the preview's styling inline — green values, the yellow SKU table, white uppercase headers, blue underlined links — because mail clients strip stylesheets. `Copy email` puts the body alone on the clipboard and `Open blank message` opens an addressed message carrying the subject, so the two halves arrive where they belong. The `mailto:` never carries a body: it cannot hold the formatting, and long URLs are dropped by some clients.

The Photo Release modal closes on release only when the email was sent. When it cannot send, the modal stays open and its footer offers `Copy email`, `Open blank message`, and `Done`; the Planning board's handoff bar is suppressed so the two do not duplicate. `Copy email` is also on the Email Preview header, available before releasing and on any release reopened through Edit Photo Releases.

`Images/Bundle` and `Total Images` appear only when a photo release includes Ecomm. A Packaging-only release hides them, omits them from the preview and the email, and stores them as null instead of the default 9.

Released Planning cards carry a standing green `R` mark on the deliverable badge line, titled with the release date, alongside the six-second badge flash shown at the moment of release. `Edit Photo Releases` uses the neutral secondary button beside the black `Group Ready Items` primary, and the release card highlight covers the full card including the checkbox lane.

Releasing through a photo release writes `Released`, `Released At`, and `Released By` on the merchandise, the same stamp the drawer's release writes. It is written once — re-releasing an edited photo release keeps the original date — and only when no sibling workstream card is still unreleased.

The Creative Force step shown on a card is the most recently reported one, matching Creative Force's own Current Step. `StepId` is not workflow order and steps it has moved past keep reporting In Progress, so neither can select the current step; identical timestamps mean a reset burst, where work resumes from the first step named in `CREATIVE_FORCE_STEP_ORDER` (Photography, Final Selection, Photo Review, External Post Production, External Post QC, Delivery), with unnamed steps sorting after by `StepId`. Released Planning cards show that step and its status on a temporary line marked with the Creative Force logo.

The deployed app is canonically `https://food.walnutcontent.com`, a Cloudflare CNAME to the Render static site left unproxied so Render can issue and renew its certificate. `VITE_CANONICAL_HOST` on the static site redirects any other hostname there from the app entry, keeping path and query; it is unset locally so development is unaffected. `CORS_ORIGINS` on the API lists both origins.

Creative Force posts to `https://hooks.walnutcontent.com/api/integrations/creative-force/webhook` permanently, which resolves to the Render API. Setting `CREATIVE_FORCE_FORWARD_URL` there relays a verbatim copy of each authentic event — same body, same `X-CF-Signature` — to a second instance, normally `hooks-dev.walnutcontent.com`, which is the named tunnel to the development machine. The relay runs on a background thread and swallows failures, so a development outage never affects production. `X-CF-Forwarded` prevents a relay being relayed onward.

The Topco source refresh reads the sheet before Airtable and fingerprints the parsed rows, so an unchanged sheet costs no Airtable calls at all; only a changed fingerprint triggers the Products scan. The background worker re-reads its schedule at the cadence that schedule names, capped at five minutes, and sleeps until a client is due rather than waking every minute. A manual refresh forces the work regardless. Each process running the worker keeps its own loop, so a multi-worker server or a development instance running alongside production multiplies the calls.

Whole-table Airtable scans are cached in process: sixty seconds for Clients, Locations and Users, ten seconds for other tables, with filtered reads never served from cache. Every create, update or delete through the Airtable client invalidates that table first, so the application's own writes are visible immediately and only direct Airtable edits can be stale. `create_app()` clears the cache. A Planning page load costs 14 Airtable calls, down from 22.

### 2026-09-18 - Kroger workbook upload settings

Kroger onboarding starts with manual workbook upload through the existing Import workspace. Admin > Clients can configure a Product Import mapping even when the Client has no saved mapping yet. For Kroger, opening that editor starts with an unsaved `Kroger workbook` profile configured for worksheet `Master Tracker Sierra`, header row 3, and the source columns `MySGS Job Number`, `UPC`, `Product Description`, `Structure/Cap Color`, `Visible Product?`, `Structure Status`, `On Hold/Live`, and `If on hold, reason`. Saving persists the worksheet, header row, and mappings in the existing Client `Product Import Profiles` JSON field. Production milestone columns beginning with Sierra pulled-files and photography/outlining/retouching dates are not part of this initial Product import contract. No Airtable schema or Planning workflow changed.

The Client mapping editor now exposes every supported Product import destination, including Brand, Notes, Product Job Number, and Reference Data, displays saved Reference Data mappings accurately, and shows the configured worksheet/header row. Import preview accepts a named worksheet and includes a worksheet picker for multi-tab workbooks. The attached `Kroger Render Master Tracker.xlsx` was verified against `Master Tracker Sierra`: 10 rows, 17 populated source columns, header row 3.

### 2026-09-18 - Actionable lifecycle Workspace

Workspace now spans Merchandise, Planning, and a read-only Production glance in one grouped table. Rows that are fully Required to Shoot and already committed to `Awaiting Photo Release` show one release action for each pending Ecomm or Packaging workstream. The action uses the existing scoped release endpoint, requires confirmation, writes the normal Creative Force handoff, and refreshes the row. Already-released workstreams are not offered again; fully released rows open Production. Rows that still need Product data show `Complete data`, while otherwise-uncommitted rows open Planning. Saving the final inline Product field refreshes the feed so release eligibility is recalculated immediately. THR3D-only rows never show a photo-release action.

Verification on 2026-09-18: `backend/.venv/bin/python -m unittest discover -s tests` passed 816 tests. `npm run build` passed; Vite continues to report the existing large-chunk advisory.

### 2026-09-18 - Matched Products provide the Merchandise display name

Merchandise now has one consistent display-name rule across Workspace, Inventory, Merchandise Review, Planning summaries, release prompts, and THR3D shipping views. When a Product is linked, its canonical Product name is the primary Merchandise title. Unmatched Merchandise continues to use the observed package name, then its description, then `Unnamed Merchandise`. The API exposes the derived `displayName` and preserved `observedProductName`; no Airtable field or observed value is overwritten. Where the names differ, Inventory and Workspace retain the observation as quiet `Received as` context, and verification/matching surfaces continue to use the observed package name as evidence.

The Workspace `Received` column shows the Central-time calendar date only; relative age remains underneath. Other detailed date/time surfaces are unchanged.

Workspace no longer repeats the canonical name in a separate Product Name column. A linked Product is shown by a compact green check beside the Merchandise title; unmatched Product Name still contributes to the Product Info missing count and is resolved in Planning.

The Merchandise group header explains that check with `= Matched to a Product`. Workspace table headers suppress the shared global table border and draw one divider between the group and column-label rows plus one beneath the complete header, avoiding stacked duplicate rules while preserving the hierarchy.

Workspace column widths are user-adjustable from the column-header boundaries. Dragging resizes a column, focused handles accept Left/Right arrow keys, and double-click restores that column's default width. Widths are stored in the browser for the current user/device; no shared data or schema is involved.

Verification remains 816 passing tests. The frontend production build passes with the existing Vite large-chunk advisory.

### 2026-09-18 - Brand Prefix stores the filename token

Client Brand Prefix configuration keeps descriptive options such as `FC -FoodClub` for recognition in the open selector. Products canonically store and display only the filename token, such as `FC`. Product imports and Product edits normalize descriptive values before writing, and API reads normalize legacy full-label values so existing records display consistently without a schema migration. The open selector retains the descriptive label; its closed state shows the saved token.


## 2026-09-19 - Request is separate from Merchandise lifecycle

Product records are reference data and are not operationally expected merely because they exist. Products now expose an Expected column and flag action that creates an optional Request with status Waiting; clearing the flag cancels that Request. Matching received Merchandise to the Product, including during confirm-and-assign, fulfills any waiting Request and links it to the Merchandise.

The Merchandise modal lifecycle now starts at Received and reads Received -> Review -> Activate -> Execute -> Done. Expected is no longer a Merchandise stage. The modal is wider, comments/history may be collapsed to recover work space, and the footer is explicitly Close plus Save review/Save changes. Saving refreshes the open record in place rather than silently closing it. Action activation remains on the individual Action row.

Issues are retired from the active operating model. The review interface no longer creates or displays Issue records, validation and release no longer query Issues, and physical exceptions belong in Merchandise condition/notes while review blockers remain derived reasons. The confirmed-empty Airtable table was renamed Deprecated Issues - Delete because Airtable's metadata API does not provide table deletion through the application endpoint; it is a manual deletion target.

Live schema state: Requests exists with Product, Status, Merchandise, Needed By, and Notes fields. The schema utility is backend/ensure_requests_schema.py.

Verification: the frontend production build passes. The full backend suite passes 820 tests. Vite continues to report the existing large-chunk advisory.


## 2026-09-19 - Deliverables are independently selectable

Packaging, Ecomm, and THR3D are independent deliverable choices. Planning may select any one, any pair, or all three on the same Merchandise record. Ecomm and THR3D are no longer treated as mutually exclusive GS1 paths. Packaging plus THR3D retains quantity allocation because those paths may divide physical units; adding Ecomm does not alter that allocation.


### 2026-09-19 - Lifecycle header clarity

The Merchandise review modal now labels every lifecycle step as Complete, Current, or Upcoming and uses an amber current-stage treatment so the active stage cannot be confused with a completed one. The generic `Missing CF Data` lifecycle badge was removed; actionable missing requirements remain beside the Product Data or Deliverables section where they can be resolved.

Verification: the frontend production build passes with the existing Vite large-chunk advisory. Focused merchandise review and intake tests pass: 61 tests.


### 2026-09-19 - Review is the visible lifecycle label

Planning and Workspace now display `Review` anywhere the persisted compatibility status is `Needs More Information`. Existing Airtable values and queue routing remain unchanged; the translation is presentation-only so current records require no migration.

Verification: the frontend production build passes with the existing Vite large-chunk advisory. Frontend source contract tests pass: 163 tests.


### 2026-09-19 - MediaBox visibility and client requirement

MediaBox Number is always visible and editable in the Merchandise modal Product Data section for photo deliverables. A blank value is labeled Optional unless that Client has selected MediaBox Number under the Packaging or Ecomm required Product fields. When selected, it participates in the existing readiness and release gate; when unselected, it does not block release. Storage remains the existing Product `Mbox Number` field and no schema change was made.

Verification: the frontend production build passes with the existing Vite large-chunk advisory. The focused client settings, Product data, readiness, release, and frontend contract suite passes 254 tests; the dedicated Product data test passes 5 tests.


### 2026-09-19 - Workspace Board/Table and three-milestone lifecycle

Workspace now owns Board and Table views behind one navigation item. The Board uses Received and Reviewed sections and removes photo work immediately after activation; its parent Merchandise does not reappear because board membership still recognizes all child work. The Table remains the broader searchable view, including activated work. Legacy Planning, Intake, Work, and merchandise-review-v2 routes redirect to the Workspace Board, and deep-link item parameters are preserved by in-app routing.

The Merchandise modal now presents only Received, Review, and Activate as the shared lifecycle. A complete review can proceed directly into activation without closing and reopening the item. Activation may optionally include the existing activation email. THR3D-only activation continues into Shipments / Outgoing rather than implying production completion. Ask in Chat is available when required information is missing; it sends the missing-field request to the client's configured chat channel and records the request in History without changing the item's queue or lifecycle. MediaBox Number remains visible in Product Data and is client-configurable as required.

No Airtable schema or database migration was performed. Existing Planning Status and Released fields continue as compatibility storage.

The Workspace view selector now lists Table before Board to match the default experience. Each user's last selected Table or Board view is stored in browser preferences and restored on later plain `/workspace` visits. Explicit `?view=table` and `?view=board` links still open the requested view and update that preference.

Ask in Chat evaluates the unsaved Product values currently visible in the Merchandise modal, so a populated field is not requested merely because Save Changes has not run yet. Chat requests include only client-answerable missing information; internal checks such as Merchandise Verified, Deliverables, and Product Linked are excluded.

File Name Description is a filename-safe token rather than prose. Generated suggestions, modal edits, imports, and Product writes allow only ASCII letters, numbers, and underscores; punctuation and whitespace become collapsed underscores while apostrophes are removed. For example, `Ice Cream Cones (Original, Chocolate, Strawberry)` becomes `Ice_Cream_Cones_Original_Chocolate_Strawberry`.

Merchandise modal section markers are status indicators rather than step numbers. Incomplete sections show an empty gray circle, while complete sections show the existing green check.

The merchandise fact list in the modal uses a tighter row rhythm so shipment, quantity, condition, and package identity read as one compact block.

The Merchandise lifecycle header uses only Received, Review, and Activate. Its color, top rail, and active background communicate state without the redundant Complete, Current, and Upcoming sublabels.

The Deliverables section keeps its bottom divider. The split-quantity panel shows the received quantity and the two allocations without repeating them in an additional assignment sentence.

Source-linked Products show a refresh icon in the Merchandise modal's matched Product card. It refreshes that Product from its exact source row and reloads the open record; Products without source-row metadata do not show the control. Automatic source refresh remains client-configurable and defaults to every 300 seconds for Topco. The refresh busy state is local to the Merchandise Planning modal, preventing unrelated Workspace or Shipments renders from referencing it. The returned refreshed Product also replaces the open modal draft immediately, so newly supplied values such as CVID appear without closing or reopening the item. The refresh icon rotates for the duration of that request and exposes a matching refreshing label to assistive technology.

Verification on 2026-09-19: the full unittest suite passes 821 tests. The frontend production build passes; Vite continues to report the existing large-chunk advisory.

### 2026-09-19 - Lifecycle tense follows milestone state

Completed lifecycle milestones use completed-state labels, while the current and upcoming milestones use command labels. For example, a merchandise item under review displays `Received` / Complete, `Review` / Current, and `Activate` / Upcoming. The underlying lifecycle values remain Received, Reviewed, and Activated.

Verification: frontend contract tests pass 163 tests and the frontend production build passes with the existing Vite large-chunk advisory.

### 2026-09-19 - Review reasons are specific only

The lifecycle header no longer displays the generic `Needs Direction` badge. The Product Match section communicates its own unmatched state, so the lifecycle header does not repeat `Needs Product Match`. Review reason badges are reserved for actionable conditions that are not already clear at their control, such as `Missing MediaBox`; section-level requirements such as choosing a Deliverable remain beside the control that resolves them.

Verification: focused merchandise-review and frontend contract suites pass 180 tests, and the frontend production build passes with the existing Vite large-chunk advisory.

### 2026-09-19 - Activation history is contextual, not a Board command

The Workspace Board no longer shows `Edit Activations` or `Activate Ready Items` as global header actions. Individual merchandise activation remains available from the modal, and selected ready cards may still be activated together from their Board section. Existing Activation records and Merchandise History remain intact; activation history belongs with the Merchandise History and broader Workspace Table rather than a competing Board-level editor.

Verification: frontend contract tests pass 163 tests and the frontend production build passes with the existing Vite large-chunk advisory.

### 2026-09-19 - Obsolete Activation utilities removed

The former Activation list editor and bulk ready-item selection flow are removed, including their state, handlers, card checkboxes, group selection controls, and styles. Activation now begins only from the individual Merchandise review context. Existing Activation records are retained as audit/email-package data and continue to contribute to Merchandise History; removing the utilities does not delete historical records. This supersedes the earlier same-day note that selected ready groups could still be activated together.

Verification: frontend contract tests pass 163 tests, the frontend production build passes with only the existing large-chunk advisory, and the diff has no whitespace errors.

### 2026-09-19 - Workspace views share stable header geometry

Board and Table now use the same three-column Workspace header geometry: title at left, the Board/Table switcher fixed in the center, and the Table summary at right with an equal reserved footprint on Board. The embedded Board also uses the same horizontal content edges as Table. Switching views no longer moves the title, switcher, or primary content boundary.

Verification: frontend contract tests pass 163 tests and the frontend production build passes with the existing Vite large-chunk advisory.

### 2026-09-19 - Workspace header remains visible over Board

The shared Workspace header now owns an explicit light background and title color rather than inheriting the Board canvas. The Board/Table switcher is positioned at the visual center independently of the right-side Table summary, so it does not drift when switching views. Mobile returns the controls to normal document flow.

Verification: frontend contract tests pass 163 tests and the frontend production build passes with the existing Vite large-chunk advisory.

### 2026-09-19 - Newly Received is an inbox, while the modal begins at Review

The Workspace Board keeps `Newly Received` as a dedicated attention column for merchandise that has not yet received PM review. Opening one of those cards does not repeat physical receipt as an unfinished task: because a Merchandise record exists only after receipt, the modal displays `Received` as complete, `Review` as current, and `Activate` as upcoming.

When the Merchandise is already matched to a Product, the same modal shows Deliverables and required Product data immediately. A PM may complete review and activate in one session without saving, closing, and reopening the item. Unmatched merchandise continues to require a Product match before new Deliverables are chosen. No Airtable schema change was made.

Verification: focused merchandise lifecycle and frontend contract suites pass 181 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-19 - Product Match collapses source rows into durable Products

The Product Match picker no longer displays an Airtable Product beside the source-sheet row from which it was created. Candidate merging prefers the durable Airtable Product and removes the corresponding source candidate by source-row snapshot first, then UPC, with exact normalized name used only when neither candidate has an identifier. Source-only rows remain available for activation. This is a presentation/read-model change and does not delete or merge Airtable or source data.

Verification: Product Match and source integration suites pass 196 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-19 - Workspace queue labels use active tense

Workspace Board queue labels now use `Review`, not `Reviewed`: `Review` and `Review · Ready to Activate`. Supporting descriptions and move confirmations follow the same vocabulary. The persisted lifecycle/status value `Reviewed` remains unchanged as an internal completed-state value; this is a presentation correction with no schema or routing change.

Verification: frontend contract tests pass 163 tests; the production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-19 - File Name Description calculates when a Product is selected

Selecting either an existing Airtable Product or a source-sheet Product candidate now populates File Name Description immediately in the open Merchandise modal. Source candidates receive the same brand-aware, size-removing suggestion used by durable Products before they are saved; an explicit source description still wins when present. The PM may edit the draft before committing it with the review. No save-and-refresh round trip or schema change is required.

Verification: filename suggestion, source integration, and frontend contract suites pass 251 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-19 - Save Changes and Activate are separate authorized commands

The Merchandise modal always presents `Save Changes` for review work. When the item is ready, users whose role has the `activate_merchandise` capability also see a separate `Activate` command; users without it see no disabled or unavailable activation control. Admin and Producer roles receive the capability by default, and administrators can change it per role on Administration / Roles. The same capability is enforced by activation, Action-status, release, and explicit dispatch endpoints.

Saving ready photo work leaves it in `Review · Ready to Activate`. Saving THR3D-only work no longer creates its Outgoing shipment; only Activate performs that handoff. Role Policies continue using the existing `Workspace Paths` Airtable field, whose JSON now supports both `paths` and `capabilities`; legacy path-array records remain compatible and inherit role defaults. No Airtable schema migration was made.

Verification: the full unittest suite passes 825 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-19 - Activate appears only when activation is valid

The Merchandise modal does not render the `Activate` command while any required Product field, Product match, deliverable, or quantity-allocation requirement is unresolved. `Save Changes` remains available so incomplete work can be preserved. Once the review is activation-ready, `Activate` appears only for users whose role has the activation capability.

Verification: frontend contract tests pass 163 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace table has a filterable Deliverable column

The Workspace table displays Packaging, Ecomm, and THR3D badges in a dedicated Deliverable column under Planning instead of embedding them in the Merchandise identity cell. Those badges reuse the shared Package, Camera, and 3D icons, and their flex layout lives inside a normal table cell so column sizing and row borders remain intact. A single All/Ecomm/Pack/THR3D menu filters both Planning merchandise rows and Production action rows by their canonical committed Deliverables. Mixed-deliverable merchandise keeps all applicable badges visible. No schema or routing behavior changed.

Verification: frontend contract tests pass 168 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-21 - Workspace Production begins at activation

Workspace no longer treats the existence of an Ecomm or Packaging action row as evidence that work is in Production. Unreleased photo action rows remain under Planning and count in the Planning filter; only released rows appear under Production and count in the Production filter. The section labels now reinforce the boundary as `Planning · Awaiting activation` and `Production · Activated Ecomm and Packaging`. No Airtable field, status, or schema changed.

Verification: frontend contract tests pass 168 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-21 - Workspace table includes THR3D shipment rows

The Workspace table now includes one derived row for every existing THR3D Shipping Item, including both open and shipped items returned by the canonical Shipments endpoint. THR3D rows appear in a distinct `Shipments · THR3D` section and a filterable `THR3D` scope rather than being classified as photo Production. Each row displays `Not shipped` with the quantity still to send, or `Shipped` after the outbound shipment is completed. Once a THR3D Shipping Item exists, its parent Merchandise row is not duplicated in Planning; mixed photo plus THR3D work still displays its independent photo and shipping rows. No schema or Airtable status was added.

Verification: frontend contract tests pass 168 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors. Visual browser verification was unavailable because the configured writable root contains a symlink that prevents the browser-control runtime from starting.

### 2026-09-21 - Workspace table uses activation vocabulary

Workspace translates the compatibility Planning value `Awaiting Photo Release` to the public label `Awaiting Activation`, regardless of source casing. Unactivated photo work displays `Not activated`, and completed handoffs display `Activated`. The stored Airtable value and backend contract remain unchanged; this is a presentation-boundary correction rather than a schema or data migration.

Verification: frontend contract tests pass 168 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-21 - THR3D has a separate Workspace shipment table

Workspace no longer mixes THR3D Shipping Items into the wide Planning/Production table. A compact `Ship to THR3D` table appears beneath it with Merchandise, received date, quantity to ship, shipping status, and the date shipped to THR3D. Shipped dates come from the linked outbound Shipment `receivedDate`; no duplicate date field was added. The THR3D endpoint now includes the linked outbound Shipment when available. Search applies to both Workspace tables.

The Dashboard `Completed` KPI was replaced with `Ship to THR3D`. Its number counts open THR3D Shipping Items (`Needs Shipment`), not merchandise units, and opens Shipments when selected.

Verification: the focused THR3D endpoint test and frontend contract suite pass 170 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace columns are customizable per user

The Workspace Table now has a Columns menu for both photo work and THR3D shipments. Users may show or hide operational columns independently, and the choice is remembered in browser storage under the signed-in user identity. Merchandise identity remains pinned so a working row cannot lose its context. The main table retains its existing drag-to-resize column widths; grouped Planning and Production headers recalculate from the visible columns. No Airtable schema or workflow state changed.

Verification: frontend contract tests and production build pass; the diff has no whitespace errors.


### 2026-09-21 - Dashboard opens THR3D Outgoing directly

The Dashboard `Ship to THR3D` KPI now deep-links to `Shipments -> THR3D / Outgoing` through the durable `/shipments?tab=outgoing` URL. Shipments initializes and synchronizes its selected subview from that URL.

The Outgoing Ship command now validates tracking before sending the request, labels the field `Tracking required`, and renders validation or server errors inside the Outgoing view. Previously the server correctly rejected blank tracking, but the page displayed the error only inside the hidden Incoming form, making Ship appear unresponsive. No schema or shipment-state behavior changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace Merchandise header spans identity columns

The top Workspace table now uses one `Merchandise` column heading across both the thumbnail and merchandise-name columns, matching the THR3D shipment table. The combined heading retains the merchandise-column resize handle. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - THR3D shipping defaults to FedEx and exposes completion date

THR3D Outgoing selects FedEx by default regardless of Airtable carrier-option order, while preserving the user's ability to choose another carrier. The outgoing work area is wider so carrier, tracking, and Ship controls have sufficient room. After a successful Ship request, the canonical endpoint creates the outbound Shipment, marks the THR3D Shipping Item `Shipped`, reloads the queue, and the shipment-history table displays the outbound Shipment's recorded date. No duplicate shipped-date field was added.

Verification: focused frontend and intake suites pass 214 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - THR3D queue exposes its ship-to address

The THR3D Outgoing header includes a compact in-app `Ship-to address` disclosure for the current THR3D recipient and destination. It reveals the address without navigating away from Marks Photo or sending recipient data to an external mapping service. The header width matches the widened outgoing work area.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace THR3D rows carry their deliverable badge

Each row in the Workspace `Ship to THR3D` table now displays the shared THR3D deliverable badge and 3D icon inside its Merchandise identity cell. The shipping table remains independently filterable and does not add a duplicate deliverable column.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - THR3D quantity label names its purpose

The Workspace THR3D table and its column-visibility menu label the outbound amount `Quantity To Ship`, replacing the ambiguous `Quantity` label. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Shipments routes preserve requested subviews

The shared page-route helper now retains query parameters for Shipments. As a result, the Dashboard `Ship to THR3D` KPI resolves to `/shipments?tab=outgoing` and reliably opens `THR3D / Outgoing`; previously the click supplied the tab but the helper discarded it while constructing the Shipments URL.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace tables share one visual structure

The Workspace THR3D shipment table now uses the same table structure and styling as the photo-work table: a two-level Merchandise/Shipping header, separate thumbnail and merchandise identity columns, a dedicated Deliverable column, stacked Received date and age, matching typography and row density, fixed column widths, and the shared sticky identity treatment. Shipment-specific columns remain Quantity To Ship, Shipping Status, and Shipped to THR3D. THR3D column visibility remains independently customizable.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - THR3D Outgoing thumbnails open merchandise photos

Each open THR3D Outgoing item now opens a read-only Merchandise photo viewer from its thumbnail. The viewer presents every available item and linked Shipment photo, the quantity to ship, thumbnail navigation, Previous/Next controls, and keyboard navigation. Shipping staff can inspect exactly what belongs in the box without entering Planning or exposing review and activation controls. No Airtable schema or shipment-state behavior changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace THR3D filter toggles its shipment table

The Workspace scope control now includes a THR3D button with the total shipment count. THR3D remains an independent outbound-shipment table rather than a photo-work lifecycle scope: the control starts active and toggles that table on or off without changing the selected All, Planning, or Production scope. No data model or workflow behavior changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace tables fill the available width

Both Workspace tables now extend to the right edge of the work area on wide screens. Their calculated column totals remain minimum widths, so compact screens retain horizontal scrolling instead of compressing operational fields beyond readability. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace tables use a single header row

The repeated grouped header bands were removed from both Workspace tables. The photo-work table no longer repeats Merchandise, Planning, and Production above its actual columns, and the THR3D table no longer repeats Merchandise and Shipping. The green `Matched to a Product` legend now sits directly beside the Merchandise column label. Sticky-header positioning was adjusted for the shorter one-row header. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Workspace is labeled Planning in the application

The PM-facing navigation tab and page heading are now `Planning`, matching the language used throughout the board and activation process. Related view, summary, search, record-type, and column accessibility labels also use Planning. The canonical route remains `/workspace`, and internal workspace-prefixed state and preference keys remain unchanged to preserve links and user settings. No permissions, queues, schema, or lifecycle behavior changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Creative Force column includes a compact brand mark

The Planning table now places a small branded `C` mark immediately before the Creative Force column label. The mark is decorative, while the full text remains available to assistive technology and the column resize control retains its `Resize Creative Force column` label. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - THR3D shipping cards show only actionable facts

Open THR3D Outgoing cards no longer display the fallback phrases `No identifier`, `Location needed`, or `Original shipment not linked`. Real values are labeled `UPC / ID` and `Current location`; absent optional values are omitted. Completing a full-quantity THR3D shipment continues to create the outbound Shipment and now moves the same Merchandise record to the existing active `Shipped to Thr3d` Location. A partial shipment leaves the parent Merchandise location unchanged because Walnut still holds the remaining units; the THR3D Shipping Item and outbound Shipment record the shipped portion. No duplicate Merchandise record or schema change was introduced.

Verification: focused frontend and intake suites pass 214 tests.


### 2026-09-21 - Planning scopes are mutually exclusive

The Planning table scope now treats `All`, `Planning`, `Production`, and `THR3D` as one mutually exclusive tab set. Selecting THR3D hides the photo-work table and shows only the `Ship to THR3D` table; selecting any other scope hides the THR3D table. The separate `showThr3d` toggle state was removed, and the toolbar item count follows the selected table.

Verification: frontend contract tests pass 169 tests.


### 2026-09-21 - Dashboard top badges follow Planning

The Dashboard top row now shows `Newly Received Merch`, `Needs Review`, and `Awaiting Activation`. These counts use the same Merchandise and unreleased photo-card membership and section routing as the Planning board, including suppression of parent Merchandise once child photo or THR3D work exists. The retired Product-readiness KPIs no longer appear in this top row. Each badge opens Planning; the lower blocker and Creative Force dashboard areas are unchanged.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Planning table identity spacing is consistent

The THR3D table remains full-width, but its extra horizontal space now flows into the final column instead of widening the thumbnail-to-name gap. Its Merchandise identity spacing therefore matches the main Planning table. The `Matched to a Product` legend beside the main Merchandise header is again compact secondary text. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - THR3D tracking is visible after shipment

Shipments `THR3D / Outgoing` now shows the outbound tracking number in its Shipped history table. Planning's THR3D table also includes Tracking, sourced from the same linked outbound Shipment and available in the user-local Columns menu. Open items show no tracking value until shipped. No schema or duplicate tracking field was introduced.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Planning uses the supplied Creative Force mark

The Creative Force column header now uses the supplied transparent Creative Force `C` image rather than the temporary styled text character. The visible `Creative Force` label remains unchanged and accessible. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - All Planning view includes THR3D

Selecting `All` in the Planning table now shows the photo-work table followed by the `Ship to THR3D` table. The All badge and toolbar item total include both photo-work rows and THR3D shipment rows. The focused `Planning` and `Production` scopes continue to show only photo work, while `THR3D` continues to show only the shipment table.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Remove workstream control is right-aligned

The destructive `Remove workstream` control now aligns to the right edge of its modal footer area, while the received date remains left-aligned. Its behavior and confirmation rules are unchanged. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Remove workstream aligns to the media-panel edge

On desktop Planning modals, `Remove workstream` is anchored to the right edge of the dark merchandise media panel rather than the narrower footer content group. Narrow layouts return the control to normal footer flow. Behavior and confirmation rules are unchanged. This supersedes the earlier same-day alignment adjustment.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Matched Product legend sizing refined

The Planning table's `Matched to a Product` legend now uses a slightly smaller 12px check indicator and a 9px label. Row-level match indicators are unchanged. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Creative Force presentation begins at activation

The supplied Creative Force header logo now has a transparent background. In the Planning table, photo-work rows that have not been activated leave Creative Force Status and Current Step blank; their Planning Status continues to show `Awaiting Activation`. Activated photo work retains Creative Force status and step reporting, and THR3D shipment statuses are unchanged.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the logo PNG has a transparent corner pixel; the diff has no whitespace errors.

### 2026-09-21 - Optional MediaBox Planning column

The Planning table column chooser now includes MediaBox Number using the existing Product `Mbox Number` field. The column is hidden by default for both new and existing users and becomes visible only when explicitly enabled. Column visibility does not change whether MediaBox is required; client settings remain the source of that requirement. No schema change was made.

### 2026-09-21 - Columns menu dismissal

The Planning table Columns menu now closes when the user clicks outside it. Interactions inside the menu remain active, and the Columns control retains its native toggle behavior.

### 2026-09-21 - Creative Force To Do status label

Creative Force raw `Todo` and `ToDo` values now display as `To Do`. The Planning production table prioritizes the overall Creative Force work-unit status over the per-step status. Current Step remains `Awaiting first update` until Creative Force reports a named step; Marks Photo does not infer Photography from a generic To Do status.


### 2026-09-21 - Planning table view uses three independent tables

The Planning table view now renders Planning, Production, and Ship to THR3D as separate tables. `All` stacks all three tables; the Planning, Production, and THR3D scope tabs isolate their corresponding table. Each table has its own saved per-user column visibility and column widths. Planning contains planning data only; Creative Force Status and Current Step are available only in Production. Planning and Production now use the same direct title/count plus column-header structure as the THR3D table instead of colored divider rows inside one merged table. No schema or workflow behavior changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-21 - Creative Force header alignment

The Creative Force mark and label in the Production table header now align as one vertically centered unit with the neighboring column labels. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.

### 2026-09-21 - Planning table headers tightened

Planning, Production, and THR3D column headers now use less space below their labels while retaining a readable top inset and the existing alignment. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Per-table column order and defaults

Planning, Production, and THR3D column menus now support drag-to-reorder. The resulting table column order is saved per signed-in user and independently per table in browser storage. Planning defaults to its review fields with MediaBox Number hidden. Production defaults to Received, Deliverable, UPC / Product ID, MediaBox Number, Activation Status, Creative Force, Current Step, and Current Step Date; CVID, WKFT #, Brand Prefix, and File Name Description remain available but start hidden. THR3D keeps all shipping columns visible by default. Current Step Date uses the existing Creative Force step reported timestamp and introduces no schema field.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Optional MP Number table column

Planning and Production column menus now include MP Number. It displays the existing Merchandise Marks Number in its formatted `MP-#####` form, is read-only, is off by default in both tables, and can be independently enabled and reordered per user. No Product field or Airtable schema change was introduced.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Column drag placement indicator

The Planning, Production, and THR3D column menus now show a blue insertion line above or below the target row while a column is dragged, plus a subtle target-row highlight. The pointer position determines both the displayed placement and whether the column is inserted before or after the target. Saved per-user column ordering is otherwise unchanged.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - MediaBox display label shortened

User-facing MediaBox Number labels now display as `MediaBox #` across the app, including Planning and Production column selectors. The internal `mboxNumber` key and Airtable `Mbox Number` field remain unchanged. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Current Step timestamp includes time

The Production table Current Step Date column now displays both the date and time of the existing Creative Force reported timestamp in Central time. No source data or schema changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Matched Product legend is Planning-only

The Matched to a Product legend now appears only in the Planning table Merchandise header. The Production table keeps its plain Merchandise header, while row-level Product match indicators remain unchanged. This is presentation-only.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - THR3D merchandise spacing aligned

THR3D table rows now keep the thumbnail and merchandise copy in one two-column cell with a fixed internal gap. This prevents the thumbnail column from stretching when the narrower shipping table fills the available width and keeps its spacing consistent with Planning and Production. No data or workflow behavior changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Planning board controls align with lanes and support MediaBox grouping

The Planning board filter controls now occupy the same three-column grid as the board and align to the right edge of the rightmost lane instead of the page edge. The former shipment checkbox is now a mutually exclusive grouping selector with `Group by shipment` and `Group by MediaBox #`. MediaBox grouping reads the matched Product's existing MediaBox value and places blank values under `No MediaBox #`; it does not add or change Airtable fields.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory; the diff has no whitespace errors.


### 2026-09-21 - Awaiting Activation modal exposes Activate

Eligible, unreleased photo-work cards in the Awaiting Activation queue now show an `Activate` button beside `Save Changes` in the Planning modal. `Save Changes` persists Product detail edits without opening activation; `Activate` first saves pending edits and then opens the activation package. Activation remains unavailable when required data is incomplete, the user lacks activation permission, or the card is already activated. No schema or lifecycle state changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory.


### 2026-09-21 - Dashboard ready-to-production count restored

The dashboard no longer crashes when rendering the Ready for Production section. Its `readyToShoot` count is again derived from open Product records whose existing Required to Shoot state is `ready_for_photo`; no workflow state or schema changed.

Verification: frontend contract tests pass 169 tests; the frontend production build passes with the existing Vite large-chunk advisory.

### 2026-09-21 - Empty Planning tables are suppressed

Planning, Production, and THR3D table sections now render only when their current filtered view contains rows. When the selected scope or filters produce no rows at all, Planning shows one `No items match this view.` empty state instead of an empty table shell. No data model or workflow behavior changed.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (169 tests passed); `npm --prefix frontend run build` (passed; existing Vite chunk-size warning remains).

### 2026-09-21 - THR3D merchandise labels retain their table width

The THR3D shipment table merchandise cell no longer overrides the table-cell layout with flex display. Its thumbnail and merchandise copy now align inline within the intact two-column span, preserving room for the full product name and UPC with ellipsis only when the combined merchandise column is genuinely constrained.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (169 tests passed); `npm --prefix frontend run build` (passed; existing Vite chunk-size warning remains).

### 2026-09-21 - Resizable table columns have visible boundaries

Planning, Production, and THR3D table headers now show a very faint vertical divider at each column-resize handle. Hovering or focusing a divider retains the stronger blue affordance, making draggable boundaries discoverable without visually boxing in the table.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (169 tests passed); `npm --prefix frontend run build` (passed; existing Vite chunk-size warning remains); `git diff --check` passed.

### 2026-09-21 - THR3D rows no longer inherit photo-table sticky columns

The THR3D shipment table now opts out of the shared first- and second-column sticky positioning that was treating its combined Merchandise cell and Received cell as separate sticky photo-table columns. This restores the full merchandise label and UPC width. Header boundaries also use faint vertical rules and slightly clearer resize handles so draggable columns are discoverable.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (169 tests passed); `npm --prefix frontend run build` (passed; existing Vite chunk-size warning remains); `git diff --check` passed.

### 2026-09-21 - Planning header and filters tightened

The redundant Planning page title was removed from both table and board views, collapsing the unused title band while preserving the centered Table/Board switch and summary controls. The table search now uses a shorter desktop width, and the deliverable filter has matching control height, typography, border, hover, and focus styling so it reads as part of the same toolbar. No workflow or data behavior changed.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (169 tests passed); `npm --prefix frontend run build` (passed; existing Vite chunk-size warning remains); `git diff --check` passed.

### 2026-09-21 - Planning table section headers size naturally

Planning, Production, and THR3D table section headers no longer reserve a 34px minimum height. Their height now follows the heading content, reducing unnecessary vertical space without changing table behavior.

Verification: frontend production build passed with the existing Vite chunk-size warning; `git diff --check` passed.

### 2026-09-21 - Redundant Planning toolbar count removed

The aggregate item count beside the Columns control was removed because the scope tabs and table section headings already show the relevant counts.

Verification: frontend production build passed with the existing Vite chunk-size warning; `git diff --check` passed.

### 2026-09-21 - THR3D merchandise spacing matches photo tables

The THR3D table now uses the same effective thumbnail-to-copy spacing as the separate thumbnail and Merchandise columns in Planning and Production. The merchandise copy width was adjusted with the gap so long labels continue to truncate safely.

Verification: frontend production build passed with the existing Vite chunk-size warning; `git diff --check` passed.

### 2026-09-21 - THR3D merchandise copy aligns with the tables above

The THR3D merchandise cell now reserves the same visual thumbnail column width as Planning and Production, aligning its merchandise name and identifier with the names above rather than placing them immediately after the thumbnail.

Verification: frontend production build passed with the existing Vite chunk-size warning; `git diff --check` passed.


### 2026-09-21 - THR3D quantity splitting applies to all Walnut photo work

The Planning merchandise modal now shows the quantity split whenever THR3D is selected with Ecomm, Packaging, or both. The entered THR3D quantity is assigned to the outbound action and the remaining units stay with Walnut for each selected photo deliverable. This replaces the prior Packaging-only condition, which hid the split for Ecomm + THR3D and could assign the full received quantity to both actions.

Verification: frontend production build passed with the existing Vite chunk-size warning.


### 2026-09-21 - Planning board defaults to Shipment grouping

The Planning board grouping selector now lists `Group by shipment` first and uses it as the default. `Group by MediaBox #` remains available, and `No grouping` renders cards directly without group headers. This is a presentation-only choice and does not change Planning state or records.

Verification: frontend contract tests passed; frontend production build passed with the existing Vite chunk-size warning; `git diff --check` passed.

### 2026-09-21 - Planning requirements wait for a photo deliverable

Planning table rows with no selected deliverable now show neutral values rather than marking client photo fields as Required. Client requirement rules begin only after Ecomm or Packaging is selected; THR3D-only merchandise does not trigger photo-production field requirements.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (170 tests passed); `npm --prefix frontend run build` passed with the existing Vite chunk-size warning.

### 2026-09-21 - Complete Newly Received saves reveal Awaiting Activation

When `Save Changes` commits a complete Newly Received item, Planning creates its proposed deliverable cards, refreshes the board, and closes the original Review modal. The user now lands on the committed `Review - Ready to Activate` placement instead of continuing to see the modal's stale pre-save Review snapshot. This does not activate the work; `Activate` remains the separate permission-controlled approval command.

Verification: targeted confirm-assign routing test, 171 frontend routing tests, frontend production build, and `git diff --check` all pass.

### 2026-09-21 - Complete Review saves reveal Awaiting Activation

Saving a complete merchandise review now promotes all existing Ecomm and Packaging deliverable cards for that merchandise to Awaiting Activation. This matches the complete Newly Received behavior: the modal closes after refresh and the committed cards appear in `Review - Ready to Activate`. Saving does not activate the cards or send an activation email.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (170 tests), `backend/.venv/bin/python -m unittest tests.test_intake_decisions.IntakeDecisionTests.test_update_workstream_card_status_updates_child_record_only`, `npm --prefix frontend run build`, and `git diff --check` passed.

### 2026-09-21 - Review footer progress labels identify the submitted command

- Saving a Review draft changes only the Save button label to `Saving...`; Activate remains labeled `Activate` while temporarily disabled.
- Activating changes only the Activate button label to `Activating...`; the shared submission lock still prevents duplicate requests.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (170 tests), `npm --prefix frontend run build`, and `git diff --check` passed.

### 2026-09-21 - Activate remains the sole primary Review action

- In an activation-ready Review modal, `Save Changes` uses the same neutral button treatment as `Close`; only `Activate` uses the dark primary treatment.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (170 tests), `npm --prefix frontend run build`, and `git diff --check` passed.


### 2026-09-21 - Activation packages preload selected Merchandise

Opening Activation from Planning now resolves the selected Merchandise actual client even when the global client filter is `All Clients`, links the selected row automatically, and imports its current linked Product data. MediaBox # is included in the item details and activation email preview when present. Project name is optional; when omitted, the activation record uses the first merchandise description as its internal fallback name.

Verification: `npm --prefix frontend run build` passed with the existing Vite chunk-size warning; `git diff --check` passed.

### 2026-09-21 - Shipments count opens THR3D Outgoing

The Shipments navigation label and icon continue to open the standard Shipments page. Its yellow ready-count badge is now a separate accessible link that opens the `THR3D / Outgoing` tab directly.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (171 tests), `npm --prefix frontend run build`, and `git diff --check` passed.

### 2026-09-21 - THR3D shipment history includes shipping time
- The Shipments > THR3D / Outgoing history now labels the final column `Shipped date / time` and shows the recorded shipment timestamp in Central time, including hours and minutes.
- The Planning THR3D shipment table uses the same date-time presentation for its shipped timestamp.
- Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing`; `npm --prefix frontend run build`; `git diff --check`.

### 2026-09-21 - New Merchandise requirements follow selected deliverables

The Planning modal now rebuilds required Product fields from the client's current configuration for each selected draft deliverable. A stored photo-production snapshot can no longer make Packaging display Ecomm-only requirements, or make Ecomm display Packaging-only requirements. This changes validation presentation only and does not commit or reroute the draft.

Verification: `backend/.venv/bin/python -m unittest tests.test_frontend_routing` (172 tests) and `npm --prefix frontend run build` passed. The existing Vite chunk-size warning remains.

### 2026-09-21 - Planning board can group deliverables by Product

The Planning board grouping menu now includes `Group by Product`. It groups Ecomm and Packaging cards under their shared linked Product identity so the two deliverables stay together. Unmatched cards appear under `No matched Product`. `Group by shipment` remains the default.

### 2026-09-21 - Planning board header uses the board canvas

The Board view switcher header now uses the same dark background as the Planning board, removing the light-gray band above the board. The Table view remains unchanged.

Verification: `npm --prefix frontend run build`; `git diff --check`.
