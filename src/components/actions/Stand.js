'use client'
import { useDeck } from "../../context/DeckContext";

export default function Stand() {
    const { setPlayerTurn } = useDeck();

    const handleStand = () => {
        setPlayerTurn(false);
    };

    return (
        <button onClick={handleStand}>Stand</button>
    )
}