from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.extraction import UnitExtraction
from app.schemas.quote import CustomerQuote, InternalCostSheet
from app.engine.bom_engine import generate_bom
from app.engine.feature_library import apply_features
from app.engine.costing_engine import generate_quote
from app.models.rate_db import SessionLocal, init_db
from app.models.quote import Quote, ExtractionCache
from fastapi import UploadFile, File, Form
from typing import Optional
import os
import shutil
from dotenv import load_dotenv

load_dotenv() # Load variables from .env if present

from app.extraction.service import ExtractionService
from app.extraction.provider import MockProvider, GeminiProvider
from app.routers import admin_rates, quotes, features

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Custom Costing API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()

# Initialize the extraction service with the Live Provider (Gemini)
# Using MockProvider as fallback if key is missing just for safety during development
has_gemini_cli = shutil.which("gemini") is not None
if has_gemini_cli:
    provider = GeminiProvider()
    print("Using LIVE Gemini CLI Provider for extraction.")
else:
    provider = MockProvider()
    print("WARNING: 'gemini' CLI binary not found in PATH. Falling back to MockProvider.")

extraction_service = ExtractionService(provider=provider)

app.include_router(admin_rates.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(quotes.router, prefix="/api/v1/quotes", tags=["quotes"])
app.include_router(features.router, prefix="/api/v1/features", tags=["features"])

@app.post("/api/v1/extraction/extract-document", response_model=UnitExtraction)
async def extract_document(file: UploadFile = File(...), notes: Optional[str] = Form(None), db: Session = Depends(get_db)):
    try:
        extraction = await extraction_service.process_upload(file, notes, db=db)
        return extraction
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/costing/generate-quote")
def generate_quote_endpoint(extraction: UnitExtraction, db: Session = Depends(get_db)):
    try:
        # Step 2: BOM Generation
        bom = generate_bom(extraction)
        
        # Apply premium features from library
        bom = apply_features(bom, extraction.premium_features)
        
        # Step 3: Costing
        quote, cost_sheet = generate_quote(db, bom)
        
        return {
            "quote": quote,
            "cost_sheet": cost_sheet
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}

# Serve the built frontend (production). In dev the Vite server handles this.
from fastapi.responses import FileResponse

_FRONTEND_DIST = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)
if os.path.isdir(_FRONTEND_DIST):
    _INDEX_HTML = os.path.join(_FRONTEND_DIST, "index.html")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        candidate = os.path.realpath(os.path.join(_FRONTEND_DIST, full_path))
        if (
            full_path
            and (candidate == _FRONTEND_DIST or candidate.startswith(_FRONTEND_DIST + os.sep))
            and os.path.isfile(candidate)
        ):
            return FileResponse(candidate)
        return FileResponse(_INDEX_HTML)
