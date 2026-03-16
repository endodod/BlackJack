'use client'
import { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../components/Card';
import getHandTotal from '../logic/getHandTotal';
import { playSound } from '../lib/sound';

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUICK_BETS = [10, 25, 100, 500];

function HandTotal({ hand, bust }) {
  const total = hand.length > 0 ? getHandTotal(hand) : null;
  if (total === null) return null;
  const isBust = total > 21;
  return (
    <span className={`hand-total${isBust ? ' hand-total-bust' : ''}`}>
      {total}
    </span>
  );
}

// ── Dealer area ───────────────────────────────────────────────────────────────

function MultiDealerHand({ hand, holeHidden }) {
  const showTotal = hand.length > 0 && !holeHidden;
  const displayHand = hand.length === 0
    ? [{ value: '', suit: '' }, { value: '', suit: '' }]
    : hand;

  const dealerTotal = showTotal ? getHandTotal(hand) : null;

  // Play sound when hole card is revealed
  const prevHiddenRef = useRef(holeHidden);
  useEffect(() => {
    if (prevHiddenRef.current && !holeHidden && hand.length > 0) {
      playSound('draw');
    }
    prevHiddenRef.current = holeHidden;
  }, [holeHidden, hand.length]);

  return (
    <div className="hand-section mp-dealer-hand">
      <div className="hand-label">
        <span>Dealer</span>
        {dealerTotal !== null && (
          <span className={`hand-total${dealerTotal > 21 ? ' hand-total-bust' : ''}`}>
            {dealerTotal}
          </span>
        )}
        {!showTotal && hand.length > 0 && <span className="hand-total">?</span>}
      </div>
      <div className="cards-row">
        {displayHand.map((c, i) => (
          <div key={`${c.value}-${c.suit}-${i}`} style={{ visibility: hand.length === 0 ? 'hidden' : 'visible' }}>
            <Card card={c} isFaceDown={holeHidden && i === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Per-player slot ───────────────────────────────────────────────────────────

function PlayerSlot({ player, seatIndex, isActive, isLocalPlayer, totalPlayers }) {
  if (!player) {
    return <div className="mp-player-slot mp-player-slot-empty" />;
  }

  const isSplit = player.hand1Completed && player.hand1Completed.length > 0;
  const hasSplitWaiting = player.splitHand && player.splitHand.length > 0;

  const slotClass = [
    'mp-player-slot',
    isActive ? 'mp-player-slot-active' : '',
    !isActive && (player.handStatus === 'stood' || player.handStatus === 'busted' || player.handStatus === 'done')
      ? 'mp-player-slot-dim'
      : '',
    isLocalPlayer ? 'mp-player-slot-local' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={slotClass}>
      {/* Player name + bankroll */}
      <div className="mp-slot-header">
        <span className="mp-slot-name">
          {player.name}
          {isLocalPlayer && <span className="mp-you-badge">YOU</span>}
        </span>
        <span className="mp-slot-bankroll">${player.bankroll}</span>
      </div>

      {/* Bet display */}
      {player.bet > 0 && (
        <div className="mp-slot-bet">
          Bet: <strong>${player.bet}</strong>
          {isSplit && <span className="mp-slot-bet-split"> | ${player.hand1Bet}</span>}
        </div>
      )}

      {/* Cards */}
      {isSplit ? (
        <div className="mp-split-hands">
          {/* Hand 1 (completed) */}
          <div className={`mp-split-hand${hasSplitWaiting ? ' mp-split-hand-active' : ' mp-split-hand-done'}`}>
            <div className="mp-split-label">Hand 1 <HandTotal hand={player.hand1Completed} /></div>
            <div className="cards-row mp-cards-compact">
              {player.hand1Completed.map((c, i) => (
                <Card key={`h1-${i}-${c.value}${c.suit}`} card={c} />
              ))}
            </div>
          </div>
          {/* Hand 2 (active) */}
          <div className={`mp-split-hand${!hasSplitWaiting ? ' mp-split-hand-active' : ' mp-split-hand-done'}`}>
            <div className="mp-split-label">Hand 2 <HandTotal hand={player.hand} /></div>
            <div className="cards-row mp-cards-compact">
              {player.hand.map((c, i) => (
                <Card key={`h2-${i}-${c.value}${c.suit}`} card={c} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="cards-row mp-cards-compact">
          {player.hand.length > 0
            ? player.hand.map((c, i) => <Card key={`${i}-${c.value}${c.suit}`} card={c} />)
            : [{ value: '', suit: '' }, { value: '', suit: '' }].map((c, i) => (
                <div key={i} className="card" style={{ visibility: 'hidden' }} />
              ))
          }
        </div>
      )}

      {/* Hand total */}
      {!isSplit && player.hand.length > 0 && (
        <div className="mp-slot-total">
          <HandTotal hand={player.hand} />
          {hasSplitWaiting && (
            <span className="mp-split-waiting-tag">+ split</span>
          )}
        </div>
      )}

      {/* Status / result label */}
      <div className="mp-slot-status">
        {player.result ? (
          <span className={`mp-result-tag ${player.result === 'Player Wins' || player.result === 'Blackjack!' ? 'mp-result-win' : player.result === 'Push' ? 'mp-result-push' : 'mp-result-lose'}`}>
            {player.result}
            {player.result === 'Blackjack!' && ' 🂡'}
          </span>
        ) : player.handStatus === 'betting' ? (
          <span className="mp-status-tag mp-status-betting">Betting…</span>
        ) : player.handStatus === 'waiting' ? (
          <span className="mp-status-tag">Waiting…</span>
        ) : player.handStatus === 'acting' ? (
          <span className="mp-status-tag mp-status-acting">● Acting</span>
        ) : player.handStatus === 'stood' ? (
          <span className="mp-status-tag mp-status-stood">Stood</span>
        ) : player.handStatus === 'busted' ? (
          <span className="mp-status-tag mp-status-bust">Bust!</span>
        ) : null}
      </div>

      {/* Split result if present */}
      {player.splitResult && (
        <div className="mp-slot-status">
          <span className={`mp-result-tag ${player.splitResult === 'Player Wins' ? 'mp-result-win' : player.splitResult === 'Push' ? 'mp-result-push' : 'mp-result-lose'}`}>
            Hand 2: {player.splitResult}
          </span>
        </div>
      )}

      {/* Active turn indicator */}
      {isActive && player.handStatus === 'acting' && (
        <div className="mp-active-arrow">▲</div>
      )}
    </div>
  );
}

// ── Betting panel (for local player during betting phase) ─────────────────────

function BettingPanel({ bankroll, onBet, disabled }) {
  const [betAmount, setBetAmount] = useState(0);

  const handleQuickBet = (amount) => {
    if (betAmount + amount <= bankroll) {
      setBetAmount(prev => prev + amount);
      playSound('chip');
    }
  };

  const handleDeal = () => {
    if (betAmount > 0 && betAmount <= bankroll) {
      onBet(betAmount);
      setBetAmount(0);
    }
  };

  if (disabled) {
    return (
      <div className="mp-waiting-indicator">
        <span className="waiting-dots">• • •</span>
      </div>
    );
  }

  return (
    <div className="betting-panel">
      <div className="betting-row">
        <div className="chip-row">
          {QUICK_BETS.map(amount => (
            <button
              key={amount}
              className="chip-button"
              onClick={() => handleQuickBet(amount)}
              disabled={betAmount + amount > bankroll}
            >
              ${amount}
            </button>
          ))}
        </div>
        <div className="bet-display">
          Bet: <span className="bet-amount">${betAmount}</span>
        </div>
        <button
          className="clear-btn"
          onClick={() => { setBetAmount(0); playSound('clearbet'); }}
          disabled={betAmount === 0}
        >
          Clear
        </button>
      </div>
      <div className="betting-row betting-row-actions">
        <button
          className="deal-btn"
          onClick={handleDeal}
          disabled={betAmount === 0 || betAmount > bankroll}
        >
          Place Bet →
        </button>
      </div>
    </div>
  );
}

// ── Action buttons (for local player during their turn) ───────────────────────

function ActionButtons({ player, send }) {
  const hand = player.hand;
  const hasSplitWaiting = player.splitHand && player.splitHand.length > 0;
  const alreadySplit = player.hand1Completed && player.hand1Completed.length > 0;
  const canSplit = (
    hand.length === 2 &&
    !hasSplitWaiting &&
    !alreadySplit &&
    hand[0]?.value === hand[1]?.value &&
    player.bankroll >= player.bet
  );
  const canDouble = hand.length === 2 && player.bankroll >= player.bet;

  return (
    <div className="action-buttons-wrapper">
      <button className="action-btn btn-hit" onClick={() => { playSound('draw'); send({ type: 'player:hit' }); }}>
        Hit <kbd className="key-hint">W</kbd>
      </button>
      <button className="action-btn btn-stand" onClick={() => send({ type: 'player:stand' })}>
        Stand <kbd className="key-hint">S</kbd>
      </button>
      <button
        className="action-btn btn-double"
        disabled={!canDouble}
        onClick={() => { if (canDouble) send({ type: 'player:double' }); }}
      >
        Double <kbd className="key-hint">D</kbd>
      </button>
      {canSplit && (
        <button className="action-btn btn-split" onClick={() => send({ type: 'player:split' })}>
          Split <kbd className="key-hint">A</kbd>
        </button>
      )}
    </div>
  );
}

// ── Main table component ──────────────────────────────────────────────────────

export default function MultiplayerTable({ gameState, playerId, send, onLeave, volumeOn }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const { players = [], dealerHand = [], dealerHoleHidden, currentPlayerIndex, status, code, round } = gameState || {};

  const localPlayer = players.find(p => p.id === playerId);
  const localPlayerIndex = players.findIndex(p => p.id === playerId);
  const isLocalPlayerTurn = status === 'playing' && currentPlayerIndex === localPlayerIndex && localPlayer?.handStatus === 'acting';
  const isLocalBetting = status === 'betting' && localPlayer?.handStatus === 'betting';

  // Keyboard shortcuts for action phase
  useEffect(() => {
    if (!isLocalPlayerTurn) return;

    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'w') { playSound('draw'); send({ type: 'player:hit' }); }
      else if (k === 's') send({ type: 'player:stand' });
      else if (k === 'd') {
        const p = players[localPlayerIndex];
        if (p?.hand.length === 2 && p.bankroll >= p.bet) send({ type: 'player:double' });
      }
      else if (k === 'a') {
        const p = players[localPlayerIndex];
        if (p?.hand.length === 2 && p.hand[0]?.value === p.hand[1]?.value && !p.splitHand && !p.hand1Completed && p.bankroll >= p.bet)
          send({ type: 'player:split' });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLocalPlayerTurn, send, players, localPlayerIndex]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleBet = useCallback((amount) => {
    send({ type: 'player:bet', amount });
  }, [send]);

  // Status banner text
  let bannerText = null;
  if (status === 'dealing') bannerText = null; // cards flying
  if (status === 'dealer') bannerText = null;
  if (status === 'round-end') {
    const localResult = localPlayer?.result;
    if (localResult === 'Blackjack!') bannerText = 'Blackjack!';
    else if (localResult === 'Player Wins') bannerText = 'You Win!';
    else if (localResult === 'House Wins') bannerText = 'Dealer Wins';
    else if (localResult === 'Push') bannerText = 'Push';
  }

  if (!gameState) return null;

  // Fill up to 3 visual slots (always show 3 seats)
  const slots = [players[0] || null, players[1] || null, players[2] || null];

  return (
    <div className="game-table">
      {/* ── Header ── */}
      <header className="game-header">
        <div className="game-header-left">
          <span className="game-title">Blackjack</span>
          <span className="mp-lobby-badge">
            Multiplayer · {code} · Round {round}
          </span>
        </div>
        <div className="game-header-right">
          {localPlayer && (
            <span className="hud-item">Bankroll: ${localPlayer.bankroll}</span>
          )}
          {localPlayer?.bet > 0 && (
            <span className="hud-item hud-bet">Bet: ${localPlayer.bet}</span>
          )}
          <div className="menu-container" ref={menuRef}>
            <button
              className={`settings-btn${menuOpen ? ' settings-btn-open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Settings"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="menu-panel">
                <button className="menu-logout-btn" onClick={() => { setMenuOpen(false); onLeave(); }}>
                  Leave Game
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Table area ── */}
      <div className="table-area mp-table-area">
        <div className="table-rules">
          <span>Blackjack Pays 3 to 2</span>
          <span className="table-rules-divider">·</span>
          <span>Dealer Stands Soft 17</span>
          <span className="table-rules-divider">·</span>
          <span>4 Decks</span>
        </div>

        {/* Dealer hand — top center */}
        <MultiDealerHand hand={dealerHand} holeHidden={dealerHoleHidden} />

        {/* Status banner */}
        {bannerText && (
          <div className={`status-banner${localPlayer?.result === 'Player Wins' || localPlayer?.result === 'Blackjack!' ? ' banner-win' : localPlayer?.result === 'House Wins' ? ' banner-lose' : ' banner-push'}`}>
            {bannerText}
          </div>
        )}

        {/* Player slots — left to right */}
        <div className="mp-players-row">
          {slots.map((player, i) => (
            <PlayerSlot
              key={i}
              player={player}
              seatIndex={i}
              isActive={status === 'playing' && currentPlayerIndex === i}
              isLocalPlayer={player?.id === playerId}
              totalPlayers={players.length}
            />
          ))}
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="controls-bar">
        {isLocalBetting && (
          <div className="betting-controls">
            <BettingPanel
              bankroll={localPlayer.bankroll}
              onBet={handleBet}
              disabled={false}
            />
          </div>
        )}

        {status === 'betting' && !isLocalBetting && (
          <div className="mp-waiting-indicator">
            <span className="waiting-dots">• • •</span>
          </div>
        )}

        {isLocalPlayerTurn && localPlayer && (
          <ActionButtons player={localPlayer} send={send} />
        )}

        {status === 'playing' && !isLocalPlayerTurn && (
          <div className="mp-waiting-indicator">
            <span className="mp-turn-label">
              {currentPlayerIndex >= 0 && players[currentPlayerIndex]
                ? `${players[currentPlayerIndex].name}'s turn`
                : 'Waiting…'}
            </span>
          </div>
        )}

        {(status === 'dealing' || status === 'dealer') && (
          <div className="mp-waiting-indicator">
            <span className="waiting-dots">• • •</span>
          </div>
        )}

        {status === 'round-end' && (
          <div className="mp-round-end">
            <div className="mp-round-end-results">
              {players.map(p => (
                <div key={p.id} className="mp-round-result-row">
                  <span className="mp-round-result-name">{p.name}:</span>
                  <span className={`mp-round-result-label ${p.result === 'Player Wins' || p.result === 'Blackjack!' ? 'stat-win' : p.result === 'Push' ? 'stat-push' : 'stat-loss'}`}>
                    {p.result || '—'}
                  </span>
                  {p.splitResult && (
                    <>
                      <span className="mp-round-result-name"> / </span>
                      <span className={`mp-round-result-label ${p.splitResult === 'Player Wins' ? 'stat-win' : p.splitResult === 'Push' ? 'stat-push' : 'stat-loss'}`}>
                        {p.splitResult}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="mp-next-round-hint">Next round starting automatically…</p>
          </div>
        )}
      </div>
    </div>
  );
}
