import React from 'react';
import { Question } from '../services/apiService';

interface QuestionCardProps {
  question: Question;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  onNext: () => void;
  isLast: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOptionId,
  onSelect,
  onNext,
  isLast
}) => {
  return (
    <div className="card animate-slide-in">
      <div className="card-body">
        {/* Question Header - No difficulty shown to candidate */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            lineHeight: 1.5,
            color: 'var(--color-text)'
          }}>
            {question.text}
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
          {question.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSelect(option.id)}
                className={`option-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="option-indicator">
                  {option.id.toUpperCase()}
                </div>
                <span className="option-text">{option.text}</span>
                {isSelected && (
                  <div style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--gradient-brand)',
                    borderRadius: '50%',
                    marginLeft: '0.5rem'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--color-border-light)'
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)'
          }}>
            Select an answer to continue
          </p>
          <button
            onClick={onNext}
            disabled={!selectedOptionId}
            className="btn btn-primary"
          >
            {isLast ? 'Complete' : 'Next Question'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
