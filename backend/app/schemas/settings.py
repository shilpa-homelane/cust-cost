from pydantic import BaseModel


class VisibilitySettingsUpdate(BaseModel):
    show_bom_to_customer: bool
    designer_margin_access: bool
    disclaimer_text: str


class VisibilitySettingsResponse(BaseModel):
    show_bom_to_customer: bool
    designer_margin_access: bool
    disclaimer_text: str

    class Config:
        from_attributes = True
