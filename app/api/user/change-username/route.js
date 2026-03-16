import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '../../../../src/lib/prisma'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { newUsername, password } = await req.json()

  if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
    return NextResponse.json({ error: 'Username must be 3–20 characters' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })
  }

  const existing = await prisma.user.findUnique({ where: { username: newUsername } })
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { username: newUsername } })

  return NextResponse.json({ success: true })
}
