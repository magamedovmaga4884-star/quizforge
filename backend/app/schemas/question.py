from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.question import QuestionType, QuestionDifficulty

class AnswerBase(BaseModel):
    text: str
    is_correct: bool = False
    order_index: int = 0

class AnswerCreate(AnswerBase):
    pass

class AnswerUpdate(BaseModel):
    id: Optional[int] = None
    text: str
    is_correct: bool = False
    order_index: int = 0

class AnswerResponse(AnswerBase):
    id: int
    question_id: int

    class Config:
        from_attributes = True

class StudentAnswerResponse(BaseModel):
    id: int
    text: str
    order_index: int

    class Config:
        from_attributes = True


class QuestionBase(BaseModel):
    text: str
    question_type: QuestionType = QuestionType.SINGLE_CHOICE
    difficulty: QuestionDifficulty = QuestionDifficulty.MEDIUM
    points: int = 1
    order_index: int = 0

class QuestionCreate(QuestionBase):
    answers: List[AnswerCreate] = []

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    question_type: Optional[QuestionType] = None
    difficulty: Optional[QuestionDifficulty] = None
    points: Optional[int] = None
    order_index: Optional[int] = None
    answers: Optional[List[AnswerUpdate]] = None

class QuestionResponse(QuestionBase):
    id: int
    test_id: int
    created_at: datetime
    answers: List[AnswerResponse] = []

    class Config:
        from_attributes = True

class StudentQuestionResponse(BaseModel):
    id: int
    text: str
    question_type: QuestionType
    points: int
    order_index: int
    answers: List[StudentAnswerResponse] = []

    class Config:
        from_attributes = True
