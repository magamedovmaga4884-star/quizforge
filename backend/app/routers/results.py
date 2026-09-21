from typing import List, Dict, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.test import Test, TestStatus
from app.models.question import Question, QuestionType
from app.models.attempt import Attempt, AttemptStatus, AttemptAnswer
from app.schemas.attempt import (
    TeacherTestResultsResponse,
    TeacherAttemptResultItem,
    TestStatisticsResponse,
    QuestionStatItem,
)
from app.utils.auth import require_teacher

router = APIRouter(tags=["results"])

@router.get("/tests/{test_id}/results", response_model=TeacherTestResultsResponse)
def get_test_results(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден или нет доступа")
    
    attempts = db.query(Attempt).filter(
        Attempt.test_id == test.id,
        Attempt.status.in_([AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT]),
    ).order_by(Attempt.finished_at.desc()).all()

    items = []
    total_score = 0.0
    highest_score = 0.0
    total_percentage = 0.0

    for att in attempts:
        duration = int((att.finished_at - att.started_at).total_seconds()) if att.finished_at else None
        items.append(
            TeacherAttemptResultItem(
                id=att.id,
                student_id=att.student_id,
                student_name=att.student.full_name if att.student else "Неизвестный студент",
                student_email=att.student.email if att.student else "",
                score=att.score,
                total_points=att.total_points,
                percentage=att.percentage,
                status=att.status,
                started_at=att.started_at,
                finished_at=att.finished_at,
                duration_seconds=duration,
            )
        )
        total_score += att.score
        if att.score > highest_score:
            highest_score = att.score
        total_percentage += att.percentage

    count = len(attempts)
    avg_score = round(total_score / count, 1) if count > 0 else 0.0
    avg_percentage = round(total_percentage / count, 1) if count > 0 else 0.0

    return TeacherTestResultsResponse(
        test_id=test.id,
        test_title=test.title,
        total_attempts=count,
        average_score=avg_score,
        highest_score=highest_score,
        average_percentage=avg_percentage,
        attempts=items,
    )

@router.get("/tests/{test_id}/statistics", response_model=TestStatisticsResponse)
def get_test_statistics(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден или нет доступа")
    
    attempts = db.query(Attempt).filter(
        Attempt.test_id == test.id,
        Attempt.status.in_([AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT]),
    ).all()

    total_students = len(attempts)
    stat_items = []

    for q in sorted(test.questions, key=lambda x: x.order_index):
        correct_answer_ids = {a.id for a in q.answers if a.is_correct}
        q_correct = 0
        q_total_answered = 0

        for att in attempts:
            student_chosen_ids = {
                aa.answer_id for aa in att.attempt_answers if aa.question_id == q.id
            }
            if student_chosen_ids:
                q_total_answered += 1
                if q.question_type in (QuestionType.SINGLE_CHOICE, QuestionType.TRUE_FALSE):
                    if len(student_chosen_ids) == 1 and student_chosen_ids == correct_answer_ids:
                        q_correct += 1
                elif q.question_type == QuestionType.MULTIPLE_CHOICE:
                    if student_chosen_ids == correct_answer_ids and len(correct_answer_ids) > 0:
                        q_correct += 1

        incorrect = q_total_answered - q_correct
        correct_pct = round((q_correct / q_total_answered * 100), 1) if q_total_answered > 0 else 0.0
        incorrect_pct = round((incorrect / q_total_answered * 100), 1) if q_total_answered > 0 else 0.0

        stat_items.append(
            QuestionStatItem(
                question_id=q.id,
                question_text=q.text,
                order_index=q.order_index,
                total_answers=q_total_answered,
                correct_count=q_correct,
                incorrect_count=incorrect,
                correct_percentage=correct_pct,
                incorrect_percentage=incorrect_pct,
            )
        )

    return TestStatisticsResponse(
        test_id=test.id,
        total_students=total_students,
        questions=stat_items,
    )

@router.get("/teacher/dashboard-stats")
def get_teacher_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    tests = db.query(Test).filter(Test.teacher_id == current_user.id).all()
    test_ids = [t.id for t in tests]
    
    total_tests = len(tests)
    active_tests = sum(1 for t in tests if t.status == TestStatus.PUBLISHED)
    
    attempts = []
    if test_ids:
        attempts = db.query(Attempt).filter(
            Attempt.test_id.in_(test_ids),
            Attempt.status.in_([AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT]),
        ).all()
    
    completed_attempts = len(attempts)
    unique_students = len({att.student_id for att in attempts})

    # Recent 5 tests
    recent_tests = (
        db.query(Test)
        .filter(Test.teacher_id == current_user.id)
        .order_by(Test.created_at.desc())
        .limit(5)
        .all()
    )

    recent_tests_data = []
    for t in recent_tests:
        recent_tests_data.append({
            "id": t.id,
            "title": t.title,
            "subject_name": t.subject.name if t.subject else "Без предмета",
            "question_count": len(t.questions),
            "difficulty": t.difficulty,
            "time_limit_minutes": t.time_limit_minutes,
            "status": t.status,
            "room_code": t.room_code,
            "created_at": t.created_at,
        })

    return {
        "total_tests": total_tests,
        "active_tests": active_tests,
        "unique_students": unique_students,
        "completed_attempts": completed_attempts,
        "recent_tests": recent_tests_data,
    }
