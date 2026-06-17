from fastapi import APIRouter, Depends, HTTPException
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

@router.put("/rates/{item_id}", response_model=RateResponse)
def update_rate(item_id: str, rate_in: RateUpdate, db: Session = Depends(get_db), role: str = Depends(require_procurement_access)):
    # Global Rule RF-001-D001: NEVER mutate objects in-place. Always create new objects with changes applied.
    # Enforce append-only updates for valid rates history.
    current_rate = db.query(MasterRate).filter(MasterRate.item_id == item_id, MasterRate.valid_to == None).first()
    if not current_rate:
        raise HTTPException(status_code=404, detail="Active rate not found.")
        
    # Expire old rate
    current_rate.valid_to = date.today()
    
    # Create new rate with updated fields
    new_rate = MasterRate(
        item_id=current_rate.item_id,
        category=current_rate.category,
        name=rate_in.name,
        master_sku=current_rate.master_sku,
        unit=current_rate.unit,
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
