from datetime import datetime
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.test import Test, TestStatus
from app.models.attempt import Attempt, AttemptStatus, AttemptAnswer
from app.schemas.attempt import (
    AttemptAnswerSubmit,
    AttemptResponse,
    StudentAttemptPlay,
    AttemptFinishResponse,
)
from app.schemas.question import StudentQuestionResponse, StudentAnswerResponse
from app.utils.auth import require_student, get_current_user
from app.services.grading import grade_attempt

router = APIRouter(tags=["attempts"])

def check_and_auto_timeout(attempt: Attempt, db: Session) -> bool:
    """
    Checks if attempt has timed out. If so, completes grading and updates status to TIMED_OUT.
    Returns True if timed out.
    """
    if attempt.status != AttemptStatus.IN_PROGRESS:
        return attempt.status == AttemptStatus.TIMED_OUT

    elapsed_seconds = (datetime.utcnow() - attempt.started_at).total_seconds()
    time_limit_seconds = attempt.test.time_limit_minutes * 60

    if elapsed_seconds > time_limit_seconds:
        # Time expired: auto-finish and grade with existing answers
        score, total_points, percentage, correct_count, total_questions = grade_attempt(
            attempt.test.questions,
            attempt.attempt_answers,
        )
        attempt.finished_at = datetime.utcnow()
        attempt.score = score
        attempt.total_points = total_points
        attempt.percentage = percentage
        attempt.status = AttemptStatus.TIMED_OUT
        db.commit()
        db.refresh(attempt)
        return True
    return False

