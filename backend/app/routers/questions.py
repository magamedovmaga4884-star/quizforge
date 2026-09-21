from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.test import Test
from app.models.question import Question, QuestionType, QuestionDifficulty
from app.models.answer import Answer
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse
from app.utils.auth import require_teacher

router = APIRouter(tags=["questions"])

@router.get("/tests/{test_id}/questions", response_model=List[QuestionResponse])
def get_test_questions(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    return test.questions

@router.post("/tests/{test_id}/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def add_question(
    test_id: int,
    q_in: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    
    if len(q_in.answers) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Вопрос должен содержать как минимум 2 варианта ответа.",
        )
    
    # Calculate next order index
    next_order = len(test.questions)

    question = Question(
        test_id=test.id,
        text=q_in.text.strip(),
        question_type=q_in.question_type,
        difficulty=q_in.difficulty,
        points=q_in.points if q_in.points > 0 else 1,
        order_index=next_order,
    )
    db.add(question)
    db.flush()

    for idx, a_in in enumerate(q_in.answers):
        answer = Answer(
            question_id=question.id,
            text=a_in.text.strip(),
            is_correct=a_in.is_correct,
            order_index=idx,
        )
        db.add(answer)

    test.question_count = len(test.questions) + 1
    db.commit()
    db.refresh(question)
    return question

@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    q_in: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    question = db.query(Question).join(Test).filter(
        Question.id == question_id,
        Test.teacher_id == current_user.id
    ).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Вопрос не найден")
    
    if q_in.text is not None:
        question.text = q_in.text.strip()
    if q_in.question_type is not None:
        question.question_type = q_in.question_type
    if q_in.difficulty is not None:
        question.difficulty = q_in.difficulty
    if q_in.points is not None and q_in.points > 0:
        question.points = q_in.points
    if q_in.order_index is not None:
        question.order_index = q_in.order_index
    
    if q_in.answers is not None:
        # Replace or update answers
        existing_answers = {a.id: a for a in question.answers}
        updated_answers = []
        
        for idx, a_in in enumerate(q_in.answers):
            if a_in.id and a_in.id in existing_answers:
                # Update existing
                ans = existing_answers[a_in.id]
                ans.text = a_in.text.strip()
                ans.is_correct = a_in.is_correct
                ans.order_index = idx
                updated_answers.append(ans)
            else:
                # Create new
                ans = Answer(
                    question_id=question.id,
                    text=a_in.text.strip(),
                    is_correct=a_in.is_correct,
                    order_index=idx,
                )
                db.add(ans)
                updated_answers.append(ans)
        
        # Remove any answers not in the new payload
        new_ids = {a.id for a in updated_answers if a.id}
        for a_id, a_obj in existing_answers.items():
            if a_id not in new_ids:
                db.delete(a_obj)

    db.commit()
    db.refresh(question)
    return question

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    question = db.query(Question).join(Test).filter(
        Question.id == question_id,
        Test.teacher_id == current_user.id
    ).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Вопрос не найден")
    
    test = question.test
    db.delete(question)
    test.question_count = max(0, len(test.questions) - 1)
    db.commit()
    return None

@router.post("/tests/{test_id}/questions/reorder", status_code=status.HTTP_200_OK)
def reorder_questions(
    test_id: int,
    question_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    
    q_map = {q.id: q for q in test.questions}
    for idx, q_id in enumerate(question_ids):
        if q_id in q_map:
            q_map[q_id].order_index = idx
    
    db.commit()
    return {"message": "Порядок вопросов успешно обновлен"}
