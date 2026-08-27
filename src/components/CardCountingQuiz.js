'use client'
import { useState } from 'react';
import './CardCountingQuiz.css';

export default function CardCountingQuiz({ metric, onSubmit }) {
  const [running, setRunning] = useState('');
  const [trueCount, setTrueCount] = useState('');

  const askRunning = metric === 'running' || metric === 'both';
  const askTrue     = metric === 'true' || metric === 'both';
  const canSubmit = (!askRunning || running !== '') && (!askTrue || trueCount !== '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      running: running === '' ? 0 : parseFloat(running),
      true: trueCount === '' ? 0 : parseFloat(trueCount),
    });
  };

  return (
    <form className="cc-quiz" onSubmit={handleSubmit}>
      <span className="cc-quiz-title">Card Counting Check</span>
      <div className="cc-quiz-fields">
        {askRunning && (
          <label className="cc-quiz-field">
            <span>Running Count</span>
            <input
              type="number"
              step="1"
              autoFocus
              value={running}
              onChange={e => setRunning(e.target.value)}
            />
          </label>
        )}
        {askTrue && (
          <label className="cc-quiz-field">
            <span>True Count</span>
            <input
              type="number"
              step="0.5"
              autoFocus={!askRunning}
              value={trueCount}
              onChange={e => setTrueCount(e.target.value)}
            />
          </label>
        )}
      </div>
      <button className="cc-quiz-submit" type="submit" disabled={!canSubmit}>
        Submit
      </button>
    </form>
  );
}
