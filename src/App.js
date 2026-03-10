'use client'
import React, { useEffect, useCallback } from "react";
import { DeckContext } from "./context/DeckContext";
import PlayerHand from './components/PlayerHand';
import DealerHand from './components/DealerHand';
import PlayerActions from "./components/PlayerActions";
import BettingModal from "./components/BettingModal";
import ResultsModal from "./components/ResultsModal";
import checkWinner from "./logic/checkWinner";
import getHandTotal from "./logic/getHandTotal";
import drawCard from "./logic/drawCard";

function App() {
  
  const { deck, setDeck, dealerHand, setDealerHand, playerHand, setPlayerHand, playerTurn, setPlayerTurn, bankroll, setBankroll, currentBet, setCurrentBet } = React.useContext(DeckContext);
  const [winner, setWinner] = React.useState(null);
  const [showActions, setShowActions] = React.useState(false);
  const [showBettingModal, setShowBettingModal] = React.useState(false);
  const [showResultsModal, setShowResultsModal] = React.useState(false);
  const [resultAmount, setResultAmount] = React.useState(0);
  const [resultMessage, setResultMessage] = React.useState('');
  const [autoDeal, setAutoDeal] = React.useState(false);
  const [lastBetAmount, setLastBetAmount] = React.useState(0);

  const suits = ["♠", "♥", "♦", "♣"];
  const values = [
    '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'J', 'Q', 'K', 'A'
  ];
  
  const createDeck = (numDecks = 4) => {
    const newDeck = [];

    for (let i = 0; i < numDecks; i++) {
      for (let suit of suits) {
        for (let value of values) {
          newDeck.push({ suit, value });
        }
      }
    }

    const shuffledDeck = newDeck.sort(() => Math.random() - 0.5);
    setDeck(shuffledDeck);
  };

  // create deck if no deck
  useEffect(() => {
    if (deck.length === 0) {
      createDeck();
    }
  }, [deck.length]);

  const dealCards = useCallback((betAmount) => {
    // Store the bet amount for auto deal
    setLastBetAmount(betAmount);
    
    // Deduct bet from bankroll
    setBankroll(prev => prev - betAmount);

    // shuffle deck
    if (deck.length < Math.floor(Math.random() * (80 - 40 + 1)) + 40) {
      //shuffle
  }

    // Reset playerTurn to ensure dealer's first card is hidden from the start
    setPlayerTurn(true);

    // Deal cards one at a time with 0.5 second delay between each
    // Card 1: Player
    setTimeout(() => {
      setPlayerHand([deck[0]]);
    }, 500);
    
    // Card 2: Dealer (face down)
    setTimeout(() => {
      setDealerHand([deck[1]]);
    }, 1000);
    
    // Card 3: Player
    setTimeout(() => {
      setPlayerHand([deck[0], deck[2]]);
    }, 1500);
    
    // Card 4: Dealer
    setTimeout(() => {
      setDealerHand([deck[1], deck[3]]);
      setDeck(deck.slice(4));
      setPlayerTurn(true); // Player's turn starts, dealer's first card should be hidden
      setWinner(null);
    }, 2000);
    
    // Show PlayerActions after 2.5 seconds
    setTimeout(() => {
      setShowActions(true);
    }, 2500);

    // Hide betting modal
    setShowBettingModal(false);
  }, [deck, setDealerHand, setPlayerHand, setDeck, setPlayerTurn, setShowActions, setShowBettingModal, setBankroll]);

  const handleBetPayout = useCallback((result) => {
    if (result === 'Player Wins') {
      // Player wins - double the bet (bet back + win)
      const winAmount = currentBet * 2;
      setBankroll(prev => prev + winAmount);
      setResultAmount(currentBet); // Show net profit
      setResultMessage(result);
    } else if (result === 'House Wins') {
      // House wins - bet is already deducted
      setResultAmount(currentBet); // Show loss amount
      setResultMessage(result);
    } else if (result === 'Push') {
      // Push - return the bet
      setBankroll(prev => prev + currentBet);
      setResultAmount(0); // Show $0 for push
      setResultMessage(result);
    }
  }, [currentBet]);

  // Show betting modal when game is not in progress (but not if auto deal is enabled)
  useEffect(() => {
    if (playerHand.length === 0 && currentBet === 0 && !autoDeal) {
      setShowBettingModal(true);
    } else if (playerHand.length === 0 && currentBet === 0 && autoDeal && lastBetAmount > 0 && lastBetAmount <= bankroll) {
      // Auto deal - don't show modal, just deal directly
      setTimeout(() => {
        dealCards(lastBetAmount);
      }, 100);
    }
  }, [playerHand.length, currentBet, autoDeal, lastBetAmount, bankroll, dealCards]);

 
  useEffect(() => {
    if (playerHand.length > 0 && dealerHand.length > 0 && deck.length > 0 && !winner) {
      const playerTotal = getHandTotal(playerHand);
      const dealerTotal = getHandTotal(dealerHand);
      const playerBlackJack = playerTotal === 21;
      const dealerBlackJack = dealerTotal === 21;
      const playerBusted = playerTotal > 21;
      
      if (dealerBlackJack) {
        // ask Insurance();
      }

      if (playerBlackJack) {
        // playerBlackJack();
      }

      // Check if dealer should play
      if (!playerTurn || playerBusted) {
        if (playerBusted) {
          setPlayerTurn(false);
          // If player busted, dealer doesn't need to draw - check winner immediately
          const result = checkWinner({playerHand, dealerHand});
          if (result) {
            setWinner(result);
            // Handle bet payouts
            handleBetPayout(result);
            // Show results modal
            setTimeout(() => {
              setShowResultsModal(true);
            }, 500);
          }
        } else {
          // Dealer logic - only if player didn't bust
          const dealerTotal = getHandTotal(dealerHand);
          if (dealerTotal < 17 && deck.length > 0) {
            const {updatedHand, updatedDeck} = drawCard({hand: dealerHand, deck: deck});
            // Add 1 second delay after drawing
            const timeout = setTimeout(() => {
              setDealerHand(updatedHand);
              setDeck(updatedDeck);
            }, 1000);
            
            return () => clearTimeout(timeout);
          } else {
            // Dealer is done, check winner
            const result = checkWinner({playerHand, dealerHand});
            if (result) {
              setWinner(result);
              // Handle bet payouts
              handleBetPayout(result);
              // Show results modal
              setTimeout(() => {
                setShowResultsModal(true);
              }, 500);
            }
          }
        }
      }
    }
  }, [playerTurn, playerHand, dealerHand, deck, currentBet, handleBetPayout, winner]);

  const handleResultsClose = useCallback(() => {
    setShowResultsModal(false);
    // Clear hands after closing results modal
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerTurn(true);
    setWinner(null);
    setShowActions(false);
    setCurrentBet(0);
    
    // If auto deal is enabled, automatically deal again with the last bet amount
    if (autoDeal && lastBetAmount > 0 && lastBetAmount <= bankroll) {
      setTimeout(() => {
        dealCards(lastBetAmount);
      }, 300);
    } else {
      setShowBettingModal(true); // Show betting modal for next round
    }
  }, [autoDeal, lastBetAmount, bankroll, dealCards]);

  // Hide Deal button when game is in progress
  const isGameInProgress = playerHand.length > 0;
  const canSplit = playerHand.length === 2 && playerHand[0].value === playerHand[1].value;
  const canDouble = playerHand.length === 2;

  // Hotkey handlers for player actions
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only handle keys when it's player's turn, actions are shown, and no modals are open
      if (!playerTurn || !showActions || showBettingModal || showResultsModal) {
        return;
      }

      // Ignore if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const key = event.key.toLowerCase();

      switch (key) {
        case 'w': // Hit
          if (playerTurn && deck.length > 0) {
            const {updatedHand, updatedDeck} = drawCard({hand: playerHand, deck: deck});
            setTimeout(() => {
              setPlayerHand(updatedHand);
              setDeck(updatedDeck);
            }, 500);
          }
          break;
        case 's': // Stand
          setPlayerTurn(false);
          break;
        case 'd': // Double
          // Double: double bet, draw one card, then stand
          if (playerHand.length === 2 && currentBet * 2 <= bankroll) {
            setBankroll(prev => prev - currentBet); // Double the bet
            setCurrentBet(prev => prev * 2);
            if (deck.length > 0) {
              const {updatedHand, updatedDeck} = drawCard({hand: playerHand, deck: deck});
              setTimeout(() => {
                setPlayerHand(updatedHand);
                setDeck(updatedDeck);
                setPlayerTurn(false); // Stand after drawing
              }, 500);
            }
          }
          break;
        case 'a': // Split
          // Split: only if two cards of same value and bankroll allows
          if (canSplit && playerHand.length === 2 && currentBet <= bankroll) {
            // Split logic would go here - for now just a placeholder
            // This is complex and would require managing multiple hands
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playerTurn, showActions, showBettingModal, showResultsModal, playerHand, deck, currentBet, bankroll, canSplit, setPlayerHand, setDeck, setPlayerTurn, setBankroll, setCurrentBet]);

  return (
    <div className="App">
      <h1>Blackjack Game</h1>
      
      <div className="bankroll-display-top">
        <span>Bankroll: ${bankroll}</span>
        {currentBet > 0 && <span>Bet: ${currentBet}</span>}
      </div>
    
      <DealerHand hand={dealerHand} />
      
      <PlayerHand hand={playerHand} />

      {isGameInProgress && showActions && <PlayerActions canSplit={canSplit}/>}

      {winner && !showResultsModal && <div>{winner}</div>}
      
      {showBettingModal && (
        <BettingModal 
          onBetPlaced={dealCards}
          autoDeal={autoDeal}
          setAutoDeal={setAutoDeal}
        />
      )}
      
      {showResultsModal && (
        <ResultsModal
          result={resultMessage}
          amount={resultAmount}
          onClose={handleResultsClose}
        />
      )}
    
    </div>
  );
}

export default App;
