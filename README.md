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

`R2_PUBLIC_BASE_URL` must be publicly reachable without authentication because Airtable stores attachment references from public URLs. The R2 bucket or custom domain should allow public reads for the uploaded receiving path. Browser CORS does not need direct R2 write access because uploads go through the backend, but the public asset domain should allow normal image reads from the app origin.

For local development only, set `RECEIVING_PHOTO_STORAGE=local`. Local mode writes files under `backend/uploads/receiving` and serves them from `/api/receiving/photos/...`. The backend will not silently fall back to local mode when `RECEIVING_PHOTO_STORAGE=r2`; missing R2 configuration returns a clear upload error.

Airtable should keep the existing `Merchandise` attachment field named `Photos`. Add one compact long-text field on `Merchandise` named `Photo Metadata`; it stores JSON metadata including the durable R2 `object_key` and `public_url`. The `Products` table should also have `Photos` and `Photo Metadata` so review can copy Merchandise photos onto the matched Product.

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
