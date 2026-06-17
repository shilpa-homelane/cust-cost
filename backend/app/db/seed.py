import json
import datetime
import re
from sqlalchemy.orm import Session
from app.models.rate_db import MasterRate, init_db, SessionLocal
import os

def sanitize_float(val) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).strip()
    if not val_str:
        return 0.0
    # Clean currency symbols and commas
    val_str = val_str.replace("₹", "").replace(",", "")
    # Extract the first numerical group
    match = re.search(r"^[0-9]+(?:\.[0-9]+)?", val_str)
    if match:
        return float(match.group(0))
    # Try finding any float in the string as fallback
    match_any = re.search(r"[0-9]+(?:\.[0-9]+)?", val_str)
    if match_any:
        return float(match_any.group(0))
    return 0.0

def seed_data(json_path: str):
    init_db()
    db: Session = SessionLocal()
    
    if not os.path.exists(json_path):
        print(f"File {json_path} not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    today = datetime.date.today()
    
    # Process materials
    for mat in data.get("materials", []):
        sku = f"MAT-{mat['sl_no']}"
        db_item = MasterRate(
            item_id=sku,
            category="board",
            name=mat["description"],
            master_sku=sku,
            unit=mat["unit"],
            rate=sanitize_float(mat.get("rate_gst")),
            valid_from=today,
            in_catalogue=False
        )
        db.add(db_item)
        
    # Process labour
    for lab in data.get("labour", []):
        sku = f"LAB-{lab['sl_no']}"
        db_item = MasterRate(
            item_id=sku,
            category="labour",
            name=lab["description"],
            master_sku=sku,
            unit=lab["unit"],
            rate=sanitize_float(lab.get("wages_inc_pf")),
            valid_from=today,
            in_catalogue=False
        )
        db.add(db_item)
        
    # Process hardware
    for hw in data.get("hardware_and_finishes", []):
        sku = f"HW-{hw['sl_no']}"
        db_item = MasterRate(
            item_id=sku,
            category="hardware_and_finishes",
            name=hw["description"],
            master_sku=sku,
            unit=hw["unit"],
            rate=sanitize_float(hw.get("rate")),
            valid_from=today,
            in_catalogue=False
        )
        db.add(db_item)
        
    db.commit()
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed_data("../extracted_costing_data.json")

