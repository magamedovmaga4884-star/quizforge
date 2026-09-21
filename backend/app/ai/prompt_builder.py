from typing import Optional
from app.models.question import QuestionType, QuestionDifficulty

def build_quiz_prompt(
    subject_name: str,
    test_title: str,
    material_text: str,
    question_count: int = 5,
    difficulty: QuestionDifficulty = QuestionDifficulty.MEDIUM,
    question_type: Optional[QuestionType] = None,
    topic: Optional[str] = None,
    custom_instructions: Optional[str] = None,
) -> tuple[str, str]:
    """
    Returns (system_prompt, user_prompt)
    """
    difficulty_map = {
        QuestionDifficulty.EASY: "Базовый уровень сложности (простые термины, прямые факты)",
        QuestionDifficulty.MEDIUM: "Средний уровень сложности (понимание связей, анализ)",
        QuestionDifficulty.HARD: "Высокий уровень сложности (глубокое понимание деталей, применение)",
    }

    type_map = {
        QuestionType.SINGLE_CHOICE: "Один правильный ответ из 4 вариантов (SINGLE_CHOICE)",
        QuestionType.MULTIPLE_CHOICE: "Несколько правильных ответов из 4-5 вариантов (MULTIPLE_CHOICE)",
        QuestionType.TRUE_FALSE: "Утверждение с двумя вариантами: Правда / Ложь (TRUE_FALSE)",
    }

    type_instruction = type_map.get(
        question_type, 
        "Преимущественно SINGLE_CHOICE (один правильный вариант), допустимы MULTIPLE_CHOICE и TRUE_FALSE"
    )

    system_prompt = (
        "Ты — высококвалифицированный методист и составитель учебных тестов для университета.\n"
        "Твоя задача — составить проверочный тест строго по предоставленным учебным материалам.\n\n"
        "ВАЖНЫЕ ПРАВИЛА:\n"
        "1. Используй предоставленный учебный материал как основной и единственный источник фактов.\n"
        "2. Не добавляй неподтверждённые или вымышленные факты.\n"
        "3. Создавай вопросы только по заявленной теме.\n"
        "4. Каждый вопрос должен иметь однозначный, логичный и чёткий ответ.\n"
        "5. Для SINGLE_CHOICE ровно ОДИН вариант должен иметь is_correct: true.\n"
        "6. Для TRUE_FALSE должно быть ровно два варианта ('Правда' и 'Ложь' / 'Верно' и 'Неверно'), и ровно один is_correct: true.\n"
        "7. Для MULTIPLE_CHOICE минимум два варианта должны иметь is_correct: true.\n"
        "8. Не повторяй вопросы и варианты.\n"
        "9. Ответ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON без вступительных или заключительных слов.\n"
    )

    # Limit material text to ~12000 chars to fit within context window comfortably
    truncated_material = material_text[:12000] if material_text else "Тема: " + (topic or test_title)

    user_prompt = f"""Сформируй проверочный тест на русском языке.

Предмет: {subject_name}
Название теста: {test_title}
Тема: {topic or test_title}
Количество вопросов: {question_count}
Уровень сложности: {difficulty_map.get(difficulty, "Средний")}
Тип вопросов: {type_instruction}
{f"Дополнительные указания: {custom_instructions}" if custom_instructions else ""}

УЧЕБНЫЙ МАТЕРИАЛ:
\"\"\"
{truncated_material}
\"\"\"

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{{
  "questions": [
    {{
      "text": "Текст первого вопроса?",
      "type": "SINGLE_CHOICE",
      "answers": [
        {{"text": "Вариант А", "is_correct": false}},
        {{"text": "Вариант Б (верный)", "is_correct": true}},
        {{"text": "Вариант В", "is_correct": false}},
        {{"text": "Вариант Г", "is_correct": false}}
      ]
    }}
  ]
}}

Верни ТОЛЬКО JSON с {question_count} вопросами. Никакого дополнительного текста.
"""
    return system_prompt, user_prompt
