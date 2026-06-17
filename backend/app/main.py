from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.extraction import UnitExtraction
from app.schemas.quote import CustomerQuote, InternalCostSheet
from app.engine.bom_engine import generate_bom
from app.engine.feature_library import apply_features
from app.engine.costing_engine import generate_quote
from app.models.rate_db import SessionLocal, MasterRate, init_db
from app.models.quote import Quote, ExtractionCache
from fastapi import UploadFile, File, Form, Header
from pydantic import BaseModel
from typing import Optional, List
import os
import shutil
import uuid
from datetime import date
from dotenv import load_dotenv

load_dotenv()

from app.extraction.service import ExtractionService
from app.extraction.provider import MockProvider, GeminiProvider
from app.routers import admin_rates, quotes, features, settings

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Custom Costing API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()

has_gemini_cli = shutil.which("gemini") is not None
if has_gemini_cli:
    provider = GeminiProvider()
    print("Using LIVE Gemini CLI Provider for extraction.")
else:
    provider = MockProvider()
    print("WARNING: 'gemini' CLI binary not found in PATH. Falling back to MockProvider.")

extraction_service = ExtractionService(provider=provider)

app.include_router(admin_rates.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(settings.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(quotes.router, prefix="/api/v1/quotes", tags=["quotes"])
app.include_router(features.router, prefix="/api/v1/features", tags=["features"])


# ── Legacy extraction + costing endpoints ────────────────────────────────────

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
        bom = generate_bom(extraction)
        bom = apply_features(bom, extraction.premium_features)
        quote, cost_sheet = generate_quote(db, bom)
        return {"quote": quote, "cost_sheet": cost_sheet}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── New flat-BOM flow endpoints ───────────────────────────────────────────────

class FlatBOMCatalogItem(BaseModel):
    item_id: str
    name: str
    unit: str
    quantity: float

class ExtractAndBOMResponse(BaseModel):
    description: Optional[str]
    items: List[FlatBOMCatalogItem]

@app.post("/api/v1/costing/extract-and-bom", response_model=ExtractAndBOMResponse)
async def extract_and_bom(
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Uploads a file, runs AI extraction, generates a BOM, and maps BOM items
    back to active catalog entries by master_sku. Returns a flat list ready
    for the BOM editor.
    """
    try:
        extraction = await extraction_service.process_upload(file, notes, db=db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        bom = generate_bom(extraction)
        bom = apply_features(bom, extraction.premium_features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BOM generation failed: {e}")

    active_rates = {
        r.master_sku: r
        for r in db.query(MasterRate).filter(
            MasterRate.valid_to == None,
            MasterRate.in_catalogue == True,
        ).all()
    }

    flat_items: List[FlatBOMCatalogItem] = []
    for item in bom.items:
        rate = active_rates.get(item.master_sku)
        flat_items.append(FlatBOMCatalogItem(
            # item_id="" signals "unresolved" — BOM editor will show it as needing selection
            item_id=rate.item_id if rate else "",
            name=rate.name if rate else item.item_name,
            unit=rate.unit if rate else item.unit,
            quantity=round(item.quantity * (1 + item.wastage_pct / 100.0), 2),
        ))

    description = getattr(extraction, "human_readable_summary", None)

    return ExtractAndBOMResponse(description=description, items=flat_items)


class FlatQuoteItem(BaseModel):
    item_id: str
    name: str
    unit: str
    quantity: float
    price_per_unit_override: Optional[float] = None

class FlatBOMQuoteRequest(BaseModel):
    description: Optional[str] = None
    items: List[FlatQuoteItem]

class FlatBOMLineResult(BaseModel):
    item_id: str
    name: str
    unit: str
    quantity: float
    price_per_unit: float
    line_total: float

class FlatBOMQuoteResponse(BaseModel):
    description: Optional[str]
    items: List[FlatBOMLineResult]
    cogs: float
    total_price: float

@app.post("/api/v1/costing/flat-bom-quote", response_model=FlatBOMQuoteResponse)
def flat_bom_quote(
    request: FlatBOMQuoteRequest,
    db: Session = Depends(get_db),
    x_user_role: str = Header(default="Designer"),
):
    """
    Prices a flat BOM submitted from the BOM editor.
    Looks up each item by item_id in the active catalog, applies standard
    markups, and returns the customer quote. Auto-saves the quote for analytics.
    """
    # Fetch settings to determine if price overrides are allowed
    from app.models.settings_db import VisibilitySettings as VisSettings
    settings_row = db.query(VisSettings).first()
    allow_price_override = settings_row.designer_margin_access if settings_row else False

    active_rates = {
        r.item_id: r
        for r in db.query(MasterRate).filter(
            MasterRate.valid_to == None,
            MasterRate.in_catalogue == True,
        ).all()
    }

    # Reject any item_ids that don't exist in the active catalog
    unknown_ids = [
        r.item_id for r in request.items
        if r.item_id and r.item_id not in active_rates
    ]
    if unknown_ids:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown or inactive catalog item(s): {', '.join(unknown_ids)}. "
                "Remove or replace these items before generating a quote."
            ),
        )

    result_items: List[FlatBOMLineResult] = []
    cogs = 0.0

    for req_item in request.items:
        rate_record = active_rates.get(req_item.item_id)
        catalog_price = rate_record.rate if rate_record else 0.0
        # Use client-provided override only when policy permits
        if (
            allow_price_override
            and req_item.price_per_unit_override is not None
            and req_item.price_per_unit_override > 0
        ):
            price_per_unit = req_item.price_per_unit_override
        else:
            price_per_unit = catalog_price
        line_total = round(req_item.quantity * price_per_unit, 2)
        cogs += line_total
        result_items.append(FlatBOMLineResult(
            item_id=req_item.item_id,
            name=req_item.name,
            unit=req_item.unit,
            quantity=req_item.quantity,
            price_per_unit=price_per_unit,
            line_total=line_total,
        ))

    cogs = round(cogs, 2)
    misc_overhead = round(cogs * 0.025, 2)
    transportation = round(cogs * 0.03, 2)
    vendor_margin = round(cogs * 0.15, 2)
    brand_margin = round(cogs * 0.40, 2)
    total_excl_gst = round(cogs + misc_overhead + transportation + vendor_margin + brand_margin, 2)
    gst = round(total_excl_gst * 0.18, 2)
    total_incl_gst = round(total_excl_gst + gst, 2)

    try:
        quote_id = f"Q-{str(uuid.uuid4())[:8].upper()}"
        costing_data = {
            "items": [i.model_dump() for i in result_items],
            "cogs": cogs,
            "total_price": total_incl_gst,
        }
        db_quote = Quote(
            quote_id=quote_id,
            customer_name="(auto-saved)",
            brand="Custom",
            status="Draft",
            total_price=total_incl_gst,
            extraction_data={"description": request.description or ""},
            costing_data=costing_data,
            designer_id=x_user_role,
        )
        db.add(db_quote)
        db.commit()
    except Exception:
        pass

    return FlatBOMQuoteResponse(
        description=request.description,
        items=result_items,
        cogs=cogs,
        total_price=total_incl_gst,
    )


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}


# Serve the built frontend (production).
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
