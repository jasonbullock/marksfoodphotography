# Marks Photo

Marks Photo is a React + Flask app for imports, receiving, job lists, item tracking, and settings backed by Airtable.

## Structure

- `frontend/` - Vite React app for dashboard, imports, receiving, job lists, item tracking, and settings.
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
- `/receiving`
- `/items`
- `/jobs`
- `/jobs/new`
- `/clients`
- `/settings`

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

Airtable should keep the existing `Receipt Entries` attachment field named `Photos`. Add one compact long-text field on `Receipt Entries` named `Photo Metadata`; it stores JSON metadata including the durable R2 `object_key` and `public_url`. The `Items` table should also have `Photos` and `Photo Metadata` so verification can copy receipt-entry photos onto the matched Item.

## Current Scope

The app includes sidebar navigation, a dashboard, imports, receiving, job list, item tracking, settings, and Airtable connection status. Airtable table and field IDs are currently configured for the Marks Photo base.
