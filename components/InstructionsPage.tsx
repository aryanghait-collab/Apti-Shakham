import React, { useState } from 'react';

interface InstructionsPageProps {
    candidateName: string;
    onStartTest: () => void;
}

const InstructionsPage: React.FC<InstructionsPageProps> = ({ candidateName, onStartTest }) => {
    const [confirmed, setConfirmed] = useState(false);

    return (
        <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '700px' }}>
            {/* Header */}
            <div className="card-header" style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Assessment Instructions</h2>
                <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                    Welcome, <strong>{candidateName}</strong>! Please read carefully before starting.
                </p>
            </div>

            {/* Body */}
            <div className="card-body">
                {/* Instructions List */}
                <ul className="instruction-list" style={{ marginBottom: '1.5rem' }}>
                    <li>
                        <span className="instruction-number">1</span>
                        <span className="instruction-text">
                            <strong>Time Limit:</strong> You have <strong>30 minutes</strong> to complete this assessment.
                        </span>
                    </li>
                    <li>
                        <span className="instruction-number">2</span>
                        <span className="instruction-text">
                            <strong>Questions:</strong> You will answer <strong>30+ questions</strong>. The test ends when time runs out or all questions are answered.
                        </span>
                    </li>
                    <li>
                        <span className="instruction-number">3</span>
                        <span className="instruction-text">
                            <strong>Difficulty Levels:</strong> Questions are <strong>Easy → Medium → Hard</strong>. Based on speed and accuracy, you advance to harder questions. Once you move up, you stay at that level.
                        </span>
                    </li>
                    <li>
                        <span className="instruction-number">4</span>
                        <span className="instruction-text">
                            <strong>Fullscreen Mode:</strong> The test will open in fullscreen mode. Do not exit fullscreen.
                        </span>
                    </li>
                    <li>
                        <span className="instruction-number">5</span>
                        <span className="instruction-text">
                            <strong>No Tab Switching:</strong> Tab switching and window changes are monitored and logged.
                        </span>
                    </li>
                    <li>
                        <span className="instruction-number">6</span>
                        <span className="instruction-text">
                            <strong>One Attempt:</strong> Once you submit an answer, you cannot change it.
                        </span>
                    </li>
                    <li>
                        <span className="instruction-number">7</span>
                        <span className="instruction-text">
                            <strong>Stable Connection:</strong> Ensure you have a stable internet connection.
                        </span>
                    </li>
                </ul>

                {/* Warning Box */}
                <div className="warning-banner" style={{ marginBottom: '1.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>
                        <strong>Important:</strong> Do not refresh the page or close the browser during the test.
                    </span>
                </div>

                {/* Confirmation Checkbox */}
                <div style={{
                    padding: '1rem',
                    background: 'var(--color-bg-muted)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <input
                        type="checkbox"
                        id="confirm-instructions"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        style={{
                            width: '1.25rem',
                            height: '1.25rem',
                            accentColor: 'var(--color-primary)',
                            cursor: 'pointer'
                        }}
                    />
                    <label
                        htmlFor="confirm-instructions"
                        style={{ fontSize: '0.875rem', color: 'var(--color-text)', cursor: 'pointer' }}
                    >
                        I have read and understood all the instructions above.
                    </label>
                </div>

                {/* Start Button */}
                <button
                    onClick={onStartTest}
                    disabled={!confirmed}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                >
                    Start Assessment
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default InstructionsPage;
