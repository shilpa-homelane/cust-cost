import json
import os
from datetime import datetime
from app.schemas.extraction import UnitExtraction

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "extraction_logs")
os.makedirs(LOG_DIR, exist_ok=True)

def log_extraction(filename: str, extraction: UnitExtraction):
    """
    Logs the extraction output for future V2 retraining and analytics.
    """
    log_file = os.path.join(LOG_DIR, "extraction_log.jsonl")
    
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "source_filename": filename,
        "extraction": extraction.model_dump()
    }
    
    with open(log_file, "a") as f:
        f.write(json.dumps(entry) + "\n")
