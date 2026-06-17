from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from datetime import datetime
from app.models.rate_db import Base

class Quote(Base):
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(String, index=True, unique=True)
    designer_id = Column(String, index=True)
    customer_name = Column(String)
    brand = Column(String)
    status = Column(String, default="Draft") # Draft, Final
    total_price = Column(Float)
    extraction_data = Column(JSON) # Stores the raw JSON payload of the extraction
    costing_data = Column(JSON) # Stores the raw JSON of the generated quote/cost sheet
    created_at = Column(DateTime, default=datetime.utcnow)

class ExtractionCache(Base):
    __tablename__ = "extraction_caches"
    
    file_hash = Column(String, primary_key=True, index=True, unique=True)
    filename = Column(String)
    extraction_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
