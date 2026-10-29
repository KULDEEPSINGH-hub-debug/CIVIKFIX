import rateLimit from 'express-rate-limit'

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// General authentication rate limiter for citizen login & registration
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 200 : 25, // 200 in dev, 25 in production
  skipSuccessfulRequests: true, // Crucial: legitimate successful logins never trigger 429
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMITED',
    },
  },
  skip: () => isTest,
})

// Dedicated limiter for Authority Portal Login (isolated bucket)
export const authorityLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 200 : 25, // 200 in dev, 25 in production
  skipSuccessfulRequests: true, // Crucial: verified authorities are not locked out after successful logins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authority login attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMITED',
    },
  },
  skip: () => isTest,
})

// Dedicated limiter for Authority Application submissions (isolated from login attempts)
export const authorityApplyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 15, // 100 in dev, 15 per hour in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authority applications submitted. Please try again later.',
      code: 'RATE_LIMITED',
    },
  },
  skip: () => isTest,
})

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 2000 : 300, // High ceiling in local dev to avoid false positives during SPA navigation
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
    },
  },
  skip: () => isTest,
})

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Upload limit reached. Please try again in an hour.',
      code: 'RATE_LIMITED',
    },
  },
})
