'use client'
import { useState, useEffect } from 'react';

export default function MultiplayerWaiting({ gameState, playerId, onStart, onLeave, onSettingChange }) {
  if (!gameState) return null;

  const {
    code, players, hostId,
    startingBalance = 1000,
    allowMidGameJoin = false,
    allowRejoinAfterBankrupt = false,
    gameMode = 'freeplay',
    roundLimit = 5,
    targetBankroll = 5000,
  } = gameState;

  const isHost = hostId === playerId;
  const canStart = isHost && players.length >= 2;
  const emptySeats = 5 - players.length;

  const gameModeLabel =
    gameMode === 'highest-bankroll' ? `Highest Bankroll (${roundLimit} rounds)` :
    gameMode === 'target-bankroll'  ? `Target $${targetBankroll.toLocaleString()}` :
    'Freeplay';

  return (
    <div className="mp-screen">
      <div className="mp-waiting-card">
        <h2 className="mp-waiting-title">Waiting Room</h2>

        <div className="mp-code-box">
          <span className="mp-code-label">Lobby Code</span>
          <span className="mp-code">{code}</span>
          <span className="mp-code-hint">Share this with friends</span>
        </div>

        {/* ── Two-column main area ── */}
        <div className="mp-waiting-main">

          {/* Player list */}
          <div className="mp-player-list">
            <div className="mp-player-list-label">Players ({players.length}/5)</div>

            {players.map((p, i) => (
              <div key={p.id} className={`mp-player-row${p.id === playerId ? ' mp-player-row-me' : ''}`}>
                <span className="mp-player-seat">Seat {i + 1}</span>
                <span className="mp-player-name">
                  {p.name}
                  {p.id === hostId && <span className="mp-host-badge">HOST</span>}
                  {p.isBot && <span className="mp-bot-badge">BOT</span>}
                  {p.id === playerId && <span className="mp-me-badge">YOU</span>}
                </span>
                {isHost && p.isBot ? (
                  <button className="mp-bot-remove-btn" onClick={() => onSettingChange('removeBot', p.id)}>×</button>
                ) : (
                  !p.isBot && <span className="mp-player-ready">Ready</span>
                )}
              </div>
            ))}

            {Array.from({ length: emptySeats }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={`mp-player-row mp-player-row-empty${isHost ? ' mp-player-row-slot' : ''}`}
              >
                <span className="mp-player-seat">Seat {players.length + i + 1}</span>
                {isHost ? (
                  <div className="mp-bot-add-chips">
                    <button className="mp-bot-add-chip" onClick={() => onSettingChange('addBot', 'beginner')}>+ Easy</button>
                    <button className="mp-bot-add-chip" onClick={() => onSettingChange('addBot', 'intermediate')}>+ Med</button>
                    <button className="mp-bot-add-chip" onClick={() => onSettingChange('addBot', 'expert')}>+ Expert</button>
                  </div>
                ) : (
                  <span className="mp-player-name mp-empty-name">Waiting…</span>
                )}
              </div>
            ))}
          </div>

          {/* Right column: lobby settings */}
          <div className="mp-waiting-side">
            {isHost ? (
              <LobbySettings
                startingBalance={startingBalance}
                allowMidGameJoin={allowMidGameJoin}
                allowRejoinAfterBankrupt={allowRejoinAfterBankrupt}
                onSettingChange={onSettingChange}
              />
            ) : (
              <>
                <div className="mp-settings-section">
                  <p className="mp-settings-title">Lobby Settings</p>
                  <div className="mp-setting-row">
                    <span className="mp-setting-label">Starting Balance</span>
                    <span className="mp-setting-value">${startingBalance.toLocaleString()}</span>
                  </div>
                  <div className="mp-setting-row">
                    <span className="mp-setting-label">Game Mode</span>
                    <span className="mp-setting-value">{gameModeLabel}</span>
                  </div>
                  <div className="mp-setting-row">
                    <span className="mp-setting-label">In-progress Join</span>
                    <span className="mp-setting-value">{allowMidGameJoin ? 'On' : 'Off'}</span>
                  </div>
                  <div className="mp-setting-row">
                    <span className="mp-setting-label">Rejoin After Bust</span>
                    <span className="mp-setting-value">{allowRejoinAfterBankrupt ? 'On' : 'Off'}</span>
                  </div>
                </div>
                <p className="mp-waiting-for-host">Waiting for the host to start…</p>
              </>
            )}
          </div>
        </div>

        {/* ── Bottom row: game mode (left) + start button (right) ── */}
        {isHost && (
          <div className="mp-waiting-bottom">
            <GameModeSettings
              gameMode={gameMode}
              roundLimit={roundLimit}
              targetBankroll={targetBankroll}
              onSettingChange={onSettingChange}
            />
            <div className="mp-start-area">
              {players.length < 2 && (
                <p className="mp-start-hint">Need at least 2 players (or bots) to start.</p>
              )}
              <button className="mp-primary-btn" disabled={!canStart} onClick={onStart}>
                Start Game →
              </button>
            </div>
          </div>
        )}

        <button className="mp-back-btn mp-back-btn-sm" onClick={onLeave}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}

