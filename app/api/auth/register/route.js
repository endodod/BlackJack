import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '../../../../src/lib/prisma'

export async function POST(req) {
  const { username, password } = await req.json()

  if (!username || username.length < 3 || username.length > 20) {
    return NextResponse.json({ error: 'Username must be 3–20 characters' }, { status: 400 })
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.create({ data: { username, password: hashed } })

  return NextResponse.json({ success: true }, { status: 201 })
}
