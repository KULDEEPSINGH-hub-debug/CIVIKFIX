import { Router, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import type { AuthenticatedRequest } from '../types'

const router = Router()

router.use(requireAuth)

// GET /api/v1/notifications - List notifications for current user
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { unreadOnly } = req.query

    const where: Record<string, unknown> = { userId }
    if (unreadOnly === 'true') {
      where.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          report: {
            select: {
              id: true,
              publicId: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ])

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/notifications/:id/read - Mark one as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const userId = req.user!.id

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    })

    if (!notification) {
      res.status(404).json({
        success: false,
        error: { message: 'Notification not found', code: 'NOT_FOUND' },
      })
      return
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    res.json({
      success: true,
      data: { notification: updated },
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/notifications/read-all - Mark all as read
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })

    res.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    })
  } catch (err) {
    next(err)
  }
})

export default router
