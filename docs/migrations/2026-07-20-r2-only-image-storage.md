# 2026-07-20 R2-Only Image Storage Migration

## Outcome

Cloudflare R2 is now the only supported image storage layer for Marks Photo.

Airtable stores image references and metadata only. The application no longer writes image attachment arrays, base64 image data, duplicate image files, or durable public image URLs into Airtable.

## Canonical Image Reference Model

Image manifests are stored in long-text JSON fields such as `Photo Metadata`.

Canonical manifest entries use stable R2 object keys:

```json
{
  "object_key": "receiving/Kroger-2026-07-16-05-25/Kroger-2026-07-16-05-25-1.jpg",
  "sort_order": 1,
  "filename": "Kroger-2026-07-16-05-25-1.jpg",
  "original_filename": "Kroger-2026-07-16-05-25-1.jpg",
  "stored_filename": "Kroger-2026-07-16-05-25-1.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 7675872,
  "uploaded_at": "2026-07-16T05:25:00Z"
}
```

Optional keys:
- `thumbnail_key`

Do not store in Airtable:
- Airtable attachments
- public image URLs
- signed image URLs
- base64 image data
- duplicate image files

The API resolves display URLs from `object_key` when records are loaded.

## Live Airtable Audit

Attachment fields found before cleanup:

| Table | Field ID | Original Field Name | Records With Attachments | Attachment Count |
| --- | --- | --- | ---: | ---: |
| Products | `fld518nperBoHn9yG` | `Photos` | 1 | 4 |
| Shipments | `fldlDpgrtKRTpBWla` | `Photos` | 0 | 0 |
| Issues | `fldBqWeFeXoFPo2Ws` | `Photos` | 0 | 0 |
| Merchandise | `fldtTr7eNQrT6iVrS` | `Photos` | 3 | 6 |

No other live Airtable `multipleAttachments` fields were found in the base during the metadata audit.

## Migration Results

Every existing Product and Merchandise attachment had an equivalent R2 object reference in `Photo Metadata`.

Each referenced R2 object was verified by:
- `head_object`
- `get_object`
- non-empty object body read
- content type / content length capture

Only after R2 verification succeeded were the Airtable attachment cells cleared.

Post-cleanup attachment values:

| Table | Records With Attachment Values | Attachment Count |
| --- | ---: | ---: |
| Products | 0 | 0 |
| Shipments | 0 | 0 |
| Issues | 0 | 0 |
| Merchandise | 0 | 0 |

The former attachment fields were renamed to `Deprecated Airtable Photos - Do Not Use` and given descriptions that direct future image storage to R2 manifest fields.

Detailed per-record evidence is in:

- `docs/migrations/2026-07-20-r2-only-image-storage-report.json`

## Application Enforcement

Backend changes:
- `ReceivingPhotoStorage` only accepts `RECEIVING_PHOTO_STORAGE=r2`.
- Receiving uploads go through R2 and update Airtable with canonical `Photo Metadata` manifests only.
- Product photo merges copy R2 metadata references only.
- Issue creation records R2 object keys in notes when needed instead of copying image attachments.
- `AirtableClient.create_record` and `AirtableClient.update_record` strip image attachment fields from payloads as a final guard.

Frontend changes:
- Existing persisted images render from R2-backed metadata returned by the API.
- Airtable attachment thumbnails are no longer treated as durable image sources.
- Receiving no longer stores shipment-level photo attachment payloads.

## Verification

Regression checks run during migration:
- Backend receiving/review/inventory unit tests.
- Authenticated API smoke checks for `/api/merchandise`, `/api/merchandise/review`, `/api/products`, and `/api/receiving/photo-storage/status`.
- Live Airtable post-migration audit confirming zero attachment values in Products, Shipments, Issues, and Merchandise.

## Risks

The deprecated Airtable attachment fields still exist because destructive field deletion is not reliable through the Airtable API in this environment. They are empty, renamed, described as deprecated, and protected by application write guards.
