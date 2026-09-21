"""
Comprehensive End-to-End Verification Test Suite for QuizForge
"""
import sys
import os

# Use SQLite or Postgres depending on environment
os.environ["DATABASE_URL"] = "sqlite:///./test_quizforge.db"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

def setup_module():
    # Initialize fresh schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def teardown_module():
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_quizforge.db"):
        try:
            os.remove("./test_quizforge.db")
        except Exception:
            pass

def test_full_quizforge_lifecycle():
    client = TestClient(app)

    print("\n--- 1. Testing System Health & AI Status ---")
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res = client.get("/api/ai/status")
    assert res.status_code == 200
    ai_info = res.json()
    assert "available" in ai_info
    print(f"AI Service Status: {ai_info['available']}, Message: {ai_info['message']}")

    print("\n--- 2. Teacher Registration and Login ---")
    reg_teacher = client.post("/api/auth/register", json={
        "email": "prof_ivanov@university.ru",
        "password": "strongpassword123",
        "full_name": "Иванов Иван Петрович",
        "role": "TEACHER"
    })
    assert reg_teacher.status_code == 201
    teacher_token = reg_teacher.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    me_res = client.get("/api/auth/me", headers=teacher_headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "TEACHER"

    print("\n--- 3. Subject Creation and Management ---")
    subj_res = client.post("/api/subjects", headers=teacher_headers, json={
        "name": "Информационные системы",
        "description": "Курс по базам данных и архитектуре информационных систем"
    })
    assert subj_res.status_code == 201
    subject_id = subj_res.json()["id"]

    subjects_list = client.get("/api/subjects", headers=teacher_headers).json()
    assert any(s["id"] == subject_id for s in subjects_list)

    print("\n--- 4. Test Creation ---")
    test_res = client.post("/api/tests", headers=teacher_headers, json={
        "title": "Итоговое тестирование по базам данных",
        "description": "Проверка знаний SQL и реляционной модели данных",
        "subject_id": subject_id,
        "difficulty": "MEDIUM",
        "time_limit_minutes": 10
    })
    assert test_res.status_code == 201
    test_id = test_res.json()["id"]
    assert test_res.json()["status"] == "DRAFT"

    print("\n--- 5. Uploading Educational Materials ---")
    sample_text = (
        "Реляционная база данных организует данные в таблицы. "
        "Первичный ключ (Primary Key) однозначно идентифицирует запись. "
        "Внешний ключ (Foreign Key) связывает две таблицы. "
        "Язык SQL используется для выборки данных с помощью команды SELECT. "
        "Нормализация снижает избыточность данных."
    )
    files = [
        ("files", ("lecture_databases.txt", sample_text.encode("utf-8"), "text/plain"))
    ]
    mat_res = client.post(f"/api/tests/{test_id}/materials", headers=teacher_headers, files=files)
    assert mat_res.status_code == 200
    materials = mat_res.json()
    assert len(materials) == 1
    assert "Реляционная" in materials[0]["extracted_text_snippet"]

    print("\n--- 6. Adding 5 Questions with Different Types ---")
    # Q1: SINGLE_CHOICE
    q1_res = client.post(f"/api/tests/{test_id}/questions", headers=teacher_headers, json={
        "text": "Какая команда SQL используется для извлечения данных из таблицы?",
        "question_type": "SINGLE_CHOICE",
        "difficulty": "EASY",
        "points": 1,
        "answers": [
            {"text": "EXTRACT", "is_correct": False},
            {"text": "SELECT", "is_correct": True},
            {"text": "GET", "is_correct": False},
            {"text": "FETCH", "is_correct": False}
        ]
    })
    assert q1_res.status_code == 201
    q1_id = q1_res.json()["id"]
    correct_a1_id = [a["id"] for a in q1_res.json()["answers"] if a["is_correct"]][0]

    # Q2: SINGLE_CHOICE
    q2_res = client.post(f"/api/tests/{test_id}/questions", headers=teacher_headers, json={
        "text": "Что однозначно идентифицирует каждую запись в реляционной таблице?",
        "question_type": "SINGLE_CHOICE",
        "difficulty": "MEDIUM",
        "points": 2,
        "answers": [
            {"text": "Внешний ключ (Foreign Key)", "is_correct": False},
            {"text": "Индекс B-Tree", "is_correct": False},
            {"text": "Первичный ключ (Primary Key)", "is_correct": True},
            {"text": "Триггер", "is_correct": False}
        ]
    })
    assert q2_res.status_code == 201
    q2_id = q2_res.json()["id"]
    correct_a2_id = [a["id"] for a in q2_res.json()["answers"] if a["is_correct"]][0]

    # Q3: MULTIPLE_CHOICE
    q3_res = client.post(f"/api/tests/{test_id}/questions", headers=teacher_headers, json={
        "text": "Какие из перечисленных понятий относятся к реляционным СУБД?",
        "question_type": "MULTIPLE_CHOICE",
        "difficulty": "MEDIUM",
        "points": 2,
        "answers": [
            {"text": "Таблицы и строки", "is_correct": True},
            {"text": "Первичные ключи", "is_correct": True},
            {"text": "Квадрокоптеры", "is_correct": False},
            {"text": "Внешние ключи", "is_correct": True}
        ]
    })
    assert q3_res.status_code == 201
    q3_id = q3_res.json()["id"]
    correct_a3_ids = [a["id"] for a in q3_res.json()["answers"] if a["is_correct"]]

    # Q4: TRUE_FALSE
    q4_res = client.post(f"/api/tests/{test_id}/questions", headers=teacher_headers, json={
        "text": "Нормализация базы данных снижает избыточность хранимой информации.",
        "question_type": "TRUE_FALSE",
        "difficulty": "EASY",
        "points": 1,
        "answers": [
            {"text": "Верно", "is_correct": True},
            {"text": "Неверно", "is_correct": False}
        ]
    })
    assert q4_res.status_code == 201
    q4_id = q4_res.json()["id"]
    correct_a4_id = [a["id"] for a in q4_res.json()["answers"] if a["is_correct"]][0]

    # Q5: SINGLE_CHOICE
    q5_res = client.post(f"/api/tests/{test_id}/questions", headers=teacher_headers, json={
        "text": "Для чего предназначен внешний ключ (Foreign Key)?",
        "question_type": "SINGLE_CHOICE",
        "difficulty": "MEDIUM",
        "points": 2,
        "answers": [
            {"text": "Для связи строк двух таблиц", "is_correct": True},
            {"text": "Для шифрования паролей", "is_correct": False},
            {"text": "Для архивации базы", "is_correct": False},
            {"text": "Для вывода графиков", "is_correct": False}
        ]
    })
    assert q5_res.status_code == 201
    q5_id = q5_res.json()["id"]
    correct_a5_id = [a["id"] for a in q5_res.json()["answers"] if a["is_correct"]][0]

    print("\n--- 7. Publishing Test & Room Code Generation ---")
    pub_res = client.post(f"/api/tests/{test_id}/publish", headers=teacher_headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "PUBLISHED"
    room_code = pub_res.json()["room_code"]
    assert room_code is not None and len(room_code) >= 6
    print(f"Generated Room Code: {room_code}")

    print("\n--- 8. Student Registration and Room Code Entry ---")
    reg_student = client.post("/api/auth/register", json={
        "email": "student_petrov@university.ru",
        "password": "studentpassword123",
        "full_name": "Петров Петр Сергеевич",
        "role": "STUDENT"
    })
    assert reg_student.status_code == 201
    student_token = reg_student.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Join room by code
    join_res = client.post(f"/api/rooms/{room_code}/join", headers=student_headers)
    assert join_res.status_code == 200
    assert join_res.json()["test_id"] == test_id
    assert join_res.json()["question_count"] == 5

    print("\n--- 9. Student Starts Attempt ---")
    start_res = client.post(f"/api/tests/{test_id}/attempts", headers=student_headers)
    assert start_res.status_code == 201
    attempt_data = start_res.json()
    attempt_id = attempt_data["id"]
    assert attempt_data["remaining_seconds"] > 0
    assert len(attempt_data["questions"]) == 5

    # Verify security: questions do NOT contain 'is_correct' field
    for q in attempt_data["questions"]:
        for a in q["answers"]:
            assert "is_correct" not in a

    print("\n--- 10. Student Answers Questions ---")
    # Q1: Correct
    client.post(f"/api/attempts/{attempt_id}/answer", headers=student_headers, json={
        "question_id": q1_id,
        "answer_ids": [correct_a1_id]
    })
    # Q2: Correct
    client.post(f"/api/attempts/{attempt_id}/answer", headers=student_headers, json={
        "question_id": q2_id,
        "answer_ids": [correct_a2_id]
    })
    # Q3: Correct (multiple choice)
    client.post(f"/api/attempts/{attempt_id}/answer", headers=student_headers, json={
        "question_id": q3_id,
        "answer_ids": correct_a3_ids
    })
    # Q4: Correct (true/false)
    client.post(f"/api/attempts/{attempt_id}/answer", headers=student_headers, json={
        "question_id": q4_id,
        "answer_ids": [correct_a4_id]
    })
    # Q5: Intentionally INCORRECT answer for stats testing
    incorrect_a5_id = [a["id"] for a in q5_res.json()["answers"] if not a["is_correct"]][0]
    client.post(f"/api/attempts/{attempt_id}/answer", headers=student_headers, json={
        "question_id": q5_id,
        "answer_ids": [incorrect_a5_id]
    })

    print("\n--- 11. Student Finishes Test & Automatic Grading ---")
    finish_res = client.post(f"/api/attempts/{attempt_id}/finish", headers=student_headers)
    assert finish_res.status_code == 200
    result_data = finish_res.json()
    # Total points: 1 + 2 + 2 + 1 + 2 = 8
    # Earned: 1 + 2 + 2 + 1 + 0 = 6 points
    assert result_data["score"] == 6.0
    assert result_data["total_points"] == 8
    assert result_data["correct_count"] == 4
    assert result_data["percentage"] == 75.0
    assert result_data["status"] == "COMPLETED"
    print(f"Student Score: {result_data['score']}/{result_data['total_points']} ({result_data['percentage']}%)")

    # Anti-cheat check: Student cannot start a second attempt
    second_attempt = client.post(f"/api/tests/{test_id}/attempts", headers=student_headers)
    assert second_attempt.status_code == 400

    print("\n--- 12. Teacher Inspects Results and Analytics ---")
    results_res = client.get(f"/api/tests/{test_id}/results", headers=teacher_headers)
    assert results_res.status_code == 200
    res_json = results_res.json()
    assert res_json["total_attempts"] == 1
    assert res_json["average_score"] == 6.0
    assert res_json["highest_score"] == 6.0
    assert len(res_json["attempts"]) == 1
    assert res_json["attempts"][0]["student_name"] == "Петров Петр Сергеевич"

    print("\n--- 13. Teacher Inspects Per-Question Statistics ---")
    stats_res = client.get(f"/api/tests/{test_id}/statistics", headers=teacher_headers)
    assert stats_res.status_code == 200
    stats_json = stats_res.json()
    assert stats_json["total_students"] == 1
    assert len(stats_json["questions"]) == 5

    # Check that Q1, Q2, Q3, Q4 were 100% correct, Q5 was 0% correct
    q5_stat = next(q for q in stats_json["questions"] if q["question_id"] == q5_id)
    assert q5_stat["correct_percentage"] == 0.0
    assert q5_stat["incorrect_percentage"] == 100.0

    print("\n--- 14. Teacher Dashboard Metrics ---")
    dash_res = client.get("/api/teacher/dashboard-stats", headers=teacher_headers)
    assert dash_res.status_code == 200
    dash_json = dash_res.json()
    assert dash_json["total_tests"] >= 1
    assert dash_json["active_tests"] >= 1
    assert dash_json["unique_students"] == 1
    assert dash_json["completed_attempts"] == 1

    print("\nSUCCESS: All End-to-End Test Steps Passed Successfully!")

if __name__ == "__main__":
    setup_module()
    try:
        test_full_quizforge_lifecycle()
    finally:
        teardown_module()
