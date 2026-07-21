# Merchandise Legacy Field Cleanup

This was a narrow cleanup pass for the Merchandise table only.

No Airtable tables were deleted.

## Scope

Audited and prepared cleanup for:

- `Production Type` (`fldSwUluDDqwe6MVs`)
- `Deprecated Airtable Photos - Do Not Use` (`fldtTr7eNQrT6iVrS`)

## Production Type Migration

The only live Merchandise record with a nonblank legacy `Production Type` value was:

- Record: `recVk8YYAj7vcl2B4`
- Observed Package Name: `Pants`
- Legacy `Production Type`: `Packaging`
- Original `Deliverables`: `Ecomm Photo`, `Thr3d`

The legacy value was treated as an additional historical deliverable and merged into canonical `Deliverables`.

Final read-back from Airtable confirmed:

- `Deliverables`: `Packaging Photo`, `Ecomm Photo`, `Thr3d`
- `Production Type`: `Packaging`

The legacy field value was left in place because field deletion is blocked until Airtable-side dependencies can be manually confirmed.

## Deprecated Airtable Photos

Live Merchandise records were inspected for `Deprecated Airtable Photos - Do Not Use`.

Result:

- 7 Merchandise records inspected.
- 0 records contain Airtable attachments in the deprecated field.
- 7 records contain `Photo Metadata`.

The application continues to use R2-backed image references from `Photo Metadata`.

## Repository References

Runtime search found no active backend or frontend dependency on:

- `Production Type`
- `fldSwUluDDqwe6MVs`
- `productionType`
- `productionTypes`

Remaining references are historical documentation or tests that intentionally assert the legacy UI/API names are absent.

The Airtable write client still strips legacy image attachment payloads by field name and field ID. This guard prevents legacy attachment writes without requiring the field to exist in Airtable.

`backend/ensure_intake_decision_fields.py` ensures canonical `Deliverables` and `Merchandise Resolution`; it does not recreate `Production Type`.

## Airtable-Side Blocker

Airtable metadata exposed tables, fields, linked fields, formulas, lookups, rollups, and views. It did not expose Interfaces, Automations, Forms, shared-view usage, scripts, or extensions.

Do not delete either field until those Airtable-side dependencies are manually checked for:

- `Production Type`
- `fldSwUluDDqwe6MVs`
- `Deprecated Airtable Photos - Do Not Use`
- `fldtTr7eNQrT6iVrS`

## Deletion Status

No fields were deleted in this pass.

Deletion candidates after manual Airtable-side confirmation:

- `Production Type` (`fldSwUluDDqwe6MVs`)
- `Deprecated Airtable Photos - Do Not Use` (`fldtTr7eNQrT6iVrS`)

## 2026-07-21 Final Field Removal

The final narrow cleanup pass removed the two legacy Merchandise fields after manual Airtable dependency inspection was completed.

Confirmed clear:

- Interfaces
- Interface pages
- Record detail pages
- Standalone Forms
- Automations
- Shared-view usage
- Scripts
- Extensions

The Airtable connector returned empty arrays for Interfaces, interface pages, record detail pages, and standalone Forms in base `appE30EGZv8OzssDx`. Manual Airtable inspection confirmed Automations, shared views, scripts, and extensions did not reference either legacy field.

Schema/data read-back:

- Live Merchandise schema no longer includes `Production Type` (`fldSwUluDDqwe6MVs`).
- Live Merchandise schema no longer includes `Deprecated Airtable Photos - Do Not Use` (`fldtTr7eNQrT6iVrS`).
- `Deliverables` remains `multipleSelects` with choices `Packaging Photo`, `Ecomm Photo`, and `Thr3d`.
- `Photo Metadata` remains present on Merchandise.
- `recVk8YYAj7vcl2B4` (`Pants`) still has `Deliverables = Packaging Photo, Ecomm Photo, Thr3d`.
- Sampled Merchandise records retained `Deliverables` and `Photo Metadata`.

Deletion status:

- `Production Type` (`fldSwUluDDqwe6MVs`) was deleted.
- `Deprecated Airtable Photos - Do Not Use` (`fldtTr7eNQrT6iVrS`) was deleted.

Remaining note:

The Airtable Metadata API delete attempt returned `404 NOT_FOUND` for the first field request, but immediate live schema read-back confirmed both fields were absent afterward. No other schema changes were made.

Validation:

- `backend/.venv/bin/python backend/ensure_intake_decision_fields.py` reused canonical fields and did not recreate `Production Type`.
- `backend/.venv/bin/python -m unittest discover -s tests` passed, 178 tests.
- `npm run build` in `frontend/` passed.
- Local frontend route smoke returned HTTP 200 for `/imports`, `/receiving`, `/merchandise`, `/merchandise/review`, and `/intake` on port 5175.
- Repository searches were run for `Production Type`, `fldSwUluDDqwe6MVs`, `productionType`, `productionTypes`, `Deprecated Airtable Photos - Do Not Use`, `fldtTr7eNQrT6iVrS`, and `IMAGE_ATTACHMENT_FIELD`.
- `git diff --check`

## Validation

- Airtable update merged `Packaging` into `Deliverables` for `recVk8YYAj7vcl2B4`.
- Airtable read-back confirmed `Deliverables` equals `Packaging Photo`, `Ecomm Photo`, `Thr3d`.
- Live Merchandise inspection confirmed the deprecated attachment field has 0 attachments on all 7 records.
- Live Merchandise inspection confirmed all 7 records have `Photo Metadata`.
- `backend/.venv/bin/python backend/ensure_intake_decision_fields.py`
- `backend/.venv/bin/python -m unittest discover -s tests`
- `npm run build` in `frontend/`
- Local frontend route smoke returned HTTP 200 for `/intake`, `/merchandise`, `/receiving`, and `/imports` on port 5175.
- Repository searches were run for `Production Type`, `fldSwUluDDqwe6MVs`, `productionType`, `productionTypes`, `Deprecated Airtable Photos - Do Not Use`, `fldtTr7eNQrT6iVrS`, and `IMAGE_ATTACHMENT_FIELD`.
- `git diff --check`
