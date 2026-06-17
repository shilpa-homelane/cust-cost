import pytest
from app.models.rate_db import SessionLocal, init_db
from app.models.feature_db import FeatureLibraryItem
from app.schemas.extraction import UnitExtraction, UnitDimensions, UnitCounts, UnitFinishes, UnitHardware, PremiumFeature
from app.engine.bom_engine import generate_bom
from app.engine.feature_library import apply_features
from app.engine.costing_engine import generate_quote

@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_confidence_buffer_calibrated_feature(db_session):
    extraction = UnitExtraction(
        archetype="wardrobe",
        dimensions=UnitDimensions(length_mm=1000, height_mm=2100, carcass_depth_mm=600),
        counts=UnitCounts(shutters=2),
        finishes=UnitFinishes(carcass_material="BWP Ply"),
        hardware=UnitHardware(),
        premium_features=[PremiumFeature(feature_type="curve", parameters={"radius_mm": 50})]
    )
    
    feat_item = db_session.query(FeatureLibraryItem).filter(FeatureLibraryItem.feature_type == "curve").first()
    assert feat_item is not None
    assert feat_item.is_calibrated is True
    
    bom = generate_bom(extraction)
    bom = apply_features(bom, extraction.premium_features)
    
    quote, cost_sheet = generate_quote(db_session, bom)
    
    # Calibrated feature => 0% buffer
    assert cost_sheet.confidence_buffer == 0.0

def test_confidence_buffer_experimental_feature(db_session):
    extraction = UnitExtraction(
        archetype="wardrobe",
        dimensions=UnitDimensions(length_mm=1000, height_mm=2100, carcass_depth_mm=600),
        counts=UnitCounts(shutters=2),
        finishes=UnitFinishes(carcass_material="BWP Ply"),
        hardware=UnitHardware(),
        premium_features=[PremiumFeature(feature_type="cane_finish", parameters={"panel_area_sft": 5.0})]
    )
    
    feat_item = db_session.query(FeatureLibraryItem).filter(FeatureLibraryItem.feature_type == "cane_finish").first()
    assert feat_item is not None
    assert feat_item.is_calibrated is False
    
    bom = generate_bom(extraction)
    bom = apply_features(bom, extraction.premium_features)
    
    quote, cost_sheet = generate_quote(db_session, bom)
    
    # Experimental feature => 10% safety buffer on COGS base
    expected_buffer = cost_sheet.cogs_base * 0.10
    assert abs(cost_sheet.confidence_buffer - expected_buffer) < 0.01
