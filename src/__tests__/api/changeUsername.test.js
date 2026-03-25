/**
 * @jest-environment node
 *
 * Tests for POST /api/user/change-username
 * Route: app/api/user/change-username/route.js
 * Requires: authenticated session + correct password
 * Validates: newUsername 3–20 chars, password must match, username not taken
 *
 * NOTE: The API does NOT check whether newUsername === current username.
 *       Setting the same username will succeed if it passes length validation
 *       (and will fail with 409 "Username already taken" since findUnique returns the user).
 * NOTE: The API does NOT trim whitespace. "   " (3 spaces) passes the length check.
 */

jest.mock('../../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))

jest.mock('../../../app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

const prisma = require('../../lib/prisma')
const bcrypt = require('bcryptjs')
const nextAuth = require('next-auth')

function makeReq(body) {
  return new Request('http://localhost/api/user/change-username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const currentUser = { id: 'user123', username: 'alice', password: '$2b$12$hashed' }

beforeEach(() => {
  jest.clearAllMocks()
  nextAuth.getServerSession.mockResolvedValue({ user: { id: 'user123' } })
})

describe('ACCOUNT: CHANGE USERNAME — API', () => {
  const { POST } = require('../../../app/api/user/change-username/route')

  describe('unauthenticated requests', () => {
    it('no session → 401', async () => {
      nextAuth.getServerSession.mockResolvedValue(null)
      const res = await POST(makeReq({ newUsername: 'bob', password: 'secret' }))
      expect(res.status).toBe(401)
    })
  })

  describe('valid change', () => {
    it('valid new username + correct password → 200 success', async () => {
      // findUnique: first call = get current user, second call = check duplicate
      prisma.user.findUnique
        .mockResolvedValueOnce(currentUser)   // get user by ID
        .mockResolvedValueOnce(null)           // no duplicate with new username
      bcrypt.compare.mockResolvedValue(true)
      prisma.user.update.mockResolvedValue({})

      const res = await POST(makeReq({ newUsername: 'bob', password: 'secret' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
    })

    it('update is called with correct new username', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(null)
      bcrypt.compare.mockResolvedValue(true)
      prisma.user.update.mockResolvedValue({})

      await POST(makeReq({ newUsername: 'bob', password: 'secret' }))

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { username: 'bob' },
      })
    })
  })

  describe('username already taken', () => {
    it('new username already exists → 409', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(currentUser)              // get user by ID
        .mockResolvedValueOnce({ id: 'other', username: 'bob' }) // duplicate found
      bcrypt.compare.mockResolvedValue(true)

      const res = await POST(makeReq({ newUsername: 'bob', password: 'secret' }))
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.error).toBe('Username already taken')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('wrong password', () => {
    it('incorrect password → 403', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(currentUser)
      bcrypt.compare.mockResolvedValue(false)

      const res = await POST(makeReq({ newUsername: 'bob', password: 'wrongpass' }))
      const body = await res.json()

      expect(res.status).toBe(403)
      expect(body.error).toBe('Incorrect password')
    })
  })

  describe('username validation', () => {
    it('empty newUsername → 400', async () => {
      const res = await POST(makeReq({ newUsername: '', password: 'secret' }))
      expect(res.status).toBe(400)
    })

    it('missing newUsername → 400', async () => {
      const res = await POST(makeReq({ password: 'secret' }))
      expect(res.status).toBe(400)
    })

    it('newUsername < 3 chars → 400', async () => {
      const res = await POST(makeReq({ newUsername: 'ab', password: 'secret' }))
      expect(res.status).toBe(400)
    })

    it('newUsername > 20 chars → 400', async () => {
      const res = await POST(makeReq({ newUsername: 'a'.repeat(21), password: 'secret' }))
      expect(res.status).toBe(400)
    })

    /**
     * Whitespace-only username ("   " = 3 chars) passes the length check.
     * The server does NOT trim. This is a known gap.
     */
    it('whitespace-only username (3 spaces) — passes length check (server does not trim)', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(null)
      bcrypt.compare.mockResolvedValue(true)
      prisma.user.update.mockResolvedValue({})

      const res = await POST(makeReq({ newUsername: '   ', password: 'secret' }))
      // No trim → length = 3 → passes → 200
      expect(res.status).toBe(200)
    })
  })

  describe('same username as current', () => {
    /**
     * The API has no explicit "same as current" check.
     * It will try to update and hit a 409 if findUnique returns the same user
     * for the newUsername (since the current user's username matches).
     */
    it('same username as current → 409 (duplicate detected)', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(currentUser)     // get user by ID
        .mockResolvedValueOnce({ id: 'user123', username: 'alice' }) // "alice" already exists
      bcrypt.compare.mockResolvedValue(true)

      const res = await POST(makeReq({ newUsername: 'alice', password: 'secret' }))
      expect(res.status).toBe(409)
    })
  })
})
