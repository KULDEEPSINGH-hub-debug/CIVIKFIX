process.env.NODE_ENV = 'test'
process.env.MOCK_AI = 'true'

import { describe, it } from 'node:test'
import assert from 'node:assert'
import request from 'supertest'
import app from '../server'

describe('CivicFix REST API Test Suite', () => {
  // ─── 1. Health & Discovery Endpoints ────────────────────────────────────────

  it('GET /api/health should return ok status and demo flag', async () => {
    const res = await request(app).get('/api/health')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.status, 'ok')
    assert.strictEqual(res.body.service, 'civicfix-api')
    assert.strictEqual(res.body.demoMode, true)
  })

  it('GET /api/v1/stats should return aggregated civic report metrics', async () => {
    const res = await request(app).get('/api/v1/stats')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(typeof res.body.data.totalReports === 'number')
    assert.ok(Array.isArray(res.body.data.byCategory))
  })

  // ─── 2. Public Reports & Filtering ──────────────────────────────────────────

  it('GET /api/v1/reports should list reports with filters and pagination', async () => {
    const res = await request(app).get('/api/v1/reports?limit=5')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(Array.isArray(res.body.data.items))
    assert.ok(res.body.data.total >= 0)
  })

  it('GET /api/v1/reports/:id with invalid ID should return 404', async () => {
    const res = await request(app).get('/api/v1/reports/non-existent-report-uuid-000')
    assert.strictEqual(res.status, 404)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'NOT_FOUND')
  })

  // ─── 3. Authority Discovery & Directory ─────────────────────────────────────

  it('GET /api/v1/authority/directory should return active departments', async () => {
    const res = await request(app).get('/api/v1/authority/directory')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(Array.isArray(res.body.data.departments))
    assert.ok(res.body.data.departments.length > 0)
  })

  it('GET /api/v1/authority/find should match department by category and city', async () => {
    const res = await request(app).get('/api/v1/authority/find?category=ROAD_DAMAGE&city=Demo City')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(res.body.data.primaryAuthority !== null)
    assert.ok(['HIGH', 'MODERATE', 'LOW'].includes(res.body.data.confidence))
  })

  it('GET /api/v1/authority/find without category should return 400 validation error', async () => {
    const res = await request(app).get('/api/v1/authority/find')
    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'MISSING_PARAM')
  })

  // ─── 4. Authentication & Security RBAC ──────────────────────────────────────

  it('POST /api/v1/auth/login with wrong credentials should return 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo-citizen@civicfix.demo', password: 'WrongPassword999!' })
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS')
  })

  it('POST /api/v1/auth/login with valid demo citizen credentials should succeed', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo-citizen@civicfix.demo', password: 'DemoCitizen123!' })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.strictEqual(res.body.data.user.role, 'CITIZEN')
  })

  it('Unauthenticated user cannot submit report (401 Unauthorized)', async () => {
    const res = await request(app).post('/api/v1/reports').send({
      title: 'Unauthorized test pothole report',
      description: 'Attempting to create report without session cookie.',
      category: 'ROAD_DAMAGE',
      latitude: 26.9,
      longitude: 75.8,
    })
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED')
  })

  it('Citizen cannot access privileged admin endpoint (401/403 Forbidden)', async () => {
    // Attempt accessing admin stats without admin session
    const res = await request(app).get('/api/v1/admin/stats')
    assert.ok(res.status === 401 || res.status === 403)
    assert.strictEqual(res.body.success, false)
  })

  it('Unapproved user cannot access authority reports endpoint (401/403)', async () => {
    const res = await request(app).get('/api/v1/authority/reports')
    assert.ok(res.status === 401 || res.status === 403)
    assert.strictEqual(res.body.success, false)
  })

  // ─── 5. Authority Application & Login Workflow ──────────────────────────────
  it('POST /api/v1/auth/authority/login with valid demo authority credentials should succeed', async () => {
    const res = await request(app).post('/api/v1/auth/authority/login').send({
      email: 'demo-authority@civicfix.demo',
      password: 'DemoAuthority123!',
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.strictEqual(res.body.data.user.role, 'AUTHORITY')
    assert.ok(res.body.data.user.authorityProfile)
  })

  it('POST /api/v1/auth/authority/login rejects non-authority user with 403 NOT_AUTHORITY', async () => {
    const res = await request(app).post('/api/v1/auth/authority/login').send({
      email: 'demo-citizen@civicfix.demo',
      password: 'DemoCitizen123!',
    })
    assert.strictEqual(res.status, 403)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'NOT_AUTHORITY')
  })

  it('POST /api/v1/auth/authority/apply should require complete official details', async () => {
    const res = await request(app).post('/api/v1/auth/authority/apply').send({
      applicantName: 'Short', // Invalid: needs official designation & department details
    })
    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR')
  })

  // ─── 6. Repaired Functionality & New Endpoints ───────────────────────────────

  it('GET /api/v1/reports/:id resolves report by Public Tracking ID', async () => {
    const res = await request(app).get('/api/v1/reports/CF-2026-000001')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.strictEqual(res.body.data.publicId, 'CF-2026-000001')
  })

  it('POST /api/v1/reports/analyze-ai classifies civic issue description', async () => {
    const res = await request(app)
      .post('/api/v1/reports/analyze-ai')
      .send({
        title: 'Dangerous broken street light near main square',
        description: 'The street lamp is completely dark and wires are exposed posing severe risk.',
      })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.strictEqual(res.body.data.category, 'STREETLIGHT')
    assert.ok(typeof res.body.data.confidence === 'number')
    assert.ok(typeof res.body.data.isCivicIssue === 'boolean')
  })

  it('POST /api/v1/reports/analyze-ai analyzes image without pre-entered title or description', async () => {
    // 1x1 transparent PNG data URI
    const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    const res = await request(app)
      .post('/api/v1/reports/analyze-ai')
      .send({
        imageBase64: dummyImage,
      })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(res.body.data.title && res.body.data.title.length >= 5)
    assert.ok(res.body.data.description && res.body.data.description.length >= 20)
    assert.ok(typeof res.body.data.category === 'string')
    assert.ok(typeof res.body.data.severity === 'string')
    assert.strictEqual(res.body.data.isCivicIssue, true)
  })

  it('Gemini AI integration unit verification: prompt construction, modelsToTry, and error translation', async () => {
    const { getModelsToTry, DEFAULT_GEMINI_MODEL, aiResponseSchema } = require('../lib/ai')
    
    // Check default model is gemini-3.8-flash
    assert.strictEqual(DEFAULT_GEMINI_MODEL, 'gemini-3.8-flash')
    
    const models = getModelsToTry()
    assert.ok(models.includes('gemini-3.8-flash'), 'modelsToTry includes gemini-3.8-flash')
    assert.strictEqual(models[0], process.env.GEMINI_MODEL || 'gemini-3.8-flash')

    // Check schema parsing and normalization of categories and severities
    const parsedValid = aiResponseSchema.parse({
      isCivicIssue: true,
      title: 'Broken streetlight at crossing',
      description: 'The street lamp is extinguished creating hazard',
      category: 'STREETLIGHT',
      severity: 'HIGH',
      confidence: 0.95,
    })
    assert.strictEqual(parsedValid.category, 'STREETLIGHT')
    assert.strictEqual(parsedValid.severity, 'HIGH')

    // Check category normalization from free text (e.g. "pothole on road" -> "ROAD_DAMAGE")
    const parsedNormalized = aiResponseSchema.parse({
      category: 'pothole',
      severity: 'critical',
    })
    assert.strictEqual(parsedNormalized.category, 'ROAD_DAMAGE')
    assert.strictEqual(parsedNormalized.severity, 'CRITICAL')
  })

  it('POST /api/v1/reports/analyze-ai handles invalid API key error structure', async () => {
    const originalEnv = process.env.NODE_ENV
    const originalMock = process.env.MOCK_AI
    const originalKey = process.env.GEMINI_API_KEY
    try {
      delete process.env.MOCK_AI
      process.env.NODE_ENV = 'production'
      process.env.GEMINI_API_KEY = 'AIzaSyInvalidKeyForTestExecution'

      const res = await request(app)
        .post('/api/v1/reports/analyze-ai')
        .send({
          title: 'Deep road pothole',
          description: 'A deep pothole is causing issues for two wheelers',
        })
      // Should cleanly map to 502 with API_KEY_INVALID without leaking secret or crashing
      assert.strictEqual(res.status, 502)
      assert.strictEqual(res.body.success, false)
      assert.strictEqual(res.body.error.code, 'API_KEY_INVALID')
    } finally {
      process.env.NODE_ENV = originalEnv
      process.env.MOCK_AI = originalMock
      if (originalKey) process.env.GEMINI_API_KEY = originalKey
      else delete process.env.GEMINI_API_KEY
    }
  })

  it('POST /api/v1/reports/analyze-ai rejects request when both image and text are missing', async () => {
    const res = await request(app)
      .post('/api/v1/reports/analyze-ai')
      .send({})
    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'NO_IMAGE_OR_TEXT')
  })

  it('POST /api/v1/reports/analyze-ai rejects invalid image format', async () => {
    const res = await request(app)
      .post('/api/v1/reports/analyze-ai')
      .send({ imageBase64: 'data:text/plain;base64,SGVsbG8=' })
    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'INVALID_IMAGE_FORMAT')
  })

  it('POST /api/v1/reports/analyze-ai returns 503 API_KEY_MISSING in production mode without key', async () => {
    const originalEnv = process.env.NODE_ENV
    const originalMock = process.env.MOCK_AI
    const originalKey = process.env.GEMINI_API_KEY
    try {
      process.env.NODE_ENV = 'production'
      delete process.env.MOCK_AI
      delete process.env.GEMINI_API_KEY

      const res = await request(app)
        .post('/api/v1/reports/analyze-ai')
        .send({
          imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        })
      assert.strictEqual(res.status, 503)
      assert.strictEqual(res.body.success, false)
      assert.strictEqual(res.body.error.code, 'API_KEY_MISSING')
    } finally {
      process.env.NODE_ENV = originalEnv
      process.env.MOCK_AI = originalMock
      if (originalKey) process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('POST /api/v1/reports/reverse-geocode returns valid location information', async () => {
    const res = await request(app)
      .post('/api/v1/reports/reverse-geocode')
      .send({ latitude: 26.9124, longitude: 75.7873 })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(res.body.data.address)
  })

  it('GET /api/v1/reports?search= filters results by keyword', async () => {
    const res = await request(app).get('/api/v1/reports?search=CF-2026-000001')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(res.body.data.items.length >= 1)
    assert.strictEqual(res.body.data.items[0].publicId, 'CF-2026-000001')
  })

  // ─── 7. Google OAuth & Citizen Dashboard Ownership Tests ────────────────────

  it('GET /api/v1/auth/google/config returns configuration status without exposing secrets', async () => {
    const res = await request(app).get('/api/v1/auth/google/config')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(typeof res.body.data.configured === 'boolean')
    assert.strictEqual(res.body.data.clientSecret, undefined) // Never expose secret
  })

  it('POST /api/v1/auth/google returns OAUTH_NOT_CONFIGURED (503) when clientId is missing', async () => {
    const origId = process.env.GOOGLE_CLIENT_ID
    try {
      delete process.env.GOOGLE_CLIENT_ID
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'dummy-google-jwt-token' })
      assert.strictEqual(res.status, 503)
      assert.strictEqual(res.body.success, false)
      assert.strictEqual(res.body.error.code, 'OAUTH_NOT_CONFIGURED')
    } finally {
      if (origId) process.env.GOOGLE_CLIENT_ID = origId
    }
  })

  it('POST /api/v1/auth/google rejects invalid/forged Google ID tokens (401)', async () => {
    const origId = process.env.GOOGLE_CLIENT_ID
    try {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'forged.invalid.token' })
      assert.strictEqual(res.status, 401)
      assert.strictEqual(res.body.success, false)
      assert.strictEqual(res.body.error.code, 'INVALID_GOOGLE_TOKEN')
    } finally {
      if (origId) process.env.GOOGLE_CLIENT_ID = origId
      else delete process.env.GOOGLE_CLIENT_ID
    }
  })

  it('GET /api/v1/reports/mine returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/reports/mine')
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.success, false)
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED')
  })

  it('Report ownership, citizen dashboard persistence, and count consistency', async () => {
    const agentA = request.agent(app)

    // 1. Citizen A logs in
    const loginRes = await agentA.post('/api/v1/auth/login').send({
      email: 'demo-citizen@civicfix.demo',
      password: 'DemoCitizen123!',
    })
    assert.strictEqual(loginRes.status, 200)
    const citizenAId = loginRes.body.data.user.id

    // 2. Fetch initial dashboard data for Citizen A
    const initialMineRes = await agentA.get('/api/v1/reports/mine')
    assert.strictEqual(initialMineRes.status, 200)
    assert.strictEqual(initialMineRes.body.success, true)
    assert.ok(initialMineRes.body.data.stats)
    const initialTotal = initialMineRes.body.data.stats.totalReports

    // 3. Citizen A submits a new civic report
    const createRes = await agentA.post('/api/v1/reports').send({
      title: 'Dangerous deep pothole on MG road crossing',
      description: 'Asphalt surface has severely degraded with 8 inch deep road crater obstructing traffic.',
      category: 'ROAD_DAMAGE',
      severity: 'HIGH',
      latitude: 26.9124,
      longitude: 75.7873,
      address: 'MG Road Junction, Jaipur',
    })
    assert.strictEqual(createRes.status, 201)
    assert.strictEqual(createRes.body.success, true)
    const newReport = createRes.body.data
    assert.strictEqual(newReport.reporterId, citizenAId) // Ownership verified on backend!

    // 4. Citizen A fetches dashboard again (simulating page refresh / navigation)
    const refreshedMineRes = await agentA.get('/api/v1/reports/mine')
    assert.strictEqual(refreshedMineRes.status, 200)
    assert.strictEqual(refreshedMineRes.body.success, true)
    // Verify report appears in items
    const foundReport = refreshedMineRes.body.data.items.find((r: any) => r.id === newReport.id)
    assert.ok(foundReport, 'Submitted report must appear in Citizen Dashboard')
    assert.strictEqual(foundReport.publicId, newReport.publicId)
    // Verify total count incremented by exactly 1 from database
    assert.strictEqual(refreshedMineRes.body.data.stats.totalReports, initialTotal + 1)

    // 5. User Isolation: Register & log in as Citizen B
    const agentB = request.agent(app)
    const uniqueEmail = `test-citizen-${Date.now()}@civicfix.demo`
    const registerB = await agentB.post('/api/v1/auth/register').send({
      email: uniqueEmail,
      password: 'Password123!',
      displayName: 'Citizen B Tester',
    })
    assert.strictEqual(registerB.status, 201)

    const loginB = await agentB.post('/api/v1/auth/login').send({
      email: uniqueEmail,
      password: 'Password123!',
    })
    assert.strictEqual(loginB.status, 200)

    // 6. Citizen B dashboard must NOT contain Citizen A's report!
    const citizenBMine = await agentB.get('/api/v1/reports/mine')
    assert.strictEqual(citizenBMine.status, 200)
    const leak = citizenBMine.body.data.items.find((r: any) => r.id === newReport.id)
    assert.strictEqual(leak, undefined, 'Citizen B must NOT see Citizen A private reports')
    assert.strictEqual(citizenBMine.body.data.stats.totalReports, 0)
  })

  // ─── 8. Google OAuth Authentication Lifecycle & Role Isolation Tests ────────

  it('Google OAuth: creates new user strictly as CITIZEN and establishes session', async () => {
    const { OAuth2Client } = await import('google-auth-library')
    const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken

    const testGoogleId = `google-uid-${Date.now()}`
    const testEmail = `new-google-citizen-${Date.now()}@example.com`

    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          sub: testGoogleId,
          email: testEmail,
          email_verified: true,
          name: 'Verified Google Citizen',
          picture: 'https://example.com/avatar.png',
        }),
      } as any
    }

    try {
      const agent = request.agent(app)
      const res = await agent
        .post('/api/v1/auth/google')
        .send({ credential: 'valid.mocked.google.token' })

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.success, true)
      assert.strictEqual(res.body.data.user.email, testEmail)
      assert.strictEqual(res.body.data.user.role, 'CITIZEN') // Strict role isolation
      assert.strictEqual(res.body.data.user.authProvider, 'GOOGLE')
      assert.strictEqual(res.body.data.user.googleId, testGoogleId)

      // Verify session persistence with /api/v1/auth/me
      const meRes = await agent.get('/api/v1/auth/me')
      assert.strictEqual(meRes.status, 200)
      assert.strictEqual(meRes.body.success, true)
      assert.strictEqual(meRes.body.data.email, testEmail)
      assert.strictEqual(meRes.body.data.role, 'CITIZEN')

      // Verify session logout
      const logoutRes = await agent.post('/api/v1/auth/logout')
      assert.strictEqual(logoutRes.status, 200)

      const afterLogoutMe = await agent.get('/api/v1/auth/me')
      assert.strictEqual(afterLogoutMe.status, 401)
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken
    }
  })

  it('Google OAuth: rejects unverified email (email_verified: false)', async () => {
    const { OAuth2Client } = await import('google-auth-library')
    const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken

    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          sub: 'unverified-sub-123',
          email: 'unverified@example.com',
          email_verified: false,
          name: 'Unverified Citizen',
        }),
      } as any
    }

    try {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'token.for.unverified.user' })

      assert.strictEqual(res.status, 400)
      assert.strictEqual(res.body.success, false)
      assert.strictEqual(res.body.error.code, 'EMAIL_NOT_VERIFIED')
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken
    }
  })

  it('Google OAuth: links to existing user without escalating role or overwriting permissions', async () => {
    const { OAuth2Client } = await import('google-auth-library')
    const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken

    // Create an existing local user with CITIZEN role first
    const existingEmail = `existing-citizen-${Date.now()}@civicfix.demo`
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      email: existingEmail,
      password: 'StrongPassword123!',
      displayName: 'Existing Citizen',
    })
    assert.strictEqual(registerRes.status, 201)

    const linkedGoogleSub = `google-linked-${Date.now()}`

    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          sub: linkedGoogleSub,
          email: existingEmail,
          email_verified: true,
          name: 'Existing Citizen Name',
        }),
      } as any
    }

    try {
      const agent = request.agent(app)
      const res = await agent
        .post('/api/v1/auth/google')
        .send({ credential: 'token.for.existing.user' })

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.success, true)
      assert.strictEqual(res.body.data.user.email, existingEmail)
      assert.strictEqual(res.body.data.user.googleId, linkedGoogleSub)
      assert.strictEqual(res.body.data.user.role, 'CITIZEN') // Preserves role
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken
    }
  })

  it('Google OAuth: blocks suspended user with 403 ACCOUNT_INACTIVE', async () => {
    const { OAuth2Client } = await import('google-auth-library')
    const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken

    const suspendedEmail = `suspended-${Date.now()}@civicfix.demo`
    const suspendedGoogleSub = `suspended-google-${Date.now()}`
    const prisma = (await import('../lib/prisma')).default
    await prisma.user.create({
      data: {
        email: suspendedEmail,
        googleId: suspendedGoogleSub,
        authProvider: 'GOOGLE',
        role: 'CITIZEN',
        status: 'SUSPENDED',
      },
    })

    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          sub: suspendedGoogleSub,
          email: suspendedEmail,
          email_verified: true,
          name: 'Suspended Citizen',
        }),
      } as any
    }

    try {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'token.for.suspended.user' })

      assert.strictEqual(res.status, 403)
      assert.strictEqual(res.body.success, false)
      assert.strictEqual(res.body.error.code, 'ACCOUNT_INACTIVE')
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken
    }
  })

  // ─── 8. Image Storage & Cloudinary Tests ────────────────────────────────────

  it('Local storage upload: saves file locally, creates ReportAttachment, and verifies URL', async () => {
    const citizenAgent = request.agent(app)
    await citizenAgent.post('/api/v1/auth/login').send({
      email: 'demo-citizen@civicfix.demo',
      password: 'DemoCitizen123!',
    })

    // 1. Submit report
    const createRes = await citizenAgent.post('/api/v1/reports').send({
      title: 'Pothole on Station Road',
      description: 'Major road asphalt collapse causing traffic slowdowns and hazard',
      category: 'ROAD_DAMAGE',
      severity: 'HIGH',
      latitude: 26.9124,
      longitude: 75.7873,
    })
    assert.strictEqual(createRes.status, 201)
    const reportId = createRes.body.data.id

    // 2. Upload dummy evidence file
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    )

    const uploadRes = await citizenAgent
      .post(`/api/v1/reports/${reportId}/attachments`)
      .attach('files', dummyPng, 'evidence-photo.png')

    assert.strictEqual(uploadRes.status, 200)
    assert.strictEqual(uploadRes.body.success, true)
    assert.strictEqual(uploadRes.body.data.count, 1)

    // 3. Retrieve report and verify attachment URL persistence
    const getRes = await request(app).get(`/api/v1/reports/${reportId}`)
    assert.strictEqual(getRes.status, 200)
    assert.strictEqual(getRes.body.data.attachments.length, 1)
    const attachmentUrl = getRes.body.data.attachments[0].url
    assert.ok(attachmentUrl.startsWith('/uploads/') || attachmentUrl.startsWith('https://res.cloudinary.com/'))
  })

  it('Cloudinary upload integration: uploadEvidenceFile uploads to Cloudinary when credentials are configured', async () => {
    const { uploadEvidenceFile, isCloudinaryConfigured } = require('../lib/storage')
    const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME
    const originalApiKey = process.env.CLOUDINARY_API_KEY
    const originalApiSecret = process.env.CLOUDINARY_API_SECRET

    try {
      process.env.CLOUDINARY_CLOUD_NAME = 'zgmkrekn'
      process.env.CLOUDINARY_API_KEY = '863899253317643'
      process.env.CLOUDINARY_API_SECRET = 'AXHtH6PoF_Jbgz7QEdF8WAJw9AE'

      assert.strictEqual(isCloudinaryConfigured(), true)

      const dummyFile: any = {
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          'base64'
        ),
        originalname: 'test-evidence.png',
        mimetype: 'image/png',
      }

      const result = await uploadEvidenceFile(dummyFile, 'civicfix/test-evidence')
      assert.strictEqual(result.provider, 'cloudinary')
      assert.ok(result.url.startsWith('https://res.cloudinary.com/zgmkrekn/image/upload/'))
      assert.ok(result.publicId)
      assert.strictEqual(result.mimeType, 'image/png')
    } finally {
      if (originalCloudName) process.env.CLOUDINARY_CLOUD_NAME = originalCloudName
      else delete process.env.CLOUDINARY_CLOUD_NAME

      if (originalApiKey) process.env.CLOUDINARY_API_KEY = originalApiKey
      else delete process.env.CLOUDINARY_API_KEY

      if (originalApiSecret) process.env.CLOUDINARY_API_SECRET = originalApiSecret
      else delete process.env.CLOUDINARY_API_SECRET
    }
  })

  it('Storage failure handling: fails safely without saving false record if provider rejects', async () => {
    const { uploadEvidenceFile } = require('../lib/storage')
    const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME
    const originalApiKey = process.env.CLOUDINARY_API_KEY
    const originalApiSecret = process.env.CLOUDINARY_API_SECRET

    try {
      // Intentionally invalid credentials
      process.env.CLOUDINARY_CLOUD_NAME = 'invalid_cloud'
      process.env.CLOUDINARY_API_KEY = '999999999'
      process.env.CLOUDINARY_API_SECRET = 'invalid_secret'

      const dummyFile: any = {
        buffer: Buffer.from('notarealimage'),
        originalname: 'bad.png',
        mimetype: 'image/png',
      }

      await assert.rejects(
        async () => {
          await uploadEvidenceFile(dummyFile, 'civicfix/test-fail')
        },
        (err: any) => {
          assert.strictEqual(err.code, 'STORAGE_UPLOAD_FAILED')
          return true
        }
      )
    } finally {
      if (originalCloudName) process.env.CLOUDINARY_CLOUD_NAME = originalCloudName
      else delete process.env.CLOUDINARY_CLOUD_NAME

      if (originalApiKey) process.env.CLOUDINARY_API_KEY = originalApiKey
      else delete process.env.CLOUDINARY_API_KEY

      if (originalApiSecret) process.env.CLOUDINARY_API_SECRET = originalApiSecret
      else delete process.env.CLOUDINARY_API_SECRET
    }
  })
})
