from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.rate_db import SessionLocal
from app.models.settings_db import VisibilitySettings, get_or_create_settings
from app.schemas.settings import VisibilitySettingsUpdate, VisibilitySettingsResponse
from app.auth.dependencies import require_business_admin_access

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/settings", response_model=VisibilitySettingsResponse)
def get_visibility_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.put("/settings", response_model=VisibilitySettingsResponse)
def update_visibility_settings(
    body: VisibilitySettingsUpdate,
    db: Session = Depends(get_db),
    role: str = Depends(require_business_admin_access),
):
    settings = get_or_create_settings(db)
    settings.show_bom_to_customer = body.show_bom_to_customer
    settings.designer_margin_access = body.designer_margin_access
    settings.disclaimer_text = body.disclaimer_text
    db.commit()
    db.refresh(settings)
    return settings
