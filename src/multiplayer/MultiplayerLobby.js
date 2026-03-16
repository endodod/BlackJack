'use client'
import { useState } from 'react';

export default function MultiplayerLobby({ onCreate, onJoin, onBack, error, connected }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState('create'); // 'create' | 'join'

  const trimmedName = name.trim();
  const trimmedCode = joinCode.trim().toUpperCase();

  const handleCreate = () => {
    if (!trimmedName) return;
    onCreate(trimmedName);
  };

  const handleJoin = () => {
    if (!trimmedName || trimmedCode.length !== 4) return;
    onJoin(trimmedCode, trimmedName);
  };

  return (
    <div className="mp-screen">
      <div className="mp-lobby-card">
        <div className="mp-lobby-header">
          <h1 className="mp-title">Multiplayer</h1>
          <p className="mp-subtitle">Play with up to 3 players</p>
        </div>

        {/* Name field — shared between create and join */}
        <div className="mp-field">
          <label className="mp-field-label">Your name</label>
          <input
            className="mp-input"
            type="text"
            placeholder="Enter your name"
            maxLength={20}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') tab === 'create' ? handleCreate() : handleJoin();
            }}
          />
        </div>

        {/* Tabs */}
        <div className="mp-tabs">
          <button
            className={`mp-tab${tab === 'create' ? ' mp-tab-active' : ''}`}
            onClick={() => setTab('create')}
          >
            Create Lobby
          </button>
          <button
            className={`mp-tab${tab === 'join' ? ' mp-tab-active' : ''}`}
            onClick={() => setTab('join')}
          >
            Join Lobby
          </button>
        </div>

        {tab === 'create' && (
          <div className="mp-tab-body">
            <p className="mp-hint">
              A 4-character code will be generated. Share it with up to 2 friends.
            </p>
            <button
              className="mp-primary-btn"
              disabled={!trimmedName || !connected}
              onClick={handleCreate}
            >
              Create Lobby
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="mp-tab-body">
            <div className="mp-field">
              <label className="mp-field-label">Lobby code</label>
              <input
                className="mp-input mp-input-code"
                type="text"
                placeholder="X7K2"
                maxLength={4}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
              />
            </div>
            <button
              className="mp-primary-btn"
              disabled={!trimmedName || trimmedCode.length !== 4 || !connected}
              onClick={handleJoin}
            >
              Join Lobby
            </button>
          </div>
        )}

        {error && <div className="mp-error-msg">{error}</div>}

        <button className="mp-back-btn" onClick={onBack}>
          ← Back to Singleplayer
        </button>
      </div>
    </div>
  );
}
