import pytest
from app.schemas.extraction import UnitExtraction, UnitDimensions, UnitCounts, UnitFinishes, UnitHardware, PremiumFeature
from app.engine.bom_engine import generate_bom
from app.engine.feature_library import apply_features

def test_bom_engine_wardrobe():
    extraction = UnitExtraction(
        archetype="wardrobe",
        dimensions=UnitDimensions(length_mm=1000, height_mm=2100, carcass_depth_mm=600),
        counts=UnitCounts(shutters=2, back_panels=1),
        finishes=UnitFinishes(carcass_material="BWP Ply"),
        hardware=UnitHardware()
    )
    
    bom = generate_bom(extraction)
    
    assert len(bom.items) == 4, "Should have 4 line items (Carcass, Back Panel, Hinges, Labour)"
    
    carcass_item = next(i for i in bom.items if i.rule_id == "ARCH_WARDROBE_CARCASS")
    assert carcass_item.quantity > 0
    assert carcass_item.unit == "sft"

def test_feature_curve():
    extraction = UnitExtraction(
        archetype="wardrobe",
        dimensions=UnitDimensions(length_mm=1000, height_mm=2100, carcass_depth_mm=600),
        counts=UnitCounts(shutters=2),
        finishes=UnitFinishes(),
        hardware=UnitHardware(),
        premium_features=[PremiumFeature(feature_type="curve", parameters={"radius_mm": 50})]
    )
    
    bom = generate_bom(extraction)
    bom = apply_features(bom, extraction.premium_features)
    
    curve_labour = next(i for i in bom.items if i.feature_id == "curve")
    assert curve_labour.quantity == 1.0
