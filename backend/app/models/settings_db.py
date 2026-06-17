from sqlalchemy import Column, Integer, String, Boolean
from app.models.rate_db import Base, SessionLocal

DEFAULT_DISCLAIMER = (
    "This estimate does not constitute a promise or commitment of any kind "
    "and has no legal validity. Prices are indicative and subject to change."
)


class VisibilitySettings(Base):
    __tablename__ = "visibility_settings"

    id = Column(Integer, primary_key=True, default=1)
    show_bom_to_customer = Column(Boolean, default=True)
    designer_margin_access = Column(Boolean, default=False)
    disclaimer_text = Column(String, default=DEFAULT_DISCLAIMER)


def get_or_create_settings(db) -> VisibilitySettings:
    settings = db.query(VisibilitySettings).filter(VisibilitySettings.id == 1).first()
    if not settings:
        settings = VisibilitySettings(
            id=1,
            show_bom_to_customer=True,
            designer_margin_access=False,
            disclaimer_text=DEFAULT_DISCLAIMER,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings
