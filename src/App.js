'use client'
import React, { useEffect, useCallback, useState, useRef } from "react";
import { useSession, signOut } from 'next-auth/react';
import { setVolumeEnabled, setVolumeLevel as applyVolumeLevel } from "./lib/sound";
import { useBlackjackGame } from "./hooks/useBlackjackGame";
import PlayerHand from './components/PlayerHand';
import DealerHand from './components/DealerHand';
import PlayerActions from "./components/PlayerActions";
import BettingPanel from "./components/BettingPanel";
import TrainingFeedback from "./components/TrainingFeedback";
import CardCountingQuiz from "./components/CardCountingQuiz";
import CardCountingFeedback from "./components/CardCountingFeedback";
import ResultPanel from "./components/ResultPanel";
import StatusBanner from "./components/StatusBanner";
import StrategyTableModal from "./components/StrategyTableModal";
import CardCountingTutorialModal from "./components/CardCountingTutorialModal";
import LeaderboardModal from "./components/LeaderboardModal";
import TestDealPanel from "./components/TestDealPanel";
import Link from 'next/link';

// gamePhase values: 'betting' | 'dealing' | 'player' | 'dealer' | 'pausing' | 'result'

function App({ initialStats = { hands: 0, wins: 0, losses: 0, pushes: 0, totalIncome: 0, blackjacks: 0, trainingHands: 0, trainingCorrect: 0 }, onRoundEnd, onReset, onShowAuth, volumeOn, onVolumeChange, volumeLevel = 1, onVolumeLevelChange, rebetEnabled = true, onRebetChange, showHotkeys = true, onShowHotkeysChange, betMode = 'fixed', onBetModeChange, onSwitchToMultiplayer }) {
  const { data: session } = useSession();

  // ── UI-only state ────────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen]             = useState(false);
  const [trainingMode, setTrainingMode]     = useState('off');
  const [trainingSetup, setTrainingSetup]   = useState(false);
  const [practiceHardHands, setPracticeHardHands] = useState(true);
  const [practiceSoftHands, setPracticeSoftHands] = useState(true);
  const [practicePairs, setPracticePairs]         = useState(true);
  const [cardCountingEnabled, setCardCountingEnabled]   = useState(false);
  const [cardCountingInterval, setCardCountingInterval] = useState(5);
  const [cardCountingMetric, setCardCountingMetric]     = useState('true');
  const [showStrategyTable, setShowStrategyTable] = useState(false);
  const [showCardCountingTutorial, setShowCardCountingTutorial] = useState(false);
  const [showLeaderboard, setShowLeaderboard]     = useState(false);
  const [testHand, setTestHand]             = useState(null);
  const [testDealerHand, setTestDealerHand] = useState(null);
  const earlyResign = true;
  const fullHandMode = trainingMode === 'basic' && cardCountingEnabled;
  const menuRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 930);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 930);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Sync volume ──────────────────────────────────────────────────────────────
  useEffect(() => { setVolumeEnabled(volumeOn); }, [volumeOn]);
  useEffect(() => { applyVolumeLevel(volumeLevel); }, [volumeLevel]);

  // ── Close menu on outside click ──────────────────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // ── Game logic (the heavy lifting) ──────────────────────────────────────────
  const {
    gamePhase, statusMessage, lastBetAmount,
    resultMessage, resultAmount, splitResults,
    strategyStats, trainingFeedback, actionFeedback,
    isSplitActive, isOutOfMoney, hasSplitPair, canSplit, canDouble, canResign,
    splitHand2, splitHand1Completed, splitBet, splitHand1Bet, pressedAction,
    playerHand, dealerHand, bankroll, currentBet,
    cardCountingStats, cardCountingQuiz, cardCountingFeedback,
    dealCards, cancelHand, handleDouble, handleStand, handleSplit, handleResign,
    handleReset, handleResultsClose, handleActionValidation,
    submitCardCountingAnswer, handleCardCountingResultClose,
  } = useBlackjackGame({
    initialStats,
    onRoundEnd,
    onReset,
    onMenuClose: useCallback(() => setMenuOpen(false), []),
    trainingMode,
    trainingSetup,
    practiceHardHands,
    practiceSoftHands,
    practicePairs,
    cardCountingEnabled,
    cardCountingInterval,
    cardCountingMetric,
    testHand,
    testDealerHand,
    earlyResign,
  });

  const handleBackToFreeplay = () => {
    if (gamePhase !== 'betting') cancelHand();
    setTrainingMode('off');
  };

  return (
    <div className="game-table">
      {/* ── Header ── */}
      <header className="game-header">
        <div className="game-header-left">
          <Link href="/" className="game-title">Blackjack</Link>
          <nav className="game-nav">
            {[
              ['off',   'Freeplay'],
              ['basic', 'Training'],
            ].map(([val, label]) => (
              <button
                key={val}
                className={`nav-btn${trainingMode === val ? ' nav-btn-active' : ''}`}
                onClick={() => {
                  if (val === trainingMode) return;
                  if (gamePhase !== 'betting') cancelHand();
                  setTrainingMode(val);
                  if (val === 'basic') setTrainingSetup(true);
                }}
              >
                {label}
              </button>
            ))}
            {!isMobile && (
              <button
                className="nav-btn"
                onClick={() => { if (gamePhase !== 'betting') cancelHand(); onSwitchToMultiplayer?.(); }}
              >
                Multiplayer
              </button>
            )}
          </nav>
          <button className="nav-btn nav-btn-highlight" onClick={() => setShowLeaderboard(true)}>
            Leaderboard
          </button>
        </div>

        {/* Mobile-only: centered bankroll */}
        <div className="mobile-bankroll">
          {trainingMode !== 'basic' && (
            <>
              ${bankroll}
              {currentBet > 0 && (
                <span className="mobile-bet">
                  Bet: ${isSplitActive ? (splitHand1Completed.length > 0 ? splitHand1Bet : splitBet) + currentBet : currentBet}
                </span>
              )}
            </>
          )}
        </div>

        <div className="game-header-right">
          {trainingMode !== 'basic' && (
            <div className="hud-bankroll-group">
              <span className="hud-bankroll-value">${bankroll}</span>
              {currentBet > 0 && (
                <span className="hud-bet-inline">
                  Bet: ${isSplitActive ? (splitHand1Completed.length > 0 ? splitHand1Bet : splitBet) + currentBet : currentBet}
                </span>
              )}
            </div>
          )}
          {session?.user?.username && (
            <Link href="/profile" className="hud-item hud-user hud-user-link">{session.user.username}</Link>
          )}
          <div className="menu-container" ref={menuRef}>
            <button
              className={`settings-btn${menuOpen ? ' settings-btn-open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              {/* Desktop: gear icon */}
              <svg className="icon-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              {/* Mobile: hamburger icon */}
              <svg className="icon-burger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="17" x2="21" y2="17"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="menu-panel">
                {/* Mobile-only: gamemode section */}
                <div className="menu-mobile-section">
                  <span className="menu-section-label">Mode</span>
                  {[
                    ['off',   'Freeplay'],
                    ['basic', 'Training'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      className={`menu-mode-btn${trainingMode === val ? ' menu-mode-btn-active' : ''}`}
                      onClick={() => {
                        setMenuOpen(false);
                        if (val === trainingMode) return;
                        if (gamePhase !== 'betting') cancelHand();
                        setTrainingMode(val);
                        if (val === 'basic') setTrainingSetup(true);
                      }}
                    >{label}</button>
                  ))}
                  {isMobile ? (
                    <div className="menu-mode-btn menu-mode-btn-locked" aria-disabled="true">
                      <span className="menu-mode-locked-row">
                        <svg className="menu-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5" y="11" width="14" height="10" rx="2"/>
                          <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                        </svg>
                        <span>Multiplayer</span>
                      </span>
                      <span className="menu-mode-locked-hint">Desktop only</span>
                    </div>
                  ) : (
                    <button
                      className="menu-mode-btn"
                      onClick={() => { setMenuOpen(false); if (gamePhase !== 'betting') cancelHand(); onSwitchToMultiplayer?.(); }}
                    >Multiplayer</button>
                  )}
                </div>
                {/* Mobile-only: account section */}
                {session?.user?.username && (
                  <div className="menu-mobile-section">
                    <span className="menu-section-label">Account</span>
                    <Link
                      href="/profile"
                      className="menu-profile-link"
                      onClick={() => setMenuOpen(false)}
                    >{session.user.username}</Link>
                  </div>
                )}
                <div className="menu-mobile-divider" />
                {/* Settings */}
                <div className="menu-row menu-volume-slider-row">
                  <span className="menu-label">Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volumeLevel}
                    className="menu-volume-slider"
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      onVolumeLevelChange?.(val);
                      onVolumeChange?.(val > 0);
                    }}
                  />
                </div>
                <div className="menu-row">
                  <span className="menu-label">Auto-Rebet</span>
                  <button
                    className={`menu-toggle${rebetEnabled ? ' menu-toggle-on' : ''}`}
                    onClick={() => onRebetChange?.(!rebetEnabled)}
                  >
                    {rebetEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="menu-row">
                  <span className="menu-label">Show Hotkeys</span>
                  <button
                    className={`menu-toggle${showHotkeys ? ' menu-toggle-on' : ''}`}
                    onClick={() => onShowHotkeysChange?.(!showHotkeys)}
                  >
                    {showHotkeys ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="menu-row">
                  <span className="menu-label">Bet Mode</span>
                  <button
                    className="menu-toggle"
                    onClick={() => onBetModeChange?.(betMode === 'percentage' ? 'fixed' : 'percentage')}
                  >
                    {betMode === 'percentage' ? '%' : 'Fixed'}
                  </button>
                </div>
                {session?.user?.username && (
                  <Link
                    href="/profile"
                    className="menu-account-btn"
                    onClick={() => setMenuOpen(false)}
                  >Account</Link>
                )}
                <button className="menu-leaderboard-btn" onClick={() => { setMenuOpen(false); setShowLeaderboard(true); }}>
                  Leaderboard
                </button>
                {!session?.user && onShowAuth && (
                  <>
                    <div className="menu-divider" />
                    <button className="menu-auth-btn" onClick={() => { setMenuOpen(false); onShowAuth(); }}>
                      Sign In / Register
                    </button>
                  </>
                )}
                {session?.user && (
                  <>
                    <div className="menu-divider" />
                    <button className="menu-logout-btn" onClick={() => { setMenuOpen(false); signOut(); }}>
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Board ── */}
      <div className="green-board">
        <div className="table-area">
          {/* Training strip (mobile only): sits right below the navbar, above the dealer's cards */}
          {trainingMode === 'basic' && !trainingSetup && (
            <div className="training-mobile-bar">
              <div className="training-mobile-bar-actions">
                <button
                  className="training-hand-btn"
                  onClick={() => { if (gamePhase !== 'betting') cancelHand(); setTrainingSetup(true); }}
                >
                  Reconfigure
                </button>
                <button
                  className="training-hand-btn strategy-table-btn"
                  onClick={() => setShowStrategyTable(true)}
                >
                  Strategy Table
                </button>
                {cardCountingEnabled && (
                  <button
                    className="training-hand-btn strategy-table-btn"
                    onClick={() => setShowCardCountingTutorial(true)}
                  >
                    CC Tutorial
                  </button>
                )}
              </div>
              <div className="training-mobile-bar-stats">
                <span>Hands <strong>{strategyStats.total}</strong></span>
                <span>Accuracy <strong>{strategyStats.total > 0 ? `${Math.round(strategyStats.correct / strategyStats.total * 100)}%` : '—'}</strong></span>
                {cardCountingEnabled && (
                  <span>CC <strong>{cardCountingStats.total > 0 ? `${Math.round(cardCountingStats.correct / cardCountingStats.total * 100)}%` : '—'}</strong></span>
                )}
              </div>
            </div>
          )}

          <div className="table-rules">
            <span>Blackjack Pays 3 to 2</span>
            <span className="table-rules-divider">·</span>
            <span>Dealer Stands Soft 17</span>
            <span className="table-rules-divider">·</span>
            <span>4 Decks</span>
          </div>

          {/* Training setup / controls */}
          {trainingMode === 'basic' && (
            trainingSetup ? (
              <div className="training-setup-overlay" onClick={handleBackToFreeplay}>
                <div className="training-setup-card" onClick={e => e.stopPropagation()}>
                  <div className="training-setup-header">
                    <h2 className="training-setup-title">Training Setup</h2>
                    <p className="training-setup-subtitle">Select which hand types to practice</p>
                  </div>
                  <div className="training-setup-checks">
                    {[
                      ['Hard Hands', practiceHardHands, setPracticeHardHands],
                      ['Soft Hands', practiceSoftHands, setPracticeSoftHands],
                      ['Pairs',      practicePairs,      setPracticePairs],
                    ].map(([label, checked, setter]) => (
                      <label key={label} className="training-setup-check">
                        <input type="checkbox" checked={checked} onChange={e => setter(e.target.checked)} />
                        <span>{label}</span>
                      </label>
                    ))}
                    <label className="training-setup-check">
                      <input
                        type="checkbox"
                        checked={cardCountingEnabled}
                        onChange={e => setCardCountingEnabled(e.target.checked)}
                      />
                      <span>Card Counting</span>
                    </label>
                  </div>
                  <div className={`training-setup-cc-config${cardCountingEnabled ? '' : ' training-setup-cc-config-disabled'}`}>
                    <label className="training-setup-cc-row">
                      <span>Ask every</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        disabled={!cardCountingEnabled}
                        className="training-setup-cc-interval"
                        value={cardCountingInterval}
                        onChange={e => setCardCountingInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                      <span>rounds</span>
                    </label>
                    <div className="training-setup-cc-metric">
                      {[
                        ['true',    'True Count'],
                        ['running', 'Running Count'],
                        ['both',    'Both'],
                      ].map(([val, label]) => (
                        <button
                          type="button"
                          key={val}
                          disabled={!cardCountingEnabled}
                          className={`training-setup-cc-metric-btn${cardCountingMetric === val ? ' training-setup-cc-metric-btn-on' : ''}`}
                          onClick={() => setCardCountingMetric(val)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    className="training-setup-start-btn"
                    disabled={![practiceHardHands, practiceSoftHands, practicePairs].some(Boolean)}
                    onClick={() => setTrainingSetup(false)}
                  >
                    Start Training
                  </button>
                  <button className="training-setup-back-btn" onClick={handleBackToFreeplay}>
                    ← Back to Freeplay
                  </button>
                </div>
              </div>
            ) : (
              <div className="training-controls-left">
                <div className="training-hand-panel strategy-table-panel">
                  <button
                    className="training-hand-btn"
                    onClick={() => { if (gamePhase !== 'betting') cancelHand(); setTrainingSetup(true); }}
                  >
                    Reconfigure
                  </button>
                  <button
                    className="training-hand-btn strategy-table-btn"
                    onClick={() => setShowStrategyTable(true)}
                  >
                    Strategy Table
                  </button>
                  {cardCountingEnabled && (
                    <button
                      className="training-hand-btn strategy-table-btn"
                      onClick={() => setShowCardCountingTutorial(true)}
                    >
                      Card Counting Tutorial
                    </button>
                  )}
                </div>
                <div className="training-session-stats">
                  <div className="training-session-stat-row">
                    <span>Hands</span>
                    <span className="training-session-stat-value">{strategyStats.total}</span>
                  </div>
                  <div className="training-session-stat-row training-session-stat-divider" />
                  <div className="training-session-stat-row">
                    <span>Correct</span>
                    {(() => {
                      const pct = strategyStats.total > 0 ? Math.round(strategyStats.correct / strategyStats.total * 100) : null;
                      const cls = pct === null ? 'training-session-stat-value' : pct >= 70 ? 'training-session-stat-value stat-win' : pct < 50 ? 'training-session-stat-value stat-loss' : 'training-session-stat-value';
                      return <span className={cls}>{pct !== null ? `${pct}%` : '—'}</span>;
                    })()}
                  </div>
                </div>
                {cardCountingEnabled && (
                  <div className="training-session-stats">
                    <div className="training-session-stat-row">
                      <span>Card Counting</span>
                    </div>
                    <div className="training-session-stat-row training-session-stat-divider" />
                    <div className="training-session-stat-row">
                      <span>Asked</span>
                      <span className="training-session-stat-value">{cardCountingStats.total}</span>
                    </div>
                    <div className="training-session-stat-row">
                      <span>Accuracy</span>
                      {(() => {
                        const pct = cardCountingStats.total > 0 ? Math.round(cardCountingStats.correct / cardCountingStats.total * 100) : null;
                        const cls = pct === null ? 'training-session-stat-value' : pct >= 70 ? 'training-session-stat-value stat-win' : pct < 50 ? 'training-session-stat-value stat-loss' : 'training-session-stat-value';
                        return <span className={cls}>{pct !== null ? `${pct}%` : '—'}</span>;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          <DealerHand hand={dealerHand} gamePhase={gamePhase} />
          {statusMessage && trainingMode !== 'basic' && <StatusBanner message={statusMessage} />}

          {isSplitActive ? (
            <div className="split-hands-row player-section">
              <PlayerHand
                hand={splitHand1Completed.length > 0 ? splitHand1Completed : playerHand}
                label="Hand 1"
                isActive={splitHand2.length > 0}
              />
              <PlayerHand
                hand={splitHand1Completed.length > 0 ? playerHand : splitHand2}
                label="Hand 2"
                isActive={splitHand1Completed.length > 0}
              />
            </div>
          ) : (
            <PlayerHand hand={playerHand} />
          )}
        </div>

        {/* ── Controls bar ── */}
        <div className="controls-bar">
          {gamePhase === 'betting' && trainingMode !== 'basic' && (
            <div className="betting-controls">
              {process.env.NEXT_PUBLIC_TEST_MODE === 'true' && (
                <TestDealPanel
                  testHand={testHand}
                  onSelect={setTestHand}
                  testDealerHand={testDealerHand}
                  onDealerSelect={setTestDealerHand}
                />
              )}
              <BettingPanel onDeal={dealCards} defaultBet={rebetEnabled ? lastBetAmount : 0} showHotkeys={showHotkeys} betMode={betMode} />
            </div>
          )}
          {gamePhase === 'player' && !statusMessage && (
            <PlayerActions
              hasSplitPair={hasSplitPair}
              canSplit={canSplit}
              canDouble={canDouble}
              canResign={canResign}
              onDouble={handleDouble}
              onStand={(trainingMode !== 'basic' || fullHandMode) ? handleStand : undefined}
              onSplit={handleSplit}
              onResign={handleResign}
              onValidate={trainingMode === 'basic' ? handleActionValidation : undefined}
              actionFeedback={actionFeedback}
              pressedAction={pressedAction}
              showHotkeys={showHotkeys}
            />
          )}
          {gamePhase === 'training-result' && trainingFeedback && (
            <TrainingFeedback feedback={trainingFeedback} onSkip={cancelHand} />
          )}
          {gamePhase === 'card-counting-quiz' && cardCountingQuiz && (
            <CardCountingQuiz metric={cardCountingMetric} onSubmit={submitCardCountingAnswer} />
          )}
          {gamePhase === 'card-counting-result' && cardCountingFeedback && (
            <CardCountingFeedback feedback={cardCountingFeedback} onSkip={handleCardCountingResultClose} />
          )}
          {gamePhase === 'result' && (trainingMode !== 'basic' || fullHandMode) && (
            <ResultPanel
              result={resultMessage}
              amount={resultAmount}
              splitResults={splitResults}
              onNext={handleResultsClose}
              hideAmount={trainingMode === 'basic'}
              trainingFeedback={trainingMode === 'basic' ? trainingFeedback : null}
            />
          )}
          {(gamePhase === 'dealing' || gamePhase === 'dealer' || gamePhase === 'pausing' ||
            (gamePhase === 'betting' && trainingMode === 'basic') ||
            (gamePhase === 'player' && statusMessage)) && (
            <div className="waiting-indicator">
              <span className="waiting-dots">• • •</span>
            </div>
          )}
        </div>
      </div>{/* green-board */}

      {/* ── Modals ── */}
      {showStrategyTable && <StrategyTableModal onClose={() => setShowStrategyTable(false)} />}
      {showCardCountingTutorial && <CardCountingTutorialModal onClose={() => setShowCardCountingTutorial(false)} />}
      {showLeaderboard   && <LeaderboardModal   onClose={() => setShowLeaderboard(false)}   />}
      {isOutOfMoney && trainingMode !== 'basic' && (
        <div className="broke-overlay">
          <div className="broke-modal">
            <h2 className="broke-title">Bankrupt</h2>
            <p className="broke-subtitle">Your bankroll is too low to place the minimum bet. It will be reset to $1000.</p>
            <button className="broke-reset-btn" onClick={handleReset}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
