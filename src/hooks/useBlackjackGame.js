'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeckContext } from '../context/DeckContext';
import { playSound, resumeAudio, setSoundsSuspended } from '../lib/sound';
import checkWinner from '../logic/checkWinner';
import getHandTotal from '../logic/getHandTotal';
import drawCard from '../logic/drawCard';
import { getBasicStrategyAction } from '../theory/basicStrategy';

// Reshuffle when fewer than 25% of the 4-deck shoe remain
const RESHUFFLE_THRESHOLD = Math.floor(4 * 52 * 0.25);
const SUITS  = ['♠', '♥', '♦', '♣'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

// Hi-Lo card counting system
const HI_LO_VALUES = { '2':1,'3':1,'4':1,'5':1,'6':1,'7':0,'8':0,'9':0,'10':-1,'J':-1,'Q':-1,'K':-1,'A':-1 };

// ── Pure helpers ──────────────────────────────────────────────────────────────

function classifyHandType(c0, c2) {
  if (c0.value === c2.value) return 'pair';
  if (c0.value === 'A' || c2.value === 'A') return 'soft';
  return 'hard';
}

// Deck positions: 0=player card 1, 1=dealer upcard, 2=player card 2, 3=dealer hole card
function setupTestCards(deck, p1, p2, d1, d2) {
  const remaining = [...deck];
  const targets = [p1, d1, p2, d2]; // ordered by deal position
  const result = targets.map(value => {
    if (!value) return null;
    const idx = remaining.findIndex(c => c.value === value);
    return idx >= 0 ? remaining.splice(idx, 1)[0] : null;
  });
  let ri = 0;
  const final = result.map(card => card ?? remaining[ri++]);
  return [...final, ...remaining.slice(ri)];
}

function findValidArrangement(deck, enabledTypes) {
  if (enabledTypes.length === 0) return deck;
  const n = deck.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (enabledTypes.includes(classifyHandType(deck[i], deck[j]))) {
        const d = [...deck];
        [d[0], d[i]] = [d[i], d[0]];
        const jAdj = j === 0 ? i : j;
        [d[2], d[jAdj]] = [d[jAdj], d[2]];
        return d;
      }
    }
  }
  return deck;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBlackjackGame({
  initialStats,
  onRoundEnd,
  onReset,
  onMenuClose,
  trainingMode,
  trainingSetup = false,
  practiceHardHands,
  practiceSoftHands,
  practicePairs,
  cardCountingEnabled = false,
  cardCountingInterval = 5,
  cardCountingMetric = 'true',
  testHand,
  testDealerHand,
  earlyResign = false,
}) {
  const {
    deck, setDeck,
    dealerHand, setDealerHand,
    playerHand, setPlayerHand,
    playerTurn, setPlayerTurn,
    bankroll, setBankroll,
    currentBet, setCurrentBet,
  } = React.useContext(DeckContext);

  // Always-current ref for trainingMode — prevents stale closures in callbacks
  const trainingModeRef = useRef(trainingMode);
  trainingModeRef.current = trainingMode;

  const [gamePhase, setGamePhase]           = useState('betting');
  const [winner, setWinner]                 = useState(null);
  const [resultAmount, setResultAmount]     = useState(0);
  const [resultMessage, setResultMessage]   = useState('');
  const [statusMessage, setStatusMessage]   = useState('');
  const [lastBetAmount, setLastBetAmount]   = useState(0);
  const [stats, setStats]                   = useState(initialStats);
  const [strategyStats, setStrategyStats]   = useState({ total: 0, correct: 0 });
  const [expectedAction, setExpectedAction] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [trainingFeedback, setTrainingFeedback] = useState(null);
  const [cardCountingStats, setCardCountingStats] = useState({ total: 0, correct: 0 });
  const [cardCountingQuiz, setCardCountingQuiz]       = useState(null);
  const [cardCountingFeedback, setCardCountingFeedback] = useState(null);

  // Split state
  const [splitHand2, setSplitHand2]                   = useState([]);
  const [splitHand1Completed, setSplitHand1Completed] = useState([]);
  const [splitBet, setSplitBet]                       = useState(0);
  const [splitHand1Bet, setSplitHand1Bet]             = useState(0);
  const [splitResults, setSplitResults]               = useState(null);
  const [pressedAction, setPressedAction]             = useState(null);
  const pressedActionTimeoutRef = useRef(null);

  // Refs
  const bankrollRef        = useRef(bankroll);
  const initialTrainingRef = useRef({ hands: initialStats.trainingHands ?? 0, correct: initialStats.trainingCorrect ?? 0 });
  const strategyStatsRef   = useRef({ total: 0, correct: 0 });
  const statsRef           = useRef(stats);
  const gameTransitionRef  = useRef(false);
  const dealCardsRef       = useRef(null);
  const handIdRef          = useRef(0);

  // Card counting (Hi-Lo running count, tracked from deck shrinkage — reshuffles reset it to 0)
  const runningCountRef          = useRef(0);
  const prevDeckRef              = useRef(deck);
  const initialCardCountingRef   = useRef({ hands: initialStats.cardCountingHands ?? 0, correct: initialStats.cardCountingCorrect ?? 0 });
  const cardCountingStatsRef     = useRef({ total: 0, correct: 0 });
  const roundsSinceQuizRef       = useRef(0);
  const cardCountingEnabledRef   = useRef(cardCountingEnabled);
  const cardCountingIntervalRef  = useRef(cardCountingInterval);
  const cardCountingMetricRef    = useRef(cardCountingMetric);
  cardCountingEnabledRef.current  = cardCountingEnabled;
  cardCountingIntervalRef.current = cardCountingInterval;
  cardCountingMetricRef.current   = cardCountingMetric;

  // Card counting requires seeing every card dealt (dealer hole card, hits, dealer's draws) —
  // so training rounds play out fully instead of ending after the first decision.
  const fullHandModeRef = useRef(false);
  fullHandModeRef.current = trainingMode === 'basic' && cardCountingEnabled;
  const actionFeedbackTimeoutRef = useRef(null);

  useEffect(() => { bankrollRef.current = bankroll; }, [bankroll]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  // Update running count whenever the deck shrinks (cards dealt) or resets (reshuffle).
  // Diffed by value counts rather than array position — training mode's dealCards()
  // reorders the deck (findValidArrangement) before dealing, so the dealt cards aren't
  // necessarily the previous deck's first N entries.
  useEffect(() => {
    const prevDeck = prevDeckRef.current;
    if (deck.length > prevDeck.length) {
      runningCountRef.current = 0;
    } else if (deck.length < prevDeck.length) {
      const prevCounts = {};
      for (const c of prevDeck) prevCounts[c.value] = (prevCounts[c.value] || 0) + 1;
      const newCounts = {};
      for (const c of deck) newCounts[c.value] = (newCounts[c.value] || 0) + 1;
      let delta = 0;
      for (const value of Object.keys(prevCounts)) {
        const dealt = prevCounts[value] - (newCounts[value] || 0);
        if (dealt > 0) delta += dealt * (HI_LO_VALUES[value] ?? 0);
      }
      runningCountRef.current += delta;
    }
    prevDeckRef.current = deck;
  }, [deck]);

  const getTrueCount = useCallback(() => {
    const decksRemaining = Math.max(deck.length / 52, 0.25);
    return runningCountRef.current / decksRemaining;
  }, [deck.length]);

  // Init deck on mount if empty
  useEffect(() => {
    if (deck.length === 0) {
      const newDeck = [];
      for (let i = 0; i < 4; i++)
        for (const suit of SUITS)
          for (const value of VALUES)
            newDeck.push({ suit, value });
      setDeck(newDeck.sort(() => Math.random() - 0.5));
    }
  }, [deck.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear training state when mode changes
  useEffect(() => {
    setExpectedAction(null);
    setActionFeedback(null);
    setTrainingFeedback(null);
    setCardCountingQuiz(null);
    setCardCountingFeedback(null);
    roundsSinceQuizRef.current = 0;
  }, [trainingMode]);

  // `stats` state stays equal to the full `initialStats` prop (trainingHands/cardCountingHands
  // baked in) whenever setStats is never called during a training-only session. Any onRoundEnd
  // payload that spreads `stats` without also re-supplying fresh trainingStats/cardCountingStats
  // would silently regress the other counter back to that stale session-start baseline — so every
  // training-mode save always carries both, reflecting the latest ref values.
  const getPersistedTrainingFields = () => {
    if (trainingModeRef.current !== 'basic') return {};
    return {
      trainingStats: {
        trainingHands: initialTrainingRef.current.hands + strategyStatsRef.current.total,
        trainingCorrect: initialTrainingRef.current.correct + strategyStatsRef.current.correct,
      },
      cardCountingStats: {
        cardCountingHands: initialCardCountingRef.current.hands + cardCountingStatsRef.current.total,
        cardCountingCorrect: initialCardCountingRef.current.correct + cardCountingStatsRef.current.correct,
      },
    };
  };

  // ── Game logic ──────────────────────────────────────────────────────────────

  const resolveRound = useCallback((playerH, dealerH, betAmount) => {
    const result = checkWinner({ playerHand: playerH, dealerHand: dealerH });
    setWinner(result);
    const amount = betAmount != null ? betAmount : currentBet;
    const isNaturalBlackjack = result === 'Player Wins' && playerH.length === 2 && getHandTotal(playerH) === 21;
    let delta = 0;
    if (trainingModeRef.current !== 'basic') {
      if (isNaturalBlackjack) {
        delta = Math.floor(amount * 2.5);
        setBankroll(prev => prev + delta);
        setResultAmount(Math.floor(amount * 1.5));
      } else if (result === 'Player Wins') {
        delta = amount * 2;
        setBankroll(prev => prev + delta);
        setResultAmount(amount);
      } else if (result === 'House Wins') {
        setResultAmount(amount);
      } else {
        delta = amount;
        setBankroll(prev => prev + delta);
        setResultAmount(0);
      }
    }
    setResultMessage(isNaturalBlackjack ? 'Blackjack!' : result);
    const incomeDelta = trainingModeRef.current !== 'basic' ? delta - (betAmount ?? currentBet) : 0;
    setStats(prev => {
      const next = trainingModeRef.current === 'basic' ? prev : {
        hands: prev.hands + 1,
        wins: prev.wins + (result === 'Player Wins' ? 1 : 0),
        losses: prev.losses + (result === 'House Wins' ? 1 : 0),
        pushes: prev.pushes + (result === 'Push' ? 1 : 0),
        totalIncome: prev.totalIncome + incomeDelta,
        blackjacks: prev.blackjacks + (isNaturalBlackjack ? 1 : 0),
      };
      onRoundEnd?.({ bankroll: bankrollRef.current + delta, stats: next, ...getPersistedTrainingFields() });
      return next;
    });
    return result;
  }, [currentBet, setBankroll, onRoundEnd]);

  const cancelHand = useCallback(() => {
    handIdRef.current += 1;
    gameTransitionRef.current = false;
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerTurn(true);
    setWinner(null);
    setStatusMessage('');
    setCurrentBet(0);
    setSplitHand2([]);
    setSplitHand1Completed([]);
    setSplitBet(0);
    setSplitHand1Bet(0);
    setSplitResults(null);
    setTrainingFeedback(null);
    setExpectedAction(null);
    setActionFeedback(null);
    setCardCountingQuiz(null);
    setCardCountingFeedback(null);
    setGamePhase('betting');
  }, [setPlayerHand, setDealerHand, setPlayerTurn, setCurrentBet]);

  const dealCards = useCallback((betAmount) => {
    const handId = ++handIdRef.current;
    resumeAudio();
    gameTransitionRef.current = false;
    setPlayerHand([]);
    setDealerHand([]);
    setLastBetAmount(betAmount);
    if (trainingModeRef.current !== 'basic') setBankroll(prev => prev - betAmount);
    setPlayerTurn(true);
    setGamePhase('dealing');
    setWinner(null);
    setStatusMessage('');

    let workingDeck = deck;
    if (trainingModeRef.current !== 'basic' && deck.length < RESHUFFLE_THRESHOLD) {
      playSound('shuffle');
      const newDeck = [];
      for (let i = 0; i < 4; i++)
        for (const suit of SUITS)
          for (const value of VALUES)
            newDeck.push({ suit, value });
      newDeck.sort(() => Math.random() - 0.5);
      workingDeck = newDeck;
      setDeck(newDeck);
    }

    if (trainingModeRef.current === 'basic') {
      const enabledTypes = [
        practiceHardHands && 'hard',
        practiceSoftHands && 'soft',
        practicePairs     && 'pair',
      ].filter(Boolean);
      workingDeck = findValidArrangement(deck, enabledTypes);
    } else if (testHand || testDealerHand) {
      workingDeck = setupTestCards(
        deck,
        testHand?.v1, testHand?.v2,
        testDealerHand?.v1, testDealerHand?.v2,
      );
    }

    const c0 = workingDeck[0], c1 = workingDeck[1], c2 = workingDeck[2], c3 = workingDeck[3];

    setTimeout(() => { if (handIdRef.current !== handId) return; playSound('draw'); setPlayerHand([c0]); }, 650);
    setTimeout(() => { if (handIdRef.current !== handId) return; playSound('draw'); setDealerHand([c1]); }, 1300);
    setTimeout(() => { if (handIdRef.current !== handId) return; playSound('draw'); setPlayerHand([c0, c2]); }, 1950);
    setTimeout(() => {
      if (handIdRef.current !== handId) return;
      playSound('draw');
      const finalPlayer = [c0, c2];
      const finalDealer = [c1, c3];
      setDealerHand(finalDealer);
      setDeck(workingDeck.slice(4));

      const playerTotal = getHandTotal(finalPlayer);
      const dealerTotal = getHandTotal(finalDealer);

      if (trainingModeRef.current === 'basic' && (playerTotal === 21 || dealerTotal === 21)) {
        setGamePhase('betting');
      } else if (playerTotal === 21 && dealerTotal === 21) {
        setStatusMessage('Push! Both Blackjack!');
        setGamePhase('pausing');
        setTimeout(() => {
          if (handIdRef.current !== handId) return;
          setStatusMessage('');
          resolveRound(finalPlayer, finalDealer, betAmount);
          setGamePhase('result');
        }, 1500);
      } else if (dealerTotal === 21) {
        setStatusMessage('Dealer Blackjack!');
        playSound('bust');
        setPlayerTurn(false);
        setGamePhase('pausing');
        setTimeout(() => {
          if (handIdRef.current !== handId) return;
          setStatusMessage('');
          resolveRound(finalPlayer, finalDealer, betAmount);
          setGamePhase('result');
        }, 1500);
      } else if (playerTotal === 21) {
        setStatusMessage('Blackjack!');
        playSound('win');
        setPlayerTurn(false);
        setGamePhase('pausing');
        setTimeout(() => {
          if (handIdRef.current !== handId) return;
          setStatusMessage('');
          resolveRound(finalPlayer, finalDealer, betAmount);
          setGamePhase('result');
        }, 1500);
      } else {
        setGamePhase('player');
        if (trainingModeRef.current === 'basic') {
          const canSplitNow = finalPlayer[0].value === finalPlayer[1].value;
          setExpectedAction(getBasicStrategyAction(finalPlayer, finalDealer[1], true, canSplitNow, true));
        }
      }
    }, 2600);
  }, [deck, setDeck, setDealerHand, setPlayerHand, setPlayerTurn, setBankroll, resolveRound,
      practiceHardHands, practiceSoftHands, practicePairs, testHand]);

  dealCardsRef.current = dealCards;

  const handleActionValidation = useCallback((action) => {
    if (trainingModeRef.current !== 'basic' || !expectedAction) return;
    const isCorrect = action === expectedAction;
    playSound(isCorrect ? 'win' : 'bust');
    const next = { total: strategyStatsRef.current.total + 1, correct: strategyStatsRef.current.correct + (isCorrect ? 1 : 0) };
    strategyStatsRef.current = next;
    setStrategyStats(next);
    onRoundEnd?.({
      bankroll: bankrollRef.current,
      stats: statsRef.current,
      ...getPersistedTrainingFields(),
    });
    // Recorded regardless of mode — full-hand mode shows this on the eventual result
    // panel instead of the win/lose outcome, since training rounds aren't about winning.
    setTrainingFeedback({ correct: isCorrect, expected: expectedAction });
    if (fullHandModeRef.current) {
      // Only the first decision per hand is scored against basic strategy — clear it so
      // later hits/etc. in the same hand (which now plays out fully) aren't re-validated.
      setExpectedAction(null);
      setActionFeedback(isCorrect ? 'correct' : 'incorrect');
      clearTimeout(actionFeedbackTimeoutRef.current);
      actionFeedbackTimeoutRef.current = setTimeout(() => setActionFeedback(null), 600);
    } else {
      setGamePhase('training-result');
    }
  }, [expectedAction, onRoundEnd]);

  const handleDouble = useCallback(() => {
    if (playerHand.length !== 2 || (trainingModeRef.current !== 'basic' && currentBet > bankroll) || deck.length === 0) return false;
    handleActionValidation('double');
    if (trainingModeRef.current === 'basic' && !fullHandModeRef.current) return true;
    playSound('chip');
    if (trainingModeRef.current !== 'basic') {
      setBankroll(prev => prev - currentBet);
      setCurrentBet(prev => prev * 2);
    }
    const { updatedHand, updatedDeck } = drawCard({ hand: playerHand, deck });
    setTimeout(() => {
      playSound('draw');
      setTimeout(() => { setPlayerHand(updatedHand); setDeck(updatedDeck); }, 500);
      setTimeout(() => setPlayerTurn(false), 1150);
    }, 200);
    return true;
  }, [playerHand, currentBet, bankroll, deck, setBankroll, setCurrentBet, setPlayerHand, setDeck, setPlayerTurn,
      handleActionValidation]);

  const handleStand = useCallback(() => {
    handleActionValidation('stand');
    if (trainingModeRef.current === 'basic' && !fullHandModeRef.current) return;
    playSound('stand');
    setTimeout(() => setPlayerTurn(false), 500);
  }, [setPlayerTurn, handleActionValidation]);

  const handleSplit = useCallback(() => {
    const isAlreadySplit = splitHand2.length > 0 || splitHand1Completed.length > 0;
    if (
      playerHand.length !== 2 ||
      playerHand[0]?.value !== playerHand[1]?.value ||
      isAlreadySplit ||
      deck.length < 2 ||
      (trainingModeRef.current !== 'basic' && currentBet > bankroll)
    ) return false;
    handleActionValidation('split');
    if (trainingModeRef.current === 'basic' && !fullHandModeRef.current) return true;
    const [card1, card2] = playerHand;
    const newCard1 = deck[0];
    const newCard2 = deck[1];
    if (trainingModeRef.current !== 'basic') setBankroll(prev => prev - currentBet);
    setSplitBet(currentBet);
    setDeck(prev => prev.slice(2));
    setPlayerHand([card1]);
    setSplitHand2([card2]);
    setTimeout(() => { playSound('draw'); setPlayerHand([card1, newCard1]); }, 650);
    setTimeout(() => { playSound('draw'); setSplitHand2([card2, newCard2]); }, 1300);
    return true;
  }, [playerHand, splitHand2, splitHand1Completed, currentBet, bankroll, deck, setBankroll, setDeck, setPlayerHand,
      handleActionValidation]);

  const handleResign = useCallback(() => {
    if (playerHand.length !== 2 || splitHand2.length > 0 || splitHand1Completed.length > 0) return false;
    handleActionValidation('resign');
    if (trainingModeRef.current === 'basic' && !fullHandModeRef.current) return true;

    const isTraining = trainingModeRef.current === 'basic';
    const handId = handIdRef.current;
    const dealerTotal = getHandTotal(dealerHand);
    const dealerHasBJ = dealerHand.length === 2 && dealerTotal === 21;

    if (!earlyResign && dealerHasBJ) {
      gameTransitionRef.current = true;
      setPlayerTurn(false);
      setStatusMessage('Dealer Blackjack!');
      playSound('bust');
      const ph = playerHand.slice();
      const dh = dealerHand.slice();
      setTimeout(() => {
        if (handIdRef.current !== handId) return;
        setStatusMessage('');
        resolveRound(ph, dh);
        setGamePhase('result');
      }, 1500);
    } else {
      gameTransitionRef.current = true;
      const halfBet = Math.floor(currentBet / 2);
      if (!isTraining) setBankroll(prev => prev + halfBet);
      setPlayerTurn(false);
      setStatusMessage('Resigned!');
      playSound('bust');
      const lostAmount = currentBet - halfBet;
      setTimeout(() => {
        if (handIdRef.current !== handId) return;
        setStatusMessage('');
        setWinner('House Wins');
        setResultMessage('Resigned');
        setResultAmount(lostAmount);
        const incomeDelta = isTraining ? 0 : -lostAmount;
        setStats(prev => {
          const next = isTraining ? prev : {
            hands: prev.hands + 1,
            wins: prev.wins,
            losses: prev.losses + 1,
            pushes: prev.pushes,
            totalIncome: prev.totalIncome + incomeDelta,
            blackjacks: prev.blackjacks,
          };
          onRoundEnd?.({ bankroll: bankrollRef.current + (isTraining ? 0 : halfBet), stats: next, ...getPersistedTrainingFields() });
          return next;
        });
        setGamePhase('result');
      }, 1500);
    }
    return true;
  }, [playerHand, splitHand2, splitHand1Completed, dealerHand, currentBet, earlyResign,
      setBankroll, setPlayerTurn, resolveRound, handleActionValidation, onRoundEnd]);

  const handleResultsClose = useCallback(() => {
    gameTransitionRef.current = false;
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerTurn(true);
    setWinner(null);
    setStatusMessage('');
    setCurrentBet(0);
    setSplitHand2([]);
    setSplitHand1Completed([]);
    setSplitBet(0);
    setSplitHand1Bet(0);
    setSplitResults(null);
    // Rounds only reach 'result' in training via full-hand mode (short-circuit training
    // never gets past 'training-result') — so this is the right place to pace the quiz.
    if (trainingModeRef.current === 'basic' && cardCountingEnabledRef.current) {
      roundsSinceQuizRef.current += 1;
      if (roundsSinceQuizRef.current >= Math.max(cardCountingIntervalRef.current, 1)) {
        roundsSinceQuizRef.current = 0;
        setCardCountingQuiz({ runningCount: runningCountRef.current, trueCount: getTrueCount() });
        setGamePhase('card-counting-quiz');
        return;
      }
    }
    setGamePhase('betting');
  }, [setPlayerHand, setDealerHand, setPlayerTurn, setCurrentBet, getTrueCount]);

  const handleReset = useCallback(() => {
    gameTransitionRef.current = false;
    setBankroll(1000);
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerTurn(true);
    setWinner(null);
    setStatusMessage('');
    setCurrentBet(0);
    setLastBetAmount(0);
    setSplitHand2([]);
    setSplitHand1Completed([]);
    setSplitBet(0);
    setSplitHand1Bet(0);
    setSplitResults(null);
    setStats({ hands: 0, wins: 0, losses: 0, pushes: 0, totalIncome: 0, blackjacks: 0 });
    setStrategyStats({ total: 0, correct: 0 });
    setExpectedAction(null);
    setActionFeedback(null);
    setCardCountingStats({ total: 0, correct: 0 });
    cardCountingStatsRef.current = { total: 0, correct: 0 };
    setCardCountingQuiz(null);
    setCardCountingFeedback(null);
    roundsSinceQuizRef.current = 0;
    onMenuClose?.();
    setGamePhase('betting');
    onReset?.();
  }, [setBankroll, setPlayerHand, setDealerHand, setPlayerTurn, setCurrentBet, onMenuClose, onReset]);

  // ── Main game effect: bust detection + dealer auto-play ─────────────────────

  useEffect(() => {
    if (playerHand.length === 0 || dealerHand.length === 0) return;
    if (gameTransitionRef.current) return;
    if (gamePhase === 'training-result') return;
    const handId = handIdRef.current;

    if (gamePhase === 'player' && !playerTurn) {
      if (splitHand2.length > 0) {
        setSplitHand1Completed(playerHand.slice());
        setSplitHand1Bet(currentBet);
        setCurrentBet(splitBet);
        setPlayerHand(splitHand2);
        setSplitHand2([]);
        setPlayerTurn(true);
      } else {
        const playerTotal = getHandTotal(playerHand);
        if (playerTotal <= 21) {
          setGamePhase('dealer');
        } else {
          gameTransitionRef.current = true;
          const ph = playerHand.slice();
          const dh = dealerHand.slice();
          const isInSplitHand2 = splitHand1Completed.length > 0;
          setTimeout(() => {
            if (handIdRef.current !== handId) return;
            setStatusMessage('Bust!');
            playSound('bust');
            setTimeout(() => {
              if (handIdRef.current !== handId) return;
              setStatusMessage('');
              if (isInSplitHand2) {
                gameTransitionRef.current = false;
                setGamePhase('dealer');
              } else {
                resolveRound(ph, dh);
                setGamePhase('result');
              }
            }, 1500);
          }, 600);
        }
      }
      return;
    }

    if (gamePhase === 'player' && playerTurn) {
      const playerTotal = getHandTotal(playerHand);

      if (playerTotal > 21) {
        gameTransitionRef.current = true;
        const ph = playerHand.slice();
        const dh = dealerHand.slice();
        const isSplitHand1 = splitHand2.length > 0;
        const isInSplitHand2 = splitHand1Completed.length > 0;
        const hand2Snap = splitHand2.slice();
        const bet1Snap = currentBet;
        const splitBetSnap = splitBet;

        setTimeout(() => {
          if (handIdRef.current !== handId) return;
          setPlayerTurn(false);
          setStatusMessage('Bust!');
          playSound('bust');
          setTimeout(() => {
            if (handIdRef.current !== handId) return;
            setStatusMessage('');
            if (isSplitHand1) {
              setSplitHand1Completed(ph);
              setSplitHand1Bet(bet1Snap);
              setCurrentBet(splitBetSnap);
              setPlayerHand(hand2Snap);
              setSplitHand2([]);
              setPlayerTurn(true);
              gameTransitionRef.current = false;
            } else if (isInSplitHand2) {
              gameTransitionRef.current = false;
              setGamePhase('dealer');
            } else {
              resolveRound(ph, dh);
              setGamePhase('result');
            }
          }, 1500);
        }, 650);

      } else if (playerTotal === 21) {
        const isInSplit = splitHand2.length > 0 || splitHand1Completed.length > 0;
        if (playerHand.length === 2 && !isInSplit) {
          gameTransitionRef.current = true;
          setPlayerTurn(false);
          const ph = playerHand.slice();
          const dh = dealerHand.slice();
          setStatusMessage('Blackjack!');
          setTimeout(() => {
            if (handIdRef.current !== handId) return;
            setStatusMessage('');
            resolveRound(ph, dh);
            setGamePhase('result');
          }, 1500);
        } else {
          setPlayerTurn(false);
        }
      }
      return;
    }

    if (gamePhase === 'dealer') {
      const dealerTotal = getHandTotal(dealerHand);
      if (dealerTotal < 17 && deck.length > 0) {
        const { updatedHand, updatedDeck } = drawCard({ hand: dealerHand, deck });
        const timeout = setTimeout(() => {
          if (handIdRef.current !== handId) return;
          playSound('draw');
          setDealerHand(updatedHand);
          setDeck(updatedDeck);
        }, 1000);
        return () => clearTimeout(timeout);
      } else {
        gameTransitionRef.current = true;
        const ph = playerHand.slice();
        const dh = dealerHand.slice();
        const ph1 = splitHand1Completed.slice();
        const bet2 = currentBet;
        const bet1 = splitHand1Bet;

        setTimeout(() => {
          if (handIdRef.current !== handId) return;
          if (ph1.length > 0) {
            const result1 = checkWinner({ playerHand: ph1, dealerHand: dh });
            const result2 = checkWinner({ playerHand: ph, dealerHand: dh });
            const hasWin  = result1 === 'Player Wins' || result2 === 'Player Wins';
            const hasPush = !hasWin && (result1 === 'Push' || result2 === 'Push');
            playSound(hasWin ? 'win' : hasPush ? 'push' : 'bust');
            let splitDelta = 0;
            if (trainingModeRef.current !== 'basic') {
              if (result1 === 'Player Wins') { setBankroll(prev => prev + bet1 * 2); splitDelta += bet1 * 2; }
              else if (result1 === 'Push') { setBankroll(prev => prev + bet1); splitDelta += bet1; }
              if (result2 === 'Player Wins') { setBankroll(prev => prev + bet2 * 2); splitDelta += bet2 * 2; }
              else if (result2 === 'Push') { setBankroll(prev => prev + bet2); splitDelta += bet2; }
            }
            const splitIncomeDelta = trainingModeRef.current !== 'basic' ? splitDelta - (bet1 + bet2) : 0;
            setStats(prev => {
              const next = trainingModeRef.current === 'basic' ? prev : {
                hands: prev.hands + 2,
                wins: prev.wins + (result1 === 'Player Wins' ? 1 : 0) + (result2 === 'Player Wins' ? 1 : 0),
                losses: prev.losses + (result1 === 'House Wins' ? 1 : 0) + (result2 === 'House Wins' ? 1 : 0),
                pushes: prev.pushes + (result1 === 'Push' ? 1 : 0) + (result2 === 'Push' ? 1 : 0),
                totalIncome: prev.totalIncome + splitIncomeDelta,
                blackjacks: prev.blackjacks,
              };
              onRoundEnd?.({ bankroll: bankrollRef.current + splitDelta, stats: next, ...getPersistedTrainingFields() });
              return next;
            });
            setSplitResults({ result1, result2, amount1: bet1, amount2: bet2 });
            setTimeout(() => { if (handIdRef.current !== handId) return; setGamePhase('result'); }, 600);
          } else {
            if (dealerTotal > 21) {
              setStatusMessage('Dealer Busts!');
              playSound('win');
            } else {
              const result = checkWinner({ playerHand: ph, dealerHand: dh });
              if (result === 'Player Wins') { setStatusMessage('You Win!'); playSound('win'); }
              else if (result === 'House Wins') { setStatusMessage('Dealer Wins!'); playSound('bust'); }
              else { setStatusMessage('Push!'); playSound('push'); }
            }
            setTimeout(() => {
              if (handIdRef.current !== handId) return;
              setStatusMessage('');
              resolveRound(ph, dh);
              setGamePhase('result');
            }, 1500);
          }
        }, 600);
      }
    }
  }, [gamePhase, playerTurn, playerHand, dealerHand, deck, resolveRound,
      setDealerHand, setDeck, setPlayerTurn, setCurrentBet, setBankroll,
      splitHand2, splitHand1Completed, splitBet, splitHand1Bet, currentBet, onRoundEnd]);

  // ── Hotkeys ──────────────────────────────────────────────────────────────────

  const flashPressedAction = useCallback((action) => {
    clearTimeout(pressedActionTimeoutRef.current);
    setPressedAction(action);
    pressedActionTimeoutRef.current = setTimeout(() => setPressedAction(null), 180);
  }, []);

  useEffect(() => () => clearTimeout(pressedActionTimeoutRef.current), []);
  useEffect(() => () => clearTimeout(actionFeedbackTimeoutRef.current), []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (gamePhase !== 'player') return;
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      const key = event.key.toLowerCase();
      switch (key) {
        case 'w':
          if (deck.length > 0) {
            flashPressedAction('hit');
            handleActionValidation('hit');
            if (trainingModeRef.current !== 'basic' || fullHandModeRef.current) {
              const { updatedHand, updatedDeck } = drawCard({ hand: playerHand, deck });
              setTimeout(() => { playSound('draw'); setPlayerHand(updatedHand); setDeck(updatedDeck); }, 500);
            } else {
              playSound('draw');
            }
          }
          break;
        case 's':
          flashPressedAction('stand');
          handleActionValidation('stand');
          if (trainingModeRef.current !== 'basic' || fullHandModeRef.current) {
            playSound('stand');
            setTimeout(() => setPlayerTurn(false), 500);
          }
          break;
        case 'd': if (handleDouble()) flashPressedAction('double'); break;
        case 'a': if (handleSplit()) flashPressedAction('split'); break;
        case 'r': if (handleResign()) flashPressedAction('resign'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gamePhase, playerHand, deck, handleDouble, handleSplit, handleResign, setPlayerHand, setDeck, setPlayerTurn, handleActionValidation, flashPressedAction]);

  // ── Suspend sounds while the round result is on screen ───────────────────────

  useEffect(() => {
    setSoundsSuspended(gamePhase === 'result' || gamePhase === 'training-result');
  }, [gamePhase]);

  // ── Auto-advance training-result after 1.8s ──────────────────────────────────

  useEffect(() => {
    if (gamePhase !== 'training-result') return;
    const handId = handIdRef.current;
    const t = setTimeout(() => {
      if (handIdRef.current !== handId) return;
      cancelHand();
    }, 1800);
    return () => clearTimeout(t);
  }, [gamePhase, cancelHand]);

  // ── Card counting quiz handling ──────────────────────────────────────────────

  const submitCardCountingAnswer = useCallback((guesses) => {
    if (!cardCountingQuiz) return;
    const metric = cardCountingMetricRef.current;
    const runningMatches = Math.round(guesses.running) === Math.round(cardCountingQuiz.runningCount);
    const trueMatches    = Math.round(guesses.true) === Math.round(cardCountingQuiz.trueCount);
    const isCorrect = metric === 'running' ? runningMatches
      : metric === 'true' ? trueMatches
      : runningMatches && trueMatches;

    const next = { total: cardCountingStatsRef.current.total + 1, correct: cardCountingStatsRef.current.correct + (isCorrect ? 1 : 0) };
    cardCountingStatsRef.current = next;
    setCardCountingStats(next);
    onRoundEnd?.({
      bankroll: bankrollRef.current,
      stats: statsRef.current,
      ...getPersistedTrainingFields(),
    });
    setCardCountingFeedback({ correct: isCorrect, guesses, actual: cardCountingQuiz, metric });
    setCardCountingQuiz(null);
    setGamePhase('card-counting-result');
  }, [cardCountingQuiz, onRoundEnd]);

  const handleCardCountingResultClose = useCallback(() => {
    setCardCountingFeedback(null);
    setGamePhase('betting');
  }, []);

  // ── Auto-deal next hand in training mode ─────────────────────────────────────

  useEffect(() => {
    if (trainingMode !== 'basic' || gamePhase !== 'betting' || trainingSetup) return;
    const t = setTimeout(() => {
      if (trainingModeRef.current !== 'basic') return;
      dealCardsRef.current?.(lastBetAmount || 10);
    }, 350);
    return () => clearTimeout(t);
  }, [trainingMode, gamePhase, lastBetAmount, trainingSetup]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const isSplitActive  = splitHand2.length > 0 || splitHand1Completed.length > 0;
  const isOutOfMoney   = gamePhase === 'betting' && bankroll < 10;
  const hasSplitPair   = playerHand.length === 2 && playerHand[0]?.value === playerHand[1]?.value && splitHand2.length === 0 && splitHand1Completed.length === 0;
  const canSplit       = hasSplitPair && currentBet <= bankroll;
  const canDouble      = playerHand.length === 2 && currentBet <= bankroll;
  const canResign      = playerHand.length === 2 && splitHand2.length === 0 && splitHand1Completed.length === 0;

  return {
    // State
    gamePhase, winner, resultAmount, resultMessage, statusMessage, lastBetAmount,
    stats, strategyStats, expectedAction, actionFeedback, trainingFeedback,
    splitHand2, splitHand1Completed, splitBet, splitHand1Bet, splitResults, pressedAction,
    cardCountingStats, cardCountingQuiz, cardCountingFeedback,
    // DeckContext values (re-exported for convenience)
    playerHand, dealerHand, bankroll, currentBet,
    // Derived
    isSplitActive, isOutOfMoney, hasSplitPair, canSplit, canDouble, canResign,
    // Handlers
    dealCards, cancelHand, handleDouble, handleStand, handleSplit, handleResign,
    handleReset, handleResultsClose, handleActionValidation,
    submitCardCountingAnswer, handleCardCountingResultClose,
  };
}
