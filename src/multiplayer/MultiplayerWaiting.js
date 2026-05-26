'use client'
import { useState, useEffect } from 'react';

export default function MultiplayerWaiting({ gameState, playerId, onStart, onLeave, onSettingChange }) {
  if (!gameState) return null;

  const { code, players, hostId, startingBalance = 1000 } = gameState;
  const isHost = hostId === playerId;
  const canStart = isHost && players.length >= 2;

  return (
    <div className="mp-screen">
      <div className="mp-waiting-card">
        <h2 className="mp-waiting-title">Waiting Room</h2>

        <div className="mp-code-box">
          <span className="mp-code-label">Lobby Code</span>
          <span className="mp-code">{code}</span>
          <span className="mp-code-hint">Share this with friends</span>
        </div>

        <div className="mp-player-list">
          <div className="mp-player-list-label">
            Players ({players.length}/5)
          </div>
          {players.map((p, i) => (
            <div key={p.id} className={`mp-player-row${p.id === playerId ? ' mp-player-row-me' : ''}`}>
              <span className="mp-player-seat">Seat {i + 1}</span>
              <span className="mp-player-name">
                {p.name}
                {p.id === hostId && <span className="mp-host-badge">HOST</span>}
                {p.id === playerId && <span className="mp-me-badge">YOU</span>}
              </span>
              <span className="mp-player-ready">Ready</span>
            </div>
          ))}
          {Array.from({ length: 5 - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="mp-player-row mp-player-row-empty">
              <span className="mp-player-seat">Seat {players.length + i + 1}</span>
              <span className="mp-player-name mp-empty-name">Waiting…</span>
            </div>
          ))}
        </div>

        {isHost ? (
          <>
            <BalanceSetting startingBalance={startingBalance} onSettingChange={onSettingChange} />
            <div className="mp-start-area">
              {players.length < 2 && (
                <p className="mp-start-hint">Need at least 2 players to start.</p>
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
              <div className="mp-setting-row">
                <span className="mp-setting-label">Starting Balance</span>
                <span className="mp-setting-value">${startingBalance.toLocaleString()}</span>
              </div>
            </div>
            <p className="mp-waiting-for-host">Waiting for the host to start…</p>
          </>
        )}

        <button className="mp-back-btn mp-back-btn-sm" onClick={onLeave}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}

function BalanceSetting({ startingBalance, onSettingChange }) {
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
    </div>
  );
}
