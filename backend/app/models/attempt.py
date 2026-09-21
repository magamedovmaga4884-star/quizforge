import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base

class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    TIMED_OUT = "TIMED_OUT"

class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    score = Column(Float, default=0.0, nullable=False)
    total_points = Column(Integer, default=0, nullable=False)
    percentage = Column(Float, default=0.0, nullable=False)
    status = Column(SAEnum(AttemptStatus), default=AttemptStatus.IN_PROGRESS, nullable=False)

    # Relationships
    test = relationship("Test", back_populates="attempts")
    student = relationship("User", back_populates="attempts")
    attempt_answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    answer_id = Column(Integer, ForeignKey("answers.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    attempt = relationship("Attempt", back_populates="attempt_answers")
    question = relationship("Question", back_populates="attempt_answers")
    answer = relationship("Answer", back_populates="attempt_answers")
