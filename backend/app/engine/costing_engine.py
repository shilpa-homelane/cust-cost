from sqlalchemy.orm import Session
from app.schemas.bom import BOMList
from app.schemas.quote import InternalCostSheet, CostedBOMLine, CustomerQuote
from app.models.rate_db import MasterRate

def generate_quote(db: Session, bom: BOMList, brand: str = "HomeLane", brand_margin_pct: float = 40.0) -> tuple[CustomerQuote, InternalCostSheet]:
    costed_items = []
    cogs_base = 0.0
    
    # Retrieve active rates (naive cache map for speed)
    active_rates = {
        r.master_sku: r 
        for r in db.query(MasterRate).filter(MasterRate.valid_to == None).all()
    }
    
    for item in bom.items:
        rate_record = active_rates.get(item.master_sku)
        rate_val = rate_record.rate if rate_record else 100.0 # Fallback rate for testing
        
        # Apply wastage
        effective_qty = item.quantity * (1 + (item.wastage_pct / 100.0))
        line_subtotal = round(effective_qty * rate_val, 2)
        
        cogs_base += line_subtotal
        
        costed_items.append(CostedBOMLine(
            **item.model_dump(),
            rate=rate_val,
            line_subtotal=line_subtotal
        ))
        
    cogs_base = round(cogs_base, 2)
    misc_overhead = round(cogs_base * 0.025, 2)
    transportation = round(cogs_base * 0.03, 2)
    vendor_margin = round(cogs_base * 0.15, 2)
    brand_margin = round(cogs_base * (brand_margin_pct / 100.0), 2)
    
    # Calculate confidence buffer for experimental features
    from app.models.feature_db import FeatureLibraryItem
    features_in_bom = set(item.feature_id for item in bom.items if item.feature_id)
    
    confidence_buffer = 0.0
    if features_in_bom:
        experimental_features = db.query(FeatureLibraryItem).filter(
            FeatureLibraryItem.feature_type.in_(features_in_bom),
            FeatureLibraryItem.is_calibrated == False
        ).all()
        if experimental_features:
            confidence_buffer = round(cogs_base * 0.10, 2)  # 10% safety buffer on COGS base
            
    total_excl_gst = round(cogs_base + misc_overhead + transportation + vendor_margin + brand_margin + confidence_buffer, 2)
    gst = round(total_excl_gst * 0.18, 2)
    total_incl_gst = round(total_excl_gst + gst, 2)
    
    internal_sheet = InternalCostSheet(
        unit_id=bom.unit_id,
        costed_items=costed_items,
        cogs_base=cogs_base,
        miscellaneous_overhead=misc_overhead,
        transportation_cost=transportation,
        vendor_margin=vendor_margin,
        brand_margin=brand_margin,
        confidence_buffer=confidence_buffer,
        total_cost_excl_gst=total_excl_gst,
        gst_amount=gst,
        total_price_incl_gst=total_incl_gst,
        rate_set_version="v1.0",
        feature_library_version="v1.0"
    )
    
    customer_quote = CustomerQuote(
        unit_id=bom.unit_id,
        brand=brand,
        unit_description="Custom Furniture Unit",
        finishes_summary=["Carcass: Standard Board", "Finish: Unknown"],
        total_price_incl_gst=total_incl_gst
    )
    
    return customer_quote, internal_sheet
