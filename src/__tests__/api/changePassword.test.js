/**
 * @jest-environment node
 *
 * Tests for POST /api/user/change-password
 * Route: app/api/user/change-password/route.js
 * Requires: authenticated session (getServerSession)
 * Validates: newPassword ≥ 6 chars, currentPassword must match DB
 *
 * NOTE: The API does NOT check whether newPassword === currentPassword.
 *       Setting the same password as the current one will succeed silently.
 * NOTE: There is no confirm-password field — the form only has currentPassword + newPassword.
 */

jest.mock('../../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('$2b$12$newhash'),
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
  return new Request('http://localhost/api/user/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockUser = { id: 'user123', password: '$2b$12$oldhash' }

beforeEach(() => {
  jest.clearAllMocks()
  nextAuth.getServerSession.mockResolvedValue({ user: { id: 'user123' } })
  prisma.user.findUnique.mockResolvedValue(mockUser)
  prisma.user.update.mockResolvedValue({})
})

describe('ACCOUNT: CHANGE PASSWORD — API', () => {
  const { POST } = require('../../../app/api/user/change-password/route')

  describe('unauthenticated requests', () => {
    it('no session → 401 Unauthorized', async () => {
      nextAuth.getServerSession.mockResolvedValue(null)
      const res = await POST(makeReq({ currentPassword: 'old', newPassword: 'newpassword' }))
      expect(res.status).toBe(401)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('valid change', () => {
    it('correct currentPassword + valid newPassword → 200 success', async () => {
      bcrypt.compare.mockResolvedValue(true)
      const res = await POST(makeReq({ currentPassword: 'oldpass', newPassword: 'newpassword' }))
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledTimes(1)
    })

    it('new password is hashed before update', async () => {
      bcrypt.compare.mockResolvedValue(true)
      await POST(makeReq({ currentPassword: 'oldpass', newPassword: 'newpassword' }))
      const updateCall = prisma.user.update.mock.calls[0][0]
      expect(updateCall.data.password).toBe('$2b$12$newhash')
    })
  })

  describe('wrong current password', () => {
    it('incorrect currentPassword → 403', async () => {
      bcrypt.compare.mockResolvedValue(false)
      const res = await POST(makeReq({ currentPassword: 'wrong', newPassword: 'newpassword' }))
      const body = await res.json()
      expect(res.status).toBe(403)
      expect(body.error).toBe('Incorrect current password')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('new password validation', () => {
    it('newPassword < 6 chars → 400', async () => {
      const res = await POST(makeReq({ currentPassword: 'oldpass', newPassword: 'abc' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/at least 6/i)
    })

    it('newPassword exactly 5 chars → 400', async () => {
      const res = await POST(makeReq({ currentPassword: 'oldpass', newPassword: 'abcde' }))
      expect(res.status).toBe(400)
    })

    it('newPassword exactly 6 chars → accepted', async () => {
      bcrypt.compare.mockResolvedValue(true)
      const res = await POST(makeReq({ currentPassword: 'oldpass', newPassword: 'abcdef' }))
      expect(res.status).toBe(200)
    })

    it('empty newPassword → 400', async () => {
      const res = await POST(makeReq({ currentPassword: 'oldpass', newPassword: '' }))
      expect(res.status).toBe(400)
    })

    it('missing newPassword → 400', async () => {
      const res = await POST(makeReq({ currentPassword: 'oldpass' }))
      expect(res.status).toBe(400)
    })
  })

  describe('new password same as old', () => {
    /**
     * The API does NOT check newPassword === currentPassword.
     * Updating to the same password will succeed with 200.
     * This is a known gap — no spec requirement to block it.
     */
    it('newPassword same as old → 200 (no duplicate-check in API)', async () => {
      bcrypt.compare.mockResolvedValue(true)
      const res = await POST(makeReq({ currentPassword: 'samepass', newPassword: 'samepass' }))
      expect(res.status).toBe(200)
    })
  })

  describe('confirm password', () => {
    /**
     * There is no confirm-password field in the change-password form or API.
     * This scenario is N/A for this implementation.
     */
    it('N/A — no confirm-password field in form or API', () => {
      expect(true).toBe(true) // documented gap
    })
  })
})
