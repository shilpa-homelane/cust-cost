import pytest
import os
from io import BytesIO
from fastapi import UploadFile
from app.extraction.provider import MockProvider
from app.extraction.service import ExtractionService

@pytest.mark.asyncio
async def test_extraction_service_mock():
    # Setup mock file
    file_content = b"fake image content"
    upload_file = UploadFile(filename="test_design.jpg", file=BytesIO(file_content))
    
    # Setup service with MockProvider
    service = ExtractionService(provider=MockProvider())
    
    # Process
    extraction = await service.process_upload(upload_file)
    
    # Assertions based on MockProvider's hardcoded output
    assert extraction.archetype == "wardrobe"
    assert extraction.dimensions.height_mm == 2100
    assert extraction.counts.shutters == 2
    assert "shutter_finish_secondary" in extraction.missing_information
    assert extraction.document_classification.pdf_type == "structured_detail_sheet"
    assert "Identified a standard Wardrobe unit" in extraction.human_readable_summary
    
    # Verify consistency checks were run
    # Mock output has height=2100, length=1200, so it shouldn't have 0-dimension warnings
    warnings_text = " ".join(extraction.consistency_warnings)
    assert "0 or missing" not in warnings_text

@pytest.mark.asyncio
async def test_consistency_engine_flags_zero_dimensions():
    # Setup mock file
    file_content = b"fake image content"
    upload_file = UploadFile(filename="test_design.jpg", file=BytesIO(file_content))
    
    # Setup a provider that returns 0 for dimensions
    class BadMockProvider(MockProvider):
        def extract_from_images(self, images, notes=None):
            ext = super().extract_from_images(images, notes)
            ext.dimensions.height_mm = 0
            return ext
            
    service = ExtractionService(provider=BadMockProvider())
    extraction = await service.process_upload(upload_file)
    
    # Check that warning was appended
    assert any("Height is 0" in w for w in extraction.consistency_warnings)
