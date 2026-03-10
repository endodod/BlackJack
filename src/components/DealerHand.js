'use client'
import Card from './Card';
import { useDeck } from '../context/DeckContext';
import getHandTotal from '../logic/getHandTotal';

export default function DealerHand({ hand, gamePhase }) {
  const { playerTurn } = useDeck();

  const displayHand = hand.length === 0
    ? [{ value: '', suit: '' }, { value: '', suit: '' }]
    : hand;

  const shouldHideFirstCard = hand.length > 0 && playerTurn;

  // Show total only when dealer's hand is fully revealed
  const showTotal = hand.length > 0 && !playerTurn && gamePhase !== 'dealing';
  const dealerTotal = showTotal ? getHandTotal(hand) : null;

  return (
    <div className="hand-section">
      <div className="hand-label">
        <span>Dealer</span>
        {dealerTotal != null && (
          <span className={`hand-total${dealerTotal > 21 ? ' hand-total-bust' : ''}`}>
            {dealerTotal}
          </span>
        )}
        {!showTotal && hand.length > 0 && (
          <span className="hand-total">?</span>
        )}
      </div>
      <div className="cards-row">
        {displayHand.map((c, index) => (
          <div
            key={`${c.value}-${c.suit}-${index}`}
            style={{ visibility: hand.length === 0 ? 'hidden' : 'visible' }}
          >
            <Card card={c} isFaceDown={shouldHideFirstCard && index === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}
