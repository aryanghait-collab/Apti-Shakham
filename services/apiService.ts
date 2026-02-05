/**
 * API Service - All backend communication
 * Configured to work on local network
 */

// Dynamic API URL that works from any device on the network
// Uses the same hostname as the frontend, with backend port 8000
const getApiBaseUrl = () => {
    // If VITE_API_URL is set and not localhost, use it
    if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
        return import.meta.env.VITE_API_URL;
    }
    // Otherwise, use the same host as the frontend but on port 8000
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:8000/api`;
};

const API_BASE_URL = getApiBaseUrl();

export interface Option {
    id: string;
    text: string;
}

export interface Question {
    id: number;
    text: string;
    options: Option[];
    difficulty: number;
}

export interface StartTestResponse {
    candidate_id: number;
    candidate_name: string;
    question: Question;
    time_limit_seconds: number;
    current_difficulty: number;
    total_questions: number;  // Total questions available in pool
    min_questions: number;  // Minimum questions required
}

export interface AnswerResponse {
    is_correct: boolean | null;  // Hidden from candidate
    correct_option_id: string | null;  // Hidden from candidate
    explanation: string | null;  // Hidden from candidate
    current_score: number;
    total_attempted: number;
    next_question: Question | null;
    current_difficulty: number;
    floor_level: number;  // Minimum difficulty level (cannot go below)
    can_finish: boolean;
    message: string;
    questions_remaining: number;  // Unanswered questions left
    is_last_question: boolean;  // True if no more questions available
}

export interface FinalResult {
    score: number;
    total_attempted: number;
    highest_difficulty_reached: number;
    percentage: number;
    weighted_score: number;  // Normalized weighted score (0-100)
    difficulty_breakdown: {
        easy: { correct: number; total: number; weight: number };
        medium: { correct: number; total: number; weight: number };
        hard: { correct: number; total: number; weight: number };
    };
    first_name: string;
    last_name: string;
    message: string;
}

export interface FocusEventResponse {
    logged: boolean;
    event_id: number;
    warning_count: number;
}

class ApiService {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `Request failed: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Start a new assessment session
     */
    async startTest(
        firstName: string,
        lastName: string,
        email: string
    ): Promise<StartTestResponse> {
        return this.request<StartTestResponse>('/start-test', {
            method: 'POST',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: email,
            }),
        });
    }

    /**
     * Submit an answer and get next question
     */
    async submitAnswer(
        candidateId: number,
        questionId: number,
        selectedOption: string,
        timeTakenSeconds: number
    ): Promise<AnswerResponse> {
        return this.request<AnswerResponse>('/submit-answer', {
            method: 'POST',
            body: JSON.stringify({
                candidate_id: candidateId,
                question_id: questionId,
                selected_option: selectedOption,
                time_taken_seconds: timeTakenSeconds,
            }),
        });
    }

    /**
     * Finish the test and get final results
     */
    async finishTest(
        candidateId: number,
        timeSpentSeconds: number
    ): Promise<FinalResult> {
        return this.request<FinalResult>('/finish-test', {
            method: 'POST',
            body: JSON.stringify({
                candidate_id: candidateId,
                time_spent_seconds: timeSpentSeconds,
            }),
        });
    }

    /**
     * Log focus events for proctoring
     */
    async logFocusEvent(
        candidateId: number,
        eventType: string,
        details?: string
    ): Promise<FocusEventResponse> {
        return this.request<FocusEventResponse>('/focus-event', {
            method: 'POST',
            body: JSON.stringify({
                candidate_id: candidateId,
                event_type: eventType,
                details: details,
            }),
        });
    }
}

export const apiService = new ApiService();
