'use client'
import { useEffect } from 'react';
import './ResultPanel.css';

const ACTION_LABELS = { hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split', resign: 'Resign' };

function SplitHandResult({ label, result, amount, hideAmount }) {
  const isWin = result === 'Player Wins';
  const isLoss = result === 'House Wins';
  return (
    <div className="split-result-col">
      <span className="split-hand-label">{label}</span>
      <span className={`split-result-outcome ${isWin ? 'result-win' : isLoss ? 'result-loss' : 'result-push'}`}>
        {isWin ? 'Win' : isLoss ? 'Lose' : 'Push'}
      </span>
      {!hideAmount && (
        <span className="split-result-amount">
          {isWin && <span className="amount-win">+${amount}</span>}
          {isLoss && <span className="amount-loss">-${amount}</span>}
          {!isWin && !isLoss && <span className="amount-push">Returned</span>}
        </span>
      )}
    </div>
  );
}

export default function ResultPanel({ result, amount, splitResults, onNext, hideAmount = false, trainingFeedback = null }) {
  useEffect(() => {
    const timer = setTimeout(onNext, 1500);
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); clearTimeout(timer); onNext(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', handleKey); };
  }, [onNext]);

  if (trainingFeedback) {
    const { correct, expected } = trainingFeedback;
    return (
      <div className="result-panel">
        <h2 className={`result-training-feedback ${correct ? 'result-win' : 'result-loss'}`}>
          {correct ? 'Correct!' : <>Incorrect — should&apos;ve been <strong>{ACTION_LABELS[expected]}</strong></>}
        </h2>
      </div>
    );
  }

  if (splitResults) {
    const { result1, result2, amount1, amount2 } = splitResults;
    return (
      <div className="result-panel">
        <div className="split-results-row">
          <SplitHandResult label="Hand 1" result={result1} amount={amount1} hideAmount={hideAmount} />
          <div className="split-divider" />
          <SplitHandResult label="Hand 2" result={result2} amount={amount2} hideAmount={hideAmount} />
        </div>
      </div>
    );
  }

  const isBlackjack = result === 'Blackjack!';
  const isWin = result === 'Player Wins' || isBlackjack;
  const isLoss = result === 'House Wins';
  const isPush = result === 'Push';

  return (
    <div className="result-panel">
      <h2 className={isWin ? 'result-win' : isLoss ? 'result-loss' : 'result-push'}>
        {isBlackjack && 'Blackjack!'}
        {result === 'Player Wins' && 'You Win!'}
        {isLoss && 'You Lose'}
        {isPush && 'Push'}
      </h2>
      {!hideAmount && (
        <div className="result-amount">
          {isWin && <span className="amount-win">+${amount}</span>}
          {isLoss && <span className="amount-loss">-${amount}</span>}
          {isPush && <span className="amount-push">Bet returned</span>}
        </div>
      )}
    </div>
  );
}
