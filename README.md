# Technical Assessment Platform

A modern, adaptive computer-based assessment platform with backend-driven logic, PostgreSQL persistence, and proctoring capabilities.

## Features

- **Adaptive Testing**: Questions dynamically adjust difficulty based on candidate performance
- **30-Minute Timed Assessment**: Candidates have 30 minutes to complete the assessment
- **Backend-Driven Logic**: All quiz logic runs on the server - frontend only displays UI
- **PostgreSQL Database**: Stores candidates, questions, scores, and focus events
- **Focus Tracking & Proctoring**: Monitors tab switches, visibility changes, and fullscreen exits
- **Dynamic Questions**: Easily add/modify questions via JSON file
- **Professional UI**: Clean, corporate design without generic AI branding

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py        # Application configuration
│   │   ├── database.py      # Database connection
│   │   ├── main.py          # FastAPI application & routes
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   └── services.py      # Business logic
│   ├── scripts/
│   │   └── seed_questions.py
│   ├── questions.json       # Dynamic question pool
│   ├── requirements.txt
│   └── .env.example
├── components/              # React components
├── services/               
│   ├── apiService.ts        # Backend API client
│   └── proctoringService.ts # Focus tracking
├── App.tsx
├── index.html
├── index.css               # Design system
└── package.json
```

## Setup Instructions

### 1. Database Setup (PostgreSQL)

Create a PostgreSQL database:

```sql
CREATE DATABASE assessment_db;
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env with your database credentials

# Seed questions
python scripts/seed_questions.py

# Run backend
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
# In project root
npm install
npm run dev
```

The frontend will run on http://localhost:5173 and proxy API requests to the backend.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/start-test` | Start new assessment session |
| POST | `/api/submit-answer` | Submit answer, get next question |
| POST | `/api/finish-test` | Complete assessment, get results |
| POST | `/api/focus-event` | Log focus changes (proctoring) |
| GET | `/api/questions` | List all questions (admin) |
| POST | `/api/questions` | Add new question |
| GET | `/api/results` | List all candidate results |

## Adding New Questions

Edit `backend/questions.json` and run the seed script:

```json
{
  "text": "Your question text here?",
  "options": [
    {"id": "a", "text": "Option A"},
    {"id": "b", "text": "Option B"},
    {"id": "c", "text": "Option C"},
    {"id": "d", "text": "Option D"}
  ],
  "correct_option_id": "b",
  "explanation": "Explanation of why this is correct",
  "difficulty": 3
}
```

Difficulty levels: 1 (easiest) to 5 (hardest)

## Database Schema

### candidates
- id, first_name, last_name, email
- total_score, total_attempted, highest_difficulty_reached
- time_spent_seconds, is_active_session
- session_start_time, completed_at, created_at

### questions
- id, text, options (JSON), correct_option_id
- explanation, difficulty (1-5), is_active

### answered_questions
- id, candidate_id, question_id
- selected_option, is_correct, answered_at

### focus_events
- id, candidate_id, event_type
- timestamp, details

## Adaptive Algorithm

1. Start at difficulty level 1
2. Correct answer → increase difficulty (max 5)
3. Wrong answer → decrease difficulty (min 1)
4. If 7+ correct in last 10 questions at current level → advance
5. Minimum 10 questions required
6. 30-minute time limit

## Proctoring Features

- Fullscreen mode on test start
- Tab switch detection (blur events)
- Visibility change detection
- Fullscreen exit detection
- All events logged to database with timestamps
- Everything shown in Admin Panel