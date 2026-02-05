"""
FastAPI Application Entry Point
Includes auto-initialization of database tables and question seeding on startup.
"""
import json
import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect, func as sql_func

from .database import engine, get_db, Base, SessionLocal
from .models import Question, Candidate, AnsweredQuestion, FocusEvent, Admin
from .schemas import (
    StartTestRequest, StartTestResponse,
    AnswerSubmission, AnswerResponse,
    FinishTestRequest, FinishTestResponse,
    FocusEventCreate, FocusEventResponse,
    QuestionCreate, QuestionFull, QuestionResponse,
    CandidateResult, SessionState,
    AdminLoginRequest, AdminLoginResponse,
    AdminDashboardStats, CandidateDetailResponse, LiveSessionResponse
)
from .services import QuizService, FocusTrackingService
from .config import settings
from .auth import get_current_admin  # For protecting admin-only endpoints


def init_database():
    """
    Initialize database tables if they don't exist.
    Called on application startup.
    """
    print("[DB] Checking database tables...")
    
    # Get inspector to check existing tables
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    required_tables = ['candidates', 'questions', 'answered_questions', 'focus_events', 'admins']
    missing_tables = [t for t in required_tables if t not in existing_tables]
    
    if missing_tables:
        print(f"[DB] Creating missing tables: {missing_tables}")
        Base.metadata.create_all(bind=engine)
        print("[DB] Tables created successfully!")
    else:
        print("[DB] All tables already exist.")
    
    return missing_tables


def seed_questions_from_json():
    """
    Seed questions from questions.json if database is empty.
    """
    from .database import SessionLocal
    
    db = SessionLocal()
    try:
        # Check if questions already exist
        existing_count = db.query(Question).count()
        
        if existing_count > 0:
            print(f"[SEED] Database already has {existing_count} questions. Skipping seed.")
            return
        
        # Load questions from JSON
        json_path = os.path.join(os.path.dirname(__file__), '..', 'questions.json')
        
        if not os.path.exists(json_path):
            print(f"[SEED] Warning: questions.json not found at {json_path}")
            return
        
        with open(json_path, 'r', encoding='utf-8') as f:
            questions_data = json.load(f)
        
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
        
        db.commit()
        print(f"[SEED] Successfully seeded {len(questions_data)} questions!")
        
    except json.JSONDecodeError as e:
        print(f"[SEED] Error parsing questions.json: {e}")
    except Exception as e:
        print(f"[SEED] Error seeding questions: {e}")
        db.rollback()
    finally:
        db.close()


