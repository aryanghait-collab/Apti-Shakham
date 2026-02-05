"""
Application Configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/assessment_db"
    )
    
    # Allow all origins for local network access
    # In production, set specific origins via environment variable
    CORS_ORIGINS: list = os.getenv(
        "CORS_ORIGINS", 
        "*"  # Allow all origins for local network
    ).split(",") if os.getenv("CORS_ORIGINS") else ["*"]
    
    # Assessment Configuration
    QUIZ_TIME_LIMIT_SECONDS: int = 30 * 60  # 30 minutes
    MIN_QUESTIONS: int = 30  # Minimum questions required
    
    # Adaptive Difficulty Settings
    # 3 levels: Easy(1), Medium(2), Hard(3)
    MAX_DIFFICULTY: int = 3
    MIN_DIFFICULTY: int = 1
    
    # Scoring weights per difficulty level
    # Used for weighted score calculation: Easy=1pt, Medium=2pts, Hard=3pts
    EASY_WEIGHT: int = 1
    MEDIUM_WEIGHT: int = 2
    HARD_WEIGHT: int = 3
    
    # Time thresholds for difficulty advancement (in seconds)
    # If candidate answers faster than this AND correctly, they may advance
    FAST_ANSWER_THRESHOLD_SECONDS: int = 30  # Answer in under 30 seconds is "fast"
    VERY_FAST_ANSWER_THRESHOLD_SECONDS: int = 15  # Answer in under 15 seconds is "very fast"
    
    # Consecutive correct answers needed to advance
    CONSECUTIVE_CORRECT_TO_ADVANCE: int = 7  # 5 correct answers in a row
    # Fast + Correct answers needed for advancement
    FAST_CORRECT_TO_ADVANCE: int = 5  # 5 fast correct answers in a row
    # Very fast correct answers needed for advancement
    VERY_FAST_CORRECT_TO_ADVANCE: int = 3  # 3 very fast correct answers
    
    # Admin Configuration
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@shakham.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "PASSWORD!@123")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "shakham-admin-secret-key-2024")
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    
    # Session Timeout (in minutes) - mark sessions as inactive after this time
    SESSION_TIMEOUT_MINUTES: int = int(os.getenv("SESSION_TIMEOUT_MINUTES", "60"))

settings = Settings()
