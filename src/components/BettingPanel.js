'use client'
import { useState, useEffect, useRef } from 'react';
import { useDeck } from '../context/DeckContext';
import { playSound } from '../lib/sound';
import './BettingPanel.css';

const QUICK_BETS = [10, 25, 100, 500];
const PRESS_ANIMATION_MS = 180;

export default function BettingPanel({ onDeal, defaultBet = 0, showHotkeys = true }) {
  const { bankroll, setCurrentBet } = useDeck();
  const [betAmount, setBetAmount] = useState(() => defaultBet <= bankroll ? defaultBet : 0);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 930);
  const [pressedBtn, setPressedBtn] = useState(null);
  const pressTimeoutRef = useRef(null);
  const showHints = isDesktop && showHotkeys;

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 930);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => () => clearTimeout(pressTimeoutRef.current), []);

  const flashPress = (id) => {
    clearTimeout(pressTimeoutRef.current);
    setPressedBtn(id);
    pressTimeoutRef.current = setTimeout(() => setPressedBtn(null), PRESS_ANIMATION_MS);
  };

  const handleQuickBet = (amount) => {
    if (betAmount + amount > bankroll) return false;
    setBetAmount(prev => prev + amount);
    playSound('chip');
    return true;
  };

  const handleClear = () => {
    if (betAmount === 0) return false;
    setBetAmount(0);
    playSound('clearbet');
    return true;
  };

  const handleDeal = () => {
    if (!(betAmount > 0 && betAmount <= bankroll)) return false;
    setCurrentBet(betAmount);
    onDeal(betAmount);
    setBetAmount(0);
    return true;
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); if (handleDeal()) flashPress('deal'); }
      if (!isDesktop || e.ctrlKey || e.altKey || e.metaKey) return;
      const chipIndex = ['1', '2', '3', '4'].indexOf(e.key);
      if (chipIndex !== -1) { if (handleQuickBet(QUICK_BETS[chipIndex])) flashPress(`chip-${chipIndex}`); return; }
      if (e.key === 'c' || e.key === 'C') { if (handleClear()) flashPress('clear'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [betAmount, bankroll, isDesktop]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="betting-panel">
      <div className="betting-row">
        <div className="chip-row">
          {QUICK_BETS.map((amount, i) => (
            <button
              key={amount}
              className={`chip-button${pressedBtn === `chip-${i}` ? ' key-pressed' : ''}`}
              onClick={() => handleQuickBet(amount)}
              disabled={betAmount + amount > bankroll}
            >
              <span className="chip-amount">${amount}</span>
              {showHints && <span className="hotkey-hint">{i + 1}</span>}
            </button>
          ))}
        </div>

        <div className="bet-display">
          Bet: <span className="bet-amount">${betAmount}</span>
        </div>

        <button
          className={`clear-btn${pressedBtn === 'clear' ? ' key-pressed' : ''}`}
          onClick={handleClear}
          disabled={betAmount === 0}
        >
          Clear
          {showHints && <span className="hotkey-hint">C</span>}
        </button>
      </div>

      <div className="betting-row betting-row-actions">
        <button
          className={`deal-btn${pressedBtn === 'deal' ? ' key-pressed' : ''}`}
          onClick={handleDeal}
          disabled={betAmount === 0 || betAmount > bankroll}
        >
          Deal →
          {showHints && <span className="hotkey-hint hotkey-hint-wide">Space</span>}
        </button>
      </div>
    </div>
  );
}