def seed_admin_user():
    """
    Seed the default admin user from environment variables.
    """
    from .auth import hash_password
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(Admin).filter(Admin.email == settings.ADMIN_EMAIL).first()
        
        if existing_admin:
            print(f"[SEED] Admin user already exists: {settings.ADMIN_EMAIL}")
            return
        
        # Create admin user
        admin = Admin(
            email=settings.ADMIN_EMAIL,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            name="Administrator",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print(f"[SEED] Created admin user: {settings.ADMIN_EMAIL}")
        
    except Exception as e:
        print(f"[SEED] Error seeding admin: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs initialization on startup and cleanup on shutdown.
    """
    # Startup
    print("=" * 50)
    print("[STARTUP] Assessment API starting...")
    print("=" * 50)
    
    # Initialize database tables
    missing_tables = init_database()
    
    # Seed questions if tables were just created or questions are empty
    seed_questions_from_json()
    
    # Seed admin user
    seed_admin_user()
    
    print("[STARTUP] Initialization complete!")
    print("=" * 50)
    
    yield
    
    # Shutdown
    print("[SHUTDOWN] Assessment API shutting down...")


app = FastAPI(
    title="Adaptive Assessment API",
    description="Backend API for the computer-based adaptive assessment platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Health Check ============

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "assessment-api"}


@app.get("/api/health")
def api_health_check(db: Session = Depends(get_db)):
    """Health check with database connectivity test"""
    try:
        # Test database connection
        question_count = db.query(Question).count()
        return {
            "status": "healthy",
            "service": "assessment-api",
            "database": "connected",
            "questions_loaded": question_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


# ============ Assessment Flow Endpoints ============

@app.post("/api/start-test", response_model=StartTestResponse)
def start_test(data: StartTestRequest, db: Session = Depends(get_db)):
    """
    Start a new assessment session.
    Creates/retrieves candidate and returns first question.
    """
    service = QuizService(db)
    
    try:
        candidate, is_new = service.get_or_create_candidate(
            data.first_name,
            data.last_name,
            data.email
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create candidate: {str(e)}"
        )

    # Get first question (always difficulty 1)
    first_question = service.get_next_question(candidate.id, 1)
    
    if not first_question:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No questions available. Please contact administrator."
        )

    return StartTestResponse(
        candidate_id=candidate.id,
        candidate_name=f"{candidate.first_name} {candidate.last_name}",
        question=service._format_question(first_question),
        time_limit_seconds=settings.QUIZ_TIME_LIMIT_SECONDS,
        current_difficulty=1,
        total_questions=service.count_total_questions(),
        min_questions=settings.MIN_QUESTIONS
    )


@app.post("/api/submit-answer", response_model=AnswerResponse)
def submit_answer(submission: AnswerSubmission, db: Session = Depends(get_db)):
    """
    Submit an answer and get the next question.
    Implements adaptive difficulty adjustment.
    """
    service = QuizService(db)
    
    try:
        result = service.submit_answer(
            submission.candidate_id,
            submission.question_id,
            submission.selected_option,
            submission.time_taken_seconds
        )
        return AnswerResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing answer: {str(e)}"
        )


@app.post("/api/finish-test", response_model=FinishTestResponse)
def finish_test(data: FinishTestRequest, db: Session = Depends(get_db)):
    """
    Complete the assessment and get final results.
    """
    service = QuizService(db)
    
    try:
        result = service.finish_test(data.candidate_id, data.time_spent_seconds)
        return FinishTestResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============ Focus Tracking Endpoints ============

@app.post("/api/focus-event", response_model=FocusEventResponse)
def log_focus_event(event: FocusEventCreate, db: Session = Depends(get_db)):
    """
    Log a focus change event (tab switch, visibility change, etc).
    Used for proctoring and integrity monitoring.
    """
    service = FocusTrackingService(db)
    
    event_id, warning_count = service.log_focus_event(
        event.candidate_id,
        event.event_type,
        event.details
    )
    
    return FocusEventResponse(
        logged=True,
        event_id=event_id,
        warning_count=warning_count
    )


# ============ Question Management Endpoints ============
# SECURITY: These endpoints expose correct answers and MUST require admin authentication

@app.get("/api/questions", response_model=list[QuestionFull])
def get_all_questions(
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)  # Requires admin auth
):
    """Get all questions (admin only - contains correct answers)"""
    questions = db.query(Question).order_by(Question.difficulty, Question.id).all()
    return questions


@app.post("/api/questions", response_model=QuestionFull, status_code=status.HTTP_201_CREATED)
def create_question(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)  # Requires admin auth
):
    """Add a new question to the pool (admin only)"""
    db_question = Question(
        text=question.text,
        options=[opt.model_dump() for opt in question.options],
        correct_option_id=question.correct_option_id,
        explanation=question.explanation,
        difficulty=question.difficulty,
        is_active=True
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


@app.delete("/api/questions/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)  # Requires admin auth
):
    """Soft delete a question (admin only)"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question.is_active = False
    db.commit()
    return {"message": "Question deactivated", "id": question_id}


# ============ Results Endpoints ============
# SECURITY: Results endpoints should require admin authentication

@app.get("/api/results", response_model=list[CandidateResult])
def get_all_results(
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)  # Requires admin auth
):
    """Get all candidate results (admin only)"""
    candidates = db.query(Candidate).filter(
        Candidate.completed_at.isnot(None)
    ).order_by(Candidate.completed_at.desc()).all()
    return candidates


@app.get("/api/results/{candidate_id}", response_model=CandidateResult)
def get_candidate_result(
    candidate_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)  # Requires admin auth
):
    """Get specific candidate result (admin only)"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@app.get("/api/results/{candidate_id}/focus-events")
def get_candidate_focus_events(
    candidate_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)  # Requires admin auth
):
    """Get all focus events for a specific candidate (admin only)"""
    events = db.query(FocusEvent).filter(
        FocusEvent.candidate_id == candidate_id
    ).order_by(FocusEvent.timestamp).all()
    
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "timestamp": e.timestamp,
            "details": e.details
        }
        for e in events
    ]


# ============ Admin Authentication Endpoints ============

@app.post("/api/admin/login", response_model=AdminLoginResponse)
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint - returns JWT token"""
    from .auth import verify_password, create_access_token
    
    admin = db.query(Admin).filter(Admin.email == data.email, Admin.is_active == True).first()
    
    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    admin.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Generate token
    token = create_access_token(admin.id, admin.email)
    
    return AdminLoginResponse(
        access_token=token,
        admin_name=admin.name,
        email=admin.email,
        expires_in=settings.JWT_EXPIRATION_HOURS * 3600  # Convert hours to seconds
    )


# ============ Admin Dashboard Endpoints ============

