'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MultiplayerClient from './multiplayer/MultiplayerClient'

export default function GameClient() {
  const { data: session, status } = useSession()
  const [volumeOn, setVolumeOn] = useState(true)
  const [dbStats, setDbStats] = useState(undefined)
  const [mpKey, setMpKey] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('volume')
      if (stored !== null) setVolumeOn(stored === 'true')
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') { setDbStats(null); return }
    fetch('/api/user/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => setDbStats(data ?? null))
      .catch(() => setDbStats(null))
  }, [status, session?.user?.id])

  if (status === 'loading' || (status === 'authenticated' && dbStats === undefined)) return null

  const handleVolumeChange = (v) => {
    setVolumeOn(v)
    if (typeof window !== 'undefined') localStorage.setItem('volume', v.toString())
  }

  return (
    <MultiplayerClient
      key={mpKey}
      onLeave={() => setMpKey(k => k + 1)}
      volumeOn={volumeOn}
      onVolumeChange={handleVolumeChange}
      dbStats={dbStats}
    />
  )
}
