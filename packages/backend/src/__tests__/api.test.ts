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

  // ─── 5. Authority Application Workflow ──────────────────────────────────────

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
})
