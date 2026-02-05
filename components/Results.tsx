import React from 'react';
import { FinalResult } from '../services/apiService';

interface ResultsProps {
  result: FinalResult;
  timedOut: boolean;
  focusWarnings: number;
  onRestart: () => void;
}

const Results: React.FC<ResultsProps> = ({ result, timedOut, focusWarnings, onRestart }) => {
  const getGrade = (percentage: number): { label: string; color: string } => {
    if (percentage >= 90) return { label: 'Excellent', color: 'var(--color-success)' };
    if (percentage >= 70) return { label: 'Good', color: 'var(--color-primary)' };
    if (percentage >= 50) return { label: 'Satisfactory', color: 'var(--color-accent)' };
    return { label: 'Needs Improvement', color: 'var(--color-error)' };
  };

  const grade = getGrade(result.percentage);

  return (
    <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '600px' }}>
      {/* Header */}
      <div className="card-header" style={{ textAlign: 'center' }}>
        {timedOut && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.625rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '1rem'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Time Expired
          </div>
        )}
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Assessment Complete</h2>
        <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          {result.first_name} {result.last_name}
        </p>
      </div>

      {/* Body */}
      <div className="card-body">
        {/* Score Display */}
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          marginBottom: '1.5rem',
          background: 'var(--color-bg-muted)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{
            fontSize: '4rem',
            fontWeight: '800',
            color: 'var(--color-primary)',
            lineHeight: 1
          }}>
            {result.percentage}%
          </div>
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '700',
            color: grade.color,
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            {grade.label}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value">{result.score}</div>
            <div className="stat-label">Correct</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{result.total_attempted}</div>
            <div className="stat-label">Attempted</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-value">{result.highest_difficulty_reached}</div>
            <div className="stat-label">Peak Level</div>
          </div>
        </div>

        {/* Focus Warnings */}
        {focusWarnings > 0 && (
          <div className="warning-banner" style={{ marginBottom: '1.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>{focusWarnings} focus violation(s)</strong> were logged during this session.
            </span>
          </div>
        )}

        {/* Message */}
        <div style={{
          padding: '1rem',
          background: 'var(--color-bg-muted)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--color-text-muted)',
          marginBottom: '1.5rem'
        }}>
          {result.message}
        </div>

        {/* Action */}
        <button
          onClick={onRestart}
          className="btn btn-accent btn-lg"
          style={{ width: '100%' }}
        >
          Start New Assessment
        </button>
      </div>
    </div>
  );
};

export default Results;
