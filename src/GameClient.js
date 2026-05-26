'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { DeckProvider } from './context/DeckContext'
import App from './App'
import AuthModal from './components/AuthModal'
import MultiplayerClient from './multiplayer/MultiplayerClient'

export default function GameClient({ initialStats }) {
  const { data: session, status } = useSession()
  const [mode, setMode] = useState('singleplayer') // 'singleplayer' | 'multiplayer'
  const [guestMode, setGuestMode] = useState(false)
  const [modalDismissed, setModalDismissed] = useState(false)
  const [volumeOn, setVolumeOn] = useState(true)
  const [volumeLevel, setVolLevel] = useState(1)
  const [userId, setUserId] = useState(session?.user?.id ?? null)
  const [dbStats, setDbStats] = useState(initialStats !== undefined ? initialStats : undefined)
  const saveTimer = useRef(null)
  const pendingSave = useRef(null)
  const prevUserIdRef = useRef(session?.user?.id)

  // Load initial volume
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('volume')
      if (stored !== null) {
        setVolumeOn(stored === 'true')
      }
      const storedLevel = localStorage.getItem('volumeLevel')
      if (storedLevel !== null) {
        setVolLevel(parseFloat(storedLevel))
      }
    }
  }, [])

  // Update userId for stable key
  useEffect(() => {
    setUserId(session?.user?.id ?? null)
  }, [session?.user?.id])

  // Fetch fresh stats from DB on authentication to avoid stale JWT values
  useEffect(() => {
    if (status !== 'authenticated') {
      setDbStats(undefined)
      return
    }
    fetch('/api/user/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => setDbStats(data ?? null))
      .catch(() => setDbStats(null))
  }, [status, session?.user?.id])

  // Detect logout → reset modal state
  useEffect(() => {
    const wasLoggedIn = prevUserIdRef.current
    const isNowLoggedOut = !session?.user?.id
    if (wasLoggedIn && isNowLoggedOut) {
      setGuestMode(false)
      setModalDismissed(false)
    }
    prevUserIdRef.current = session?.user?.id
  }, [session])

  const handleRoundEnd = useCallback(({ bankroll, stats, trainingStats }) => {
    if (!session?.user?.id) return
    pendingSave.current = { bankroll, ...stats, ...trainingStats }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const data = pendingSave.current
      if (!data) return
      try {
        const res = await fetch('/api/game/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (res.status === 404) signOut()
      } catch (e) { console.error('Save failed:', e) }
    }, 800)
  }, [session])

  const handleReset = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      await fetch('/api/user/reset', { method: 'POST' })
    } catch (e) { console.error('Reset failed:', e) }
  }, [session])

  const openAuthModal = useCallback(() => {
    setGuestMode(false)
    setModalDismissed(false)
  }, [])

  const handleVolumeChange = useCallback((newVolume) => {
    setVolumeOn(newVolume)
    if (typeof window !== 'undefined') {
      localStorage.setItem('volume', newVolume.toString())
    }
  }, [])

  const handleVolumeLevelChange = useCallback((level) => {
    setVolLevel(level)
    if (typeof window !== 'undefined') {
      localStorage.setItem('volumeLevel', level.toString())
    }
  }, [])

  // Fallback while session or stats are still resolving (should be near-instant with server prefetch)
  if (status === 'loading' || (status === 'authenticated' && dbStats === undefined)) {
    return <div style={{ background: '#08080e', minHeight: '100vh' }} />
  }

  const showModal = status === 'unauthenticated' && !guestMode && !modalDismissed
  const initialBankroll = dbStats?.bankroll ?? 1000
  const gameStats = dbStats
    ? { hands: dbStats.hands, wins: dbStats.wins, losses: dbStats.losses, pushes: dbStats.pushes, totalIncome: dbStats.totalIncome ?? 0, blackjacks: dbStats.blackjacks ?? 0, trainingHands: dbStats.trainingHands ?? 0, trainingCorrect: dbStats.trainingCorrect ?? 0 }
    : { hands: 0, wins: 0, losses: 0, pushes: 0, totalIncome: 0, blackjacks: 0, trainingHands: 0, trainingCorrect: 0 }

  const isMultiplayer = mode === 'multiplayer'

  return (
    <>
      {showModal && !isMultiplayer && (
        <AuthModal onClose={() => setModalDismissed(true)} onGuest={() => setGuestMode(true)} />
      )}
      <div style={isMultiplayer ? { pointerEvents: 'none', userSelect: 'none' } : {}}>
        <DeckProvider key={userId ?? 'guest'} initialBankroll={initialBankroll}>
          <App
            initialStats={gameStats}
            onRoundEnd={handleRoundEnd}
            onReset={handleReset}
            onShowAuth={openAuthModal}
            volumeOn={volumeOn}
            onVolumeChange={handleVolumeChange}
            volumeLevel={volumeLevel}
            onVolumeLevelChange={handleVolumeLevelChange}
            onSwitchToMultiplayer={() => setMode('multiplayer')}
          />
        </DeckProvider>
      </div>
      {isMultiplayer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <MultiplayerClient
            onLeave={() => setMode('singleplayer')}
            volumeOn={volumeOn}
          />
        </div>
      )}
    </>
  )
}
