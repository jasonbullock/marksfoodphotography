# Marks Food Photography

Marks Food Photography is a React + Flask app for studio job intake and SKU production tracking backed by Airtable.

## Structure

- `frontend/` - Vite React app for dashboard, job intake, job lists, SKU tracking, and settings.
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

## Current Scope

The app includes sidebar navigation, a dashboard, new job intake, job list, SKU tracking, settings, and Airtable connection status. Airtable table and field IDs are currently configured for the Marks Food Photography base.
