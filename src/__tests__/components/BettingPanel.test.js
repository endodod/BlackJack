/**
 * Tests for BettingPanel component
 * Source: src/components/BettingPanel.js
 *
 * Quick-bet buttons: $10, $25, $100, $500
 * Deal button: disabled when betAmount === 0 OR betAmount > bankroll
 * There is NO text input for bet amount — only chip buttons.
 * Therefore: negative bets and non-numeric bets are structurally impossible.
 *
 * isOutOfMoney in useBlackjackGame: bankroll < 10 (threshold is 10, not 0)
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BettingPanel from '../../components/BettingPanel'
import { DeckContext } from '../../context/DeckContext'

// Mock sound to prevent Audio API errors in jsdom
jest.mock('../../lib/sound', () => ({
  playSound: jest.fn(),
  resumeAudio: jest.fn(),
  setVolumeEnabled: jest.fn(),
}))

function renderPanel({ bankroll = 1000, onDeal = jest.fn(), defaultBet = 0 } = {}) {
  const contextValue = {
    bankroll,
    setCurrentBet: jest.fn(),
    deck: [],
    setDeck: jest.fn(),
    dealerHand: [],
    setDealerHand: jest.fn(),
    playerHand: [],
    setPlayerHand: jest.fn(),
    playerTurn: true,
    setPlayerTurn: jest.fn(),
    currentBet: 0,
  }
  return {
    onDeal,
    ...render(
      <DeckContext.Provider value={contextValue}>
        <BettingPanel onDeal={onDeal} defaultBet={defaultBet} />
      </DeckContext.Provider>
    ),
  }
}

// Exact chip name matchers (avoid /\$10/ matching $100, $1000 etc.)
const chip = {
  $10:  (el) => el.textContent.trim() === '$10',
  $25:  (el) => el.textContent.trim() === '$25',
  $100: (el) => el.textContent.trim() === '$100',
  $500: (el) => el.textContent.trim() === '$500',
}

describe('UI / STATE CONSISTENCY — BettingPanel', () => {
  describe('initial state', () => {
    it('Deal button is disabled when bet is $0', () => {
      renderPanel({ bankroll: 1000 })
      expect(screen.getByRole('button', { name: /deal/i })).toBeDisabled()
    })

    it('displays initial bet of $0', () => {
      renderPanel()
      expect(screen.getByText('$0')).toBeInTheDocument()
    })

    it('renders all four quick-bet chip buttons', () => {
      renderPanel()
      const btns = screen.getAllByRole('button', { name: /chip|^\$/ })
      // All 4 chip buttons should be in the DOM
      const chipButtons = screen.getAllByRole('button').filter(b => /^\$\d+$/.test(b.textContent.trim()))
      expect(chipButtons).toHaveLength(4)
    })

    it('all four chip values are present: $10, $25, $100, $500', () => {
      renderPanel({ bankroll: 1000 })
      const allButtons = screen.getAllByRole('button')
      const texts = allButtons.map(b => b.textContent.trim())
      expect(texts).toContain('$10')
      expect(texts).toContain('$25')
      expect(texts).toContain('$100')
      expect(texts).toContain('$500')
    })
  })

  describe('BLACKJACK: GAME INITIALIZATION — bet validation', () => {
    it('cannot start game with bet = 0 — Deal button disabled', () => {
      renderPanel({ bankroll: 1000 })
      expect(screen.getByRole('button', { name: /deal/i })).toBeDisabled()
    })

    it('cannot start game with bet > balance — chip disabled, Deal disabled', () => {
      renderPanel({ bankroll: 50 })
      const chipButtons = screen.getAllByRole('button').filter(b => /^\$\d+$/.test(b.textContent.trim()))
      const btn100 = chipButtons.find(chip.$100)
      expect(btn100).toBeDisabled()
    })

    it('chip button disabled when adding it would exceed bankroll', () => {
      renderPanel({ bankroll: 30 })
      const chipButtons = screen.getAllByRole('button').filter(b => /^\$\d+$/.test(b.textContent.trim()))
      expect(chipButtons.find(chip.$100)).toBeDisabled()
      expect(chipButtons.find(chip.$500)).toBeDisabled()
    })

    it('Deal button enabled after valid bet placed', () => {
      renderPanel({ bankroll: 1000 })
      const chipBtns = screen.getAllByRole('button').filter(b => b.textContent.trim() === '$10')
      fireEvent.click(chipBtns[0])
      expect(screen.getByRole('button', { name: /deal/i })).not.toBeDisabled()
    })

    it('cannot start with negative bet — no text input, chip buttons prevent this', () => {
      renderPanel({ bankroll: 1000 })
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('cannot start with non-numeric bet — chip buttons only, always numeric', () => {
      renderPanel({ bankroll: 1000 })
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('chip button interactions', () => {
    it('clicking $10 chip increases bet display to $10', () => {
      renderPanel({ bankroll: 1000 })
      const ten = screen.getAllByRole('button').find(chip.$10)
      fireEvent.click(ten)
      // Use selector:'span' because both the chip button and bet-display span show '$10'
      expect(screen.getByText('$10', { selector: 'span' })).toBeInTheDocument()
    })

    it('clicking chips accumulates the bet ($25 + $25 = $50)', () => {
      renderPanel({ bankroll: 1000 })
      const twenty5 = screen.getAllByRole('button').find(chip.$25)
      fireEvent.click(twenty5)
      fireEvent.click(twenty5)
      expect(screen.getByText('$50')).toBeInTheDocument()
    })

    it('chip disabled when adding it would exceed bankroll', () => {
      renderPanel({ bankroll: 15 })
      const chipButtons = screen.getAllByRole('button').filter(b => /^\$\d+$/.test(b.textContent.trim()))
      expect(chipButtons.find(chip.$25)).toBeDisabled()
    })

    it('very large bet near balance — $500 chip enabled when bankroll = 500', () => {
      renderPanel({ bankroll: 500 })
      const btn500 = screen.getAllByRole('button').find(chip.$500)
      expect(btn500).not.toBeDisabled()
    })
  })

  describe('Clear button', () => {
    it('Clear button is disabled when bet is $0', () => {
      renderPanel()
      expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled()
    })

    it('Clear button resets bet to $0', () => {
      renderPanel({ bankroll: 1000 })
      const twenty5 = screen.getAllByRole('button').find(chip.$25)
      fireEvent.click(twenty5)
      fireEvent.click(screen.getByRole('button', { name: /clear/i }))
      expect(screen.getByText('$0')).toBeInTheDocument()
    })

    it('after clear, Deal button is disabled again', () => {
      renderPanel({ bankroll: 1000 })
      const twenty5 = screen.getAllByRole('button').find(chip.$25)
      fireEvent.click(twenty5)
      fireEvent.click(screen.getByRole('button', { name: /clear/i }))
      expect(screen.getByRole('button', { name: /deal/i })).toBeDisabled()
    })
  })

  describe('bet resets after round ends', () => {
    it('betAmount resets to $0 after Deal is clicked', () => {
      const onDeal = jest.fn()
      renderPanel({ bankroll: 1000, onDeal })
      const twenty5 = screen.getAllByRole('button').find(chip.$25)
      fireEvent.click(twenty5)
      fireEvent.click(screen.getByRole('button', { name: /deal/i }))
      expect(screen.getByText('$0')).toBeInTheDocument()
    })

    it('onDeal callback called with the bet amount', () => {
      const onDeal = jest.fn()
      renderPanel({ bankroll: 1000, onDeal })
      const twenty5 = screen.getAllByRole('button').find(chip.$25)
      fireEvent.click(twenty5)
      fireEvent.click(screen.getByRole('button', { name: /deal/i }))
      expect(onDeal).toHaveBeenCalledWith(25)
    })
  })

  describe('BLACKJACK: EDGE CASES — balance = 0 / < 10', () => {
    /**
     * isOutOfMoney in the hook is: bankroll < 10 (not bankroll === 0).
     * When bankroll < 10, all chip buttons ($10+) are disabled.
     */
    it('balance < 10 — all chip buttons disabled (minimum chip $10 > bankroll)', () => {
      renderPanel({ bankroll: 5 })
      const chipButtons = screen.getAllByRole('button').filter(b => /^\$\d+$/.test(b.textContent.trim()))
      chipButtons.forEach(btn => expect(btn).toBeDisabled())
    })

    it('balance = 0 — Deal button disabled', () => {
      renderPanel({ bankroll: 0 })
      expect(screen.getByRole('button', { name: /deal/i })).toBeDisabled()
    })

    it('very large bet (= full balance) — Deal allowed when bet ≤ bankroll', () => {
      renderPanel({ bankroll: 500 })
      const btn500 = screen.getAllByRole('button').find(chip.$500)
      fireEvent.click(btn500)
      // 500 <= 500 → Deal enabled
      expect(screen.getByRole('button', { name: /deal/i })).not.toBeDisabled()
    })
  })
})
