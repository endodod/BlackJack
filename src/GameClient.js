'use client'
import { DeckProvider } from './context/DeckContext'
import App from './App'

export default function GameClient() {
  return (
    <DeckProvider>
      <App />
    </DeckProvider>
  )
}
