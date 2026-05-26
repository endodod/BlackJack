'use client'
import { useState, useEffect } from 'react';

export default function MultiplayerWaiting({ gameState, playerId, onStart, onLeave, onSettingChange }) {
  if (!gameState) return null;

  const { code, players, hostId, startingBalance = 1000, allowMidGameJoin = false, allowRejoinAfterBankrupt = false } = gameState;
  const isHost = hostId === playerId;
  const canStart = isHost && players.length >= 2;
  const emptySeats = 5 - players.length;

  return (
    <div className="mp-screen">
      <div className="mp-waiting-card">
        <h2 className="mp-waiting-title">Waiting Room</h2>

        <div className="mp-code-box">
          <span className="mp-code-label">Lobby Code</span>
          <span className="mp-code">{code}</span>
          <span className="mp-code-hint">Share this with friends</span>
        </div>

        <div className="mp-waiting-main">
          {/* ── Player list ── */}
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
                  <button
                    className="mp-bot-remove-btn"
                    onClick={() => onSettingChange('removeBot', p.id)}
                  >
                    ×
                  </button>
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

          {/* ── Right column: settings + start ── */}
          <div className="mp-waiting-side">
            {isHost ? (
              <>
                <LobbySettings
                  startingBalance={startingBalance}
                  allowMidGameJoin={allowMidGameJoin}
                  allowRejoinAfterBankrupt={allowRejoinAfterBankrupt}
                  onSettingChange={onSettingChange}
                />
                <div className="mp-start-area">
                  {players.length < 2 && (
                    <p className="mp-start-hint">Need at least 2 players (or bots) to start.</p>
                  )}
                  <button
                    className="mp-primary-btn"
                    disabled={!canStart}
                    onClick={onStart}
                  >
                    Start Game →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mp-settings-section">
                  <p className="mp-settings-title">Lobby Settings</p>
                  <div className="mp-setting-row">
                    <span className="mp-setting-label">Starting Balance</span>
                    <span className="mp-setting-value">${startingBalance.toLocaleString()}</span>
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

        <button className="mp-back-btn mp-back-btn-sm" onClick={onLeave}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}

function LobbySettings({ startingBalance, allowMidGameJoin, allowRejoinAfterBankrupt, onSettingChange }) {
  const [value, setValue] = useState(startingBalance);

  useEffect(() => { setValue(startingBalance); }, [startingBalance]);

  const commit = () => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 1) {
      onSettingChange('startingBalance', n);
    } else {
      setValue(startingBalance);
    }
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
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={commit}
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
