import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.models.rate_db import SessionLocal, MasterRate
from app.schemas.admin import RateCreate, RateUpdate, RateResponse
from app.auth.dependencies import require_procurement_access

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/rates", response_model=List[RateResponse])
def list_rates(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(MasterRate)
    if active_only:
        # Active = not expired AND in catalogue for designer selection
        query = query.filter(MasterRate.valid_to == None, MasterRate.in_catalogue == True)
    else:
        # When showing all, only exclude expired rows (show both active and deactivated)
        query = query.filter(MasterRate.valid_to == None)
    return query.all()

@router.post("/rates", response_model=RateResponse)
def create_rate(rate_in: RateCreate, db: Session = Depends(get_db), role: str = Depends(require_procurement_access)):
    # Check if item_id already exists and is active
    existing = db.query(MasterRate).filter(MasterRate.item_id == rate_in.item_id, MasterRate.valid_to == None).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Active rate for item_id {rate_in.item_id} already exists.")
        
    db_rate = MasterRate(
        **rate_in.model_dump(),
        valid_from=date.today(),
        valid_to=None
    )
    db.add(db_rate)
    db.commit()
    db.refresh(db_rate)
    return db_rate

REQUIRED_CSV_COLUMNS = {"item_id", "name", "category", "unit", "price_per_unit", "gst_percent"}

@router.post("/rates/import")
async def import_rates_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    role: str = Depends(require_procurement_access),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    headers = {h.strip().lower() for h in reader.fieldnames}
    missing = REQUIRED_CSV_COLUMNS - headers
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(sorted(missing))}",
        )

    existing_ids = {
        r.item_id
        for r in db.query(MasterRate.item_id).filter(MasterRate.valid_to == None).all()
    }

    rows_added = 0
    rows_skipped = 0
    errors: list[dict] = []

    for line_num, row in enumerate(reader, start=2):
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        item_id = row.get("item_id", "").strip()

        if not item_id:
            errors.append({"row": line_num, "reason": "item_id is empty"})
            continue

        if item_id in existing_ids:
            rows_skipped += 1
            continue

        try:
            price_per_unit = float(row["price_per_unit"])
            gst_percent = float(row["gst_percent"])
        except ValueError:
            errors.append({"row": line_num, "item_id": item_id, "reason": "price_per_unit and gst_percent must be numeric"})
            continue

        name = row.get("name", "").strip()
        category = row.get("category", "").strip()
        unit = row.get("unit", "").strip()

        if not name or not category or not unit:
            errors.append({"row": line_num, "item_id": item_id, "reason": "name, category, and unit must not be empty"})
            continue

        master_sku = row.get("master_sku", "").strip() or item_id

        db.add(MasterRate(
            item_id=item_id,
            category=category,
            name=name,
            master_sku=master_sku,
            unit=unit,
            rate=price_per_unit,
            gst_percent=gst_percent,
            applicable_vendor=row.get("applicable_vendor", "").strip() or None,
            valid_from=date.today(),
            valid_to=None,
            in_catalogue=True,
        ))
        existing_ids.add(item_id)
        rows_added += 1

    db.commit()

    return {
        "rows_added": rows_added,
        "rows_skipped": rows_skipped,
        "errors": errors,
    }


@router.put("/rates/{item_id}", response_model=RateResponse)
def update_rate(item_id: str, rate_in: RateUpdate, db: Session = Depends(get_db), role: str = Depends(require_procurement_access)):
    # Global Rule RF-001-D001: NEVER mutate objects in-place. Always create new objects with changes applied.
    # Enforce append-only updates for valid rates history.
    current_rate = db.query(MasterRate).filter(MasterRate.item_id == item_id, MasterRate.valid_to == None).first()
    if not current_rate:
        raise HTTPException(status_code=404, detail="Active rate not found.")
        
    # Expire old rate
    current_rate.valid_to = date.today()
    
    # Create new rate with updated fields (unit and category may be updated)
    new_rate = MasterRate(
        item_id=current_rate.item_id,
        category=rate_in.category if rate_in.category is not None else current_rate.category,
        name=rate_in.name,
        master_sku=current_rate.master_sku,
        unit=rate_in.unit if rate_in.unit is not None else current_rate.unit,
        rate=rate_in.rate,
        gst_percent=rate_in.gst_percent,
        applicable_vendor=rate_in.applicable_vendor,
        in_catalogue=rate_in.in_catalogue,
        valid_from=date.today(),
        valid_to=None
    )
    db.add(new_rate)
    db.commit()
    db.refresh(new_rate)
    return new_rate
