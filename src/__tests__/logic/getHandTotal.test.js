import getHandTotal from '../../logic/getHandTotal'

const card = (value, suit = '♠') => ({ value, suit })

describe('getHandTotal', () => {
  describe('basic numeric cards', () => {
    it('returns correct total for a simple numeric hand', () => {
      expect(getHandTotal([card('7'), card('8')])).toBe(15)
    })

    it('handles face cards as 10', () => {
      expect(getHandTotal([card('J'), card('Q')])).toBe(20)
      expect(getHandTotal([card('K'), card('5')])).toBe(15)
    })

    it('handles a hand of all face cards', () => {
      expect(getHandTotal([card('J'), card('Q'), card('K')])).toBe(30)
    })
  })

  describe('Ace handling — soft vs hard', () => {
    it('Ace counts as 11 when safe', () => {
      // A + 6 = 17 (soft 17)
      expect(getHandTotal([card('A'), card('6')])).toBe(17)
    })

    it('Ace switches to 1 when total would exceed 21', () => {
      // A + 6 + 8 = 15 (ace drops from 11 to 1)
      expect(getHandTotal([card('A'), card('6'), card('8')])).toBe(15)
    })

    it('A + A counts as 12, not 22', () => {
      // First A = 11, second A = 1 → total 12
      expect(getHandTotal([card('A'), card('A')])).toBe(12)
    })

    it('A + A + 9 = 21, not 23 — multiple aces reduce correctly', () => {
      // First A=11, A=11, 9 → 31 → reduce first A → 21
      expect(getHandTotal([card('A'), card('A'), card('9')])).toBe(21)
    })

    it('A + A + A = 13 — all three aces reduce as needed', () => {
      // 11+11+11=33 → 23 → 13
      expect(getHandTotal([card('A'), card('A'), card('A')])).toBe(13)
    })

    it('soft 20: A + 9 = 20', () => {
      expect(getHandTotal([card('A'), card('9')])).toBe(20)
    })

    it('natural blackjack: A + K = 21', () => {
      expect(getHandTotal([card('A'), card('K')])).toBe(21)
    })

    it('hard hand with ace: 9 + 5 + A = 15 (ace as 1)', () => {
      expect(getHandTotal([card('9'), card('5'), card('A')])).toBe(15)
    })
  })

  describe('bust conditions', () => {
    it('three cards totalling > 21 returns bust value', () => {
      // 8 + 7 + 9 = 24
      expect(getHandTotal([card('8'), card('7'), card('9')])).toBe(24)
    })

    it('bust with face cards', () => {
      expect(getHandTotal([card('J'), card('K'), card('5')])).toBe(25)
    })
  })

  describe('edge cases', () => {
    it('empty hand returns 0', () => {
      expect(getHandTotal([])).toBe(0)
    })

    it('single card — numeric', () => {
      expect(getHandTotal([card('7')])).toBe(7)
    })

    it('single Ace returns 11', () => {
      expect(getHandTotal([card('A')])).toBe(11)
    })

    it('10 is treated as numeric 10', () => {
      expect(getHandTotal([card('10'), card('9')])).toBe(19)
    })
  })
})
