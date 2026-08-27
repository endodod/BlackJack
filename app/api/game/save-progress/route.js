import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../src/lib/auth'
import prisma from '../../../../src/lib/prisma'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bankroll, hands, wins, losses, pushes, totalIncome, blackjacks, trainingHands, trainingCorrect, cardCountingHands, cardCountingCorrect } = await req.json()

  const data = { bankroll, hands, wins, losses, pushes }
  if (totalIncome !== undefined) data.totalIncome = totalIncome
  if (blackjacks !== undefined) data.blackjacks = blackjacks
  if (trainingHands !== undefined) data.trainingHands = trainingHands
  if (trainingCorrect !== undefined) data.trainingCorrect = trainingCorrect
  if (cardCountingHands !== undefined) data.cardCountingHands = cardCountingHands
  if (cardCountingCorrect !== undefined) data.cardCountingCorrect = cardCountingCorrect

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data,
    })
  } catch (err) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    throw err
  }

  return NextResponse.json({ success: true })
}
