# read MASTER DATA.xlsx and extract data from it

import csv
import json
import re

def clean_num(val):
    if not val: return None
    val = val.strip().replace('/-', '').replace('%', '').replace(',', '')
    try:
        return float(val)
    except ValueError:
        return val

def main():
    with open('sheet2.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

    data = {
        "materials": [],
        "labour": [],
        "hardware_and_finishes": []
    }

    # Helper function to parse base material (Region A)
    def parse_base_material(row_idx):
        if row_idx >= len(rows): return None
        row = rows[row_idx]
        if len(row) < 9: return None
        
        sl_no = row[1].strip()
        if not sl_no.isdigit():
            return None
        
        desc = row[2].strip()
        dim1 = row[4].strip()
        dim2 = row[5].strip()
        size = f"{dim1}{dim2}".strip() if dim1 or dim2 else None
        
        unit = row[6].strip()
        rate_gst = clean_num(row[7])
        sft_price = clean_num(row[8])
        
        return {
            "sl_no": int(sl_no),
            "description": desc,
            "size": size,
            "unit": unit,
            "rate_gst": rate_gst,
            "sft_price": sft_price,
            "brand_pricing": {}
        }

    # Region A: Base Materials (Indices 4 to 59)
    for i in range(4, 60):
        mat = parse_base_material(i)
        if mat and mat["description"]:
            
            # Region C & D: Brand Pricing
            # Green Panel & Action Tessa (Indices 4 to 23)
            if 4 <= i <= 23:
                # Green Panel is cols 21 to 25
                if len(rows[i]) > 25:
                    mat["brand_pricing"]["GREEN PANEL"] = {
                        "sft_price": clean_num(rows[i][21]),
                        "mrp_board": clean_num(rows[i][22]),
                        "discount_pct": clean_num(rows[i][23]) / 100 if isinstance(clean_num(rows[i][23]), float) else None,
                        "sp_board": clean_num(rows[i][24]),
                        "selling_sft_price": clean_num(rows[i][25])
                    }
                # Action Tessa is cols 26 to 30
                if len(rows[i]) > 30:
                    mat["brand_pricing"]["ACTION TESSA"] = {
                        "sft_price": clean_num(rows[i][26]),
                        "mrp_board_with_gst": clean_num(rows[i][27]),
                        "discount_pct": clean_num(rows[i][28]) / 100 if isinstance(clean_num(rows[i][28]), float) else None,
                        "sp_board": clean_num(rows[i][29]),
                        "selling_sft_price": clean_num(rows[i][30])
                    }
                    
            # Green Ply & Century (Indices 26 to 41)
            elif 26 <= i <= 41:
                # Green Ply: 21 to 25
                if len(rows[i]) > 25:
                    mat["brand_pricing"]["GREEN PLY"] = {
                        "sft_price": clean_num(rows[i][21]),
                        "mrp_board": clean_num(rows[i][22]),
                        "discount_pct": clean_num(rows[i][23]) / 100 if isinstance(clean_num(rows[i][23]), float) else None,
                        "sp_board": clean_num(rows[i][24]),
                        "selling_sft_price": clean_num(rows[i][25])
                    }
                # Century: 26 to 30
                if len(rows[i]) > 30:
                    mat["brand_pricing"]["CENTURY"] = {
                        "sft_price": clean_num(rows[i][26]),
                        "mrp_board": clean_num(rows[i][27]),
                        "discount_pct": clean_num(rows[i][28]) / 100 if isinstance(clean_num(rows[i][28]), float) else None,
                        "sp_board": clean_num(rows[i][29]),
                        "selling_sft_price": clean_num(rows[i][30])
                    }
                    
            data["materials"].append(mat)

    # Region B: Labour Master (Indices 4 to 11)
    for i in range(4, 12):
        row = rows[i]
        if len(row) > 14:
            sl_no = row[11].strip()
            desc = row[12].strip()
            unit = row[13].strip()
            wages = clean_num(row[14])
            if desc:
                data["labour"].append({
                    "sl_no": int(sl_no) if sl_no.isdigit() else None,
                    "description": desc,
                    "unit": unit,
                    "wages_inc_pf": wages
                })

    # Region E: Hardware & Finishes (Indices 60 to 129)
    current_category = None
    for i in range(60, len(rows)):
        row = rows[i]
        if len(row) < 8: continue
        
        sl_no_str = row[1].strip()
        desc = row[2].strip()
        sub_desc = row[3].strip()
        
        unit = row[6].strip()
        rate_str = row[7].strip()
        
        # Header Detection logic
        if not unit and not rate_str and (desc or sub_desc):
            current_category = desc if desc else sub_desc
            continue
            
        # Item logic
        if sl_no_str.isdigit():
            dim1 = row[4].strip() if len(row) > 4 else ""
            dim2 = row[5].strip() if len(row) > 5 else ""
            size = f"{dim1}{dim2}".strip() if dim1 or dim2 else None
            
            rate = clean_num(rate_str)
            
            # Extract additional fields like facia or secondary rates if present
            extra_info = []
            for col_idx in range(8, 11):
                if len(row) > col_idx and row[col_idx].strip() and row[col_idx].strip() != "overall":
                    extra_info.append(row[col_idx].strip())
            
            primary_desc = desc if desc else sub_desc
            
            item = {
                "category": current_category,
                "sl_no": int(sl_no_str),
                "description": primary_desc,
                "size": size,
                "unit": unit,
                "rate": rate,
                "extra_info": extra_info if extra_info else None
            }
            data["hardware_and_finishes"].append(item)

    with open('extracted_costing_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
        
    print(f"Successfully extracted {len(data['materials'])} base materials, {len(data['labour'])} labour items, and {len(data['hardware_and_finishes'])} hardware/finishes items.")

if __name__ == '__main__':
    main()
