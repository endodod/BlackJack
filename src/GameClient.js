'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DeckProvider } from './context/DeckContext'
import App from './App'
import AuthModal from './components/AuthModal'

export default function GameClient() {
  const { data: session, status } = useSession()
  const [guestMode, setGuestMode] = useState(false)
  const [modalDismissed, setModalDismissed] = useState(false)
  const saveTimer = useRef(null)
  const pendingSave = useRef(null)
  const prevUserIdRef = useRef(session?.user?.id)

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

  const handleRoundEnd = useCallback(({ bankroll, stats }) => {
    if (!session?.user?.id) return
    pendingSave.current = { bankroll, ...stats }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const data = pendingSave.current
      if (!data) return
      try {
        await fetch('/api/game/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } catch (e) { console.error('Save failed:', e) }
    }, 800)
  }, [session])

  if (status === 'loading') return null

  const showModal = status === 'unauthenticated' && !guestMode && !modalDismissed
  const initialBankroll = session?.user?.bankroll ?? 1000
  const initialStats = session?.user
    ? { hands: session.user.hands, wins: session.user.wins, losses: session.user.losses, pushes: session.user.pushes }
    : { hands: 0, wins: 0, losses: 0, pushes: 0 }

  return (
    <>
      {showModal && (
        <AuthModal onClose={() => setModalDismissed(true)} onGuest={() => setGuestMode(true)} />
      )}
      <DeckProvider key={session?.user?.id ?? 'guest'} initialBankroll={initialBankroll}>
        <App initialStats={initialStats} onRoundEnd={handleRoundEnd} />
      </DeckProvider>
    </>
  )
}
