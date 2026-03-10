'use client'
import getCardValue from '../logic/getCardValue';
import getHandTotal from '../logic/getHandTotal';
import Card from './Card';

export default function PlayerHand({ hand }) {
  // Show placeholder cards when hand is empty to maintain layout
  const displayHand = hand.length === 0 ? [{value: '', suit: ''}, {value: '', suit: ''}] : hand;
  
  return (
    <div style={{ marginBottom: '2em' }}>
      <h2>Player</h2>
      <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', gap: '0.2em' }}>
        {displayHand.map((c, index) => (
          <div 
            key={`${c.value}-${c.suit}-${index}`}
            style={{ 
              visibility: hand.length === 0 ? 'hidden' : 'visible'
            }}
          >
            <Card card={c} />
          </div>
        ))}
      </div>
    </div>
  );
}