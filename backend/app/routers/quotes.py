from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.models.rate_db import SessionLocal
from app.models.quote import Quote
from app.schemas.quote import QuoteCreate, QuoteResponse
from app.auth.dependencies import get_current_role

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=QuoteResponse)
def create_quote(quote_in: QuoteCreate, db: Session = Depends(get_db), role: str = Depends(get_current_role)):
    # Generate a simple quote ID (in real life, this would use a sequence like Q-10042)
    new_quote_id = f"Q-{str(uuid.uuid4())[:8].upper()}"
    
    db_quote = Quote(
        **quote_in.model_dump(),
        quote_id=new_quote_id,
        designer_id=role # In a real app this is the User ID from JWT, for now we use Role
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote

@router.get("/", response_model=List[QuoteResponse])
def list_quotes(db: Session = Depends(get_db), role: str = Depends(get_current_role)):
    # If designer, only show theirs. If Admin/D2M, show all.
    query = db.query(Quote)
    if role in ["Designer", "Senior Designer"]:
        query = query.filter(Quote.designer_id == role)
    
    return query.order_by(Quote.created_at.desc()).all()

@router.get("/{quote_id}", response_model=QuoteResponse)
def get_quote(quote_id: str, db: Session = Depends(get_db), role: str = Depends(get_current_role)):
    quote = db.query(Quote).filter(Quote.quote_id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    if role in ["Designer", "Senior Designer"] and quote.designer_id != role:
        raise HTTPException(status_code=403, detail="Not authorized to view this quote")
        
    return quote