@router.post("/tests/{test_id}/attempts", response_model=StudentAttemptPlay, status_code=status.HTTP_201_CREATED)
def start_or_resume_attempt(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    
    if test.status != TestStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Тест не опубликован или закрыт для прохождения.",
        )
    
    if len(test.questions) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="В тесте нет вопросов.",
        )

    # Check for existing completed or in-progress attempt
    existing_attempts = db.query(Attempt).filter(
        Attempt.test_id == test.id,
        Attempt.student_id == current_user.id,
    ).all()

    for att in existing_attempts:
        if att.status in (AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Вы уже прошли этот тест. Повторное прохождение запрещено.",
            )
        elif att.status == AttemptStatus.IN_PROGRESS:
            # Check if time expired
            if check_and_auto_timeout(att, db):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Время на прохождение теста истекло.",
                )
            # Resume existing attempt
            return build_student_attempt_play(att)

    # Create new attempt
    attempt = Attempt(
        test_id=test.id,
        student_id=current_user.id,
        started_at=datetime.utcnow(),
        status=AttemptStatus.IN_PROGRESS,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return build_student_attempt_play(attempt)

@router.get("/attempts/{attempt_id}", response_model=StudentAttemptPlay)
def get_attempt_state(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    attempt = db.query(Attempt).filter(
        Attempt.id == attempt_id,
        Attempt.student_id == current_user.id,
    ).first()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Попытка прохождения не найдена или принадлежит другому студенту.",
        )
    
    check_and_auto_timeout(attempt, db)
    return build_student_attempt_play(attempt)

@router.post("/attempts/{attempt_id}/answer", status_code=status.HTTP_200_OK)
def save_answer(
    attempt_id: int,
    payload: AttemptAnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    attempt = db.query(Attempt).filter(
        Attempt.id == attempt_id,
        Attempt.student_id == current_user.id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Попытка не найдена")

    if check_and_auto_timeout(attempt, db) or attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Время прохождения теста истекло или попытка уже завершена.",
        )

    # Delete previous answers for this question in this attempt
    db.query(AttemptAnswer).filter(
        AttemptAnswer.attempt_id == attempt.id,
        AttemptAnswer.question_id == payload.question_id,
    ).delete()

    # Insert newly selected answer(s)
    for ans_id in payload.answer_ids:
        db.add(AttemptAnswer(
            attempt_id=attempt.id,
            question_id=payload.question_id,
            answer_id=ans_id,
        ))

    db.commit()
    return {"status": "saved", "question_id": payload.question_id, "answer_ids": payload.answer_ids}

@router.post("/attempts/{attempt_id}/finish", response_model=AttemptFinishResponse)
def finish_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    attempt = db.query(Attempt).filter(
        Attempt.id == attempt_id,
        Attempt.student_id == current_user.id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Попытка не найдена")

    if attempt.status in (AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT):
        # Already finished, return existing results
        score, total_points, percentage, correct_count, total_questions = grade_attempt(
            attempt.test.questions,
            attempt.attempt_answers,
        )
        duration = int((attempt.finished_at - attempt.started_at).total_seconds()) if attempt.finished_at else 0
        return AttemptFinishResponse(
            id=attempt.id,
            score=attempt.score,
            total_points=attempt.total_points,
            percentage=attempt.percentage,
            status=attempt.status,
            started_at=attempt.started_at,
            finished_at=attempt.finished_at or datetime.utcnow(),
            duration_seconds=max(0, duration),
            correct_count=correct_count,
            total_questions=total_questions,
        )

    # Grade attempt
    score, total_points, percentage, correct_count, total_questions = grade_attempt(
        attempt.test.questions,
        attempt.attempt_answers,
    )
    
    elapsed = (datetime.utcnow() - attempt.started_at).total_seconds()
    time_limit_seconds = attempt.test.time_limit_minutes * 60
    final_status = AttemptStatus.TIMED_OUT if elapsed > time_limit_seconds else AttemptStatus.COMPLETED

    attempt.finished_at = datetime.utcnow()
    attempt.score = score
    attempt.total_points = total_points
    attempt.percentage = percentage
    attempt.status = final_status

    db.commit()
    db.refresh(attempt)

    duration = int((attempt.finished_at - attempt.started_at).total_seconds())

    return AttemptFinishResponse(
        id=attempt.id,
        score=score,
        total_points=total_points,
        percentage=percentage,
        status=final_status,
        started_at=attempt.started_at,
        finished_at=attempt.finished_at,
        duration_seconds=max(0, duration),
        correct_count=correct_count,
        total_questions=total_questions,
    )

@router.get("/attempts/my", response_model=List[AttemptResponse])
def get_my_attempts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    attempts = db.query(Attempt).filter(
        Attempt.student_id == current_user.id
    ).order_by(Attempt.started_at.desc()).all()
    return attempts

def build_student_attempt_play(attempt: Attempt) -> StudentAttemptPlay:
    test = attempt.test
    elapsed = (datetime.utcnow() - attempt.started_at).total_seconds()
    remaining = max(0, int(test.time_limit_minutes * 60 - elapsed))

    # Strip correct answers to prevent cheating
    student_questions = []
    for q in sorted(test.questions, key=lambda x: x.order_index):
        student_answers = [
            StudentAnswerResponse(id=a.id, text=a.text, order_index=a.order_index)
            for a in sorted(q.answers, key=lambda x: x.order_index)
        ]
        student_questions.append(
            StudentQuestionResponse(
                id=q.id,
                text=q.text,
                question_type=q.question_type,
                points=q.points,
                order_index=q.order_index,
                answers=student_answers,
            )
        )

    # Current saved answers
    answers_map: Dict[int, List[int]] = {}
    for aa in attempt.attempt_answers:
        if aa.question_id not in answers_map:
            answers_map[aa.question_id] = []
        answers_map[aa.question_id].append(aa.answer_id)

    return StudentAttemptPlay(
        id=attempt.id,
        test_id=test.id,
        test_title=test.title,
        subject_name=test.subject.name if test.subject else "Без предмета",
        time_limit_minutes=test.time_limit_minutes,
        started_at=attempt.started_at,
        remaining_seconds=remaining,
        status=attempt.status,
        questions=student_questions,
        answers=answers_map,
    )
