'use client'
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages a WebSocket connection to the multiplayer game server.
 *
 * Usage:
 *   const { connect, disconnect, send, on, connected, error } = useMultiplayerSocket();
 *
 * Call `on(type, handler)` to register a message listener *before* calling `connect()`.
 * The handler map is kept in a ref so handlers can be updated without re-subscribing.
 */
export function useMultiplayerSocket() {
  const wsRef = useRef(null);
  const handlersRef = useRef({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const on = useCallback((type, handler) => {
    handlersRef.current[type] = handler;
  }, []);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => { setConnected(true); setError(null); };
    ws.onclose = () => { setConnected(false); };
    ws.onerror = () => { setError('Connection failed. Is the server running?'); setConnected(false); };

    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      const handler = handlersRef.current[msg.type];
      if (handler) handler(msg);
    };

    return ws;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  // Clean up on unmount
  useEffect(() => () => wsRef.current?.close(), []);

  return { connect, disconnect, send, on, connected, error };
}
