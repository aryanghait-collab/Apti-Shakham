"""
SQLAlchemy Database Models
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Candidate(Base):
    """
    Stores candidate registration information and final assessment results.
    """
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Assessment Results
    total_score = Column(Integer, default=0)
    total_attempted = Column(Integer, default=0)
    highest_difficulty_reached = Column(Integer, default=1)  # Highest level ever reached
    floor_level = Column(Integer, default=1)  # Current minimum level (cannot go below)
    time_spent_seconds = Column(Integer, default=0)
    
    # Status
    is_active_session = Column(Boolean, default=False)
    session_start_time = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    focus_events = relationship("FocusEvent", back_populates="candidate")
    answered_questions = relationship("AnsweredQuestion", back_populates="candidate")


class Question(Base):
    """
    Stores quiz questions with difficulty levels.
    Questions can be dynamically added/updated.
    """
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # Stored as JSON array
    correct_option_id = Column(String(10), nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(Integer, nullable=False, index=True)  # 1-5
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnsweredQuestion(Base):
    """
    Tracks which questions a candidate has answered in their session.
    Prevents showing the same question twice.
    """
    __tablename__ = "answered_questions"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option = Column(String(10), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    time_taken_seconds = Column(Integer, default=0)  # Time taken to answer this question
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    candidate = relationship("Candidate", back_populates="answered_questions")
    question = relationship("Question")


class FocusEvent(Base):
    """
    Logs focus changes/tab switches during assessment.
    Used for proctoring and integrity monitoring.
    """
    __tablename__ = "focus_events"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # 'blur', 'focus', 'visibility_hidden', 'visibility_visible'
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Additional context
    details = Column(Text, nullable=True)

    # Relationships
    candidate = relationship("Candidate", back_populates="focus_events")


class Admin(Base):
    """
    Admin users for the dashboard.
    """
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), default="Administrator")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
