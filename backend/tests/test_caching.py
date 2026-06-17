import pytest
import hashlib
from io import BytesIO
from fastapi import UploadFile
from app.models.rate_db import SessionLocal, init_db
from app.models.quote import ExtractionCache
from app.extraction.service import ExtractionService
from app.extraction.provider import MockProvider

@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    try:
        # Clear any existing caches to ensure test isolation
        db.query(ExtractionCache).delete()
        db.commit()
        yield db
    finally:
        db.query(ExtractionCache).delete()
        db.commit()
        db.close()

class CountingMockProvider(MockProvider):
    def __init__(self):
        self.call_count = 0
        
    def extract_from_images(self, images, notes=None):
        self.call_count += 1
        return super().extract_from_images(images, notes)

@pytest.mark.asyncio
async def test_extraction_caching_hit_and_miss(db_session):
    provider = CountingMockProvider()
    service = ExtractionService(provider=provider)
    
    file_content_a = b"dummy file content pattern A"
    file_content_b = b"dummy file content pattern B"
    
    upload_1 = UploadFile(filename="drawing_1.png", file=BytesIO(file_content_a))
    upload_2 = UploadFile(filename="drawing_1_dup.png", file=BytesIO(file_content_a)) # identical content
    upload_3 = UploadFile(filename="drawing_2.png", file=BytesIO(file_content_b)) # different content
    
    # 1. First upload (Cache Miss)
    res_1 = await service.process_upload(upload_1, db=db_session)
    assert provider.call_count == 1
    assert res_1.archetype == "wardrobe"
    
    # Verify database cache entry exists
    expected_hash = hashlib.sha256(file_content_a).hexdigest()
    cache_entry = db_session.query(ExtractionCache).filter(ExtractionCache.file_hash == expected_hash).first()
    assert cache_entry is not None
    assert cache_entry.filename == "drawing_1.png"
    
    # 2. Second upload of identical content (Cache Hit)
    res_2 = await service.process_upload(upload_2, db=db_session)
    # The provider call count must remain 1!
    assert provider.call_count == 1
    assert res_2.archetype == "wardrobe"
    # Ensure human_readable_summary or other fields are correctly restored
    assert res_2.human_readable_summary == res_1.human_readable_summary
    
    # 3. Third upload of different content (Cache Miss)
    res_3 = await service.process_upload(upload_3, db=db_session)
    # The provider call count must increment to 2
    assert provider.call_count == 2
    assert res_3.archetype == "wardrobe"
    
    # Verify second database cache entry exists
    expected_hash_b = hashlib.sha256(file_content_b).hexdigest()
    cache_entry_b = db_session.query(ExtractionCache).filter(ExtractionCache.file_hash == expected_hash_b).first()
    assert cache_entry_b is not None
    assert cache_entry_b.filename == "drawing_2.png"
