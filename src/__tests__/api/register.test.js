/**
 * @jest-environment node
 *
 * Tests for POST /api/auth/register
 * Route: app/api/auth/register/route.js
 * Validation: username 3–20 chars, password ≥ 6 chars
 * Note: No special-character restriction — only length is checked.
 * Note: Whitespace-only usernames pass the length check (server does NOT trim).
 */

import { POST } from '../../../app/api/auth/register/route'

jest.mock('../../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
  compare: jest.fn(),
}))

const prisma = require('../../lib/prisma')

function makeReq(body) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AUTH: REGISTER — API', () => {
  describe('valid registration', () => {
    it('unique username + valid password → 201 success', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: '1', username: 'alice' })

      const res = await POST(makeReq({ username: 'alice', password: 'secret123' }))
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(prisma.user.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('duplicate username', () => {
    it('existing username → 409 with error message', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', username: 'alice' })

      const res = await POST(makeReq({ username: 'alice', password: 'secret123' }))
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.error).toBe('Username already taken')
      expect(prisma.user.create).not.toHaveBeenCalled()
    })
  })

  describe('username validation', () => {
    it('empty username → 400', async () => {
      const res = await POST(makeReq({ username: '', password: 'secret123' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/Username must be/i)
    })

    it('missing username field → 400', async () => {
      const res = await POST(makeReq({ password: 'secret123' }))
      expect(res.status).toBe(400)
    })

    it('username < 3 chars → 400', async () => {
      const res = await POST(makeReq({ username: 'ab', password: 'secret123' }))
      expect(res.status).toBe(400)
    })

    it('username > 20 chars → 400', async () => {
      const longName = 'a'.repeat(21)
      const res = await POST(makeReq({ username: longName, password: 'secret123' }))
      expect(res.status).toBe(400)
    })

    it('username exactly 3 chars → accepted (boundary)', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({})
      const res = await POST(makeReq({ username: 'abc', password: 'secret123' }))
      expect(res.status).toBe(201)
    })

    it('username exactly 20 chars → accepted (boundary)', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({})
      const res = await POST(makeReq({ username: 'a'.repeat(20), password: 'secret123' }))
      expect(res.status).toBe(201)
    })

    it('500-char username → 400', async () => {
      const res = await POST(makeReq({ username: 'a'.repeat(500), password: 'secret123' }))
      expect(res.status).toBe(400)
    })

    /**
     * Whitespace-only username ("   " = 3 chars) PASSES the length check.
     * The server does NOT trim usernames. This is a known gap — document for future fix.
     */
    it('whitespace-only username (3 spaces) — passes length check, gets stored as-is', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({})
      const res = await POST(makeReq({ username: '   ', password: 'secret123' }))
      // Server does not trim → length 3 passes → 201
      expect(res.status).toBe(201)
    })
  })

  describe('password validation', () => {
    it('empty password → 400', async () => {
      const res = await POST(makeReq({ username: 'alice', password: '' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/Password must be/i)
    })

    it('missing password field → 400', async () => {
      const res = await POST(makeReq({ username: 'alice' }))
      expect(res.status).toBe(400)
    })

    it('password shorter than 6 chars → 400', async () => {
      const res = await POST(makeReq({ username: 'alice', password: 'abc' }))
      expect(res.status).toBe(400)
    })

    it('password exactly 5 chars → 400', async () => {
      const res = await POST(makeReq({ username: 'alice', password: 'abcde' }))
      expect(res.status).toBe(400)
    })

    it('password exactly 6 chars → accepted', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({})
      const res = await POST(makeReq({ username: 'alice', password: 'abcdef' }))
      expect(res.status).toBe(201)
    })
  })

  describe('security: SQL injection and XSS', () => {
    /**
     * SQL injection attempt: "'; DROP TABLE users; --"
     * Length = 26 chars → exceeds 20-char limit → rejected with 400.
     * Even if length were valid, Prisma uses parameterized queries — safe by design.
     */
    it('SQL injection in username (>20 chars) → 400 due to length', async () => {
      const sqlInjection = "'; DROP TABLE users; --"
      expect(sqlInjection.length).toBeGreaterThan(20)
      const res = await POST(makeReq({ username: sqlInjection, password: 'secret123' }))
      expect(res.status).toBe(400)
    })

    it('short SQL injection attempt (≤20 chars) → Prisma parameterizes safely', async () => {
      // "' OR '1'='1" = 12 chars — passes length check
      // Prisma uses parameterized queries, so this is safe
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({})
      const res = await POST(makeReq({ username: "' OR '1'='1", password: 'secret123' }))
      // Server treats it as a plain string — special chars not blocked by API code
      expect(res.status).toBe(201)
    })

    /**
     * XSS attempt: "<script>alert(1)</script>" = 25 chars → exceeds 20-char limit.
     * Note: If a short XSS payload were used, the API would store it as-is.
     * Output escaping is the responsibility of the React rendering layer.
     */
    it('XSS attempt in username (>20 chars) → 400 due to length', async () => {
      const xss = '<script>alert(1)</script>'
      expect(xss.length).toBeGreaterThan(20)
      const res = await POST(makeReq({ username: xss, password: 'secret123' }))
      expect(res.status).toBe(400)
    })

    it('short XSS payload (≤20 chars) passes length check — API does not sanitize', async () => {
      // "<img src=x>" = 11 chars — passes length check; API stores as-is
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({})
      const res = await POST(makeReq({ username: '<img src=x>', password: 'secret123' }))
      expect(res.status).toBe(201)
    })

    /**
     * Special characters: The register API only validates length, NOT character class.
     * Usernames like "user_name!" (10 chars) are accepted.
     */
    it('username with special characters (allowed by API — no char class restriction)', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({})
      const res = await POST(makeReq({ username: 'user_name!', password: 'secret123' }))
      expect(res.status).toBe(201)
    })
  })

  describe('password hashing', () => {
    it('password is hashed before storing — plaintext never passed to create', async () => {
      const bcrypt = require('bcryptjs')
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({})

      await POST(makeReq({ username: 'alice', password: 'secret123' }))

      expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 12)
      const createCall = prisma.user.create.mock.calls[0][0]
      expect(createCall.data.password).not.toBe('secret123')
      expect(createCall.data.password).toBe('$2b$12$hashed')
    })
  })
})
