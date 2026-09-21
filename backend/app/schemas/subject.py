from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class SubjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class SubjectResponse(SubjectBase):
    id: int
    teacher_id: int
    created_at: datetime
    test_count: Optional[int] = 0

    class Config:
        from_attributes = True
