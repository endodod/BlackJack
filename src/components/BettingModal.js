'use client'
import { useState } from 'react';
import { useDeck } from '../context/DeckContext';

export default function BettingModal({ onBetPlaced, autoDeal, setAutoDeal }) {
  const { bankroll, setCurrentBet } = useDeck();
  const [betAmount, setBetAmount] = useState(0);

  const quickBets = [10, 100, 1000];

  const handleQuickBet = (amount) => {
    const newBetAmount = betAmount + amount;
    if (newBetAmount <= bankroll) {
      setBetAmount(newBetAmount);
    }
  };

  const handleClear = () => {
    setBetAmount(0);
  };

  const handleDeal = () => {
    if (betAmount > 0 && betAmount <= bankroll) {
      setCurrentBet(betAmount);
      onBetPlaced(betAmount);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Place Your Bet</h2>
        <div className="bankroll-display">
          <span>Bankroll: ${bankroll}</span>
        </div>
        <div className="bet-section">
          <div className="quick-bets">
            {quickBets.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickBet(amount)}
                disabled={betAmount + amount > bankroll}
              >
                ${amount}
              </button>
            ))}
          </div>
          <div className="current-bet">
            <span>Bet: ${betAmount}</span>
          </div>
          <button 
            onClick={handleClear} 
            className="clear-button"
            disabled={betAmount === 0}
          >
            Clear
          </button>
        </div>
        <div className="auto-deal-toggle">
          <label>
            <input
              type="checkbox"
              checked={autoDeal}
              onChange={(e) => setAutoDeal(e.target.checked)}
            />
            <span>Auto Deal</span>
          </label>
        </div>
        <button
          onClick={handleDeal}
          disabled={betAmount === 0 || betAmount > bankroll}
          className="deal-button"
        >
          Deal
        </button>
      </div>
    </div>
  );
}

