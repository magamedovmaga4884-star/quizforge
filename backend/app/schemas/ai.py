from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.question import QuestionType, QuestionDifficulty

class AIAnswerItem(BaseModel):
    text: str = Field(..., description="Answer text")
    is_correct: bool = Field(..., description="Whether this answer is correct")

class AIQuestionItem(BaseModel):
    text: str = Field(..., description="Question statement")
    type: QuestionType = Field(default=QuestionType.SINGLE_CHOICE, description="Type of question")
    answers: List[AIAnswerItem] = Field(..., min_length=2, description="List of options")

class AIGeneratedQuiz(BaseModel):
    questions: List[AIQuestionItem]

class AIGenerateRequest(BaseModel):
    question_count: int = Field(default=5, ge=1, le=30)
    difficulty: QuestionDifficulty = Field(default=QuestionDifficulty.MEDIUM)
    question_type: Optional[QuestionType] = None
    topic: Optional[str] = None
    custom_instructions: Optional[str] = None

class AIGenerateResponse(BaseModel):
    success: bool
    message: str
    questions_generated: int
    questions: List[AIQuestionItem] = []
    model_used: Optional[str] = None
