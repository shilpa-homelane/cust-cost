from app.schemas.bom import BOMList, BOMLineItem
from app.schemas.extraction import PremiumFeature

def apply_feature_curve(bom: BOMList, feature: PremiumFeature):
    radius = feature.parameters.get("radius_mm", 50)
    for item in bom.items:
        if item.category == "board":
            item.wastage_pct += 10.0
            
    bom.items.append(BOMLineItem(
        category="labour",
        item_name=f"Curve Edge Profiling (R{radius})",
        master_sku="LAB-CURVE",
        quantity=1.0,
        unit="nos",
        notes="Extra labour for curved profile",
        feature_id="curve"
    ))

def apply_feature_jaali_pattern(bom: BOMList, feature: PremiumFeature):
    area_sft = feature.parameters.get("panel_area_sft", 5.0)
    jaali_type = feature.parameters.get("jaali_type", "Standard MDF")
    
    bom.items.append(BOMLineItem(
        category="board",
        item_name=f"Jaali Panel Board ({jaali_type})",
        master_sku="MAT-JAALI-BOARD",
        quantity=area_sft,
        unit="sft",
        wastage_pct=15.0,
        feature_id="jaali_pattern"
    ))
    bom.items.append(BOMLineItem(
        category="labour",
        item_name="Jaali Cutting & Duco Polish Labour",
        master_sku="LAB-JAALI-CUTTING",
        quantity=area_sft,
        unit="sft",
        feature_id="jaali_pattern"
    ))

def apply_feature_asymmetric_expo(bom: BOMList, feature: PremiumFeature):
    expo_sides = feature.parameters.get("expo_sides", ["right"])
    sides_count = len(expo_sides) if isinstance(expo_sides, list) else 1
    
    bom.items.append(BOMLineItem(
        category="board",
        item_name="Asymmetric Expo Panel",
        master_sku="MAT-EXPO-BOARD",
        quantity=sides_count * 12.0,
        unit="sft",
        feature_id="asymmetric_expo"
    ))

def apply_feature_glass_shutter(bom: BOMList, feature: PremiumFeature):
    area_sft = feature.parameters.get("area_sft", 4.0)
    glass_type = feature.parameters.get("glass_type", "Clear")
    
    bom.items.append(BOMLineItem(
        category="glass",
        item_name=f"Glass Shutter Insert ({glass_type})",
        master_sku="MAT-GLASS-CLEAR",
        quantity=area_sft,
        unit="sft",
        feature_id="glass_shutter"
    ))
    bom.items.append(BOMLineItem(
        category="hardware",
        item_name="Aluminum Glass Frame Channel Set",
        master_sku="HW-GLASS-FRAME",
        quantity=1.0,
        unit="nos",
        feature_id="glass_shutter"
    ))

def apply_feature_fluted_glass(bom: BOMList, feature: PremiumFeature):
    area_sft = feature.parameters.get("area_sft", 4.0)
    
    bom.items.append(BOMLineItem(
        category="glass",
        item_name="Fluted Glass 5mm",
        master_sku="MAT-GLASS-FLUTED",
        quantity=area_sft,
        unit="sft",
        wastage_pct=15.0,
        feature_id="fluted_glass"
    ))

def apply_feature_cane_finish(bom: BOMList, feature: PremiumFeature):
    area_sft = feature.parameters.get("panel_area_sft", 5.0)
    
    bom.items.append(BOMLineItem(
        category="board",
        item_name="Cane Finish Woven Panel",
        master_sku="MAT-CANE-WEAVE",
        quantity=area_sft,
        unit="sft",
        feature_id="cane_finish"
    ))

def apply_feature_laminate_cut_paste(bom: BOMList, feature: PremiumFeature):
    area_sft = feature.parameters.get("pattern_area_sft", 5.0)
    colors = feature.parameters.get("num_colors", 2)
    
    bom.items.append(BOMLineItem(
        category="labour",
        item_name=f"Laminate Cut & Paste Multi-Color ({colors} colors)",
        master_sku="LAB-CUT-PASTE",
        quantity=area_sft,
        unit="sft",
        feature_id="laminate_cut_paste"
    ))

def apply_feature_arch_cutout(bom: BOMList, feature: PremiumFeature):
    bom.items.append(BOMLineItem(
        category="labour",
        item_name="Arch Cutout CNC Shutter Routing",
        master_sku="LAB-CNC-ARCH",
        quantity=1.0,
        unit="nos",
        feature_id="arch_cutout"
    ))

def apply_feature_mirror_inset(bom: BOMList, feature: PremiumFeature):
    area_sft = feature.parameters.get("area_sft", 6.0)
    
    bom.items.append(BOMLineItem(
        category="glass",
        item_name="Mirror Glass Inset 4mm",
        master_sku="MAT-MIRROR-INSET",
        quantity=area_sft,
        unit="sft",
        feature_id="mirror_inset"
    ))

