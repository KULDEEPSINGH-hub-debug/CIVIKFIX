import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

// Extend Express session type
declare module 'express-session' {
  interface SessionData {
    userId: string
    userRole: string
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, role: true, status: true, email: true },
    })

    if (!user) {
      req.session.destroy(() => {})
      res.status(401).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
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

    // Attach user to request
    ;(req as Request & { user: typeof user }).user = user
    next()
  } catch (err) {
    next(err)
  }
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, async () => {
      const user = (req as Request & { user?: { role: string } }).user
      if (!user || !roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: {
            message: `Required role: ${roles.join(' or ')}`,
            code: 'FORBIDDEN',
          },
        })
        return
      }
      next()
    })
  }
}

export async function requireApprovedAuthority(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as Request & { user?: { id: string; role: string } }).user
    if (!user || user.role !== 'AUTHORITY') {
      res.status(403).json({
        success: false,
        error: { message: 'Authority access required', code: 'FORBIDDEN' },
      })
      return
    }

    const application = await prisma.authorityApplication.findUnique({
      where: { userId: user.id },
      select: { status: true },
    })

    if (!application || application.status !== 'APPROVED') {
      res.status(403).json({
        success: false,
        error: { message: 'Your authority application is not approved', code: 'NOT_APPROVED' },
      })
      return
    }

    next()
  })
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as Request & { user?: { role: string } }).user
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { message: 'Admin access required', code: 'FORBIDDEN' },
      })
      return
    }
    next()
  })
}
