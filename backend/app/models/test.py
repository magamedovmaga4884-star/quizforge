import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base

class TestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"

class TestDifficulty(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(SAEnum(TestDifficulty), default=TestDifficulty.MEDIUM, nullable=False)
    time_limit_minutes = Column(Integer, default=15, nullable=False)
    question_count = Column(Integer, default=0, nullable=False)
    room_code = Column(String(20), unique=True, index=True, nullable=True)
    status = Column(SAEnum(TestStatus), default=TestStatus.DRAFT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    teacher = relationship("User", back_populates="tests")
    subject = relationship("Subject", back_populates="tests")
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan", order_by="Question.order_index")
    materials = relationship("Material", back_populates="test", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="test", cascade="all, delete-orphan")
