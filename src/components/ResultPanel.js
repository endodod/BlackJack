'use client'
import './ResultPanel.css';

export default function ResultPanel({ result, amount, onNext }) {
  const isWin = result === 'Player Wins';
  const isLoss = result === 'House Wins';
  const isPush = result === 'Push';

  return (
    <div className="result-panel">
      <h2 className={isWin ? 'result-win' : isLoss ? 'result-loss' : 'result-push'}>
        {isWin && 'You Win!'}
        {isLoss && 'You Lose'}
        {isPush && 'Push'}
      </h2>
      <div className="result-amount">
        {isWin && <span className="amount-win">+${amount}</span>}
        {isLoss && <span className="amount-loss">-${amount}</span>}
        {isPush && <span className="amount-push">Bet returned</span>}
      </div>
      <button className="next-hand-btn" onClick={onNext}>
        Next Hand →
      </button>
    </div>
  );
}
