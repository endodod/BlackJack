'use client'
import Card from './Card';
import getHandTotal from '../logic/getHandTotal';

export default function PlayerHand({ hand }) {
  const displayHand = hand.length === 0
    ? [{ value: '', suit: '' }, { value: '', suit: '' }]
    : hand;

  const playerTotal = hand.length > 0 ? getHandTotal(hand) : null;

  return (
    <div className="hand-section">
      <div className="cards-row">
        {displayHand.map((c, index) => (
          <div
            key={`${c.value}-${c.suit}-${index}`}
            style={{ visibility: hand.length === 0 ? 'hidden' : 'visible' }}
          >
            <Card card={c} />
          </div>
        ))}
      </div>
      <div className="hand-label">
        <span>Player</span>
        {playerTotal != null && (
          <span className={`hand-total${playerTotal > 21 ? ' hand-total-bust' : ''}`}>
            {playerTotal}
          </span>
        )}
      </div>
    </div>
  );
}
