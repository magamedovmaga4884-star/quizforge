from typing import List, Dict, Set
from app.models.question import Question, QuestionType
from app.models.answer import Answer
from app.models.attempt import AttemptAnswer

def grade_attempt(
    questions: List[Question],
    attempt_answers: List[AttemptAnswer],
) -> tuple[float, int, float, int, int]:
    """
    Computes score for an attempt.
    Returns: (score, total_points, percentage, correct_questions_count, total_questions)
    """
    total_points = sum(q.points for q in questions)
    total_questions = len(questions)

    # Map student answers by question_id -> set of chosen answer_ids
    student_answers_by_question: Dict[int, Set[int]] = {}
    for aa in attempt_answers:
        if aa.question_id not in student_answers_by_question:
            student_answers_by_question[aa.question_id] = set()
        student_answers_by_question[aa.question_id].add(aa.answer_id)

    earned_score = 0.0
    correct_count = 0

    for q in questions:
        correct_answer_ids = {a.id for a in q.answers if a.is_correct}
        chosen_ids = student_answers_by_question.get(q.id, set())

        if q.question_type in (QuestionType.SINGLE_CHOICE, QuestionType.TRUE_FALSE):
            # Must match the single correct answer
            if len(chosen_ids) == 1 and chosen_ids == correct_answer_ids:
                earned_score += q.points
                correct_count += 1
        elif q.question_type == QuestionType.MULTIPLE_CHOICE:
            # Full match of all correct answers and no incorrect ones
            if chosen_ids == correct_answer_ids and len(correct_answer_ids) > 0:
                earned_score += q.points
                correct_count += 1

    percentage = round((earned_score / total_points * 100.0), 1) if total_points > 0 else 0.0

    return earned_score, total_points, percentage, correct_count, total_questions
