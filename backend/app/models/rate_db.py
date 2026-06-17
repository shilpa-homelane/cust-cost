from sqlalchemy import Column, Integer, String, Float, Boolean, Date, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class MasterRate(Base):
    __tablename__ = "master_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(String, index=True)  # stable identifier
    category = Column(String, index=True)  # board, laminate, hardware, labour
    name = Column(String)  # human-readable
    master_sku = Column(String, index=True)  # lookup key
    unit = Column(String)
    rate = Column(Float)
    gst_percent = Column(Float, default=18.0)
    applicable_vendor = Column(String, nullable=True)
    valid_from = Column(Date)
    valid_to = Column(Date, nullable=True)
    in_catalogue = Column(Boolean, default=False)

# Simple SQLite setup for Phase 1
engine = create_engine("sqlite:///./costing_tool.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

SEED_RATES = [
    ("ITM-001", "board",       "18mm Plywood (BWR Grade)",       "MAT-1",      "sft",  110.0, 18.0),
    ("ITM-002", "board",       "HDHMR Back Panel 8mm",           "MAT-2",      "sft",   85.0, 18.0),
    ("ITM-003", "board",       "MDF 18mm",                       "MAT-3",      "sft",   95.0, 18.0),
    ("ITM-004", "laminate",    "Laminate Sheet (1mm)",           "MAT-4",      "sft",   60.0, 18.0),
    ("ITM-005", "laminate",    "Acrylic Finish Sheet",           "MAT-5",      "sft",  180.0, 18.0),
    ("ITM-006", "hardware",    "Hettich Soft Close Hinge",       "HW-1",       "nos",   85.0, 18.0),
    ("ITM-007", "hardware",    "Telescopic Drawer Slide (pair)", "HW-2",       "pair", 320.0, 18.0),
    ("ITM-008", "hardware",    "SS Hanger Rod with Brackets",    "HW-ROD-1",   "nos",  150.0, 18.0),
    ("ITM-009", "hardware",    "Magnetic Catch",                 "HW-3",       "nos",   25.0, 18.0),
    ("ITM-010", "hardware",    "Handle (Standard)",              "HW-4",       "nos",   45.0, 18.0),
    ("ITM-011", "labour",      "Standard Assembly Labour",       "LAB-1",      "sft",  120.0, 18.0),
    ("ITM-012", "labour",      "Installation & Finishing",       "LAB-2",      "job",  800.0, 18.0),
    ("ITM-013", "glass",       "Frosted Glass Panel 5mm",        "GLS-1",      "sft",  220.0, 18.0),
    ("ITM-014", "miscellaneous","Adhesive & Consumables",        "MISC-1",     "job",  250.0, 18.0),
    ("ITM-015", "board",       "Particle Board 18mm (Economy)",  "MAT-PB-18",  "sft",   70.0, 18.0),
]

def seed_rates(db):
    from datetime import date
    existing_ids = {r.item_id for r in db.query(MasterRate).filter(MasterRate.valid_to == None).all()}
    for (item_id, category, name, master_sku, unit, rate, gst_pct) in SEED_RATES:
        if item_id not in existing_ids:
            db.add(MasterRate(
                item_id=item_id,
                category=category,
                name=name,
                master_sku=master_sku,
                unit=unit,
                rate=rate,
                gst_percent=gst_pct,
                valid_from=date.today(),
                valid_to=None,
                in_catalogue=True,
            ))
    db.commit()

def init_db():
    from app.models.feature_db import FeatureLibraryItem, seed_features
    from app.models.settings_db import VisibilitySettings, get_or_create_settings
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_features(db)
        get_or_create_settings(db)
        seed_rates(db)
    finally:
        db.close()