function LobbySettings({ startingBalance, allowMidGameJoin, allowRejoinAfterBankrupt, onSettingChange }) {
  const [balanceVal, setBalanceVal] = useState(startingBalance);
  useEffect(() => { setBalanceVal(startingBalance); }, [startingBalance]);

  const commitBalance = () => {
    const n = parseInt(balanceVal, 10);
    if (!isNaN(n) && n >= 1) onSettingChange('startingBalance', n);
    else setBalanceVal(startingBalance);
  };

  return (
    <div className="mp-settings-section">
      <p className="mp-settings-title">Lobby Settings</p>
      <div className="mp-setting-row">
        <label className="mp-setting-label" htmlFor="mp-balance-input">Starting Balance</label>
        <div className="mp-input-prefix-wrap">
          <span className="mp-input-prefix">$</span>
          <input
            id="mp-balance-input"
            className="mp-input mp-input-balance"
            type="number"
            min={1}
            value={balanceVal}
            onChange={e => setBalanceVal(e.target.value)}
            onBlur={commitBalance}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        </div>
      </div>
      <div className="mp-setting-row">
        <span className="mp-setting-label">In-progress Join</span>
        <button
          className={`mp-setting-chip${allowMidGameJoin ? ' mp-setting-chip-active' : ''}`}
          onClick={() => onSettingChange('allowMidGameJoin', !allowMidGameJoin)}
        >
          {allowMidGameJoin ? 'On' : 'Off'}
        </button>
      </div>
      <div className="mp-setting-row">
        <span className="mp-setting-label">Rejoin After Bust</span>
        <button
          className={`mp-setting-chip${allowRejoinAfterBankrupt ? ' mp-setting-chip-active' : ''}`}
          onClick={() => onSettingChange('allowRejoinAfterBankrupt', !allowRejoinAfterBankrupt)}
        >
          {allowRejoinAfterBankrupt ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}

function GameModeSettings({ gameMode, roundLimit, targetBankroll, onSettingChange }) {
  const [roundVal, setRoundVal] = useState(roundLimit);
  const [targetVal, setTargetVal] = useState(targetBankroll);

  useEffect(() => { setRoundVal(roundLimit); }, [roundLimit]);
  useEffect(() => { setTargetVal(targetBankroll); }, [targetBankroll]);

  const commitRound = () => {
    const n = parseInt(roundVal, 10);
    if (!isNaN(n) && n >= 1) onSettingChange('roundLimit', n);
    else setRoundVal(roundLimit);
  };

  const commitTarget = () => {
    const n = parseInt(targetVal, 10);
    if (!isNaN(n) && n >= 1) onSettingChange('targetBankroll', n);
    else setTargetVal(targetBankroll);
  };

  return (
    <div className="mp-gamemode-section">
      <div className="mp-setting-row">
        <span className="mp-setting-label">Game Mode</span>
        <div className="mp-setting-chips">
          {[
            { value: 'freeplay',         label: 'Freeplay' },
            { value: 'highest-bankroll', label: 'Highest Bankroll' },
            { value: 'target-bankroll',  label: 'Target Bankroll' },
          ].map(opt => (
            <button
              key={opt.value}
              className={`mp-setting-chip${gameMode === opt.value ? ' mp-setting-chip-active' : ''}`}
              onClick={() => onSettingChange('gameMode', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {gameMode === 'highest-bankroll' && (
        <div className="mp-setting-row mp-setting-row-sub">
          <label className="mp-setting-label" htmlFor="mp-rounds-input">Rounds</label>
          <input
            id="mp-rounds-input"
            className="mp-input mp-input-balance"
            type="number"
            min={1}
            value={roundVal}
            onChange={e => setRoundVal(e.target.value)}
            onBlur={commitRound}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        </div>
      )}

      {gameMode === 'target-bankroll' && (
        <div className="mp-setting-row mp-setting-row-sub">
          <label className="mp-setting-label" htmlFor="mp-target-input">Target</label>
          <div className="mp-input-prefix-wrap">
            <span className="mp-input-prefix">$</span>
            <input
              id="mp-target-input"
              className="mp-input mp-input-balance"
              type="number"
              min={1}
              value={targetVal}
              onChange={e => setTargetVal(e.target.value)}
              onBlur={commitTarget}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
