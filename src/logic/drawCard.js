export default function drawCard({hand, deck}) {
  return {
    updatedHand: [...hand, deck[0]],
    updatedDeck: deck.slice(1),
  };
}
