import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.subject import Subject
from app.models.test import Test, TestStatus, TestDifficulty
from app.models.question import Question, QuestionType, QuestionDifficulty
from app.models.answer import Answer
from app.models.material import Material
from app.schemas.test import TestCreate, TestUpdate, TestResponse, TestDetailResponse
from app.schemas.material import MaterialResponse
from app.schemas.ai import AIGenerateRequest, AIGenerateResponse, AIQuestionItem
from app.utils.auth import require_teacher
from app.utils.room_code import generate_room_code
from app.services.document_parser import DocumentParser
from app.ai.ollama import ollama_service
from app.ai.prompt_builder import build_quiz_prompt
from app.ai.question_parser import parse_and_validate_quiz

router = APIRouter(prefix="/tests", tags=["tests"])

@router.get("", response_model=List[TestResponse])
def list_tests(
    subject_id: Optional[int] = None,
    status_filter: Optional[TestStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    query = db.query(Test).filter(Test.teacher_id == current_user.id)
    if subject_id:
        query = query.filter(Test.subject_id == subject_id)
    if status_filter:
        query = query.filter(Test.status == status_filter)
    
    tests = query.order_by(Test.created_at.desc()).all()
    # Update question counts dynamically
    for t in tests:
        t.question_count = len(t.questions)
    return tests

@router.post("", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
def create_test(
    test_in: TestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    subject = db.query(Subject).filter(Subject.id == test_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")
    
    test = Test(
        teacher_id=current_user.id,
        subject_id=test_in.subject_id,
        title=test_in.title.strip(),
        description=test_in.description.strip() if test_in.description else None,
        difficulty=test_in.difficulty,
        time_limit_minutes=test_in.time_limit_minutes,
        question_count=0,
        status=TestStatus.DRAFT,
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test

@router.get("/{test_id}", response_model=TestDetailResponse)
def get_test_detail(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден или нет доступа")
    
    test.question_count = len(test.questions)
    materials_response = []
    for m in test.materials:
        snippet = m.extracted_text[:200] + "..." if m.extracted_text and len(m.extracted_text) > 200 else m.extracted_text
        materials_response.append(
            MaterialResponse(
                id=m.id,
                test_id=m.test_id,
                filename=m.filename,
                file_type=m.file_type,
                extracted_text_snippet=snippet,
                char_count=len(m.extracted_text) if m.extracted_text else 0,
                created_at=m.created_at,
            )
        )
    
    result = TestDetailResponse.model_validate(test)
    result.materials = materials_response
    return result

@router.put("/{test_id}", response_model=TestResponse)
def update_test(
    test_id: int,
    test_in: TestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден или нет доступа")
    
    if test_in.title is not None:
        test.title = test_in.title.strip()
    if test_in.description is not None:
        test.description = test_in.description.strip()
    if test_in.subject_id is not None:
        test.subject_id = test_in.subject_id
    if test_in.difficulty is not None:
        test.difficulty = test_in.difficulty
    if test_in.time_limit_minutes is not None:
        test.time_limit_minutes = test_in.time_limit_minutes
    if test_in.status is not None:
        test.status = test_in.status
    
    test.question_count = len(test.questions)
    db.commit()
    db.refresh(test)
    return test

@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден или нет доступа")
    
    # Delete uploaded files on disk
    for m in test.materials:
        if os.path.exists(m.file_path):
            try:
                os.remove(m.file_path)
            except Exception:
                pass
    
    db.delete(test)
    db.commit()
    return None

@router.post("/{test_id}/copy", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
def duplicate_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    source_test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not source_test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    
    # Create clone
    new_test = Test(
        teacher_id=current_user.id,
        subject_id=source_test.subject_id,
        title=f"{source_test.title} (Копия)",
        description=source_test.description,
        difficulty=source_test.difficulty,
        time_limit_minutes=source_test.time_limit_minutes,
        question_count=len(source_test.questions),
        status=TestStatus.DRAFT,
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)

    # Copy questions & answers
    for q in source_test.questions:
        new_q = Question(
            test_id=new_test.id,
            text=q.text,
            question_type=q.question_type,
            difficulty=q.difficulty,
            points=q.points,
            order_index=q.order_index,
        )
        db.add(new_q)
        db.flush()
        for a in q.answers:
            new_a = Answer(
                question_id=new_q.id,
                text=a.text,
                is_correct=a.is_correct,
                order_index=a.order_index,
            )
            db.add(new_a)
    
    db.commit()
    db.refresh(new_test)
    return new_test

@router.post("/{test_id}/publish", response_model=TestResponse)
def publish_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    
    if len(test.questions) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя опубликовать тест без единого вопроса. Добавьте вопросы вручную или через AI.",
        )
    
    # Generate room code if not already set
    if not test.room_code:
        test.room_code = generate_room_code(db)
    
    test.status = TestStatus.PUBLISHED
    test.question_count = len(test.questions)
    db.commit()
    db.refresh(test)
    return test

@router.post("/{test_id}/close", response_model=TestResponse)
def close_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    
    test.status = TestStatus.CLOSED
    db.commit()
    db.refresh(test)
    return test

@router.post("/{test_id}/materials", response_model=List[MaterialResponse])
async def upload_materials(
    test_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    
    current_materials = db.query(Material).filter(Material.test_id == test_id).all()
    if len(current_materials) + len(files) > settings.MAX_FILES_PER_TEST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Превышен лимит файлов. Максимально разрешено {settings.MAX_FILES_PER_TEST} файлов на тест.",
        )
    
    uploaded_items = []
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    for file in files:
        if not DocumentParser.is_supported(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Файл '{file.filename}' имеет неподдерживаемый формат. Разрешены: PDF, DOCX, PPTX, TXT.",
            )
        
        file_bytes = await file.read()
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Файл '{file.filename}' превышает допустимый размер {settings.MAX_FILE_SIZE_MB} МБ.",
            )
        
        # Save securely to uploads directory
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        saved_path = os.path.join(settings.UPLOAD_DIR, unique_name)
        
        with open(saved_path, "wb") as f:
            f.write(file_bytes)
        
        # Extract text
        success, text_or_err = DocumentParser.extract_text(saved_path, file.filename)
        extracted_text = text_or_err if success else f"[Ошибка извлечения]: {text_or_err}"

        material = Material(
            test_id=test.id,
            filename=file.filename,
            file_type=ext.replace(".", "").upper(),
            file_path=saved_path,
            extracted_text=extracted_text,
        )
        db.add(material)
        uploaded_items.append(material)

    db.commit()
    for m in uploaded_items:
        db.refresh(m)

    response = []
    for m in uploaded_items:
        snippet = m.extracted_text[:200] + "..." if m.extracted_text and len(m.extracted_text) > 200 else m.extracted_text
        response.append(
            MaterialResponse(
                id=m.id,
                test_id=m.test_id,
                filename=m.filename,
                file_type=m.file_type,
                extracted_text_snippet=snippet,
                char_count=len(m.extracted_text) if m.extracted_text else 0,
                created_at=m.created_at,
            )
        )
    return response

@router.delete("/{test_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    test_id: int,
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    material = db.query(Material).filter(Material.id == material_id, Material.test_id == test_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Материал не найден")
    
    if os.path.exists(material.file_path):
        try:
            os.remove(material.file_path)
        except Exception:
            pass
    
    db.delete(material)
    db.commit()
    return None

@router.post("/{test_id}/generate", response_model=AIGenerateResponse)
async def generate_questions_with_ai(
    test_id: int,
    req: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    test = db.query(Test).filter(Test.id == test_id, Test.teacher_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тест не найден")
    
    # Check Ollama health first
    is_healthy, health_msg = await ollama_service.check_health()
    if not is_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Локальный AI сейчас недоступен ({health_msg}). "
                "Проверьте, запущен ли Ollama. Вы можете создать вопросы вручную."
            ),
        )

    # Collect extracted texts from materials
    materials = db.query(Material).filter(Material.test_id == test_id).all()
    all_material_texts = []
    for m in materials:
        if m.extracted_text and not m.extracted_text.startswith("[Ошибка"):
            all_material_texts.append(f"--- Документ: {m.filename} ---\n{m.extracted_text}")
    
    combined_text = "\n\n".join(all_material_texts)

    # If no materials, use test description or topic
    if not combined_text.strip():
        combined_text = test.description or req.topic or test.title

    system_prompt, user_prompt = build_quiz_prompt(
        subject_name=test.subject.name if test.subject else "Общий предмет",
        test_title=test.title,
        material_text=combined_text,
        question_count=req.question_count,
        difficulty=req.difficulty,
        question_type=req.question_type,
        topic=req.topic or test.title,
        custom_instructions=req.custom_instructions,
    )

    # Try calling Ollama (attempt 1)
    success, raw_output = await ollama_service.generate_completion(system_prompt, user_prompt)
    if not success:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=raw_output)

    # Parse and validate JSON
    is_valid, quiz_obj, err_msg = parse_and_validate_quiz(raw_output)
    
    # Retry once if parsing failed
    if not is_valid:
        retry_prompt = user_prompt + "\n\nВНИМАНИЕ: Предыдущий ответ не содержал валидный JSON. Верни СТРОГО JSON без markdown и пояснений."
        retry_success, retry_raw = await ollama_service.generate_completion(system_prompt, retry_prompt)
        if retry_success:
            is_valid, quiz_obj, err_msg = parse_and_validate_quiz(retry_raw)

    if not is_valid or not quiz_obj:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Не удалось получить корректный формат вопросов от AI: {err_msg}. Попробуйте ещё раз или создайте вопросы вручную.",
        )

    # Save generated questions into database
    current_max_order = len(test.questions)
    created_questions = []

    for idx, q_item in enumerate(quiz_obj.questions):
        question = Question(
            test_id=test.id,
            text=q_item.text,
            question_type=q_item.type,
            difficulty=req.difficulty,
            points=1,
            order_index=current_max_order + idx,
        )
        db.add(question)
        db.flush()

        for a_idx, a_item in enumerate(q_item.answers):
            answer = Answer(
                question_id=question.id,
                text=a_item.text,
                is_correct=a_item.is_correct,
                order_index=a_idx,
            )
            db.add(answer)

    test.question_count = len(test.questions) + len(quiz_obj.questions)
    db.commit()

    return AIGenerateResponse(
        success=True,
        message=f"Успешно создано {len(quiz_obj.questions)} вопросов через AI.",
        questions_generated=len(quiz_obj.questions),
        questions=quiz_obj.questions,
        model_used=ollama_service.model,
    )
