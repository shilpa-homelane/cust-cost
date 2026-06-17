from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models.rate_db import SessionLocal
from app.models.feature_db import FeatureLibraryItem
from app.schemas.feature import FeatureItem, FeatureUpdate
from app.auth.dependencies import require_d2m_analyst_access

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[FeatureItem])
def get_features(db: Session = Depends(get_db)):
    """
    Retrieve all features in the Cost Feature Library.
    """
    return db.query(FeatureLibraryItem).all()

@router.put("/{feature_type}", response_model=FeatureItem)
def update_feature(
    feature_type: str, 
    update: FeatureUpdate, 
    db: Session = Depends(get_db),
    role: str = Depends(require_d2m_analyst_access)
):
    """
    Update calibration parameters, confidence buffer, and versioning for a feature model.
    Only D2M Cost Costing Analysts and Admins are authorized.
    """
    db_item = db.query(FeatureLibraryItem).filter(FeatureLibraryItem.feature_type == feature_type).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Feature cost model not found")
        
    db_item.is_calibrated = update.is_calibrated
    db_item.calibration_count = update.calibration_count
    db_item.confidence_buffer = update.confidence_buffer
    db_item.version = update.version
    db_item.calibration_notes = update.calibration_notes
    
    db.commit()
    db.refresh(db_item)
    return db_item
