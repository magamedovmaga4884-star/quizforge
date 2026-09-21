import sys
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.subject import Subject
from app.utils.security import get_password_hash

DEFAULT_SUBJECTS = [
    {
        "name": "Программирование",
        "description": "Основы алгоритмов, структуры данных, Python, базы данных и разработка ПО.",
    },
    {
        "name": "Математика",
        "description": "Высшая математика, линейная алгебра, математический анализ и теория вероятностей.",
    },
    {
        "name": "История",
        "description": "Отечественная и мировая история, ключевые исторические эпохи и события.",
    },
    {
        "name": "Информатика",
        "description": "Теория информации, архитектура вычислительных систем, сети и информационная безопасность.",
    },
    {
        "name": "Физика",
        "description": "Общая физика: механика, термодинамика, электродинамика и оптика.",
    },
]

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("[*] Инициализация тестовых данных QuizForge...")

        # 1. Ensure teacher account exists for initial subjects
        teacher = db.query(User).filter(User.email == "teacher@quizforge.edu").first()
        if not teacher:
            teacher = User(
                email="teacher@quizforge.edu",
                full_name="Профессор Смирнов А. В.",
                password_hash=get_password_hash("teacher123"),
                role=UserRole.TEACHER,
            )
            db.add(teacher)
            db.commit()
            db.refresh(teacher)
            print(f"[+] Создан аккаунт преподавателя: {teacher.email} (пароль: teacher123)")
        else:
            print(f"[-] Преподаватель уже существует: {teacher.email}")

        # 2. Ensure student account exists for testing
        student = db.query(User).filter(User.email == "student@quizforge.edu").first()
        if not student:
            student = User(
                email="student@quizforge.edu",
                full_name="Иванов Алексей",
                password_hash=get_password_hash("student123"),
                role=UserRole.STUDENT,
            )
            db.add(student)
            db.commit()
            db.refresh(student)
            print(f"[+] Создан аккаунт студента: {student.email} (пароль: student123)")
        else:
            print(f"[-] Студент уже существует: {student.email}")

        # 3. Ensure subjects exist
        for s_data in DEFAULT_SUBJECTS:
            existing = db.query(Subject).filter(Subject.name == s_data["name"]).first()
            if not existing:
                subj = Subject(
                    name=s_data["name"],
                    description=s_data["description"],
                    teacher_id=teacher.id,
                )
                db.add(subj)
                print(f"[+] Создан предмет: {s_data['name']}")
        
        db.commit()
        print("[SUCCESS] База данных успешно инициализирована начальными предметами!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Ошибка при инициализации данных: {e}", file=sys.stderr)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
