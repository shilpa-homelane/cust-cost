from app.schemas.extraction import UnitExtraction
from app.engine.bom_engine import generate_bom

# Mock extraction
data = {
    "archetype": "open_shelving_frame",
    "dimensions": {"length_mm": 1000, "height_mm": 2000, "carcass_depth_mm": 350},
    "counts": {"fixed_shelves": 4, "adjustable_shelves": 2, "back_panels": 0, "shutters": 0},
    "finishes": {"carcass_material": "MDF", "internal_finish": "White Laminate"},
    "hardware": {}
}

ext = UnitExtraction.model_validate(data)
bom = generate_bom(ext)
for item in bom.items:
    print(item.category, item.item_name, item.quantity, item.unit)
