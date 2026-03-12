'use client'
import { useEffect } from 'react';
import './TrainingPanel.css';

export default function TrainingPanel({
  onDeal,
  practiceHardHands,
  practiceSoftHands,
  practicePairs,
  onToggleHard,
  onToggleSoft,
  onTogglePairs,
}) {
  const handleDeal = () => onDeal(1);

  const enabledCount = [practiceHardHands, practiceSoftHands, practicePairs].filter(Boolean).length;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); handleDeal(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="training-panel">
      <div className="training-hand-types">
        <button
          className={`hand-type-btn${practiceHardHands ? ' hand-type-btn-on' : ''}`}
          onClick={onToggleHard}
          disabled={practiceHardHands && enabledCount === 1}
        >
          Hard Hands
        </button>
        <button
          className={`hand-type-btn${practiceSoftHands ? ' hand-type-btn-on' : ''}`}
          onClick={onToggleSoft}
          disabled={practiceSoftHands && enabledCount === 1}
        >
          Soft Hands
        </button>
        <button
          className={`hand-type-btn${practicePairs ? ' hand-type-btn-on' : ''}`}
          onClick={onTogglePairs}
          disabled={practicePairs && enabledCount === 1}
        >
          Pairs
        </button>
      </div>
      <button className="deal-btn" onClick={handleDeal}>
        Deal →
      </button>
    </div>
  );
}
