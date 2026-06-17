from pydantic import BaseModel
from typing import Optional

class BOMLineItem(BaseModel):
    category: str
    item_name: str
    master_sku: str
    quantity: float
    unit: str
    wastage_pct: float = 0.0
    notes: Optional[str] = None
    rule_id: Optional[str] = None
    feature_id: Optional[str] = None

class BOMList(BaseModel):
    unit_id: str
    items: list[BOMLineItem]
