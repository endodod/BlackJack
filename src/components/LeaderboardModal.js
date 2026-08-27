'use client'
import { useEffect, useState } from 'react'
import './LeaderboardModal.css'

const BOARDS = [
  { key: 'freeplay',    label: 'Freeplay' },
  { key: 'training',    label: 'Training' },
  { key: 'multiplayer', label: 'Multiplayer' },
]

function rankClass(i) {
  if (i === 0) return 'lb-rank lb-rank-1'
  if (i === 1) return 'lb-rank lb-rank-2'
  if (i === 2) return 'lb-rank lb-rank-3'
  return 'lb-rank'
}

function BankrollRow({ entry, i }) {
  return (
    <div className="lb-row">
      <span className={rankClass(i)}>{i + 1}</span>
      <span className="lb-name">{entry.username}</span>
      <span className="lb-primary">${entry.bankroll}</span>
      <span className="lb-secondary">{entry.hands} hands</span>
    </div>
  )
}

function TrainingRow({ entry, i }) {
  const accuracy = entry.trainingHands > 0
    ? Math.round((entry.trainingCorrect / entry.trainingHands) * 100)
    : 0
  return (
    <div className="lb-row">
      <span className={rankClass(i)}>{i + 1}</span>
      <span className="lb-name">{entry.username}</span>
      <span className="lb-primary">{accuracy}% correct</span>
      <span className="lb-secondary">{entry.trainingHands} hands</span>
    </div>
  )
}

function CardCountingRow({ entry, i }) {
  const accuracy = entry.cardCountingHands > 0
    ? Math.round((entry.cardCountingCorrect / entry.cardCountingHands) * 100)
    : 0
  return (
    <div className="lb-row">
      <span className={rankClass(i)}>{i + 1}</span>
      <span className="lb-name">{entry.username}</span>
      <span className="lb-primary">{accuracy}% correct</span>
      <span className="lb-secondary">{entry.cardCountingHands} checks</span>
    </div>
  )
}

function ResetsRow({ entry, i }) {
  return (
    <div className="lb-row">
      <span className={rankClass(i)}>{i + 1}</span>
      <span className="lb-name">{entry.username}</span>
      <span className="lb-primary">{entry.resets} resets</span>
    </div>
  )
}

function MultiplayerRow({ entry, i }) {
  return (
    <div className="lb-row">
      <span className={rankClass(i)}>{i + 1}</span>
      <span className="lb-name">{entry.username}</span>
      <span className="lb-primary">{entry.multiplayerWins} wins</span>
    </div>
  )
}

const FREEPLAY_METRICS = [
  ['bankroll', 'Bankroll'],
  ['resets',   'Resets'],
]

const TRAINING_METRICS = [
  ['accuracy',     'Basic Strategy'],
  ['cardCounting', 'Card Counting'],
]

export default function LeaderboardModal({ onClose }) {
  const [active, setActive] = useState('freeplay')
  const [freeplayMetric, setFreeplayMetric] = useState('bankroll')
  const [trainingMetric, setTrainingMetric] = useState('accuracy')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const dataKey =
    active === 'freeplay' ? freeplayMetric :
    active === 'training' ? (trainingMetric === 'accuracy' ? 'training' : 'cardCounting') :
    'multiplayerWins'
  const rows = data?.[dataKey] ?? []

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div className="lb-modal" onClick={e => e.stopPropagation()}>
        <div className="lb-header">
          <span className="lb-title">Leaderboard</span>
          <button className="lb-close" onClick={onClose}>✕</button>
        </div>

        <div className="lb-tabs">
          {BOARDS.map(b => (
            <button
              key={b.key}
              className={`lb-tab${active === b.key ? ' lb-tab-active' : ''}`}
              onClick={() => setActive(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>

        {active === 'freeplay' && (
          <div className="lb-subtabs">
            {FREEPLAY_METRICS.map(([key, label]) => (
              <button
                key={key}
                className={`lb-subtab${freeplayMetric === key ? ' lb-subtab-active' : ''}`}
                onClick={() => setFreeplayMetric(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {active === 'training' && (
          <div className="lb-subtabs">
            {TRAINING_METRICS.map(([key, label]) => (
              <button
                key={key}
                className={`lb-subtab${trainingMetric === key ? ' lb-subtab-active' : ''}`}
                onClick={() => setTrainingMetric(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <p className="lb-filter-note">
          {active === 'freeplay'
            ? freeplayMetric === 'bankroll'
              ? 'Minimum 5 hands played to qualify'
              : 'Amount of bankroll resets in freeplay'
            : active === 'training'
            ? trainingMetric === 'accuracy'
              ? 'Minimum 5 training hands to qualify'
              : 'Minimum 5 card counting checks to qualify'
            : 'Multiplayer rounds won'}
        </p>

        <div className="lb-list">
          {loading && <div className="lb-empty">Loading…</div>}
          {!loading && rows.length === 0 && (
            <div className="lb-empty">No entries yet.</div>
          )}
          {!loading && rows.map((entry, i) => (
            active === 'freeplay'
              ? (freeplayMetric === 'bankroll'
                  ? <BankrollRow key={entry.username} entry={entry} i={i} />
                  : <ResetsRow   key={entry.username} entry={entry} i={i} />)
              : active === 'training'
              ? (trainingMetric === 'accuracy'
                  ? <TrainingRow      key={entry.username} entry={entry} i={i} />
                  : <CardCountingRow  key={entry.username} entry={entry} i={i} />)
              : <MultiplayerRow key={entry.username} entry={entry} i={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
