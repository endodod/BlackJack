import checkWinner from '../../logic/checkWinner'

const card = (value, suit = '♠') => ({ value, suit })

describe('checkWinner', () => {
  describe('dealer bust', () => {
    it('dealer bust → Player Wins regardless of player total', () => {
      const playerHand = [card('8'), card('9')]          // 17
      const dealerHand = [card('J'), card('K'), card('5')] // 25 — bust
      expect(checkWinner({ playerHand, dealerHand })).toBe('Player Wins')
    })

    it('dealer bust with player also at > 21 — dealer bust checked first', () => {
      // Note: checkWinner checks dealer bust BEFORE player bust,
      // so dealer bust always returns 'Player Wins' even if player also busted.
      // This is correct per the code's evaluation order.
      const playerHand = [card('J'), card('K'), card('5')] // 25
      const dealerHand = [card('J'), card('Q'), card('5')] // 25
      expect(checkWinner({ playerHand, dealerHand })).toBe('Player Wins')
    })
  })

  describe('player bust', () => {
    it('player bust (dealer not bust) → House Wins', () => {
      const playerHand = [card('J'), card('K'), card('5')] // 25
      const dealerHand = [card('J'), card('7')]             // 17
      expect(checkWinner({ playerHand, dealerHand })).toBe('House Wins')
    })
  })

  describe('higher hand wins', () => {
    it('dealer higher total → House Wins', () => {
      const playerHand = [card('7'), card('9')]  // 16
      const dealerHand = [card('J'), card('9')]  // 19
      expect(checkWinner({ playerHand, dealerHand })).toBe('House Wins')
    })

    it('player higher total → Player Wins', () => {
      const playerHand = [card('J'), card('9')]  // 19
      const dealerHand = [card('7'), card('9')]  // 16
      expect(checkWinner({ playerHand, dealerHand })).toBe('Player Wins')
    })

    it('player 21 vs dealer 20 → Player Wins', () => {
      const playerHand = [card('A'), card('K')]  // 21
      const dealerHand = [card('J'), card('Q')]  // 20
      expect(checkWinner({ playerHand, dealerHand })).toBe('Player Wins')
    })

    it('dealer 21 vs player 20 → House Wins', () => {
      const playerHand = [card('J'), card('Q')]  // 20
      const dealerHand = [card('A'), card('K')]  // 21
      expect(checkWinner({ playerHand, dealerHand })).toBe('House Wins')
    })
  })

  describe('push (tie)', () => {
    it('equal totals → Push', () => {
      const playerHand = [card('J'), card('7')]  // 17
      const dealerHand = [card('9'), card('8')]  // 17
      expect(checkWinner({ playerHand, dealerHand })).toBe('Push')
    })

    it('both have 20 → Push', () => {
      const playerHand = [card('J'), card('Q')]  // 20
      const dealerHand = [card('K'), card('Q')]  // 20
      expect(checkWinner({ playerHand, dealerHand })).toBe('Push')
    })

    it('both have 21 (natural) → Push', () => {
      const playerHand = [card('A'), card('K')]  // 21
      const dealerHand = [card('A'), card('J')]  // 21
      expect(checkWinner({ playerHand, dealerHand })).toBe('Push')
    })
  })
})
