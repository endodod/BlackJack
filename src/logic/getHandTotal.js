export default function getHandTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.value === 'A') { total += 11; aces++; }
    else if (['J', 'Q', 'K'].includes(String(card.value))) total += 10;
    else total += Number(card.value);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
