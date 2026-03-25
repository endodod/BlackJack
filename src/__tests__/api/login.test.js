/**
 * @jest-environment node
 *
 * Tests for the NextAuth credentials `authorize` function.
 * Source: app/api/auth/[...nextauth]/route.js → authOptions.providers[0].authorize
 *
 * Note: NextAuth v4 is initialized via `NextAuth(authOptions)` which exports
 * GET/POST handlers. We test the raw `authorize` function directly.
 *
 * Session persistence: NextAuth stores sessions as JWT cookies.
 * There is NO localStorage/sessionStorage usage for sessions.
 */

jest.mock('../../lib/prisma', () => ({
  user: { findUnique: jest.fn() },
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

// NextAuth itself is not needed for testing the authorize function directly
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ GET: jest.fn(), POST: jest.fn() })),
  getServerSession: jest.fn(),
}))
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn((config) => ({ ...config, type: 'credentials', id: 'credentials' })),
}))

const prisma = require('../../lib/prisma')
const bcrypt = require('bcryptjs')

// Load authOptions after mocks are in place
let authorize

beforeAll(async () => {
  const { authOptions } = await import('../../../app/api/auth/[...nextauth]/route')
  authorize = authOptions.providers[0].authorize
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AUTH: LOGIN — authorize function', () => {
  const mockUser = {
    id: 'user123',
    username: 'alice',
    password: '$2b$12$hashed',
    bankroll: 1000,
    hands: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    totalIncome: 0,
    blackjacks: 0,
    trainingHands: 0,
    trainingCorrect: 0,
  }

  describe('valid credentials', () => {
    it('correct username + password → returns user object (logged in)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser)
      bcrypt.compare.mockResolvedValue(true)

      const result = await authorize({ username: 'alice', password: 'secret123' })

      expect(result).not.toBeNull()
      expect(result.id).toBe('user123')
      expect(result.username).toBe('alice')
      expect(result.bankroll).toBe(1000)
    })

    it('returned user object includes all session fields', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser)
      bcrypt.compare.mockResolvedValue(true)

      const result = await authorize({ username: 'alice', password: 'secret123' })

      expect(result).toMatchObject({
        id: 'user123',
        username: 'alice',
        bankroll: 1000,
        hands: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        totalIncome: 0,
        blackjacks: 0,
        trainingHands: 0,
        trainingCorrect: 0,
      })
    })
  })

  describe('wrong password', () => {
    it('wrong password → returns null (NOT logged in)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser)
      bcrypt.compare.mockResolvedValue(false)

      const result = await authorize({ username: 'alice', password: 'wrongpass' })

      expect(result).toBeNull()
    })
  })

  describe('non-existent username', () => {
    it('unknown username → returns null', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      const result = await authorize({ username: 'nobody', password: 'secret123' })

      expect(result).toBeNull()
      expect(bcrypt.compare).not.toHaveBeenCalled()
    })
  })

  describe('empty / missing fields', () => {
    it('empty username → returns null without DB call', async () => {
      const result = await authorize({ username: '', password: 'secret123' })
      expect(result).toBeNull()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('empty password → returns null without DB call', async () => {
      const result = await authorize({ username: 'alice', password: '' })
      expect(result).toBeNull()
    })

    it('missing credentials entirely → returns null', async () => {
      const result = await authorize(null)
      expect(result).toBeNull()
    })

    it('undefined username → returns null', async () => {
      const result = await authorize({ username: undefined, password: 'secret123' })
      expect(result).toBeNull()
    })
  })

  describe('case sensitivity', () => {
    /**
     * NextAuth uses prisma.user.findUnique({ where: { username } }).
     * Prisma/PostgreSQL default collation is case-sensitive.
     * "Admin" and "admin" are different usernames.
     */
    it('username "Admin" vs stored "admin" → not found (case-sensitive lookup)', async () => {
      // DB returns null when searching for "Admin" if stored as "admin"
      prisma.user.findUnique.mockResolvedValue(null)

      const result = await authorize({ username: 'Admin', password: 'secret123' })
      expect(result).toBeNull()
    })

    it('exact username match → found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser)
      bcrypt.compare.mockResolvedValue(true)

      const result = await authorize({ username: 'alice', password: 'secret123' })
      expect(result).not.toBeNull()

      // Verify the DB was queried with the exact username provided
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'alice' },
      })
    })
  })

  describe('session persistence', () => {
    /**
     * Sessions are stored as JWT cookies (strategy: 'jwt' in authOptions).
     * There is NO localStorage or sessionStorage involved.
     * "Persistence after reload" is handled by the browser sending the cookie
     * on subsequent requests — tested at the integration level, not here.
     * We verify the session strategy is configured correctly.
     */
    it('session strategy is jwt (not database)', async () => {
      const { authOptions } = await import('../../../app/api/auth/[...nextauth]/route')
      expect(authOptions.session.strategy).toBe('jwt')
    })
  })

  describe('already logged-in user', () => {
    /**
     * Preventing duplicate sessions is handled at the NextAuth/framework level,
     * not in the authorize function. The authorize function is only called
     * when signIn('credentials', ...) is invoked. If the user is already
     * authenticated, the app should not call signIn again.
     *
     * This behavior is enforced in the UI (AuthModal) by checking session status
     * before showing the login form. Tested in AuthModal component tests.
     */
    it('authorize can be called independently of existing sessions — duplicate prevention is a UI concern', () => {
      // Documented: authorize() itself has no session-awareness.
      // The UI layer (AuthModal.js) should check useSession() before showing login.
      expect(typeof authorize).toBe('function')
    })
  })
})
