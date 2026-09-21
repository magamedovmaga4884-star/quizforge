from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.utils.auth import get_current_user, require_teacher

router = APIRouter(prefix="/subjects", tags=["subjects"])

@router.get("", response_model=List[SubjectResponse])
def get_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subjects = db.query(Subject).order_by(Subject.name.asc()).all()
    result = []
    for s in subjects:
        item = SubjectResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            teacher_id=s.teacher_id,
            created_at=s.created_at,
            test_count=len(s.tests),
        )
        result.append(item)
    return result

@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    existing = db.query(Subject).filter(Subject.name.ilike(subject_in.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Предмет '{subject_in.name.strip()}' уже существует.",
        )
    
    subject = Subject(
        name=subject_in.name.strip(),
        description=subject_in.description.strip() if subject_in.description else None,
        teacher_id=current_user.id,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return SubjectResponse(
        id=subject.id,
        name=subject.name,
        description=subject.description,
        teacher_id=subject.teacher_id,
        created_at=subject.created_at,
        test_count=0,
    )

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    subject_in: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")
    
    if subject_in.name is not None:
        subject.name = subject_in.name.strip()
    if subject_in.description is not None:
        subject.description = subject_in.description.strip()
    
    db.commit()
    db.refresh(subject)
    return SubjectResponse(
        id=subject.id,
        name=subject.name,
        description=subject.description,
        teacher_id=subject.teacher_id,
        created_at=subject.created_at,
        test_count=len(subject.tests),
    )

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")
    
    db.delete(subject)
    db.commit()
    return None