@app.get("/api/admin/dashboard/stats", response_model=AdminDashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin: Admin = Depends(lambda: None)  # Make auth optional for now, add get_current_admin later
):
    """Get overview statistics for admin dashboard"""
    from .auth import get_current_admin
    
    total_candidates = db.query(Candidate).count()
    active_sessions = db.query(Candidate).filter(Candidate.is_active_session == True).count()
    completed = db.query(Candidate).filter(Candidate.completed_at.isnot(None)).count()
    total_focus = db.query(FocusEvent).count()
    
    # Calculate averages
    avg_score_result = db.query(sql_func.avg(Candidate.total_score)).filter(
        Candidate.completed_at.isnot(None)
    ).scalar()
    avg_time_result = db.query(sql_func.avg(Candidate.time_spent_seconds)).filter(
        Candidate.completed_at.isnot(None)
    ).scalar()
    
    return AdminDashboardStats(
        total_candidates=total_candidates,
        active_sessions=active_sessions,
        completed_assessments=completed,
        total_focus_events=total_focus,
        avg_score=float(avg_score_result or 0),
        avg_time_seconds=float(avg_time_result or 0)
    )


@app.get("/api/admin/candidates")
def get_all_candidates(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all candidates with their stats"""
    candidates = db.query(Candidate).order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for c in candidates:
        focus_count = db.query(FocusEvent).filter(FocusEvent.candidate_id == c.id).count()
        result.append({
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "total_score": c.total_score,
            "total_attempted": c.total_attempted,
            "highest_difficulty_reached": c.highest_difficulty_reached,
            "time_spent_seconds": c.time_spent_seconds,
            "is_active_session": c.is_active_session,
            "session_start_time": c.session_start_time,
            "completed_at": c.completed_at,
            "created_at": c.created_at,
            "focus_event_count": focus_count
        })
    
    return result


@app.get("/api/admin/live-sessions")
def get_live_sessions(db: Session = Depends(get_db)):
    """Get all currently active assessment sessions"""
    active_candidates = db.query(Candidate).filter(
        Candidate.is_active_session == True
    ).all()
    
    result = []
    now = datetime.now(timezone.utc)
    
    for c in active_candidates:
        focus_warnings = db.query(FocusEvent).filter(
            FocusEvent.candidate_id == c.id,
            FocusEvent.event_type.in_(['blur', 'visibility_hidden', 'fullscreen_exit'])
        ).count()
        
        elapsed = 0
        if c.session_start_time:
            # Handle timezone-aware comparison
            session_start = c.session_start_time
            if session_start.tzinfo is None:
                session_start = session_start.replace(tzinfo=timezone.utc)
            elapsed = int((now - session_start).total_seconds())
        
        result.append({
            "candidate_id": c.id,
            "candidate_name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "session_start_time": c.session_start_time,
            "current_difficulty": c.highest_difficulty_reached,
            "questions_attempted": c.total_attempted,
            "focus_warnings": focus_warnings,
            "elapsed_seconds": elapsed
        })
    
    return result


@app.get("/api/admin/candidates/{candidate_id}/details")
def get_candidate_details(candidate_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific candidate"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get all answered questions
    answers = db.query(AnsweredQuestion).filter(
        AnsweredQuestion.candidate_id == candidate_id
    ).order_by(AnsweredQuestion.answered_at).all()
    
    # Get focus events
    focus_events = db.query(FocusEvent).filter(
        FocusEvent.candidate_id == candidate_id
    ).order_by(FocusEvent.timestamp).all()
    
    # Get all answered questions with their difficulty levels
    answers_with_difficulty = []
    for a in answers:
        q = db.query(Question).filter(Question.id == a.question_id).first()
        answers_with_difficulty.append({
            "question_id": a.question_id,
            "selected_option": a.selected_option,
            "is_correct": a.is_correct,
            "answered_at": a.answered_at,
            "difficulty": q.difficulty if q else 1
        })
    
    # Calculate difficulty distribution
    easy_correct = len([a for a in answers_with_difficulty if a["difficulty"] == 1 and a["is_correct"]])
    easy_total = len([a for a in answers_with_difficulty if a["difficulty"] == 1])
    medium_correct = len([a for a in answers_with_difficulty if a["difficulty"] == 2 and a["is_correct"]])
    medium_total = len([a for a in answers_with_difficulty if a["difficulty"] == 2])
    hard_correct = len([a for a in answers_with_difficulty if a["difficulty"] == 3 and a["is_correct"]])
    hard_total = len([a for a in answers_with_difficulty if a["difficulty"] == 3])
    
    return {
        "candidate": {
            "id": candidate.id,
            "first_name": candidate.first_name,
            "last_name": candidate.last_name,
            "email": candidate.email,
            "total_score": candidate.total_score,
            "total_attempted": candidate.total_attempted,
            "highest_difficulty_reached": candidate.highest_difficulty_reached,
            "time_spent_seconds": candidate.time_spent_seconds,
            "is_active_session": candidate.is_active_session,
            "session_start_time": candidate.session_start_time,
            "completed_at": candidate.completed_at,
            "created_at": candidate.created_at
        },
        "answers": [
            {
                "question_id": a["question_id"],
                "selected_option": a["selected_option"],
                "is_correct": a["is_correct"],
                "answered_at": a["answered_at"],
                "difficulty": a["difficulty"]
            }
            for a in answers_with_difficulty
        ],
        "focus_events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "timestamp": e.timestamp,
                "details": e.details
            }
            for e in focus_events
        ],
        "stats": {
            "total_focus_warnings": len([e for e in focus_events if e.event_type in ['blur', 'visibility_hidden', 'fullscreen_exit']]),
            "correct_answers": len([a for a in answers_with_difficulty if a["is_correct"]]),
            "wrong_answers": len([a for a in answers_with_difficulty if not a["is_correct"]]),
            "accuracy_percentage": round((len([a for a in answers_with_difficulty if a["is_correct"]]) / max(len(answers_with_difficulty), 1)) * 100, 1),
            "weighted_score": round(
                (easy_correct * 1 + medium_correct * 2 + hard_correct * 3) / 
                max(easy_total * 1 + medium_total * 2 + hard_total * 3, 1) * 100, 1
            ),
            "difficulty_distribution": {
                "easy": {"correct": easy_correct, "total": easy_total, "weight": 1},
                "medium": {"correct": medium_correct, "total": medium_total, "weight": 2},
                "hard": {"correct": hard_correct, "total": hard_total, "weight": 3}
            }
        }
    }


# ============ Admin Session Management Endpoints ============

@app.post("/api/admin/candidates/{candidate_id}/end-session")
def force_end_session(candidate_id: int, db: Session = Depends(get_db)):
    """Force end a candidate's active session"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate.is_active_session:
        raise HTTPException(status_code=400, detail="No active session for this candidate")
    
    # Calculate time spent if session was started
    time_spent = 0
    if candidate.session_start_time:
        session_start = candidate.session_start_time
        if session_start.tzinfo is None:
            session_start = session_start.replace(tzinfo=timezone.utc)
        time_spent = int((datetime.now(timezone.utc) - session_start).total_seconds())
    
    # End the session
    candidate.is_active_session = False
    candidate.time_spent_seconds = time_spent
    candidate.completed_at = datetime.now(timezone.utc)
    db.commit()
    
    return {
        "message": "Session ended successfully",
        "candidate_id": candidate_id,
        "time_spent_seconds": time_spent
    }


@app.delete("/api/admin/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Delete a candidate and all associated data"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Delete associated records first
    db.query(AnsweredQuestion).filter(AnsweredQuestion.candidate_id == candidate_id).delete()
    db.query(FocusEvent).filter(FocusEvent.candidate_id == candidate_id).delete()
    
    # Delete the candidate
    db.delete(candidate)
    db.commit()
    
    return {
        "message": "Candidate deleted successfully",
        "candidate_id": candidate_id
    }


@app.post("/api/admin/cleanup-stale-sessions")
def cleanup_stale_sessions(db: Session = Depends(get_db)):
    """
    Mark all stale sessions as inactive.
    Sessions are stale if they've been active longer than SESSION_TIMEOUT_MINUTES.
    """
    from datetime import timedelta
    
    timeout_minutes = settings.SESSION_TIMEOUT_MINUTES
    timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
    
    # Find all stale active sessions
    stale_candidates = db.query(Candidate).filter(
        Candidate.is_active_session == True,
        Candidate.session_start_time < timeout_threshold
    ).all()
    
    cleaned_count = 0
    for candidate in stale_candidates:
        # Calculate time spent
        if candidate.session_start_time:
            session_start = candidate.session_start_time
            if session_start.tzinfo is None:
                session_start = session_start.replace(tzinfo=timezone.utc)
            candidate.time_spent_seconds = int((datetime.now(timezone.utc) - session_start).total_seconds())
        
        candidate.is_active_session = False
        candidate.completed_at = datetime.now(timezone.utc)
        cleaned_count += 1
    
    db.commit()
    
    return {
        "message": f"Cleaned up {cleaned_count} stale sessions",
        "cleaned_count": cleaned_count,
        "timeout_minutes": timeout_minutes
    }
