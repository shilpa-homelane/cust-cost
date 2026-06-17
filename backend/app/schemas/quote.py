from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.schemas.bom import BOMLineItem

class QuoteCreate(BaseModel):
    customer_name: str
    brand: str
    status: str = "Draft"
    total_price: float
    extraction_data: Dict[str, Any]
    costing_data: Dict[str, Any]

class QuoteResponse(QuoteCreate):
    id: int
    quote_id: str
    designer_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class CostedBOMLine(BOMLineItem):
    rate: float
    line_subtotal: float

class InternalCostSheet(BaseModel):
    unit_id: str
    costed_items: List[CostedBOMLine]
    cogs_base: float
    miscellaneous_overhead: float
    transportation_cost: float
    vendor_margin: float
    brand_margin: float
    confidence_buffer: float
    total_cost_excl_gst: float
    gst_amount: float
    total_price_incl_gst: float
    rate_set_version: str
    feature_library_version: str

class CustomerQuote(BaseModel):
    unit_id: str
    brand: str
    unit_description: str
    finishes_summary: List[str]
    total_price_incl_gst: float
