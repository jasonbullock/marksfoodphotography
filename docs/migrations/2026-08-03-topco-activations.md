# 2026-08-03 Topco Activations

## Summary

The existing Airtable `Activations` table was expanded from a single `Name` field into the first Topco activation schema.

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
| Source Method | `fldcbcKzgICUgCNev` | singleSelect |
| Source Reference | `flduUnoBRe5dw4sqH` | singleLineText |
| Original Message | `flda0noXtTa6wC8yv` | multilineText |
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

The frontend API wrapper now includes:

- `api.listActivations`
- `api.createActivation`

## Deferred

- Activation email parsing
- Activation modal UI
- UPC matching confirmation
- automatic movement to `Ready for Photo`
- activation email automation
