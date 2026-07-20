# Marks Photo

Marks Photo is the operational readiness system for Walnut Studio.

It is not a project management system, PIM, or system of record. Its purpose is to consolidate enough information to receive, understand, prepare, photograph, route, and dispose of Merchandise.

The app should answer: "What do we need to do with this Merchandise right now?"

## Structure

- `frontend/` - Vite React app for the operational shell, dashboard, receiving, merchandise, planning, production, inventory, supporting data, clients, and settings.
- `backend/` - Flask API with environment loading, CORS support, Airtable helpers, and route blueprints.
- `.env.example` - root-level configuration reference for local development.

## Local Setup

```bash
cp .env.example .env

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

In another terminal:

```bash
cd frontend
npm install
npm run dev -- --port 5175
```

Frontend: `http://localhost:5175`

Backend health: `http://localhost:5057/api/health`

## Frontend Routes

The app uses React Router with these bookmarkable routes:

- `/` redirects to `/dashboard`
- `/dashboard`
- `/imports`
- `/imports/history`
- `/shipments`
- `/merchandise`
- `/merchandise/review`
- `/planning`
- `/production`
- `/products`
- `/jobs`
- `/jobs/new`
- `/clients`
- `/settings`

Compatibility redirects remain for older routes such as `/receiving`, `/receipts`, `/verification`, `/items`, and `/intake`.

Static hosting must serve `index.html` for client-side routes while leaving `/api/*` for the backend. The Netlify-style fallback in `frontend/public/_redirects` is:

```text
/api/* /api/:splat 200
/* /index.html 200
```

## Receiving Photo Storage

Receiving photos are uploaded through the Flask backend. Do not expose Cloudflare R2 credentials to the frontend.

For production, set:

```bash
RECEIVING_PHOTO_STORAGE=r2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket
R2_PUBLIC_BASE_URL=https://your-public-asset-domain
RECEIVING_PHOTO_MAX_BYTES=12582912
```

The backend builds the S3-compatible R2 endpoint as:

```text
https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Uploaded receipt-entry photos use this object-key format:

```text
receiving/<Client>-<YYYY-MM-DD>-<HH-mm>/<Client>-<YYYY-MM-DD>-<HH-mm>-<sequence>.<ext>
```

For example:

```text
receiving/Smithfield-2026-07-12-16-11/Smithfield-2026-07-12-16-11-1.jpg
```

`R2_PUBLIC_BASE_URL` is used by the backend to resolve display URLs from durable R2 object keys at read time. Browser CORS does not need direct R2 write access because uploads go through the backend, but the asset domain should allow normal image reads from the app origin.

Cloudflare R2 is the only supported image storage mode. Local receiving-photo storage and Airtable attachment storage are not supported.

Airtable stores image references only. The `Merchandise` and `Products` tables use a compact long-text field named `Photo Metadata` containing a JSON manifest with durable R2 `object_key` values, optional `thumbnail_key` values, ordering, and file metadata. Do not store public URLs, base64 image data, duplicate files, or Airtable attachment arrays in Airtable. The API resolves display URLs from R2 object keys when records are loaded.

## Airtable Table Mapping

The application domain uses Products, Shipments, and Merchandise.

The live Airtable schema now uses the canonical physical table names:

```bash
AIRTABLE_PRODUCTS_TABLE=Products
AIRTABLE_SHIPMENTS_TABLE=Shipments
AIRTABLE_MERCHANDISE_TABLE=Merchandise
```

The backend reads Airtable through canonical table constants. Deprecated legacy environment aliases such as `AIRTABLE_ITEMS_TABLE`, `AIRTABLE_RECEIPTS_TABLE`, and `AIRTABLE_RECEIPT_ENTRIES_TABLE` may remain for one rollback cycle, but new configuration should use the canonical variable names above.

## Current Scope

Marks Photo currently includes a top-navigation operational shell, dashboard, imports, receiving/shipments, physical Merchandise Inventory, Merchandise Review, placeholder Planning and Production workspaces, supporting Product and Job views, client administration, settings, and Airtable connection status.

Airtable table and field IDs are currently configured for the Marks Photo base. The physical Airtable schema now uses the Merchandise-centered language through the canonical table mapping layer.
