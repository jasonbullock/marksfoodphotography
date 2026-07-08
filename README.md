# Sierra Intake

Sierra Intake is a React + Flask starter app for a Kroger merchandise intake workflow backed by Airtable. This first pass is intentionally stubbed so pages, routes, and backend integration points can be wired progressively without locking in the Airtable schema yet.

## Structure

- `frontend/` - Vite React app with producer-focused navigation and stub workflow pages.
- `backend/` - Flask API with environment loading, CORS support, route blueprints, and an Airtable helper.
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
npm run dev
```

Frontend: `http://localhost:5174`

Backend health: `http://localhost:5057/api/health`

## Current Scope

The app includes sidebar navigation, dashboard and workflow pages, and stub API routes for merchandise intake, work queue, shot assignment, Creative Force handoff, settings, and Airtable connection status. The Airtable helper reads credentials from the root `.env` and is ready for read/create/update calls once the schema is finalized.
# marksfoodphotography
