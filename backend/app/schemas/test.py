from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.test import TestStatus, TestDifficulty
from app.schemas.question import QuestionResponse
from app.schemas.material import MaterialResponse
from app.schemas.subject import SubjectResponse

class TestBase(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: int
    difficulty: TestDifficulty = TestDifficulty.MEDIUM
    time_limit_minutes: int = 15

class TestCreate(TestBase):
    question_count: Optional[int] = 0

class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[int] = None
    difficulty: Optional[TestDifficulty] = None
    time_limit_minutes: Optional[int] = None
    status: Optional[TestStatus] = None

class TestResponse(TestBase):
    id: int
    teacher_id: int
    question_count: int
    room_code: Optional[str] = None
    status: TestStatus
    created_at: datetime
    updated_at: datetime
    subject: Optional[SubjectResponse] = None

    class Config:
        from_attributes = True

class TestDetailResponse(TestResponse):
    questions: List[QuestionResponse] = []
    materials: List[MaterialResponse] = []

class RoomJoinResponse(BaseModel):
    test_id: int
    title: str
    description: Optional[str] = None
    subject_name: str
    difficulty: TestDifficulty
    time_limit_minutes: int
    question_count: int
    room_code: str
