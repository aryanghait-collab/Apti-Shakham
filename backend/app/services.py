"""
Business Logic Services
Contains all quiz logic - adaptive difficulty, question selection, scoring
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List, Tuple
from datetime import datetime, timezone

from .models import Candidate, Question, AnsweredQuestion, FocusEvent
from .schemas import QuestionResponse, OptionSchema
from .config import settings


class QuizService:
    """
    Core quiz logic service.
    Handles adaptive difficulty, question selection, and scoring.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_candidate(
        self, 
        first_name: str, 
        last_name: str, 
        email: str
    ) -> Tuple[Candidate, bool]:
        """
        Get existing candidate or create new one.
        Returns tuple of (candidate, is_new).
        """
        candidate = self.db.query(Candidate).filter(
            Candidate.email == email
        ).first()

        if candidate:
            # Reset session for existing candidate
            candidate.is_active_session = True
            candidate.session_start_time = datetime.now(timezone.utc)
            candidate.total_score = 0
            candidate.total_attempted = 0
            candidate.highest_difficulty_reached = 1
            candidate.floor_level = 1  # Reset floor level for new session
            candidate.completed_at = None
            
            # Clear previous answered questions
            self.db.query(AnsweredQuestion).filter(
                AnsweredQuestion.candidate_id == candidate.id
            ).delete()
            
            self.db.commit()
            return candidate, False

        # Create new candidate
        candidate = Candidate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            is_active_session=True,
            session_start_time=datetime.now(timezone.utc)
        )
        self.db.add(candidate)
        self.db.commit()
        self.db.refresh(candidate)
        
        return candidate, True

    def get_next_question(
        self, 
        candidate_id: int, 
        difficulty: int
    ) -> Optional[Question]:
        """
        Get next question based on difficulty.
        Excludes already answered questions.
        Falls back to other difficulties if current level is exhausted.
        """
        # Get IDs of already answered questions
        answered_ids = self.db.query(AnsweredQuestion.question_id).filter(
            AnsweredQuestion.candidate_id == candidate_id
        ).all()
        answered_ids = [q[0] for q in answered_ids]

        # Clamp difficulty to valid range
        difficulty = max(settings.MIN_DIFFICULTY, min(difficulty, settings.MAX_DIFFICULTY))

        # Try to get question at current difficulty
        query = self.db.query(Question).filter(
            Question.difficulty == difficulty,
            Question.is_active == True
        )
        if answered_ids:
            query = query.filter(~Question.id.in_(answered_ids))
        
        question = query.order_by(func.random()).first()

        if question:
            return question

        # Fallback: try other difficulties
        for offset in [1, -1, 2, -2]:
            new_diff = difficulty + offset
            if settings.MIN_DIFFICULTY <= new_diff <= settings.MAX_DIFFICULTY:
                query = self.db.query(Question).filter(
                    Question.difficulty == new_diff,
                    Question.is_active == True
                )
                if answered_ids:
                    query = query.filter(~Question.id.in_(answered_ids))
                
                question = query.order_by(func.random()).first()
                if question:
                    return question

        # Last resort: any unanswered question
        query = self.db.query(Question).filter(Question.is_active == True)
        if answered_ids:
            query = query.filter(~Question.id.in_(answered_ids))
        return query.order_by(func.random()).first()

    def count_total_questions(self) -> int:
        """Count total active questions in the pool."""
        return self.db.query(Question).filter(Question.is_active == True).count()

    def count_remaining_questions(self, candidate_id: int) -> int:
        """
        Count how many questions the candidate can still answer.
        """
        # Get IDs of already answered questions
        answered_ids = self.db.query(AnsweredQuestion.question_id).filter(
            AnsweredQuestion.candidate_id == candidate_id
        ).all()
        answered_ids = [q[0] for q in answered_ids]

        # Count unanswered active questions
        query = self.db.query(Question).filter(Question.is_active == True)
        if answered_ids:
            query = query.filter(~Question.id.in_(answered_ids))
        return query.count()

    def calculate_next_difficulty(
        self, 
        candidate_id: int,
        current_difficulty: int,
        floor_level: int,
        is_correct: bool,
        time_taken_seconds: int
    ) -> int:
        """
        Calculate next difficulty based on correctness AND time taken.
        
        Rules:
        - Once you advance to a new level, you cannot go back (floor_level enforced)
        - Fast + Correct answers accelerate advancement
        - Time thresholds: <15s = very fast, <30s = fast
        
        Advancement criteria:
        - 3 consecutive correct answers at any speed → advance
        - 2 fast correct answers (<30s each) → advance
        - 1 very fast correct answer (<15s) + 1 correct → advance
        
        The function never returns below floor_level.
        """
        # Get recent answers with time info (most recent first)
        recent_answers = self.db.query(AnsweredQuestion).filter(
            AnsweredQuestion.candidate_id == candidate_id
        ).order_by(AnsweredQuestion.answered_at.desc()).limit(4).all()
        
        # Build streak including current answer (with time info)
        # Each entry: (is_correct, time_taken, difficulty)
        current_answer = {
            "is_correct": is_correct, 
            "time_taken": time_taken_seconds
        }
        
        answers = [current_answer]
        for answer in recent_answers:
            answers.append({
                "is_correct": answer.is_correct,
                "time_taken": answer.time_taken_seconds or 60  # Default to 60 if not set
            })
        
        # Check for advancement conditions
        should_advance = False
        
        # Condition 1: 5 consecutive correct answers
        correct_streak = 0
        for a in answers:
            if a["is_correct"]:
                correct_streak += 1
            else:
                break
        if correct_streak >= settings.CONSECUTIVE_CORRECT_TO_ADVANCE:
            should_advance = True
        
        # Condition 2: 5 fast (<30s) and correct answers in a row
        fast_correct_streak = 0
        for a in answers:
            if a["is_correct"] and a["time_taken"] < settings.FAST_ANSWER_THRESHOLD_SECONDS:
                fast_correct_streak += 1
            else:
                break
        if fast_correct_streak >= settings.FAST_CORRECT_TO_ADVANCE:
            should_advance = True
        
        # Condition 3: 3 very fast (<15s) correct answers in a row
        very_fast_correct_streak = 0
        for a in answers:
            if a["is_correct"] and a["time_taken"] < settings.VERY_FAST_ANSWER_THRESHOLD_SECONDS:
                very_fast_correct_streak += 1
            else:
                break
        if very_fast_correct_streak >= settings.VERY_FAST_CORRECT_TO_ADVANCE:
            should_advance = True
        
        # Calculate next difficulty
        if should_advance:
            next_difficulty = min(current_difficulty + 1, settings.MAX_DIFFICULTY)
        else:
            # Stay at current level (no going back ever)
            next_difficulty = current_difficulty
        
        # CRITICAL: Never go below floor level
        next_difficulty = max(next_difficulty, floor_level)
        
        return next_difficulty

    def submit_answer(
        self, 
        candidate_id: int, 
        question_id: int, 
        selected_option: str,
        time_taken_seconds: int
    ) -> dict:
        """
        Process answer submission.
        Returns result with next question and updated state.
        
        Now includes time_taken_seconds for adaptive difficulty calculation.
        """
        candidate = self.db.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()
        
        if not candidate:
            raise ValueError("Candidate not found")
        
        if not candidate.is_active_session:
            raise ValueError("Session not active")

        question = self.db.query(Question).filter(
            Question.id == question_id
        ).first()
        
        if not question:
            raise ValueError("Question not found")

        # Check if correct (internal only)
        is_correct = selected_option == question.correct_option_id

        # Record answer with time taken
        answered = AnsweredQuestion(
            candidate_id=candidate_id,
            question_id=question_id,
            selected_option=selected_option,
            is_correct=is_correct,
            time_taken_seconds=time_taken_seconds
        )
        self.db.add(answered)

        # Update candidate stats
        candidate.total_attempted += 1
        if is_correct:
            candidate.total_score += 1

        # Calculate next difficulty with time consideration
        current_difficulty = question.difficulty
        floor_level = candidate.floor_level  # Get current floor level
        
        next_difficulty = self.calculate_next_difficulty(
            candidate_id, 
            current_difficulty, 
            floor_level,
            is_correct,
            time_taken_seconds
        )
        
        # Update floor level if we've advanced
        if next_difficulty > candidate.floor_level:
            candidate.floor_level = next_difficulty
            floor_level = next_difficulty
        
        # Update highest difficulty reached
        if next_difficulty > candidate.highest_difficulty_reached:
            candidate.highest_difficulty_reached = next_difficulty

        self.db.commit()

        # Get next question at the current difficulty (respecting floor)
        next_question = self.get_next_question(candidate_id, next_difficulty)
        
        can_finish = candidate.total_attempted >= settings.MIN_QUESTIONS
        
        # Count remaining unanswered questions
        questions_remaining = self.count_remaining_questions(candidate_id)
        is_last_question = next_question is None

        return {
            "is_correct": None,
            "correct_option_id": None,
            "explanation": None,
            "current_score": candidate.total_attempted,
            "total_attempted": candidate.total_attempted,
            "next_question": self._format_question(next_question) if next_question else None,
            "current_difficulty": next_difficulty,
            "floor_level": floor_level,
            "can_finish": can_finish,
            "message": f"{settings.MIN_QUESTIONS - candidate.total_attempted} more to go" if not can_finish else "You can finish now",
            "questions_remaining": questions_remaining,
            "is_last_question": is_last_question
        }

    def finish_test(self, candidate_id: int, time_spent_seconds: int) -> dict:
        """Complete the assessment and finalize results with weighted scoring."""
        candidate = self.db.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()

        if not candidate:
            raise ValueError("Candidate not found")

        candidate.is_active_session = False
        candidate.time_spent_seconds = time_spent_seconds
        candidate.completed_at = datetime.now(timezone.utc)
        
        self.db.commit()

        # Calculate weighted score based on difficulty
        weighted_score_data = self.calculate_weighted_score(candidate_id)
        
        percentage = (candidate.total_score / candidate.total_attempted * 100) if candidate.total_attempted > 0 else 0

        return {
            "score": candidate.total_score,
            "total_attempted": candidate.total_attempted,
            "highest_difficulty_reached": candidate.highest_difficulty_reached,
            "percentage": round(percentage, 1),
            "weighted_score": weighted_score_data["weighted_score"],
            "difficulty_breakdown": weighted_score_data["breakdown"],
            "first_name": candidate.first_name,
            "last_name": candidate.last_name,
            "message": "Assessment completed successfully!"
        }

    def calculate_weighted_score(self, candidate_id: int) -> dict:
        """
        Calculate weighted score based on difficulty levels.
        Easy = 1 point, Medium = 2 points, Hard = 3 points.
        Returns normalized score out of 100.
        """
        # Get all answers with question difficulty
        answers = self.db.query(AnsweredQuestion, Question).join(
            Question, AnsweredQuestion.question_id == Question.id
        ).filter(
            AnsweredQuestion.candidate_id == candidate_id
        ).all()

        # Count correct and total by difficulty
        easy_correct = sum(1 for a, q in answers if q.difficulty == 1 and a.is_correct)
        easy_total = sum(1 for a, q in answers if q.difficulty == 1)
        medium_correct = sum(1 for a, q in answers if q.difficulty == 2 and a.is_correct)
        medium_total = sum(1 for a, q in answers if q.difficulty == 2)
        hard_correct = sum(1 for a, q in answers if q.difficulty == 3 and a.is_correct)
        hard_total = sum(1 for a, q in answers if q.difficulty == 3)

        # Calculate weighted points
        points_earned = (
            easy_correct * settings.EASY_WEIGHT +
            medium_correct * settings.MEDIUM_WEIGHT +
            hard_correct * settings.HARD_WEIGHT
        )
        
        max_points = (
            easy_total * settings.EASY_WEIGHT +
            medium_total * settings.MEDIUM_WEIGHT +
            hard_total * settings.HARD_WEIGHT
        )

        # Normalize to 100
        weighted_score = round((points_earned / max_points * 100), 1) if max_points > 0 else 0

        return {
            "weighted_score": weighted_score,
            "points_earned": points_earned,
            "max_points": max_points,
            "breakdown": {
                "easy": {"correct": easy_correct, "total": easy_total, "weight": settings.EASY_WEIGHT},
                "medium": {"correct": medium_correct, "total": medium_total, "weight": settings.MEDIUM_WEIGHT},
                "hard": {"correct": hard_correct, "total": hard_total, "weight": settings.HARD_WEIGHT}
            }
        }

    def _format_question(self, question: Question) -> QuestionResponse:
        """Format question for frontend (without correct answer)"""
        return QuestionResponse(
            id=question.id,
            text=question.text,
            options=[OptionSchema(**opt) for opt in question.options],
            difficulty=question.difficulty
        )


class FocusTrackingService:
    """Service for tracking focus events."""

    def __init__(self, db: Session):
        self.db = db

    def log_focus_event(
        self, 
        candidate_id: int, 
        event_type: str, 
        details: Optional[str] = None
    ) -> Tuple[int, int]:
        """Log a focus event. Returns (event_id, warning_count)."""
        event = FocusEvent(
            candidate_id=candidate_id,
            event_type=event_type,
            details=details
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)

        violation_types = ['blur', 'visibility_hidden', 'fullscreen_exit']
        warning_count = self.db.query(FocusEvent).filter(
            FocusEvent.candidate_id == candidate_id,
            FocusEvent.event_type.in_(violation_types)
        ).count()

        return event.id, warning_count

    def get_focus_events(self, candidate_id: int) -> List[FocusEvent]:
        """Get all focus events for a candidate."""
        return self.db.query(FocusEvent).filter(
            FocusEvent.candidate_id == candidate_id
        ).order_by(FocusEvent.timestamp).all()
