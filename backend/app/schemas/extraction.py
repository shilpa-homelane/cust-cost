from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal

class DocumentClassification(BaseModel):
    pdf_type: Literal["annotated_elevation", "structured_detail_sheet", "minimal_sketch", "mixed", "reference_image_only"] = "structured_detail_sheet"
    num_units_described: int = 1
    brand: Literal["HomeLane", "DesignCafe", "unknown"] = "unknown"

class UnitDimensions(BaseModel):
    length_mm: Optional[float] = None
    height_mm: Optional[float] = None
    carcass_depth_mm: Optional[float] = None
    shutter_depth_mm: Optional[float] = None

class UnitCounts(BaseModel):
    shutters: Optional[int] = 0
    drawers: Optional[int] = 0
    skirting_drawers: Optional[int] = 0
    fixed_shelves: Optional[int] = 0
    adjustable_shelves: Optional[int] = 0
    vertical_partitions: Optional[int] = 0
    back_panels: Optional[int] = 1
    hanger_rods: Optional[int] = 0

class UnitFinishes(BaseModel):
    carcass_material: Optional[str] = None
    internal_finish: Optional[str] = None
    shutter_finish_primary: Optional[str] = None
    shutter_finish_secondary: Optional[str] = None
    expo_sides_finish: Optional[str] = None
    skirting_finish: Optional[str] = None

class UnitHardware(BaseModel):
    handle_sku: Optional[str] = None
    hinge_type: Optional[str] = None
    channel_type: Optional[str] = None
    handles_client_scope: bool = False

class PremiumFeature(BaseModel):
    feature_type: str
    parameters: Dict[str, Any]
    confidence: str = "high"
    source: Optional[str] = None

class UnitExtraction(BaseModel):
    document_classification: DocumentClassification = Field(default_factory=DocumentClassification)
    human_readable_summary: str = ""
    unit_identification: Dict[str, str] = Field(default_factory=dict)
    archetype: str
    dimensions: UnitDimensions
    counts: UnitCounts
    finishes: UnitFinishes
    hardware: UnitHardware
    premium_features: List[PremiumFeature] = Field(default_factory=list)
    consistency_warnings: List[str] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)
    extraction_metadata: Dict[str, Any] = Field(default_factory=dict)
