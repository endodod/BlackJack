'use client'
import { createContext, useContext, useState } from "react";

const DeckContext = createContext();

export function DeckProvider({ children }) {
  const [deck, setDeck] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [bankroll, setBankroll] = useState(1000);
  const [currentBet, setCurrentBet] = useState(0);

  return (
    <DeckContext.Provider
      value={{
        deck,
        setDeck,
        dealerHand,
        setDealerHand,
        playerHand,
        setPlayerHand,
        playerTurn,
        setPlayerTurn,
        bankroll,
        setBankroll,
        currentBet,
        setCurrentBet
      }}
    >
      {children}
    </DeckContext.Provider>
  );
}

export function useDeck() {
  return useContext(DeckContext);
}

export { DeckContext };