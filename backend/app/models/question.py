import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base

class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"

class QuestionDifficulty(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    question_type = Column(SAEnum(QuestionType), default=QuestionType.SINGLE_CHOICE, nullable=False)
    difficulty = Column(SAEnum(QuestionDifficulty), default=QuestionDifficulty.MEDIUM, nullable=False)
    points = Column(Integer, default=1, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    test = relationship("Test", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan", order_by="Answer.order_index")
    attempt_answers = relationship("AttemptAnswer", back_populates="question", cascade="all, delete-orphan")
