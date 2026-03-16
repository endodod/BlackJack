'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import './AuthModal.css'

export default function AuthModal({ onClose, onGuest }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', { username, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError('Invalid username or password')
    } else {
      onClose()
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setLoading(false)
      setError(data.error || 'Registration failed')
      return
    }
    // Auto-login after register
    const loginRes = await signIn('credentials', { username, password, redirect: false })
    setLoading(false)
    if (loginRes?.error) {
      setError('Registered but login failed — please try logging in')
      setTab('login')
    } else {
      onClose()
    }
  }

  const switchTab = (t) => {
    setTab(t)
    setError('')
  }

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <h2 className="auth-modal-title">Blackjack</h2>
        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'login' ? ' auth-tab-active' : ''}`}
            onClick={() => switchTab('login')}
          >
            Login
          </button>
          <button
            className={`auth-tab${tab === 'register' ? ' auth-tab-active' : ''}`}
            onClick={() => switchTab('register')}
          >
            Register
          </button>
        </div>
        <form className="auth-form" onSubmit={tab === 'login' ? handleLogin : handleRegister}>
          <input
            className="auth-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={20}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            required
          />
          <div className="auth-error">{error}</div>
          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? '...' : tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
        <hr className="auth-divider" />
        <button className="auth-guest-btn" onClick={onGuest}>
          Play as Guest (no save)
        </button>
      </div>
    </div>
  )
}
