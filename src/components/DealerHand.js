'use client'
import getCardValue from '../logic/getCardValue';
import Card from './Card';
import { useDeck } from '../context/DeckContext';

export default function DealerHand({ hand }) {
  const { playerTurn } = useDeck();
  
  // Show placeholder cards when hand is empty to maintain layout
  const displayHand = hand.length === 0 ? [{value: '', suit: ''}, {value: '', suit: ''}] : hand;
  
  // Hide first dealer card when it's player's turn (standard blackjack rule)
  // Hide it from the moment it's dealt if playerTurn is true or will be true
  const shouldHideFirstCard = hand.length > 0 && playerTurn;
  
  return (
    <div>
      <h2>Dealer</h2>
      <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', gap: '0.2em' }}>
        {displayHand.map((c, index) => (
          <div 
            key={`${c.value}-${c.suit}-${index}`}
            style={{ 
              visibility: hand.length === 0 ? 'hidden' : 'visible'
            }}
          >
            <Card 
              card={c} 
              isFaceDown={shouldHideFirstCard && index === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}