def apply_feature_internal_lighting(bom: BOMList, feature: PremiumFeature):
    length_mm = feature.parameters.get("running_length_mm", 1000)
    length_rft = length_mm / 304.8
    
    bom.items.append(BOMLineItem(
        category="hardware",
        item_name="LED Profile Strip & Diffuser Channel",
        master_sku="MAT-LIGHT-LED",
        quantity=length_rft,
        unit="rft",
        feature_id="internal_lighting"
    ))
    bom.items.append(BOMLineItem(
        category="hardware",
        item_name="LED Electronic Driver/Adapter",
        master_sku="HW-LIGHT-DRIVER",
        quantity=1.0,
        unit="nos",
        feature_id="internal_lighting"
    ))

def apply_feature_bevelled_edges(bom: BOMList, feature: PremiumFeature):
    length_mm = feature.parameters.get("edge_length_mm", 1000)
    length_rft = length_mm / 304.8
    
    bom.items.append(BOMLineItem(
        category="labour",
        item_name="Glass/Mirror Edge Bevelling Labour",
        master_sku="LAB-BEVEL-EDGE",
        quantity=length_rft,
        unit="rft",
        feature_id="bevelled_edges"
    ))

def apply_feature_open_back_no_panel(bom: BOMList, feature: PremiumFeature):
    # Deduction: Remove any back panel from the BOM list
    bom.items = [
        item for item in bom.items 
        if "back" not in item.item_name.lower() and item.master_sku != "MAT-2"
    ]

def apply_feature_skirting_drawer(bom: BOMList, feature: PremiumFeature):
    drawers = feature.parameters.get("drawer_count", 1)
    
    bom.items.append(BOMLineItem(
        category="hardware",
        item_name="Skirting Drawer Slide Channel Set",
        master_sku="HW-SKIRTING-SLIDES",
        quantity=drawers,
        unit="nos",
        feature_id="skirting_drawer_decorative"
    ))
    bom.items.append(BOMLineItem(
        category="labour",
        item_name="Skirting Drawer Fitting Assembly",
        master_sku="LAB-SKIRTING-DRAWER",
        quantity=drawers,
        unit="nos",
        feature_id="skirting_drawer_decorative"
    ))

def apply_feature_groove_detailing(bom: BOMList, feature: PremiumFeature):
    area_sft = feature.parameters.get("area_sft", 10.0)
    
    bom.items.append(BOMLineItem(
        category="labour",
        item_name="Linear Groove Routing Detailing",
        master_sku="LAB-GROOVE-ROUTE",
        quantity=area_sft,
        unit="sft",
        feature_id="groove_detailing"
    ))

# Register handlers (mapping both canonical names and short names to be extremely robust)
FEATURE_HANDLERS = {
    # Curve
    "curve": apply_feature_curve,
    "curved_edges": apply_feature_curve,
    
    # Jaali
    "jaali": apply_feature_jaali_pattern,
    "jaali_pattern": apply_feature_jaali_pattern,
    
    # Expo
    "asymmetric_expo": apply_feature_asymmetric_expo,
    
    # Glass Shutter
    "glass_shutter": apply_feature_glass_shutter,
    
    # Fluted Glass
    "fluted_glass": apply_feature_fluted_glass,
    
    # Cane
    "cane": apply_feature_cane_finish,
    "cane_finish": apply_feature_cane_finish,
    
    # Laminate Cut-and-Paste
    "laminate_cut_paste": apply_feature_laminate_cut_paste,
    "laminate_cut_paste_pattern": apply_feature_laminate_cut_paste,
    
    # Arch Cutout
    "arch_cutout": apply_feature_arch_cutout,
    
    # Mirror
    "mirror_inset": apply_feature_mirror_inset,
    
    # Lighting
    "internal_lighting": apply_feature_internal_lighting,
    
    # Bevelled Edges
    "bevelled_edges": apply_feature_bevelled_edges,
    
    # Open Back (Deduction)
    "open_back_no_panel": apply_feature_open_back_no_panel,
    
    # Skirting Drawer
    "skirting_drawer_decorative": apply_feature_skirting_drawer,
    
    # Groove
    "groove_detailing": apply_feature_groove_detailing,
    "routed_pattern": apply_feature_groove_detailing,
}

def apply_features(bom: BOMList, features: list[PremiumFeature]) -> BOMList:
    """
    Applies D2M-owned feature cost models to the existing BOM.
    """
    for feature in features:
        handler = FEATURE_HANDLERS.get(feature.feature_type)
        if handler:
            handler(bom, feature)
    return bom
