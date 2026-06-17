import os
import hashlib
from io import BytesIO
from fastapi import UploadFile
from sqlalchemy.orm import Session
from typing import Optional
from app.schemas.extraction import UnitExtraction
from app.extraction.provider import VisionLLMProvider
from app.extraction.consistency import run_consistency_checks
from app.extraction.logger import log_extraction
from pdf2image import convert_from_bytes
from PIL import Image
from app.models.quote import ExtractionCache

class ExtractionService:
    def __init__(self, provider: VisionLLMProvider):
        self.provider = provider
        
    async def process_upload(self, file: UploadFile, notes: str = None, db: Optional[Session] = None) -> UnitExtraction:
        content = await file.read()
        filename = file.filename.lower()
        
        # 1. Hashing and caching check
        file_hash = hashlib.sha256(content).hexdigest()
        
        if db is not None:
            cache_entry = db.query(ExtractionCache).filter(ExtractionCache.file_hash == file_hash).first()
            if cache_entry:
                # Cache Hit! Reconstruct UnitExtraction from cached JSON payload
                extraction = UnitExtraction.model_validate(cache_entry.extraction_data)
                # Run deterministic consistency checks & log it
                extraction = run_consistency_checks(extraction)
                log_extraction(file.filename, extraction)
                return extraction
                
        # Cache Miss: Proceed with PDF/Image parsing and LLM call
        images: list[BytesIO] = []
        
        if filename.endswith(".pdf"):
            # Convert PDF to images
            # Note: requires poppler to be installed on system
            try:
                pages = convert_from_bytes(content)
                for page in pages:
                    img_byte_arr = BytesIO()
                    page.save(img_byte_arr, format='JPEG')
                    img_byte_arr.seek(0)
                    images.append(img_byte_arr)
            except Exception as e:
                # If poppler is missing, we fallback gracefully or raise
                raise RuntimeError(f"PDF conversion failed: {e}")
        elif filename.endswith((".jpg", ".jpeg", ".png")):
            # It's already an image
            images.append(BytesIO(content))
        else:
            raise ValueError("Unsupported file format. Please upload PDF or images.")
            
        # 2. Call LLM
        extraction = self.provider.extract_from_images(images, notes)
        
        # Save fresh extraction to database cache
        if db is not None:
            new_cache = ExtractionCache(
                file_hash=file_hash,
                filename=file.filename,
                extraction_data=extraction.model_dump()
            )
            db.add(new_cache)
            db.commit()
            
        # 3. Run deterministic consistency checks
        extraction = run_consistency_checks(extraction)
        
        # 4. Log for V2 training
        log_extraction(file.filename, extraction)
        
        return extraction
