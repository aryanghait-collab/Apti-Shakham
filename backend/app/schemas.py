"""
Pydantic Schemas for Request/Response Validation
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ============ Candidate Schemas ============

class CandidateCreate(BaseModel):
    """Registration request schema"""
    first_name: str
    last_name: str
    email: EmailStr


class CandidateResponse(BaseModel):
    """Public candidate information"""
    id: int
    first_name: str
    last_name: str
    email: str
    is_active_session: bool

    class Config:
        from_attributes = True


class CandidateResult(BaseModel):
    """Assessment result schema"""
    id: int
    first_name: str
    last_name: str
    email: str
    total_score: int
    total_attempted: int
    highest_difficulty_reached: int
    time_spent_seconds: int
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============ Question Schemas ============

class OptionSchema(BaseModel):
    """Question option schema"""
    id: str
    text: str


class QuestionResponse(BaseModel):
    """Question sent to frontend (without correct answer)"""
    id: int
    text: str
    options: List[OptionSchema]
    difficulty: int


class QuestionCreate(BaseModel):
    """Schema for adding new questions"""
    text: str
    options: List[OptionSchema]
    correct_option_id: str
    explanation: Optional[str] = None
    difficulty: int  # 1-5


class QuestionFull(QuestionCreate):
    """Full question schema (admin view)"""
    id: int
    is_active: bool

    class Config:
        from_attributes = True


# ============ Assessment Flow Schemas ============

class StartTestRequest(BaseModel):
    """Start test request"""
    first_name: str
    last_name: str
    email: EmailStr


class StartTestResponse(BaseModel):
    """Start test response with first question"""
    candidate_id: int
    candidate_name: str
    question: QuestionResponse
    time_limit_seconds: int
    current_difficulty: int
    total_questions: int  # Total questions available in the pool
    min_questions: int  # Minimum questions required


class AnswerSubmission(BaseModel):
    """Submit answer request"""
    candidate_id: int
    question_id: int
    selected_option: str
    time_taken_seconds: int  # Time taken to answer this question


class AnswerResponse(BaseModel):
    """Answer submission response"""
    is_correct: Optional[bool]  # Hidden from candidate
    correct_option_id: Optional[str]  # Hidden from candidate
    explanation: Optional[str]  # Hidden from candidate
    current_score: int
    total_attempted: int
    next_question: Optional[QuestionResponse]
    current_difficulty: int
    floor_level: int  # Minimum difficulty level (candidate cannot go below this)
    can_finish: bool  # True after minimum questions
    message: str
    questions_remaining: int  # Number of unanswered questions remaining
    is_last_question: bool  # True if this was the last available question


class FinishTestRequest(BaseModel):
    """Finish test request"""
    candidate_id: int
    time_spent_seconds: int


class FinishTestResponse(BaseModel):
    """Final results after completing test"""
    score: int
    total_attempted: int
    highest_difficulty_reached: int
    percentage: float
    weighted_score: float  # Normalized weighted score (0-100)
    difficulty_breakdown: dict  # Easy/Medium/Hard breakdown with weights
    first_name: str
    last_name: str
    message: str


# ============ Focus Tracking Schemas ============

class FocusEventCreate(BaseModel):
    """Focus event logging request"""
    candidate_id: int
    event_type: str  # 'blur', 'focus', 'visibility_hidden', 'visibility_visible', 'fullscreen_exit'
    details: Optional[str] = None


class FocusEventResponse(BaseModel):
    """Focus event confirmation"""
    logged: bool
    event_id: int
    warning_count: int  # How many focus violations so far


# ============ Session State Schema ============

class SessionState(BaseModel):
    """Current session state for reconnection"""
    candidate_id: int
    first_name: str
    last_name: str
    current_score: int
    total_attempted: int
    current_difficulty: int
    time_remaining_seconds: int
    current_question: Optional[QuestionResponse]
    can_finish: bool


# ============ Admin Schemas ============

class AdminLoginRequest(BaseModel):
    """Admin login request"""
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    """Admin login response with JWT token"""
    access_token: str
    token_type: str = "bearer"
    admin_name: str
    email: str
    expires_in: int  # Token expiration time in seconds


class AdminDashboardStats(BaseModel):
    """Dashboard overview statistics"""
    total_candidates: int
    active_sessions: int
    completed_assessments: int
    total_focus_events: int
    avg_score: float
    avg_time_seconds: float


class CandidateDetailResponse(BaseModel):
    """Detailed candidate info for admin view"""
    id: int
    first_name: str
    last_name: str
    email: str
    total_score: int
    total_attempted: int
    highest_difficulty_reached: int
    time_spent_seconds: int
    is_active_session: bool
    session_start_time: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    focus_event_count: int

    class Config:
        from_attributes = True


class LiveSessionResponse(BaseModel):
    """Live session data for monitoring"""
    candidate_id: int
    candidate_name: str
    email: str
    session_start_time: Optional[datetime]
    current_difficulty: int
    questions_attempted: int
    focus_warnings: int
    elapsed_seconds: int
