'use client'
import { useState } from 'react';
import './TestDealPanel.css';

const PAIRS = ['A','2','3','4','5','6','7','8','9','10'].map(v => ({
  label: `${v}-${v}`, v1: v, v2: v,
}));

const SOFT = [
  ...['2','3','4','5','6','7','8','9'].map(v => ({ label: `A+${v}`, v1: 'A', v2: v })),
  { label: 'BJ', v1: 'A', v2: '10' },
];

const HARD = [
  { label: '8',  v1: '3', v2: '5' },
  { label: '9',  v1: '4', v2: '5' },
  { label: '10', v1: '4', v2: '6' },
  { label: '11', v1: '5', v2: '6' },
  { label: '12', v1: '5', v2: '7' },
  { label: '13', v1: '6', v2: '7' },
  { label: '14', v1: '6', v2: '8' },
  { label: '15', v1: '6', v2: '9' },
  { label: '16', v1: '7', v2: '9' },
  { label: '17', v1: '8', v2: '9' },
  { label: '18', v1: '8', v2: '10' },
  { label: '19', v1: '9', v2: '10' },
  { label: '20', v1: 'K', v2: 'Q' },
];

export default function TestDealPanel({ testHand, onSelect, testDealerHand, onDealerSelect }) {
  const [tab, setTab] = useState('pairs');
  const [dealerTab, setDealerTab] = useState('pairs');

  const hands = tab === 'pairs' ? PAIRS : tab === 'soft' ? SOFT : HARD;
  const dealerHands = dealerTab === 'pairs' ? PAIRS : dealerTab === 'soft' ? SOFT : HARD;

  return (
    <div className="test-deal-panel">
      <div className="test-deal-header">
        <span className="test-deal-label">Player</span>
        <div className="test-deal-tabs">
          {['pairs', 'soft', 'hard'].map(t => (
            <button
              key={t}
              className={`test-tab${tab === t ? ' test-tab-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {testHand && (
          <button className="test-clear-btn" onClick={() => onSelect(null)}>
            {testHand.label} ×
          </button>
        )}
      </div>
      <div className="test-deal-chips">
        {hands.map(h => (
          <button
            key={h.label}
            className={`test-chip${testHand?.label === h.label ? ' test-chip-active' : ''}`}
            onClick={() => onSelect(testHand?.label === h.label ? null : h)}
          >
            {h.label}
          </button>
        ))}
      </div>
      <div className="test-deal-header test-dealer-header">
        <span className="test-deal-label">Dealer</span>
        <div className="test-deal-tabs">
          {['pairs', 'soft', 'hard'].map(t => (
            <button
              key={t}
              className={`test-tab test-tab-dealer${dealerTab === t ? ' test-tab-dealer-active' : ''}`}
              onClick={() => setDealerTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {testDealerHand && (
          <button className="test-clear-btn test-clear-dealer" onClick={() => onDealerSelect(null)}>
            {testDealerHand.label} ×
          </button>
        )}
      </div>
      <div className="test-deal-chips">
        {dealerHands.map(h => (
          <button
            key={h.label}
            className={`test-chip test-chip-dealer${testDealerHand?.label === h.label ? ' test-chip-dealer-active' : ''}`}
            onClick={() => onDealerSelect(testDealerHand?.label === h.label ? null : h)}
          >
            {h.label}
          </button>
        ))}
      </div>
    </div>
  );
}
