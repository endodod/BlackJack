import { getServerSession } from 'next-auth'
import { authOptions } from '../src/lib/auth'
import prisma from '../src/lib/prisma'
import GameClient from '../src/GameClient'

export default async function Page() {
  const session = await getServerSession(authOptions)
  let initialStats = null
  if (session?.user?.id) {
    initialStats = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, bankroll: true, hands: true, wins: true, losses: true, pushes: true, resets: true, totalIncome: true, blackjacks: true, trainingHands: true, trainingCorrect: true },
    })
  }
  return <GameClient initialStats={initialStats} />
}
