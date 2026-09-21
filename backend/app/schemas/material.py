from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class MaterialResponse(BaseModel):
    id: int
    test_id: int
    filename: str
    file_type: str
    extracted_text_snippet: Optional[str] = None
    char_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
