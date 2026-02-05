import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min(((current + 1) / total) * 100, 100);

  return (
    <div className="progress-container">
      <div
        className="progress-bar"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
