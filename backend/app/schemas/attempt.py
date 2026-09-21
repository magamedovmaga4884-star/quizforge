from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.attempt import AttemptStatus
from app.schemas.question import StudentQuestionResponse

class AttemptAnswerSubmit(BaseModel):
    question_id: int
    answer_ids: List[int]  # Support single choice, multiple choice, and boolean

class AttemptResponse(BaseModel):
    id: int
    test_id: int
    student_id: int
    started_at: datetime
    finished_at: Optional[datetime] = None
    score: float
    total_points: int
    percentage: float
    status: AttemptStatus

    class Config:
        from_attributes = True

class StudentAttemptPlay(BaseModel):
    id: int
    test_id: int
    test_title: str
    subject_name: str
    time_limit_minutes: int
    started_at: datetime
    remaining_seconds: int
    status: AttemptStatus
    questions: List[StudentQuestionResponse]
    answers: dict[int, List[int]]  # question_id -> list of answer_ids currently saved

class AttemptFinishResponse(BaseModel):
    id: int
    score: float
    total_points: int
    percentage: float
    status: AttemptStatus
    started_at: datetime
    finished_at: datetime
    duration_seconds: int
    correct_count: int
    total_questions: int

class TeacherAttemptResultItem(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_email: str
    score: float
    total_points: int
    percentage: float
    status: AttemptStatus
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

class TeacherTestResultsResponse(BaseModel):
    test_id: int
    test_title: str
    total_attempts: int
    average_score: float
    highest_score: float
    average_percentage: float
    attempts: List[TeacherAttemptResultItem]

class QuestionStatItem(BaseModel):
    question_id: int
    question_text: str
    order_index: int
    total_answers: int
    correct_count: int
    incorrect_count: int
    correct_percentage: float
    incorrect_percentage: float

class TestStatisticsResponse(BaseModel):
    test_id: int
    total_students: int
    questions: List[QuestionStatItem]
