'use client'
import { useDeck } from "../../context/DeckContext";

export default function Stand({ onValidate, onStand, pressed, showHotkeys = true }) {
    const { setPlayerTurn } = useDeck();

    const handleStand = () => {
        if (onValidate) onValidate('stand');
        if (onStand) {
            onStand();
        } else {
            setPlayerTurn(false);
        }
    };

    return (
        <button className={`action-btn btn-stand${pressed ? ' key-pressed' : ''}`} onClick={handleStand}>
            Stand
            {showHotkeys && <span className="hotkey-hint">S</span>}
        </button>
    )
}