'use client'
import { useEffect } from 'react';
import './CardCountingQuiz.css';

export default function CardCountingFeedback({ feedback, onSkip }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); onSkip(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSkip]);

  const { correct, actual, metric } = feedback;
  const showRunning = metric === 'running' || metric === 'both';
  const showTrue     = metric === 'true' || metric === 'both';

  return (
    <div
      className={`cc-feedback ${correct ? 'cc-feedback-correct' : 'cc-feedback-wrong'}`}
      onClick={onSkip}
      title="Click to continue"
    >
      <span className="cc-feedback-icon">{correct ? '✓' : '✗'}</span>
      <span className="cc-feedback-text">
        {correct ? 'Correct!' : (
          <>
            Actual:{' '}
            {showRunning && <>RC <strong>{Math.round(actual.runningCount)}</strong></>}
            {showRunning && showTrue && ' · '}
            {showTrue && <>TC <strong>{Math.round(actual.trueCount * 2) / 2}</strong></>}
          </>
        )}
      </span>
      <span className="cc-feedback-hint">click or space to skip</span>
    </div>
  );
}
