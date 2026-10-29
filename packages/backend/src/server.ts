import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables from packages/backend/.env before other imports
const envCandidates = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'packages/backend/.env'),
]
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { apiRateLimiter } from './middleware/rateLimiter'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import reportRoutes from './routes/reports'
import statsRoutes from './routes/stats'
import authorityRoutes from './routes/authority'
import adminRoutes from './routes/admin'
import notificationRoutes from './routes/notifications'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)
const isProd = process.env.NODE_ENV === 'production'

// Trust reverse proxy (e.g. Render, Cloudflare, load balancers)
// Essential for secure cookies and accurate rate limiting over HTTPS
if (isProd || process.env.RENDER) {
  app.set('trust proxy', 1)
}

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .map((url) => (url as string).replace(/\/+$/, ''))

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }
      const cleanOrigin = origin.replace(/\/+$/, '')
      if (allowedOrigins.includes(cleanOrigin)) {
        callback(null, true)
      } else if (isProd) {
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      } else {
        callback(null, true) // Permissive for local dev
      }
    },
    credentials: true,
  })
)

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Session configuration
const dbUrl = process.env.DATABASE_URL || ''
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')

let sessionStore: session.Store | undefined
if (isPostgres) {
  const PgSession = connectPgSimple(session)
  sessionStore = new PgSession({
    conString: dbUrl,
    createTableIfMissing: true,
  })
}

const isCrossSite = Boolean(
  process.env.FRONTEND_URL &&
    !process.env.FRONTEND_URL.includes('localhost') &&
    !process.env.FRONTEND_URL.includes('127.0.0.1')
)

const cookieSameSite =
  (process.env.SESSION_COOKIE_SAMESITE as 'lax' | 'strict' | 'none') ||
  (isProd ? (isCrossSite ? 'none' : 'lax') : 'lax')

app.use(
  session({
    name: 'civicfix.sid',
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'civicfix-insecure-dev-secret-replace-in-production-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
)

// Ensure uploads folder exists and serve statically
const uploadsDir = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

// General rate limiter
app.use('/api', apiRateLimiter)

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'civicfix-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    demoMode: true,
  })
})

// Mount API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/stats', statsRoutes)
app.use('/api/v1/authority', authorityRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/notifications', notificationRoutes)

// 404 handler for unknown routes
app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'API route not found', code: 'ROUTE_NOT_FOUND' },
  })
})

// Central error handling middleware
app.use(errorHandler)

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[CivicFix API] Server running at http://localhost:${PORT}`)
    console.log(`[CivicFix API] Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`[CivicFix API] Health check: http://localhost:${PORT}/api/health`)
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0)
    console.log(`[CivicFix API] Gemini Vision configured: ${hasKey}`)
  })
}

export default app
