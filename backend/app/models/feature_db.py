from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime
from app.models.rate_db import Base
from sqlalchemy.orm import Session

class FeatureLibraryItem(Base):
    __tablename__ = "feature_library_items"
    
    id = Column(Integer, primary_key=True, index=True)
    feature_type = Column(String, unique=True, index=True, nullable=False) # e.g. "curve"
    name = Column(String, nullable=False)
    description = Column(String)
    is_calibrated = Column(Boolean, default=False)
    calibration_count = Column(Integer, default=0)
    confidence_buffer = Column(Float, default=10.0) # percentage (e.g. 10.0%)
    version = Column(String, default="v1.0")
    calibration_notes = Column(String, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def seed_features(db: Session):
    # Initial list of 14 features from PRD
    initial_features = [
        {
            "feature_type": "curve",
            "name": "Curved Edges",
            "description": "Applies 10% material wastage & profiling labor.",
            "is_calibrated": True,
            "calibration_count": 8,
            "confidence_buffer": 0.0,
            "version": "v1.0",
            "calibration_notes": "Calibrated against 8 past wardrobe projects in Q1."
        },
        {
            "feature_type": "jaali_pattern",
            "name": "Jaali Pattern",
            "description": "Adds MDF panel and Duco paint labor.",
            "is_calibrated": False,
            "calibration_count": 2,
            "confidence_buffer": 10.0,
            "version": "v1.0",
            "calibration_notes": "Pending calibration (only 2 past projects tracked)."
        },
        {
            "feature_type": "asymmetric_expo",
            "name": "Asymmetric Expo",
            "description": "Adds open cabinet finish carcass adjustments.",
            "is_calibrated": True,
            "calibration_count": 6,
            "confidence_buffer": 0.0,
            "version": "v1.0",
            "calibration_notes": "Calibrated against 6 past accent-unit projects."
        },
        {
            "feature_type": "glass_shutter",
            "name": "Glass Shutter",
            "description": "Adds clear/tinted glass insert board and framing labor.",
            "is_calibrated": True,
            "calibration_count": 5,
            "confidence_buffer": 0.0,
            "version": "v1.0",
            "calibration_notes": "Calibrated against 5 clear-glass kitchen projects."
        },
        {
            "feature_type": "fluted_glass",
            "name": "Fluted Glass Shutter",
            "description": "Adds fluted glass material and labor profiling.",
            "is_calibrated": True,
            "calibration_count": 5,
            "confidence_buffer": 0.0,
            "version": "v1.0",
            "calibration_notes": "Calibrated against 5 premium tall units."
        },
        {
            "feature_type": "cane_finish",
            "name": "Cane Finish",
            "description": "Adds custom cane panel weave and backing board.",
            "is_calibrated": False,
            "calibration_count": 1,
            "confidence_buffer": 10.0,
            "version": "v1.0",
            "calibration_notes": "Experimental cost model. Calibration target: 5 projects."
        },
        {
            "feature_type": "laminate_cut_paste",
            "name": "Laminate Cut-and-Paste",
            "description": "Adds extra labor for complex multi-colored laminate designs.",
            "is_calibrated": False,
            "calibration_count": 0,
            "confidence_buffer": 10.0,
            "version": "v1.0",
            "calibration_notes": "Experimental cost model. Standard 10% confidence penalty."
        },
        {
            "feature_type": "arch_cutout",
            "name": "Arch Cutout Shutter",
            "description": "Adds custom routing labor and shutter reinforcement.",
            "is_calibrated": False,
            "calibration_count": 3,
            "confidence_buffer": 10.0,
            "version": "v1.0",
            "calibration_notes": "Calibrated against 3 projects. Requires 2 more for full calibration."
        },
        {
            "feature_type": "mirror_inset",
            "name": "Mirror Inset",
            "description": "Adds mirror panel adhesive and safety backing.",
            "is_calibrated": True,
            "calibration_count": 7,
            "confidence_buffer": 0.0,
            "version": "v1.0",
            "calibration_notes": "Calibrated against 7 wardrobe mirror projects."
        },
        {
            "feature_type": "internal_lighting",
            "name": "Internal LED Lighting",
            "description": "Adds LED profile channel and driver hardware.",
            "is_calibrated": True,
            "calibration_count": 12,
            "confidence_buffer": 0.0,
            "version": "v1.0",
            "calibration_notes": "Fully calibrated against 12 standard lighting packages."
        },
        {
            "feature_type": "bevelled_edges",
            "name": "Bevelled Edges",
            "description": "Adds edge bevelling labor for glass/mirror pieces.",
            "is_calibrated": False,
            "calibration_count": 0,
            "confidence_buffer": 10.0,
            "version": "v1.0",
            "calibration_notes": "Experimental. Requires 5 project validations."
        },
        {
            "feature_type": "open_back_no_panel",
            "name": "Open Back (No Panel)",
            "description": "Removes standard back panel carcass cost from BOM.",
            "is_calibrated": True,
            "calibration_count": 9,
            "confidence_buffer": 0.0,
            "version": "v1.0",
            "calibration_notes": "Calibrated standard deduction rate."
        },
        {
            "feature_type": "skirting_drawer_decorative",
            "name": "Skirting Drawer (Decorative)",
            "description": "Adds bottom skirting drawer guides and specialized hardware.",
            "is_calibrated": False,
            "calibration_count": 1,
            "confidence_buffer": 10.0,
            "version": "v1.0",
            "calibration_notes": "Experimental skirting drawer costing."
        },
        {
            "feature_type": "groove_detailing",
            "name": "Groove Detailing",
            "description": "Adds linear routing machine time and detailing labor.",
            "is_calibrated": True,
            "calibration_count": 15,
            "confidence_buffer": 0.0,
            "version": "v1.0",
            "calibration_notes": "Fully calibrated with 15 project actuals."
        }
    ]
    
    for feat in initial_features:
        exists = db.query(FeatureLibraryItem).filter(FeatureLibraryItem.feature_type == feat["feature_type"]).first()
        if not exists:
            db_item = FeatureLibraryItem(**feat)
            db.add(db_item)
    db.commit()
