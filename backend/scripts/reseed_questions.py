"""
Script to clear and reseed questions from questions.json
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Question, AnsweredQuestion, FocusEvent, Candidate

def reseed_questions():
    """Clear all data and reseed questions from JSON"""
    db = SessionLocal()
    
    try:
        # Delete in order to respect foreign keys
        print("[RESEED] Clearing answered_questions...")
        db.query(AnsweredQuestion).delete()
        
        print("[RESEED] Clearing focus_events...")
        db.query(FocusEvent).delete()
        
        print("[RESEED] Clearing candidates...")
        db.query(Candidate).delete()
        
        print("[RESEED] Clearing questions...")
        db.query(Question).delete()
        
        db.commit()
        print("[RESEED] All tables cleared!")
        
        # Load questions from JSON
        json_path = os.path.join(os.path.dirname(__file__), '..', 'questions.json')
        
        with open(json_path, 'r', encoding='utf-8') as f:
            questions_data = json.load(f)
        
        # Count by difficulty
        counts = {1: 0, 2: 0, 3: 0}
        
        # Insert questions
        for q_data in questions_data:
            question = Question(
                text=q_data["text"],
                options=q_data["options"],
                correct_option_id=q_data["correct_option_id"],
                explanation=q_data.get("explanation"),
                difficulty=q_data["difficulty"],
                is_active=True
            )
            db.add(question)
            counts[q_data["difficulty"]] = counts.get(q_data["difficulty"], 0) + 1
        
        db.commit()
        
        print(f"\n[SUCCESS] Seeded {len(questions_data)} questions!")
        print(f"  Easy (1): {counts.get(1, 0)}")
        print(f"  Moderate (2): {counts.get(2, 0)}")
        print(f"  Hard (3): {counts.get(3, 0)}")
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reseed_questions()
