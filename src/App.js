'use client'
import React, { useEffect, useCallback, useState, useRef } from "react";
import { DeckContext } from "./context/DeckContext";
import PlayerHand from './components/PlayerHand';
import DealerHand from './components/DealerHand';
import PlayerActions from "./components/PlayerActions";
import BettingPanel from "./components/BettingPanel";
import ResultPanel from "./components/ResultPanel";
import StatusBanner from "./components/StatusBanner";
import checkWinner from "./logic/checkWinner";
import getHandTotal from "./logic/getHandTotal";
import drawCard from "./logic/drawCard";

// gamePhase values: 'betting' | 'dealing' | 'player' | 'dealer' | 'pausing' | 'result'

function App() {
  const {
    deck, setDeck,
    dealerHand, setDealerHand,
    playerHand, setPlayerHand,
    playerTurn, setPlayerTurn,
    bankroll, setBankroll,
    currentBet, setCurrentBet,
  } = React.useContext(DeckContext);

  const [gamePhase, setGamePhase] = useState('betting');
  const [winner, setWinner] = useState(null);
  const [resultAmount, setResultAmount] = useState(0);
  const [resultMessage, setResultMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [autoDeal, setAutoDeal] = useState(false);
  const [lastBetAmount, setLastBetAmount] = useState(0);

  // Prevents the game effect from re-entering during banner pauses.
  // Using a ref (not state) so it doesn't trigger re-renders.
  const gameTransitionRef = useRef(false);

  const suits = ["♠", "♥", "♦", "♣"];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const createDeck = (numDecks = 4) => {
    const newDeck = [];
    for (let i = 0; i < numDecks; i++) {
      for (let suit of suits) {
        for (let value of values) {
          newDeck.push({ suit, value });
        }
      }
    }
    setDeck(newDeck.sort(() => Math.random() - 0.5));
  };

  useEffect(() => {
    if (deck.length === 0) createDeck();
  }, [deck.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBetPayout = useCallback((result) => {
    if (result === 'Player Wins') {
      setBankroll(prev => prev + currentBet * 2);
      setResultAmount(currentBet);
      setResultMessage(result);
    } else if (result === 'House Wins') {
      setResultAmount(currentBet);
      setResultMessage(result);
    } else if (result === 'Push') {
      setBankroll(prev => prev + currentBet);
      setResultAmount(0);
      setResultMessage(result);
    }
  }, [currentBet, setBankroll]);

  const resolveRound = useCallback((playerH, dealerH, betAmount) => {
    const result = checkWinner({ playerHand: playerH, dealerHand: dealerH });
    setWinner(result);
    // Use betAmount passed directly to avoid stale currentBet closure
    const amount = betAmount != null ? betAmount : currentBet;
    if (result === 'Player Wins') {
      setBankroll(prev => prev + amount * 2);
      setResultAmount(amount);
    } else if (result === 'House Wins') {
      setResultAmount(amount);
    } else {
      setBankroll(prev => prev + amount);
      setResultAmount(0);
    }
    setResultMessage(result);
    return result;
  }, [currentBet, setBankroll]);

  const dealCards = useCallback((betAmount) => {
    gameTransitionRef.current = false;
    setLastBetAmount(betAmount);
    setBankroll(prev => prev - betAmount);
    setPlayerTurn(true);
    setGamePhase('dealing');
    setWinner(null);
    setStatusMessage('');

    // Capture the 4 cards immediately before any async
    const c0 = deck[0], c1 = deck[1], c2 = deck[2], c3 = deck[3];

    setTimeout(() => setPlayerHand([c0]), 500);
    setTimeout(() => setDealerHand([c1]), 1000);
    setTimeout(() => setPlayerHand([c0, c2]), 1500);
    setTimeout(() => {
      const finalPlayer = [c0, c2];
      const finalDealer = [c1, c3];
      setDealerHand(finalDealer);
      setDeck(prev => prev.slice(4));

      const playerTotal = getHandTotal(finalPlayer);
      const dealerTotal = getHandTotal(finalDealer);

      if (playerTotal === 21 && dealerTotal === 21) {
        setStatusMessage('Push! Both Blackjack!');
        setGamePhase('pausing');
        setTimeout(() => {
          setStatusMessage('');
          resolveRound(finalPlayer, finalDealer, betAmount);
          setGamePhase('result');
        }, 1500);
      } else if (dealerTotal === 21) {
        setStatusMessage('Dealer Blackjack!');
        setPlayerTurn(false);
        setGamePhase('pausing');
        setTimeout(() => {
          setStatusMessage('');
          resolveRound(finalPlayer, finalDealer, betAmount);
          setGamePhase('result');
        }, 1500);
      } else if (playerTotal === 21) {
        setStatusMessage('Blackjack!');
        setPlayerTurn(false);
        setGamePhase('pausing');
        setTimeout(() => {
          setStatusMessage('');
          resolveRound(finalPlayer, finalDealer, betAmount);
          setGamePhase('result');
        }, 1500);
      } else {
        setGamePhase('player');
      }
    }, 2000);
  }, [deck, setDeck, setDealerHand, setPlayerHand, setPlayerTurn, setBankroll, resolveRound]);

  // Game logic: player bust detection + dealer auto-play
  useEffect(() => {
    if (playerHand.length === 0 || dealerHand.length === 0) return;
    // Guard: prevent re-entry while a banner timeout is pending
    if (gameTransitionRef.current) return;

    // Player stood (playerTurn flipped to false while in player phase) → go to dealer
    if (gamePhase === 'player' && !playerTurn) {
      const playerTotal = getHandTotal(playerHand);
      if (playerTotal <= 21) {
        setGamePhase('dealer');
      }
      return;
    }

    // Player bust
    if (gamePhase === 'player' && playerTurn) {
      const playerTotal = getHandTotal(playerHand);
      if (playerTotal > 21) {
        gameTransitionRef.current = true;
        setPlayerTurn(false);
        setStatusMessage('Bust!');
        // Capture hands for the closure
        const ph = playerHand.slice();
        const dh = dealerHand.slice();
        setTimeout(() => {
          setStatusMessage('');
          resolveRound(ph, dh);
          setGamePhase('result');
        }, 1500);
      }
      return;
    }

    // Dealer auto-play
    if (gamePhase === 'dealer') {
      const dealerTotal = getHandTotal(dealerHand);
      if (dealerTotal < 17 && deck.length > 0) {
        const { updatedHand, updatedDeck } = drawCard({ hand: dealerHand, deck });
        const timeout = setTimeout(() => {
          setDealerHand(updatedHand);
          setDeck(updatedDeck);
        }, 1000);
        return () => clearTimeout(timeout);
      } else {
        // Dealer done drawing
        gameTransitionRef.current = true;
        const isBust = dealerTotal > 21;
        if (isBust) setStatusMessage('Dealer Busts!');
        const delay = isBust ? 1500 : 500;
        // Capture hands for the closure
        const ph = playerHand.slice();
        const dh = dealerHand.slice();
        setTimeout(() => {
          setStatusMessage('');
          resolveRound(ph, dh);
          setGamePhase('result');
        }, delay);
      }
    }
  }, [gamePhase, playerTurn, playerHand, dealerHand, deck, resolveRound, setDealerHand, setDeck, setPlayerTurn]);

  const handleResultsClose = useCallback(() => {
    gameTransitionRef.current = false;
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerTurn(true);
    setWinner(null);
    setStatusMessage('');
    setCurrentBet(0);

    if (autoDeal && lastBetAmount > 0 && lastBetAmount <= bankroll) {
      setTimeout(() => dealCards(lastBetAmount), 300);
    } else {
      setGamePhase('betting');
    }
  }, [autoDeal, lastBetAmount, bankroll, dealCards, setPlayerHand, setDealerHand, setPlayerTurn, setCurrentBet]);

  const canSplit = playerHand.length === 2 && playerHand[0]?.value === playerHand[1]?.value;
  const canDouble = playerHand.length === 2 && currentBet * 2 <= bankroll;

  // Hotkeys (W=Hit, S=Stand, D=Double, A=Split)
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (gamePhase !== 'player') return;
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

      const key = event.key.toLowerCase();
      switch (key) {
        case 'w': // Hit
          if (deck.length > 0) {
            const { updatedHand, updatedDeck } = drawCard({ hand: playerHand, deck });
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
          if (canDouble) {
            setBankroll(prev => prev - currentBet);
            setCurrentBet(prev => prev * 2);
            if (deck.length > 0) {
              const { updatedHand, updatedDeck } = drawCard({ hand: playerHand, deck });
              setTimeout(() => {
                setPlayerHand(updatedHand);
                setDeck(updatedDeck);
                setPlayerTurn(false);
              }, 500);
            }
          }
          break;
        case 'a': // Split (placeholder)
          if (canSplit) {
            // Split logic not yet implemented
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gamePhase, playerHand, deck, currentBet, bankroll, canSplit, canDouble, setPlayerHand, setDeck, setPlayerTurn, setBankroll, setCurrentBet]);

  return (
    <div className="game-table">
      <header className="game-header">
        <span className="game-title">Blackjack</span>
        <div className="game-hud">
          <span className="hud-item">Bankroll: ${bankroll}</span>
          {currentBet > 0 && <span className="hud-item hud-bet">Bet: ${currentBet}</span>}
        </div>
      </header>

      <div className="table-area">
        <DealerHand hand={dealerHand} gamePhase={gamePhase} />
        {statusMessage && <StatusBanner message={statusMessage} />}
        <PlayerHand hand={playerHand} />
      </div>

      <div className="controls-bar">
        {gamePhase === 'betting' && (
          <BettingPanel
            onDeal={dealCards}
            autoDeal={autoDeal}
            setAutoDeal={setAutoDeal}
          />
        )}
        {gamePhase === 'player' && !statusMessage && (
          <PlayerActions canSplit={canSplit} />
        )}
        {gamePhase === 'result' && (
          <ResultPanel
            result={resultMessage}
            amount={resultAmount}
            onNext={handleResultsClose}
          />
        )}
        {(gamePhase === 'dealing' || gamePhase === 'dealer' || gamePhase === 'pausing' || (gamePhase === 'player' && statusMessage)) && (
          <div className="waiting-indicator">
            <span className="waiting-dots">• • •</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
