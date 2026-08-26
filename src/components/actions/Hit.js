'use client'
import { useDeck } from "../../context/DeckContext";
import drawCard from "../../logic/drawCard";
import { playSound } from "../../lib/sound";

export default function Hit({ onValidate, pressed, showHotkeys = true }) {
    const { deck, playerHand, setPlayerHand, setDeck, playerTurn } = useDeck();

    const handleHit = () => {
        // Only allow hit if it's player's turn and deck has cards
        if (playerTurn && deck.length > 0) {
            if (onValidate) onValidate('hit');
            const {updatedHand, updatedDeck} = drawCard({hand: playerHand, deck: deck});
            setTimeout(() => {
                playSound('draw');
                setPlayerHand(updatedHand);
                setDeck(updatedDeck);
            }, 500);
        }
    };

    return (
        <button className={`action-btn btn-hit${pressed ? ' key-pressed' : ''}`} onClick={handleHit}>
            Hit
            {showHotkeys && <span className="hotkey-hint">W</span>}
        </button>
    )
}