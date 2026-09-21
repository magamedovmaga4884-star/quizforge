import re
import json
import logging
from typing import Optional
from pydantic import ValidationError
from app.schemas.ai import AIGeneratedQuiz

logger = logging.getLogger(__name__)

def extract_json_from_text(raw_text: str) -> Optional[dict]:
    """
    Extracts json dict from LLM raw text output, stripping markdown fences or preamble.
    """
    cleaned = raw_text.strip()
    
    # Check for markdown code fence ```json ... ``` or ``` ... ```
    fence_pattern = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)
    match = fence_pattern.search(cleaned)
    if match:
        cleaned = match.group(1).strip()
    
    # Find first { and last }
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_str = cleaned[first_brace:last_brace + 1]
    else:
        json_str = cleaned

    try:
        data = json.loads(json_str)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError as e:
        logger.warning(f"Failed direct json decode: {e}. Trying secondary cleanup.")

    # Secondary cleanup: fix common trailing commas
    try:
        fixed_str = re.sub(r",\s*([\]}])", r"\1", json_str)
        data = json.loads(fixed_str)
        if isinstance(data, dict):
            return data
    except Exception as e:
        logger.warning(f"Failed secondary json decode: {e}")

    return None

def parse_and_validate_quiz(raw_text: str) -> tuple[bool, Optional[AIGeneratedQuiz], str]:
    """
    Validates parsed json with Pydantic.
    Returns: (is_valid: bool, quiz_object: Optional[AIGeneratedQuiz], error_message: str)
    """
    data = extract_json_from_text(raw_text)
    if not data:
        return False, None, "Не удалось извлечь корректный JSON из ответа нейросети."

    # If key is not 'questions' but a list was returned or top-level key varies
    if "questions" not in data and isinstance(data.get("items"), list):
        data["questions"] = data.pop("items")

    try:
        quiz = AIGeneratedQuiz.model_validate(data)
    except ValidationError as e:
        logger.error(f"Pydantic validation error: {e}")
        return False, None, f"Ошибка валидации структуры вопросов: {e.errors()[0]['msg']}"

    if not quiz.questions:
        return False, None, "Сгенерированный список вопросов пуст."

    # Post-validation checks: ensure each question has at least 2 answers and at least 1 correct
    for i, q in enumerate(quiz.questions, 1):
        if len(q.answers) < 2:
            return False, None, f"В вопросе {i} менее двух вариантов ответа."
        has_correct = any(a.is_correct for a in q.answers)
        if not has_correct:
            # Fallback: mark the first answer as correct if none marked
            q.answers[0].is_correct = True

    return True, quiz, ""
