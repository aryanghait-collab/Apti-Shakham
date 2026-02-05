import React, { useState, useEffect } from 'react';

interface TimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  isActive: boolean;
}

const Timer: React.FC<TimerProps> = ({ initialSeconds, onTimeUp, isActive }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds <= 0) {
      onTimeUp();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, onTimeUp]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLow = seconds < 300; // 5 mins

  return (
    <div className={`timer ${isLow ? 'warning' : ''}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>{formatTime(seconds)}</span>
    </div>
  );
};

export default Timer;
