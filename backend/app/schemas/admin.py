from pydantic import BaseModel
from typing import Optional
from datetime import date

class RateCreate(BaseModel):
    item_id: str
    category: str
    name: str
    master_sku: str
    unit: str
    rate: float
    gst_percent: float = 18.0
    applicable_vendor: Optional[str] = None
    in_catalogue: bool = False

class RateUpdate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    rate: float
    gst_percent: float = 18.0
    applicable_vendor: Optional[str] = None
    in_catalogue: bool = False

class RateResponse(BaseModel):
    id: int
    item_id: str
    category: str
    name: str
    master_sku: str
    unit: str
    rate: float
    gst_percent: float
    applicable_vendor: Optional[str]
    valid_from: date
    valid_to: Optional[date]
    in_catalogue: bool

    class Config:
        from_attributes = True
