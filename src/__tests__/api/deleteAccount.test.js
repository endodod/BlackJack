/**
 * @jest-environment node
 *
 * Tests for POST /api/user/delete-account
 * Route: app/api/user/delete-account/route.js
 * Requires: authenticated session + correct password confirmation
 */

jest.mock('../../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    delete: jest.fn(),
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
  return new Request('http://localhost/api/user/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockUser = { id: 'user123', password: '$2b$12$hashed' }

beforeEach(() => {
  jest.clearAllMocks()
  nextAuth.getServerSession.mockResolvedValue({ user: { id: 'user123' } })
  prisma.user.findUnique.mockResolvedValue(mockUser)
  prisma.user.delete.mockResolvedValue({})
})

describe('ACCOUNT: DELETE ACCOUNT — API', () => {
  const { POST } = require('../../../app/api/user/delete-account/route')

  describe('unauthenticated requests', () => {
    it('no session → 401, account not deleted', async () => {
      nextAuth.getServerSession.mockResolvedValue(null)
      const res = await POST(makeReq({ password: 'secret' }))
      expect(res.status).toBe(401)
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })
  })

  describe('confirmation: correct password', () => {
    it('correct password → 200, account deleted', async () => {
      bcrypt.compare.mockResolvedValue(true)
      const res = await POST(makeReq({ password: 'secret' }))
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user123' } })
    })
  })

  describe('confirmation: wrong password', () => {
    it('wrong password → 403, account NOT deleted', async () => {
      bcrypt.compare.mockResolvedValue(false)
      const res = await POST(makeReq({ password: 'wrongpass' }))
      const body = await res.json()
      expect(res.status).toBe(403)
      expect(body.error).toBe('Incorrect password')
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })
  })

  describe('after deletion: old credentials should fail', () => {
    /**
     * After deletion, prisma.user.findUnique returns null for the old user.
     * The NextAuth authorize function will return null → login fails.
     * This is tested via the authorize function (login.test.js).
     * Here we verify the delete call was made with the correct ID.
     */
    it('delete is called with the session user id', async () => {
      bcrypt.compare.mockResolvedValue(true)
      await POST(makeReq({ password: 'secret' }))
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user123' },
      })
    })
  })
})
