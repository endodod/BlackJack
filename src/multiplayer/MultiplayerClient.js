'use client'
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useMultiplayerSocket } from './useMultiplayerSocket';
import MultiplayerTable from './MultiplayerTable';
import './Multiplayer.css';

function generateGuestName() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `Guest_${suffix}`;
}

function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getOrCreateStableId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('mp_stable_id');
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('mp_stable_id', id);
  }
  return id;
}

function saveSession(lobbyCode) {
  if (typeof window !== 'undefined')
    localStorage.setItem('mp_session', JSON.stringify({ lobbyCode }));
}

function getSavedSession() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('mp_session')); } catch { return null; }
}

function clearSession() {
  if (typeof window !== 'undefined') localStorage.removeItem('mp_session');
}

export default function MultiplayerClient({ onLeave, volumeOn, onVolumeChange, dbStats }) {
  const { data: session } = useSession();
  const { connect, disconnect, send, on } = useMultiplayerSocket();
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const playerIdRef = useRef(null);
  const stableId = useRef(getOrCreateStableId());

  const [playerName] = useState(() =>
    typeof window !== 'undefined'
      ? (session?.user?.username ?? generateGuestName())
      : ''
  );

  const startingBankroll = dbStats?.bankroll ?? 1000;

  // ── Register server→client event handlers ─────────────────────────────────
  useEffect(() => {
    on('lobby:created', ({ code, state, playerId: pid }) => {
      setPlayerId(pid);
      playerIdRef.current = pid;
      setGameState(state);
      saveSession(code);
      // Auto-start immediately — no waiting room needed
      send({ type: 'lobby:start' });
    });

    on('lobby:joined', ({ state, playerId: pid }) => {
      setPlayerId(pid);
      playerIdRef.current = pid;
      setGameState(state);
      saveSession(state.code);
    });

    on('lobby:rejoined', ({ state, playerId: pid }) => {
      setPlayerId(pid);
      playerIdRef.current = pid;
      setGameState(state);
    });

    on('lobby:update', ({ state }) => setGameState(state));
    on('lobby:player-left', ({ state }) => setGameState(state));
    on('game:started', ({ state }) => setGameState(state));
    on('game:dealt', ({ state }) => setGameState(state));
    on('game:state', ({ state }) => setGameState(state));
    on('game:dealer-play', ({ state }) => setGameState(state));

    on('game:round-end', ({ state }) => {
      setGameState(state);
      const me = state.players.find(p => p.id === playerIdRef.current);
      if (!me || me.pending || me.disconnected) return;

      if (me.forcedReset && session?.user?.id) {
        fetch('/api/user/track-reset', { method: 'POST' });
      }

      if (session?.user?.id) {
        const isSplit = me.hand1Completed?.length > 0;
        const hands   = isSplit ? 2 : 1;
        const wins    = (me.result === 'Player Wins' || me.result === 'Blackjack!' ? 1 : 0)
                      + (isSplit && me.splitResult === 'Player Wins' ? 1 : 0);
        const losses  = (me.result === 'House Wins' ? 1 : 0)
                      + (isSplit && me.splitResult === 'House Wins' ? 1 : 0);
        const pushes  = (me.result === 'Push' ? 1 : 0)
                      + (isSplit && me.splitResult === 'Push' ? 1 : 0);
        const earnings = (me.result === 'Player Wins' || me.result === 'Blackjack!' ? me.resultAmount : 0)
                       + (isSplit && me.splitResult === 'Player Wins' ? me.splitResultAmount : 0);
        fetch('/api/game/mp-round', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bankroll: me.bankroll, hands, wins, losses, pushes, earnings }),
        }).catch(() => {});
      }
    });

    on('game:new-round', ({ state }) => setGameState(state));
    on('error', ({ message }) => console.warn('Lobby error:', message));

    return () => disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-create or rejoin on mount ────────────────────────────────────────
  useEffect(() => {
    const saved = getSavedSession();
    if (saved?.lobbyCode && stableId.current) {
      connect(saved.lobbyCode);
      send({ type: 'lobby:rejoin', stableId: stableId.current });
    } else {
      const code = generateLobbyCode();
      connect(code);
      send({ type: 'lobby:create', name: playerName, stableId: stableId.current, bankroll: startingBankroll });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoinLobby = useCallback((code) => {
    disconnect();
    clearSession();
    connect(code.toUpperCase());
    send({ type: 'lobby:join', name: playerName, stableId: stableId.current, bankroll: startingBankroll });
  }, [connect, disconnect, send, playerName, startingBankroll]);

  const handleLeave = useCallback(() => {
    disconnect();
    clearSession();
    onLeave();
  }, [disconnect, onLeave]);

  return (
    <MultiplayerTable
      gameState={gameState}
      playerId={playerId}
      send={send}
      onLeave={handleLeave}
      onJoin={handleJoinLobby}
      volumeOn={volumeOn}
      onVolumeChange={onVolumeChange}
    />
  );
}
