'use client'
import { useEffect, useRef } from 'react';

export default function ResultsModal({ result, amount, onClose }) {
  const isWin = result === 'Player Wins';
  const isLoss = result === 'House Wins';
  const isPush = result === 'Push';
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-content results-modal">
        <h2 className={isWin ? 'result-win' : isLoss ? 'result-loss' : 'result-push'}>
          {isWin && 'You Win!'}
          {isLoss && 'You Lose'}
          {isPush && 'Push'}
        </h2>
        <div className="results-amount">
          {isWin && <span className="amount-win">+${amount}</span>}
          {isLoss && <span className="amount-loss">-${amount}</span>}
          {isPush && <span className="amount-push">Bet returned</span>}
        </div>
        <button onClick={onClose} className="close-button">
          Continue
        </button>
      </div>
    </div>
  );
}

