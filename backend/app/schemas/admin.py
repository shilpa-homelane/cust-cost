import math
from pydantic import BaseModel, field_validator
from typing import Optional, List
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


class CsvRateRow(BaseModel):
    """One validated data row from a bulk-import CSV.

    Field names mirror the CSV columns (``price_per_unit``, not the DB's
    ``rate``). Values arrive pre-stripped from the caller; these validators
    reject blank required fields and non-finite / negative numbers so corrupt
    values (``inf``, ``nan``, negatives) never reach the catalog.
    """

    item_id: str
    name: str
    category: str
    unit: str
    price_per_unit: float
    gst_percent: float
    master_sku: Optional[str] = None
    applicable_vendor: Optional[str] = None

    @field_validator("item_id", "name", "category", "unit")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("must not be empty")
        return value.strip()

    @field_validator("price_per_unit", "gst_percent")
    @classmethod
    def _finite_non_negative(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("must be a finite number")
        if value < 0:
            raise ValueError("must not be negative")
        return value


class ImportRowError(BaseModel):
    row: int
    item_id: Optional[str] = None
    reason: str


class ImportResult(BaseModel):
    rows_added: int
    rows_skipped: int
    errors: List[ImportRowError]
