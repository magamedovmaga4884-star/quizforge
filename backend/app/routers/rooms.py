from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.test import Test, TestStatus
from app.schemas.test import RoomJoinResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.post("/{code}/join", response_model=RoomJoinResponse)
def join_room(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    normalized_code = code.strip().upper()
    test = db.query(Test).filter(Test.room_code == normalized_code).first()
    
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Тест с кодом '{normalized_code}' не найден. Проверьте правильность ввода.",
        )
    
    if test.status != TestStatus.PUBLISHED:
        if test.status == TestStatus.CLOSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этот тест уже закрыт преподавателем.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Этот тест еще не опубликован преподавателем.",
        )
    
    if len(test.questions) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="В тесте пока нет вопросов.",
        )
    
    return RoomJoinResponse(
        test_id=test.id,
        title=test.title,
        description=test.description,
        subject_name=test.subject.name if test.subject else "Без предмета",
        difficulty=test.difficulty,
        time_limit_minutes=test.time_limit_minutes,
        question_count=len(test.questions),
        room_code=test.room_code,
    )
