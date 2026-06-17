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

def init_db():
    from app.models.feature_db import FeatureLibraryItem, seed_features
    from app.models.settings_db import VisibilitySettings, get_or_create_settings
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_features(db)
        get_or_create_settings(db)
    finally:
        db.close()
