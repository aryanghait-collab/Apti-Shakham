import React, { useState, useCallback, useEffect } from 'react';
import { apiService, Question, FinalResult } from './services/apiService';
import { proctoringService } from './services/proctoringService';
import ProgressBar from './components/ProgressBar';
import QuestionCard from './components/QuestionCard';
import RegistrationForm from './components/RegistrationForm';
import InstructionsPage from './components/InstructionsPage';
import Timer from './components/Timer';

// Import logo
import companyLogo from './assests/company_logo.png';

type QuizStatus = 'registration' | 'instructions' | 'loading' | 'active' | 'finished' | 'timed-out' | 'error';

interface SessionState {
  candidateId: number;
  candidateName: string;
  currentQuestion: Question | null;
  currentDifficulty: number;
  floorLevel: number;  // Minimum difficulty level (cannot go below)
  totalAttempted: number;
  canFinish: boolean;
  timeLimitSeconds: number;
  totalQuestions: number;  // Total questions in the pool
  minQuestions: number;  // Minimum required questions
  questionsRemaining: number;  // Unanswered questions left
}

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

const App: React.FC = () => {
  const [status, setStatus] = useState<QuizStatus>('registration');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);  // Track time per question
  const [focusWarnings, setFocusWarnings] = useState<number>(0);
  const [showWarningBanner, setShowWarningBanner] = useState<boolean>(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  /**
   * Handle focus events from proctoring service
   */
  const handleFocusChange = useCallback((eventType: string, warningCount?: number) => {
    if (warningCount !== undefined) {
      setFocusWarnings(warningCount);
    }

    if (eventType === 'blur' || eventType === 'visibility_hidden' || eventType === 'fullscreen_exit') {
      setShowWarningBanner(true);
      setTimeout(() => setShowWarningBanner(false), 5000);
    }
  }, []);

  /**
   * Handle registration - show instructions first
   */
  const handleRegistration = (userData: User) => {
    setPendingUser(userData);
    setStatus('instructions');
  };

  /**
   * Start the actual quiz after reading instructions
   */
  const startQuiz = async () => {
    if (!pendingUser) return;

    setStatus('loading');
    setError(null);

    try {
      const response = await apiService.startTest(
        pendingUser.firstName,
        pendingUser.lastName,
        pendingUser.email
      );

      // Initialize session state
      setSession({
        candidateId: response.candidate_id,
        candidateName: response.candidate_name,
        currentQuestion: response.question,
        currentDifficulty: response.current_difficulty,
        floorLevel: 1,  // Start at Easy level
        totalAttempted: 0,
        canFinish: false,
        timeLimitSeconds: response.time_limit_seconds,
        totalQuestions: response.total_questions,
        minQuestions: response.min_questions,
        questionsRemaining: response.total_questions - 1, // Subtract first question
      });

      setStartTime(Date.now());
      setQuestionStartTime(Date.now());  // Start timing first question
      setSelectedOption(null);

      // Initialize proctoring
      proctoringService.initialize(
        response.candidate_id,
        async (eventType, details) => {
          await apiService.logFocusEvent(response.candidate_id, eventType, details);
        },
        handleFocusChange
      );

      // Request fullscreen
      await proctoringService.requestFullscreen();

      setStatus('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assessment');
      setStatus('error');
    }
  };

  /**
   * Handle option selection
   */
  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
  };

  /**
   * Submit answer and get next question
   */
  const handleNext = async () => {
    if (!session || !session.currentQuestion || !selectedOption) return;

    // Calculate time taken for this question
    const timeTakenSeconds = Math.floor((Date.now() - questionStartTime) / 1000);

    try {
      const response = await apiService.submitAnswer(
        session.candidateId,
        session.currentQuestion.id,
        selectedOption,
        timeTakenSeconds
      );

      // Update session state with questions remaining info
      setSession({
        ...session,
        currentQuestion: response.next_question,
        currentDifficulty: response.current_difficulty,
        floorLevel: response.floor_level,
        totalAttempted: response.total_attempted,
        canFinish: response.can_finish,
        questionsRemaining: response.questions_remaining,
      });

      setSelectedOption(null);
      setQuestionStartTime(Date.now());  // Reset timer for next question

      // If no more questions, finish the quiz
      if (response.is_last_question || !response.next_question) {
        finishQuiz();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    }
  };

  /**
   * Finish the assessment
   */
  const finishQuiz = useCallback(async () => {
    if (!session || status === 'finished' || status === 'timed-out') return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      await apiService.finishTest(session.candidateId, timeSpent);
      setStatus('finished');

      // Cleanup proctoring
      proctoringService.cleanup();
      proctoringService.exitFullscreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete assessment');
    }
  }, [session, status, startTime]);

  /**
   * Handle time up
   */
  const handleTimeUp = useCallback(() => {
    if (status === 'active') {
      setStatus('timed-out');
      finishQuiz();
    }
  }, [status, finishQuiz]);

  /**
   * Reset and start a new session
   */
  const resetQuiz = () => {
    setSession(null);
    setSelectedOption(null);
    setPendingUser(null);
    setFocusWarnings(0);
    setError(null);
    setStatus('registration');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      proctoringService.cleanup();
    };
  }, []);

  // Get difficulty label
  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return { text: 'Easy', class: 'badge-easy' };
      case 2: return { text: 'Medium', class: 'badge-moderate' };
      case 3: return { text: 'Hard', class: 'badge-hard' };
      default: return { text: 'Easy', class: 'badge-easy' };
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <img src={companyLogo} alt="Shakham Inc" />
          </div>

          {status === 'active' && session && (
            <div className="header-controls">
              <Timer
                initialSeconds={session.timeLimitSeconds}
                isActive={status === 'active'}
                onTimeUp={handleTimeUp}
              />
            </div>
          )}
        </div>
      </header>

      {/* Focus Warning Banner */}
      {showWarningBanner && (
        <div className="warning-banner error animate-fade-in" style={{ margin: '1rem', marginBottom: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <strong>Focus Lost!</strong> Tab switching is being monitored. Warnings: {focusWarnings}
          </span>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Registration */}
        {status === 'registration' && (
          <div className="content-center">
            <RegistrationForm onRegister={handleRegistration} />
          </div>
        )}

        {/* Instructions Page */}
        {status === 'instructions' && pendingUser && (
          <div className="content-center">
            <InstructionsPage
              candidateName={`${pendingUser.firstName} ${pendingUser.lastName}`}
              onStartTest={startQuiz}
            />
          </div>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div className="content-center">
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
              <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Preparing Assessment...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="content-center">
            <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
              <div className="card-body">
                <div style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Connection Error</h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{error}</p>
                <button className="btn btn-primary" onClick={resetQuiz}>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Quiz */}
        {status === 'active' && session && session.currentQuestion && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }} className="animate-fade-in">
            {/* Progress Section */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.625rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Difficulty
                  </span>
                  <div className="difficulty-dots">
                    {[1, 2, 3].map(lvl => (
                      <div
                        key={lvl}
                        className={`difficulty-dot ${lvl <= session.currentDifficulty ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                  <span className={`badge ${getDifficultyLabel(session.currentDifficulty).class}`}>
                    {getDifficultyLabel(session.currentDifficulty).text}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge badge-primary">
                    Question {session.totalAttempted + 1} of {session.totalQuestions}
                  </span>
                </div>
              </div>
              <ProgressBar current={session.totalAttempted} total={session.totalQuestions} />

              {/* Questions Remaining Info */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)'
              }}>
                <span>
                  {session.totalAttempted < session.minQuestions
                    ? `${session.minQuestions - session.totalAttempted} more questions required`
                    : 'Minimum questions completed ✓'
                  }
                </span>
                <span>
                  {session.questionsRemaining} questions remaining
                </span>
              </div>

              {/* Low Questions Warning */}
              {session.questionsRemaining <= 3 && session.questionsRemaining > 0 && (
                <div className="warning-banner" style={{ marginTop: '1rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    <strong>Almost done!</strong> Only {session.questionsRemaining} question{session.questionsRemaining !== 1 ? 's' : ''} remaining. The test will end after you answer all questions.
                  </span>
                </div>
              )}
            </div>

            {/* Question Card */}
            <QuestionCard
              question={session.currentQuestion}
              selectedOptionId={selectedOption}
              onSelect={handleSelectOption}
              onNext={handleNext}
              isLast={session.questionsRemaining === 0}
            />

            {/* Early Finish Button */}
            {session.canFinish && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  className="btn btn-outline"
                  onClick={finishQuiz}
                >
                  Completed minimum questions — End assessment early
                </button>
              </div>
            )}
          </div>
        )}

        {/* Completion Message (No results shown to candidate) */}
        {(status === 'finished' || status === 'timed-out') && (
          <div className="content-center">
            <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
              <div className="card-header">
                <div style={{
                  width: '4rem',
                  height: '4rem',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius-lg)'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Assessment Complete</h2>
                <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                  {status === 'timed-out' ? 'Time has expired' : 'Thank you for completing the assessment'}
                </p>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                  Your responses have been recorded. The results will be reviewed and you will be contacted shortly.
                </p>
                <button
                  onClick={resetQuiz}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  Start New Session
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p className="footer-text">
          © {new Date().getFullYear()} Shakham Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default App;
