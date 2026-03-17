/**
 * @jest-environment node
 *
 * Tests for POST /api/user/reset
 * Route: app/api/user/reset/route.js
 * Requires: authenticated session
 * Effect: sets bankroll=1000, all game stats=0, increments resets counter
 *
 * NOTE: There is NO confirmation step in the API itself.
 *       The confirmation (two-step UI) is handled in the profile page component.
 *       See ProfilePage.test.js for the UI confirmation flow.
 * NOTE: The schema has no "streak" field. Only bankroll, hands, wins, losses,
 *       pushes, totalIncome, blackjacks are reset.
 */

jest.mock('../../lib/prisma', () => ({
  user: {
    update: jest.fn(),
  },
}))

jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))

jest.mock('../../../app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

const prisma = require('../../lib/prisma')
const nextAuth = require('next-auth')

function makeReq() {
  return new Request('http://localhost/api/user/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  nextAuth.getServerSession.mockResolvedValue({ user: { id: 'user123' } })
  prisma.user.update.mockResolvedValue({})
})

describe('ACCOUNT: RESET STATS — API', () => {
  const { POST } = require('../../../app/api/user/reset/route')

  describe('unauthenticated requests', () => {
    it('no session → 401', async () => {
      nextAuth.getServerSession.mockResolvedValue(null)
      const res = await POST(makeReq())
      expect(res.status).toBe(401)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('authenticated reset', () => {
    it('returns 200 success', async () => {
      const res = await POST(makeReq())
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
    })

    it('resets bankroll to default starting value of 1000', async () => {
      await POST(makeReq())
      const updateCall = prisma.user.update.mock.calls[0][0]
      expect(updateCall.data.bankroll).toBe(1000)
    })

    it('resets hands, wins, losses, pushes, totalIncome, blackjacks to 0', async () => {
      await POST(makeReq())
      const updateCall = prisma.user.update.mock.calls[0][0]
      expect(updateCall.data).toMatchObject({
        hands: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        totalIncome: 0,
        blackjacks: 0,
      })
    })

    it('increments the resets counter (not reset to 0)', async () => {
      await POST(makeReq())
      const updateCall = prisma.user.update.mock.calls[0][0]
      expect(updateCall.data.resets).toEqual({ increment: 1 })
    })

    it('update targets the correct user id from session', async () => {
      await POST(makeReq())
      const updateCall = prisma.user.update.mock.calls[0][0]
      expect(updateCall.where).toEqual({ id: 'user123' })
    })
  })
})
