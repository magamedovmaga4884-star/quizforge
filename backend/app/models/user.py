import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.STUDENT)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subjects = relationship("Subject", back_populates="teacher", cascade="all, delete-orphan")
    tests = relationship("Test", back_populates="teacher", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="student", cascade="all, delete-orphan")
