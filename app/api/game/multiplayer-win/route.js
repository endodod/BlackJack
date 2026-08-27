import { NextResponse } from 'next/server'
import prisma from '../../../../src/lib/prisma'

// Called server-to-server by the PartyKit room on round resolution — there's no
// browser session to check here, so a shared secret authenticates the caller instead.
export async function POST(req) {
  const secret = req.headers.get('x-party-secret')
  if (!secret || secret !== process.env.PARTY_SHARED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username } = await req.json()
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
  }

  // Silently no-ops for guest names that don't match a real account.
  await prisma.user.updateMany({
    where: { username },
    data: { multiplayerWins: { increment: 1 } },
  })

  return NextResponse.json({ success: true })
}
