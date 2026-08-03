# 2026-08-03 Topco Activations

## Summary

The existing Airtable `Activations` table was expanded from a single `Name` field into the first Topco activation schema.

Activation is the client/project readiness package created in Marks. It is not an inbound email. Email or notification content may later be generated from this stored package, but the package is the source of truth for Topco Ready for Photo validation.

This is additive schema work only. No existing records were deleted or modified.

## Table

- Table: `Activations`
- Table ID: `tbleD3EuIMJTG2OWT`

## Fields Added

| Field | Field ID | Type |
| --- | --- | --- |
| Client | `fldoTTOddKcWBAn2U` | multipleRecordLinks |
| Activation Type | `fldDKivrCSS21Hcpa` | singleSelect |
| Status | `fldDF0dvyooiviYCz` | singleSelect |
| Creation Method | `fldcbcKzgICUgCNev` | singleSelect |
| Project Reference | `flduUnoBRe5dw4sqH` | singleLineText |
| Activation Package | `flda0noXtTa6wC8yv` | multilineText |
| Activation Date | `fldTgNShCXe8tgdvQ` | date |
| Due / Urgency | `fldyz8KckRmqMwbal` | singleLineText |
| Walnut Scope | `fldgJJ3Itz4PSzUwt` | singleLineText |
| Number of SKUs | `fldw1GoDLikvvYGcc` | number |
| Images Per Bundle | `fld7WBkUFoA87iQVC` | number |
| Total Images | `fldt9cpxHuoauCcF8` | number |
| Artwork Path | `fldGPlnL3WO81sbx0` | multilineText |
| Upload Location | `fldBU0pSfg378YkFZ` | multilineText |
| SKU Details JSON | `fld2sIchlLv69jDLh` | multilineText |
| Deliverables | `fldkOJLvW6g6yGsvn` | multipleSelects |
| Matched Merchandise | `fldi6wURnZ9eglYnX` | multipleRecordLinks |
| Notes | `fldaL9JAE6xL9piF2` | multilineText |

## Current App Integration

The backend now includes:

- `GET /api/activations`
- `POST /api/activations`
- `PATCH /api/activations/:id`

The frontend API wrapper now includes:

- `api.listActivations`
- `api.createActivation`
- `api.updateActivation`

The Clients/Admin Topco profile includes a basic Activation editor so package data can be created and revised while the final Planning experience is still taking shape.

The Planning board also exposes a PM-facing `Add Activation` action. PMs can create the activation from the frontend without opening Airtable or Admin.

## Deferred

- UPC matching confirmation
- automatic movement to `Ready for Photo`
- notification/email generation from the stored Activation Package

## Notes

The live Airtable field labels were renamed on 2026-08-03 from the first-pass email/source terminology:

- `Source Method` -> `Creation Method`
- `Source Reference` -> `Project Reference`
- `Original Message` -> `Activation Package`

Airtable accepted the field label renames through the Metadata API. Airtable rejected the attempted single-select option rename for `Creation Method`; application code currently writes only `Manual Entry` or `Spreadsheet` so no email-oriented creation method is required by the app.
