import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '../../../../src/lib/prisma'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bankroll, hands, wins, losses, pushes } = await req.json()

  await prisma.user.update({
    where: { id: session.user.id },
    data: { bankroll, hands, wins, losses, pushes },
  })

  return NextResponse.json({ success: true })
}
