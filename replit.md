# Custom Costing Tool

A tool for generating costing quotes from custom design documents (WhatsApp photos, JPEGs, PDFs). Designers upload a document, the app extracts features, and generates a customer quote and internal cost sheet.

## Architecture

- **Frontend**: React 19 + Vite + TypeScript + Tailwind (`frontend/`). Runs on port 5000.
- **Backend**: FastAPI + SQLAlchemy + SQLite (`backend/`). Runs on port 8000 (uvicorn).
- **Database**: SQLite (`backend/app/db/costing_tool.db`), holds rates, premium feature library, and saved quotes.
- **Extraction**: Uses the Gemini CLI provider when available, otherwise falls back to a MockProvider.

## Development (Replit)

Two workflows run the app:
- `Start application` — Vite dev server on port 5000 (this is the Preview). It proxies `/api/*` to the backend.
- `Backend API` — uvicorn on `127.0.0.1:8000`.

The frontend calls the backend via relative `/api/v1/...` URLs, routed through the Vite dev proxy (`frontend/vite.config.ts`).

## Production (Deployment)

VM deployment:
- **Build**: `cd frontend && npm install && npm run build`
- **Run**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 5000`

In production FastAPI serves the built `frontend/dist` (SPA) on the same port 5000, so `/api/*` and the UI share one origin. VM is used because the app persists state in a local SQLite file.

## User preferences

(None recorded yet.)
