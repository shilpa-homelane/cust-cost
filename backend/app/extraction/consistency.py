from app.schemas.extraction import UnitExtraction

def run_consistency_checks(extraction: UnitExtraction) -> UnitExtraction:
    """
    Evaluates the extraction against basic physical and logical rules.
    Appends warnings to the extraction object.
    """
    warnings = []
    
    # 1. Dimension checks
    if extraction.dimensions.height_mm == 0 or extraction.dimensions.height_mm is None:
        warnings.append("Height is 0 or missing. Cannot calculate vertical area.")
        
    if extraction.dimensions.length_mm == 0 or extraction.dimensions.length_mm is None:
        warnings.append("Length is 0 or missing. Cannot calculate horizontal area.")
        
    # 2. Count vs Archetype checks
    if extraction.archetype == "wardrobe" and (extraction.counts.shutters == 0 or extraction.counts.shutters is None):
        warnings.append("Wardrobe specified but 0 shutters detected.")
        
    # 3. Premium features cross-check
    features = [f.feature_type for f in extraction.premium_features]
    if "fluted_glass" in features and extraction.counts.shutters == 0:
        warnings.append("Fluted glass feature detected but no shutters exist to house it.")
        
    extraction.consistency_warnings.extend(warnings)
    return extraction
