import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/mailer'
import { authRateLimiter } from '../middleware/rateLimiter'
import { requireAuth } from '../middleware/auth'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
})

const authorityApplySchema = z.object({
  applicantName: z.string().min(2),
  designation: z.string().min(2),
  department: z.string().min(2),
  officialEmail: z.string().email(),
  workPhone: z.string().optional(),
  officeLocation: z.string().min(5),
  requestedJurisdiction: z.string().min(3),
  requestedResponsibilities: z.string().min(20),
  supervisorName: z.string().optional(),
  supervisorContact: z.string().optional(),
  password: z.string().min(8),
})

// ─── POST /register ───────────────────────────────────────────────────────────

router.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
      })
      return
    }

    const { email, password, displayName } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({
        success: false,
        error: { message: 'An account with this email already exists', code: 'EMAIL_TAKEN' },
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const emailVerifyToken = uuidv4()

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerifyToken,
        citizenProfile: {
          create: { displayName },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        citizenProfile: { select: { displayName: true } },
      },
    })

    // Send verification email (non-blocking)
    sendVerificationEmail(email, emailVerifyToken).catch(console.error)

    res.status(201).json({ success: true, data: { user } })
  } catch (err) {
    next(err)
  }
})

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        citizenProfile: true,
        authorityProfile: true,
      },
    })

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      })
      return
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      })
      return
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: { message: 'Account is suspended or deactivated', code: 'ACCOUNT_INACTIVE' },
      })
      return
    }

    req.session.userId = user.id
    req.session.userRole = user.role

    const { passwordHash, emailVerifyToken, passwordResetToken, passwordResetExpiry, mfaSecret, ...safeUser } = user

    res.json({ success: true, data: { user: safeUser } })
  } catch (err) {
    next(err)
  }
})

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true, data: { message: 'Logged out successfully' } })
  })
})

// ─── GET /me ──────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        citizenProfile: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            city: true,
            state: true,
            bio: true,
            avatarUrl: true,
            totalPoints: true,
          },
        },
        authorityProfile: {
          select: {
            id: true,
            displayName: true,
            designation: true,
            departmentId: true,
            jurisdictionId: true,
          },
        },
      },
    })

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      })
      return
    }

    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// ─── GET /verify-email ────────────────────────────────────────────────────────

router.get('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.query.token as string
    if (!token) {
      res.status(400).json({
        success: false,
        error: { message: 'Verification token is required', code: 'MISSING_TOKEN' },
      })
      return
    }

    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } })
    if (!user) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired verification token', code: 'INVALID_TOKEN' },
      })
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    })

    res.json({ success: true, data: { message: 'Email verified successfully' } })
  } catch (err) {
    next(err)
  }
})

// ─── POST /forgot-password ────────────────────────────────────────────────────

router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Valid email is required', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const { email } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success to prevent email enumeration
    if (user) {
      const token = uuidv4()
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiry: expiry },
      })

      sendPasswordResetEmail(email, token).catch(console.error)
    }

    res.json({
      success: true,
      data: { message: 'If an account with that email exists, a reset link has been sent.' },
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /reset-password ─────────────────────────────────────────────────────

router.post('/reset-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
      })
      return
    }

    const { token, password } = parsed.data

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired reset token', code: 'INVALID_TOKEN' },
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    })

    res.json({ success: true, data: { message: 'Password reset successfully' } })
  } catch (err) {
    next(err)
  }
})

// ─── POST /authority/apply ────────────────────────────────────────────────────

router.post('/authority/apply', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = authorityApplySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
      })
      return
    }

    const { password, ...appData } = parsed.data

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: appData.officialEmail } })
    if (existing) {
      res.status(409).json({
        success: false,
        error: { message: 'An account with this email already exists', code: 'EMAIL_TAKEN' },
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const emailVerifyToken = uuidv4()

    const user = await prisma.user.create({
      data: {
        email: appData.officialEmail,
        passwordHash,
        emailVerifyToken,
        citizenProfile: {
          create: { displayName: appData.applicantName },
        },
        authorityApplication: {
          create: appData,
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    sendVerificationEmail(appData.officialEmail, emailVerifyToken).catch(console.error)

    res.status(201).json({
      success: true,
      data: {
        user,
        message: 'Authority application submitted. Our team will review and contact you.',
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /authority/login ────────────────────────────────────────────────────

router.post('/authority/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        authorityProfile: true,
        authorityApplication: { select: { status: true } },
      },
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      })
      return
    }

    if (user.role !== 'AUTHORITY' && user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { message: 'This account does not have authority access', code: 'NOT_AUTHORITY' },
      })
      return
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: { message: 'Account is inactive', code: 'ACCOUNT_INACTIVE' },
      })
      return
    }

    req.session.userId = user.id
    req.session.userRole = user.role

    const { passwordHash, emailVerifyToken, passwordResetToken, passwordResetExpiry, mfaSecret, ...safeUser } = user

    res.json({ success: true, data: { user: safeUser } })
  } catch (err) {
    next(err)
  }
})

export default router
