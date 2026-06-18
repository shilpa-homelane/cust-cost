import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import ValidationError
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.models.rate_db import SessionLocal, MasterRate
from app.schemas.admin import (
    RateCreate,
    RateUpdate,
    RateResponse,
    CsvRateRow,
    ImportRowError,
    ImportResult,
)
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

# Row 1 of the file is the header; data rows are numbered from 2 for user-facing errors.
_FIRST_DATA_LINE = 2


def _decode_csv(raw: bytes) -> str:
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")


def _open_reader(text: str) -> csv.DictReader:
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
    return reader


def _clean_row(raw_row: dict) -> dict:
    # csv.DictReader pads short rows with None and dumps surplus cells under a
    # None key. Coerce every value to a stripped string and drop the None key so
    # a ragged/short row never raises AttributeError on .strip().
    return {
        key.strip().lower(): (value or "").strip()
        for key, value in raw_row.items()
        if key
    }


def _format_row_error(exc: ValidationError) -> str:
    parts = []
    for err in exc.errors():
        loc = err.get("loc") or ()
        field = str(loc[0]) if loc else "row"
        msg = err.get("msg", "is invalid").removeprefix("Value error, ")
        parts.append(f"{field} {msg}")
    return "; ".join(parts)


def _to_master_rate(row: CsvRateRow) -> MasterRate:
    return MasterRate(
        item_id=row.item_id,
        category=row.category,
        name=row.name,
        master_sku=row.master_sku or row.item_id,
        unit=row.unit,
        rate=row.price_per_unit,
        gst_percent=row.gst_percent,
        applicable_vendor=row.applicable_vendor or None,
        valid_from=date.today(),
        valid_to=None,
        in_catalogue=True,
    )


@router.post("/rates/import", response_model=ImportResult)
async def import_rates_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    role: str = Depends(require_procurement_access),
) -> ImportResult:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    reader = _open_reader(_decode_csv(await file.read()))

    existing_ids = {
        r.item_id
        for r in db.query(MasterRate.item_id).filter(MasterRate.valid_to == None).all()
    }

    rows_added = 0
    rows_skipped = 0
    errors: List[ImportRowError] = []

    for line_num, raw_row in enumerate(reader, start=_FIRST_DATA_LINE):
        row = _clean_row(raw_row)
        item_id = row.get("item_id", "")

        if not item_id:
            errors.append(ImportRowError(row=line_num, reason="item_id is empty"))
            continue
        if item_id in existing_ids:
            rows_skipped += 1
            continue

        try:
            valid_row = CsvRateRow(**row)
        except ValidationError as exc:
            errors.append(
                ImportRowError(row=line_num, item_id=item_id, reason=_format_row_error(exc))
            )
            continue

        db.add(_to_master_rate(valid_row))
        existing_ids.add(item_id)
        rows_added += 1

    db.commit()

    return ImportResult(rows_added=rows_added, rows_skipped=rows_skipped, errors=errors)


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
