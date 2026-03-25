import drawCard from '../../logic/drawCard'

const card = (value, suit = '♠') => ({ value, suit })

describe('drawCard', () => {
  it('adds the top deck card to the hand', () => {
    const hand = [card('7'), card('8')]
    const deck = [card('A'), card('K'), card('Q')]
    const { updatedHand } = drawCard({ hand, deck })
    expect(updatedHand).toHaveLength(3)
    expect(updatedHand[2]).toEqual(card('A'))
  })

  it('removes the drawn card from the deck', () => {
    const hand = [card('7')]
    const deck = [card('A'), card('K')]
    const { updatedDeck } = drawCard({ hand, deck })
    expect(updatedDeck).toHaveLength(1)
    expect(updatedDeck[0]).toEqual(card('K'))
  })

  it('does not mutate the original hand', () => {
    const hand = [card('7')]
    const deck = [card('A')]
    const originalLength = hand.length
    drawCard({ hand, deck })
    expect(hand).toHaveLength(originalLength)
  })

  it('does not mutate the original deck', () => {
    const hand = []
    const deck = [card('A'), card('K')]
    const originalLength = deck.length
    drawCard({ hand, deck })
    expect(deck).toHaveLength(originalLength)
  })

  it('always takes the first card from the deck (index 0)', () => {
    const hand = []
    const deck = [card('2'), card('3'), card('4')]
    const { updatedHand } = drawCard({ hand, deck })
    expect(updatedHand[0]).toEqual(card('2'))
  })

  it('returned hand contains original cards followed by drawn card', () => {
    const hand = [card('5'), card('6')]
    const deck = [card('J')]
    const { updatedHand } = drawCard({ hand, deck })
    expect(updatedHand).toEqual([card('5'), card('6'), card('J')])
  })

  describe('deck uniqueness over multiple draws', () => {
    it('cards drawn in sequence do not repeat', () => {
      const SUITS = ['♠', '♥', '♦', '♣']
      const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
      let deck = SUITS.flatMap(suit => VALUES.map(value => ({ suit, value })))
      let hand = []

      const drawn = new Set()
      for (let i = 0; i < 10; i++) {
        const result = drawCard({ hand, deck })
        const key = `${result.updatedHand[i].value}-${result.updatedHand[i].suit}`
        expect(drawn.has(key)).toBe(false)
        drawn.add(key)
        hand = result.updatedHand
        deck = result.updatedDeck
      }
    })
  })
})
