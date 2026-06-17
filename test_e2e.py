import requests
import sys

def run_test():
    file_path = "test/Screenshot 2026-01-04 121700.png"
    notes = "Customer requested a premium finish."
    
    print(f"Testing extraction with {file_path}...")
    with open(file_path, "rb") as f:
        files = {"file": ("screenshot.png", f, "image/png")}
        data = {"notes": notes}
        
        # Hit extraction endpoint
        resp = requests.post("http://127.0.0.1:8000/api/v1/extraction/extract-document", data=data, files=files, timeout=90.0)
        
    if resp.status_code != 200:
        print("Extraction failed:", resp.text)
        sys.exit(1)
        
    extraction_data = resp.json()
    print("Extraction Success!")
    print(f"Archetype: {extraction_data.get('archetype')}")
    print(f"Dimensions: {extraction_data.get('dimensions')}")
    print(f"Human Readable Summary: {extraction_data.get('human_readable_summary')}")
    
    # Now hit quote endpoint
    print("\nTesting quote generation...")
    q_resp = requests.post("http://127.0.0.1:8000/api/v1/costing/generate-quote", json=extraction_data, timeout=90.0)
    if q_resp.status_code != 200:
        print("Quote failed:", q_resp.text)
        sys.exit(1)
            
    quote_data = q_resp.json()
    print("Quote Success!")
    print(f"Total Price: {quote_data['quote']['total_price_incl_gst']}")
    print(f"COGS Base: {quote_data['cost_sheet']['cogs_base']}")
    print(f"Brand Margin: {quote_data['cost_sheet']['brand_margin']}")

if __name__ == "__main__":
    run_test()
