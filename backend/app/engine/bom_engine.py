from app.schemas.extraction import UnitExtraction
from app.schemas.bom import BOMList, BOMLineItem
from typing import List

def generate_bom(extraction: UnitExtraction, unit_id: str = "default_unit") -> BOMList:
    """
    Translates an AI extraction into deterministic BOM line items based on the archetype.
    """
    items: List[BOMLineItem] = []
    
    # Check archetype (case-insensitive)
    archetype_lower = (extraction.archetype or "").lower()
    
    length = extraction.dimensions.length_mm or 0
    height = extraction.dimensions.height_mm or 0
    depth = extraction.dimensions.carcass_depth_mm or 0
    
    # Common area calculations
    sides_sqft = 2 * (height * depth) / 92903.04
    tb_sqft = 2 * (length * depth) / 92903.04
    total_carcass_sqft = sides_sqft + tb_sqft
    back_sqft = (length * height) / 92903.04
    
    if archetype_lower in ["wardrobe", "tall_storage_with_shutters"]:
        # 1. Carcass (Sides, Top, Bottom)
        if total_carcass_sqft > 0:
            items.append(BOMLineItem(
                category="board",
                item_name=extraction.finishes.carcass_material or "Standard Carcass Board",
                master_sku="MAT-1",
                quantity=total_carcass_sqft,
                unit="sft",
                wastage_pct=15.0,
                notes="Carcass calculation (Top, Bottom, Sides)",
                rule_id=f"ARCH_{archetype_lower.upper()}_CARCASS"
            ))
            
        # 2. Back Panel
        if back_sqft > 0 and (extraction.counts.back_panels or 0) > 0:
            items.append(BOMLineItem(
                category="board",
                item_name="HDHMR Back Panel 8mm",
                master_sku="MAT-2",
                quantity=back_sqft,
                unit="sft",
                wastage_pct=10.0,
                notes="Back panel",
                rule_id=f"ARCH_{archetype_lower.upper()}_BACK"
            ))
            
        # 3. Hardware (Hinges)
        shutters = extraction.counts.shutters or 0
        if shutters > 0:
            hinges_per_shutter = 2
            if height > 2400: hinges_per_shutter = 5
            elif height > 1800: hinges_per_shutter = 4
            elif height > 900: hinges_per_shutter = 3
            
            items.append(BOMLineItem(
                category="hardware",
                item_name="Hettich Soft Close Hinge",
                master_sku="HW-1",
                quantity=shutters * hinges_per_shutter,
                unit="nos",
                notes=f"{hinges_per_shutter} hinges per shutter",
                rule_id=f"ARCH_{archetype_lower.upper()}_HINGES"
            ))
            
        # 4. Hardware (Drawers)
        drawers = extraction.counts.drawers or 0
        if drawers > 0:
            items.append(BOMLineItem(
                category="hardware",
                item_name="Telescopic Drawer Slide",
                master_sku="HW-2",
                quantity=drawers,
                unit="pair",
                notes="Standard drawer slides",
                rule_id=f"ARCH_{archetype_lower.upper()}_DRAWER_SLIDES"
            ))

        # 5. Wardrobe specific: Hanger Rods
        if archetype_lower == "wardrobe":
            hanger_rods = extraction.counts.hanger_rods if extraction.counts.hanger_rods is not None else 1
            if hanger_rods > 0:
                items.append(BOMLineItem(
                    category="hardware",
                    item_name="SS Hanger Rod with Brackets",
                    master_sku="HW-ROD-1",
                    quantity=hanger_rods,
                    unit="nos",
                    notes="Wardrobe hanger rod",
                    rule_id="ARCH_WARDROBE_HANGER_ROD"
                ))
            
        # 6. Labour
        items.append(BOMLineItem(
            category="labour",
            item_name="Standard Assembly Labour",
            master_sku="LAB-1",
            quantity=max(total_carcass_sqft + back_sqft, 1.0),
            unit="sft",
            notes="Assembly labour",
            rule_id=f"ARCH_{archetype_lower.upper()}_LABOUR"
        ))

    elif archetype_lower == "base_storage_with_shutters":
        # 1. Carcass
        if total_carcass_sqft > 0:
            items.append(BOMLineItem(
                category="board",
                item_name=extraction.finishes.carcass_material or "Standard Carcass Board",
                master_sku="MAT-1",
                quantity=total_carcass_sqft,
                unit="sft",
                wastage_pct=15.0,
                notes="Carcass calculation",
                rule_id="ARCH_BASE_STORAGE_CARCASS"
            ))
            
        # 2. Back panel
        if back_sqft > 0 and (extraction.counts.back_panels or 0) > 0:
            items.append(BOMLineItem(
                category="board",
                item_name="HDHMR Back Panel 8mm",
                master_sku="MAT-2",
                quantity=back_sqft,
                unit="sft",
                wastage_pct=10.0,
                notes="Back panel",
                rule_id="ARCH_BASE_STORAGE_BACK"
            ))
            
        # 3. Skirting
        skirting_sqft = (length * 100) / 92903.04
        if skirting_sqft > 0:
            items.append(BOMLineItem(
                category="board",
                item_name=extraction.finishes.skirting_finish or "Standard Skirting Board",
                master_sku="MAT-3",
                quantity=skirting_sqft,
                unit="sft",
                wastage_pct=15.0,
                notes="Skirting calculation",
                rule_id="ARCH_BASE_STORAGE_SKIRTING"
            ))
            
        # 4. Hardware
        shutters = extraction.counts.shutters or 0
        if shutters > 0:
            hinges_per_shutter = 2
            if height > 900: hinges_per_shutter = 3
            items.append(BOMLineItem(
                category="hardware",
                item_name="Hettich Soft Close Hinge",
                master_sku="HW-1",
                quantity=shutters * hinges_per_shutter,
                unit="nos",
                notes=f"{hinges_per_shutter} hinges per shutter",
                rule_id="ARCH_BASE_STORAGE_HINGES"
            ))
            
        drawers = extraction.counts.drawers or 0
        if drawers > 0:
            items.append(BOMLineItem(
                category="hardware",
                item_name="Telescopic Drawer Slide",
                master_sku="HW-2",
                quantity=drawers,
                unit="pair",
                notes="Drawer slides",
                rule_id="ARCH_BASE_STORAGE_DRAWER_SLIDES"
            ))
            
        # 5. Labour
        items.append(BOMLineItem(
            category="labour",
            item_name="Standard Assembly Labour",
            master_sku="LAB-1",
            quantity=max(total_carcass_sqft + back_sqft + skirting_sqft, 1.0),
            unit="sft",
            notes="Assembly labour",
            rule_id="ARCH_BASE_STORAGE_LABOUR"
        ))

    elif archetype_lower == "open_shelving_frame":
        # 1. Carcass
        if total_carcass_sqft > 0:
            items.append(BOMLineItem(
                category="board",
                item_name=extraction.finishes.carcass_material or "Standard Carcass Board",
                master_sku="MAT-1",
                quantity=total_carcass_sqft,
                unit="sft",
                wastage_pct=15.0,
                notes="Carcass calculation",
                rule_id="ARCH_OPEN_SHELVING_CARCASS"
            ))
            
        # 2. Back panel
        if back_sqft > 0 and (extraction.counts.back_panels or 0) > 0:
            items.append(BOMLineItem(
                category="board",
                item_name=extraction.finishes.internal_finish or "HDHMR Back Panel 8mm",
                master_sku="MAT-2",
                quantity=back_sqft,
                unit="sft",
                wastage_pct=10.0,
                notes="Back panel",
                rule_id="ARCH_OPEN_SHELVING_BACK"
            ))
            
        # 3. Shelves
        shelves_count = (extraction.counts.fixed_shelves or 0) + (extraction.counts.adjustable_shelves or 0)
        if shelves_count > 0:
            shelf_sqft = (length * depth) / 92903.04
            items.append(BOMLineItem(
                category="board",
                item_name=extraction.finishes.internal_finish or "Standard Shelf Board",
                master_sku="MAT-1",
                quantity=shelf_sqft * shelves_count,
                unit="sft",
                wastage_pct=15.0,
                notes="Shelves calculation",
                rule_id="ARCH_OPEN_SHELVING_SHELVES"
            ))
            
        # 4. Labour
        items.append(BOMLineItem(
            category="labour",
            item_name="Open Unit Assembly Labour",
            master_sku="LAB-OPEN",
            quantity=max(total_carcass_sqft + back_sqft, 1.0),
            unit="sft",
            notes="Assembly labour",
            rule_id="ARCH_OPEN_SHELVING_LABOUR"
        ))
        
    elif archetype_lower == "floating_unit":
        # 1. Carcass
        if total_carcass_sqft > 0:
            items.append(BOMLineItem(
                category="board",
                item_name=extraction.finishes.carcass_material or "Standard Carcass Board",
                master_sku="MAT-1",
                quantity=total_carcass_sqft,
                unit="sft",
                wastage_pct=15.0,
                notes="Carcass calculation",
                rule_id="ARCH_FLOATING_CARCASS"
            ))
            
        # 2. Heavy Duty Back panel
        if back_sqft > 0 and (extraction.counts.back_panels or 0) > 0:
            items.append(BOMLineItem(
                category="board",
                item_name="HDHMR Heavy Duty Back Panel 18mm",
                master_sku="MAT-4",
                quantity=back_sqft,
                unit="sft",
                wastage_pct=10.0,
                notes="Heavy duty back panel for floating support",
                rule_id="ARCH_FLOATING_BACK"
            ))
            
        # 3. Hardware
        shutters = extraction.counts.shutters or 0
        if shutters > 0:
            items.append(BOMLineItem(
                category="hardware",
                item_name="Hettich Soft Close Hinge",
                master_sku="HW-1",
                quantity=shutters * 2,
                unit="nos",
                notes="Hinges",
                rule_id="ARCH_FLOATING_HINGES"
            ))
            
        drawers = extraction.counts.drawers or 0
        if drawers > 0:
            items.append(BOMLineItem(
                category="hardware",
                item_name="Telescopic Drawer Slide",
                master_sku="HW-2",
                quantity=drawers,
                unit="pair",
                notes="Drawer slides",
                rule_id="ARCH_FLOATING_DRAWER_SLIDES"
            ))
            
        # 4. Floating Mount
        items.append(BOMLineItem(
            category="hardware",
            item_name="Heavy Duty Wall Mounting Bracket (Bull Dog / Cleat)",
            master_sku="HW-FLOAT",
            quantity=max(int(length / 600), 2),
            unit="nos",
            notes="Mounting hardware based on length",
            rule_id="ARCH_FLOATING_MOUNT"
        ))
        
        # 5. Labour
        items.append(BOMLineItem(
            category="labour",
            item_name="Floating Unit Assembly & Wall Mount Labour",
            master_sku="LAB-FLOAT",
            quantity=max(total_carcass_sqft + back_sqft, 1.0),
            unit="sft",
            notes="Assembly and mount labour",
            rule_id="ARCH_FLOATING_LABOUR"
        ))
        
    else:
        # Fallback generic logic
        if total_carcass_sqft > 0:
            items.append(BOMLineItem(
                category="board",
                item_name=extraction.finishes.carcass_material or "Standard Carcass Board",
                master_sku="MAT-1",
                quantity=total_carcass_sqft,
                unit="sft",
                wastage_pct=15.0,
                notes="Carcass calculation",
                rule_id="ARCH_GENERIC_CARCASS"
            ))
            
        if back_sqft > 0 and (extraction.counts.back_panels or 0) > 0:
            items.append(BOMLineItem(
                category="board",
                item_name="HDHMR Back Panel 8mm",
                master_sku="MAT-2",
                quantity=back_sqft,
                unit="sft",
                wastage_pct=10.0,
                notes="Back panel",
                rule_id="ARCH_GENERIC_BACK"
            ))
            
        shutters = extraction.counts.shutters or 0
        if shutters > 0:
            items.append(BOMLineItem(
                category="hardware",
                item_name="Hettich Soft Close Hinge",
                master_sku="HW-1",
                quantity=shutters * 2,
                unit="nos",
                notes="Standard hinges",
                rule_id="ARCH_GENERIC_HINGES"
            ))
            
        drawers = extraction.counts.drawers or 0
        if drawers > 0:
            items.append(BOMLineItem(
                category="hardware",
                item_name="Telescopic Drawer Slide",
                master_sku="HW-2",
                quantity=drawers,
                unit="pair",
                notes="Standard drawer slides",
                rule_id="ARCH_GENERIC_DRAWER_SLIDES"
            ))
            
        items.append(BOMLineItem(
            category="labour",
            item_name="Standard Assembly Labour",
            master_sku="LAB-1",
            quantity=max(total_carcass_sqft + back_sqft, 1.0),
            unit="sft",
            notes="Assembly labour",
            rule_id="ARCH_GENERIC_LABOUR"
        ))

    return BOMList(unit_id=unit_id, items=items)
