'use client'
import { useEffect } from 'react';
import './TrainingFeedback.css';

const ACTION_LABELS = { hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split' };

export default function TrainingFeedback({ feedback, onSkip }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); onSkip(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSkip]);

  return (
    <div
      className={`training-feedback ${feedback.correct ? 'training-feedback-correct' : 'training-feedback-wrong'}`}
      onClick={onSkip}
      title="Click to continue"
    >
      <span className="tf-icon">{feedback.correct ? '✓' : '✗'}</span>
      <span className="tf-text">
        {feedback.correct
          ? 'Correct!'
          : <>Incorrect — should&apos;ve been <strong>{ACTION_LABELS[feedback.expected]}</strong></>
        }
      </span>
      <span className="tf-hint">click or space to skip</span>
    </div>
  );
}
