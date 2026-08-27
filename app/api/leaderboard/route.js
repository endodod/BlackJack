import { NextResponse } from 'next/server'
import prisma from '../../../src/lib/prisma'

// Accuracy is a ratio of two columns, so Prisma can't order by it directly —
// fetch qualifying rows and sort in JS instead.
function topByAccuracy(rows, handsField, correctField, limit = 10) {
  return rows
    .map(r => ({ ...r, accuracy: r[correctField] / r[handsField] }))
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, limit)
}

export async function GET() {
  const [bankroll, trainingRows, cardCountingRows, resets, multiplayerWins] = await Promise.all([
    prisma.user.findMany({
      where: { hands: { gte: 5 } },
      orderBy: { bankroll: 'desc' },
      take: 10,
      select: { username: true, bankroll: true, hands: true },
    }),
    prisma.user.findMany({
      where: { trainingHands: { gte: 5 } },
      select: { username: true, trainingHands: true, trainingCorrect: true },
    }),
    prisma.user.findMany({
      where: { cardCountingHands: { gte: 5 } },
      select: { username: true, cardCountingHands: true, cardCountingCorrect: true },
    }),
    prisma.user.findMany({
      where: { resets: { gt: 0 } },
      orderBy: { resets: 'desc' },
      take: 10,
      select: { username: true, resets: true },
    }),
    prisma.user.findMany({
      where: { multiplayerWins: { gt: 0 } },
      orderBy: { multiplayerWins: 'desc' },
      take: 10,
      select: { username: true, multiplayerWins: true },
    }),
  ])

  const training = topByAccuracy(trainingRows, 'trainingHands', 'trainingCorrect')
  const cardCounting = topByAccuracy(cardCountingRows, 'cardCountingHands', 'cardCountingCorrect')

  return NextResponse.json({ bankroll, resets, training, cardCounting, multiplayerWins })
}
