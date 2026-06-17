from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FeatureUpdate(BaseModel):
    is_calibrated: bool
    calibration_count: int
    confidence_buffer: float
    version: str
    calibration_notes: Optional[str] = None

class FeatureItem(FeatureUpdate):
    id: int
    feature_type: str
    name: str
    description: Optional[str] = None
    last_updated: datetime

    class Config:
        from_attributes = True
