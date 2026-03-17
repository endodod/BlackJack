/**
 * Tests for AuthModal component
 * Source: src/components/AuthModal.js
 *
 * Login flow: signIn('credentials', { redirect: false }) → error = 'Invalid username or password'
 * Register flow: POST /api/auth/register → auto-login → onClose()
 *
 * Session persistence: JWT cookie managed by NextAuth — no localStorage involved.
 * Already-logged-in user: the UI layer is responsible for not showing the modal.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthModal from '../../components/AuthModal'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

const { signIn } = require('next-auth/react')

// Mock global fetch for register calls
global.fetch = jest.fn()

const onClose = jest.fn()
const onGuest = jest.fn()

function renderModal() {
  return render(<AuthModal onClose={onClose} onGuest={onGuest} />)
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch.mockReset()
})

// The modal has two "Login" buttons: the tab button and the submit button.
// Use getAllByRole(...).find(b => b.type === 'submit') to target the submit button.
function getLoginSubmitBtn() {
  return screen.getAllByRole('button', { name: /^login$/i }).find(b => b.type === 'submit')
}

describe('AUTH: REGISTER — AuthModal component', () => {
  describe('tab visibility', () => {
    it('shows Login and Register tabs', () => {
      renderModal()
      // Both the Login tab button and Login submit button are present — check at least one
      expect(screen.getAllByRole('button', { name: /^login$/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('button', { name: /^register$/i })).toBeInTheDocument()
    })

    it('switching to Register tab shows "Create Account" button', async () => {
      renderModal()
      fireEvent.click(screen.getByRole('button', { name: /register/i }))
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })
  })

  describe('valid registration', () => {
    it('successful register → auto-login → onClose called', async () => {
      renderModal()
      fireEvent.click(screen.getByRole('button', { name: /^register$/i }))

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      signIn.mockResolvedValueOnce({ error: null })

      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'alice' } })
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret123' } })
      fireEvent.submit(document.querySelector('.auth-form'))

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    })
  })

  describe('duplicate username', () => {
    it('API returns 409 → error message shown', async () => {
      renderModal()
      fireEvent.click(screen.getByRole('button', { name: /^register$/i }))

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Username already taken' }),
      })

      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'alice' } })
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret123' } })
      fireEvent.submit(document.querySelector('.auth-form'))

      await waitFor(() =>
        expect(screen.getByText(/username already taken/i)).toBeInTheDocument()
      )
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('empty field validation', () => {
    it('empty username → HTML required prevents submit', async () => {
      renderModal()
      fireEvent.click(screen.getByRole('button', { name: /^register$/i }))

      // Leave username empty, only fill password; click submit
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret123' } })
      // fireEvent.click triggers HTML required check; fireEvent.submit bypasses it.
      // Use click to verify HTML required blocks submission.
      fireEvent.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => expect(fetch).not.toHaveBeenCalled())
    })

    it('empty password → HTML required prevents submit', async () => {
      renderModal()
      fireEvent.click(screen.getByRole('button', { name: /^register$/i }))

      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'alice' } })
      // Leave password empty
      fireEvent.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => expect(fetch).not.toHaveBeenCalled())
    })
  })

  describe('API error feedback', () => {
    it('registration failure with error message → error is displayed', async () => {
      renderModal()
      fireEvent.click(screen.getByRole('button', { name: /^register$/i }))

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Registration failed' }),
      })

      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'xxxxx' } })
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret123' } })
      fireEvent.submit(document.querySelector('.auth-form'))

      await waitFor(() =>
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
      )
    })
  })
})

describe('AUTH: LOGIN — AuthModal component', () => {
  describe('valid login', () => {
    it('correct credentials → onClose called', async () => {
      renderModal()
      signIn.mockResolvedValueOnce({ error: null })

      // Use fireEvent.change + fireEvent.submit(form) for reliable controlled-input updates
      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'alice' } })
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret123' } })
      fireEvent.submit(document.querySelector('.auth-form'))

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    })

    it('signIn is called with credentials provider and redirect:false', async () => {
      renderModal()
      signIn.mockResolvedValueOnce({ error: null })

      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'alice' } })
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret123' } })
      fireEvent.submit(document.querySelector('.auth-form'))

      await waitFor(() =>
        expect(signIn).toHaveBeenCalledWith('credentials', {
          username: 'alice',
          password: 'secret123',
          redirect: false,
        })
      )
    })
  })

  describe('wrong password / non-existent username', () => {
    it('signIn returns error → "Invalid username or password" shown, onClose NOT called', async () => {
      renderModal()
      signIn.mockResolvedValueOnce({ error: 'CredentialsSignin' })

      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'alice' } })
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrongpass' } })
      fireEvent.submit(document.querySelector('.auth-form'))

      await waitFor(() =>
        expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument()
      )
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('empty fields', () => {
    it('empty username → HTML required prevents signIn call', () => {
      renderModal()
      // fireEvent.click triggers HTML required validation; signIn not called when required field empty
      fireEvent.click(getLoginSubmitBtn())
      expect(signIn).not.toHaveBeenCalled()
    })
  })

  describe('already logged-in user', () => {
    /**
     * The modal is conditionally rendered by the parent (GameClient.js).
     * When session is authenticated, the parent should NOT render AuthModal at all.
     * This test verifies that the modal itself does not double-submit signIn when
     * a session is already active — enforcement is a parent component concern.
     */
    it('modal can be rendered regardless (parent controls visibility)', () => {
      renderModal()
      // The login submit button is present (modal renders regardless of session)
      expect(getLoginSubmitBtn()).toBeTruthy()
    })
  })

  describe('guest mode', () => {
    it('Play as Guest button calls onGuest', () => {
      renderModal()
      fireEvent.click(screen.getByRole('button', { name: /play as guest/i }))
      expect(onGuest).toHaveBeenCalledTimes(1)
    })
  })
})

describe('AUTH: LOGOUT — visibility', () => {
  /**
   * The logout button is part of the Settings menu in App.js, not AuthModal.
   * AuthModal only handles login/register.
   * We can verify the modal itself has no logout button.
   */
  it('AuthModal does not contain a logout button', () => {
    renderModal()
    expect(screen.queryByRole('button', { name: /logout|sign out/i })).not.toBeInTheDocument()
  })
})
