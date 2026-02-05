"""
Seed script to populate questions from JSON file.
Run this after setting up the database.
"""
import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import Question


def load_questions_from_json(json_path: str = None):
    """Load questions from JSON file"""
    if json_path is None:
        json_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "questions.json"
        )
    
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def seed_questions():
    """Seed database with questions from JSON"""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if questions already exist
        existing_count = db.query(Question).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} questions. Skipping seed.")
            return
        
        questions_data = load_questions_from_json()
        
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
        
        db.commit()
        print(f"Successfully seeded {len(questions_data)} questions!")
        
    except FileNotFoundError:
        print("Error: questions.json not found. Please create the file first.")
    except json.JSONDecodeError as e:
        print(f"Error parsing questions.json: {e}")
    except Exception as e:
        print(f"Error seeding questions: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_questions()
