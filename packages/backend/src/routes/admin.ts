import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import type { AuthenticatedRequest } from '../types'
import { AuthorityAppStatus, AccountStatus } from '../types'

const router = Router()

// All admin routes require ADMIN role
router.use(requireAdmin)

// GET /api/v1/admin/stats - Overview metrics
router.get('/stats', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalCitizens,
      totalAuthorities,
      pendingApplications,
      totalReports,
      disputedReports,
      reopenedReports,
      verifiedReports,
      auditLogsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CITIZEN' } }),
      prisma.user.count({ where: { role: 'AUTHORITY' } }),
      prisma.authorityApplication.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'DISPUTED' } }),
      prisma.report.count({ where: { status: 'REOPENED' } }),
      prisma.report.count({ where: { status: 'VERIFIED_RESOLVED' } }),
      prisma.auditLog.count(),
    ])

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCitizens,
        totalAuthorities,
        pendingApplications,
        totalReports,
        disputedReports,
        reopenedReports,
        verifiedReports,
        auditLogsCount,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/admin/applications - List authority applications
router.get('/applications', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as { status?: string }

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const applications = await prisma.authorityApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
            createdAt: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: { applications },
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/admin/applications/:id - Review and approve/reject/suspend authority application
const reviewApplicationSchema = z.object({
  status: z.nativeEnum(AuthorityAppStatus),
  reviewNotes: z.string().min(5, 'Review notes are required for institutional record'),
  departmentId: z.string().optional(),
  jurisdictionId: z.string().optional(),
})

router.patch('/applications/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const adminId = req.user!.id

    const parsed = reviewApplicationSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
      })
      return
    }

    const application = await prisma.authorityApplication.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!application) {
      res.status(404).json({
        success: false,
        error: { message: 'Application not found', code: 'NOT_FOUND' },
      })
      return
    }

    const { status, reviewNotes, departmentId, jurisdictionId } = parsed.data

    // If approving, find or ensure department
    let targetDeptId = departmentId
    if (status === 'APPROVED' && !targetDeptId) {
      // Find matching department by name or create/assign default
      const dept = await prisma.department.findFirst({
        where: { name: { contains: application.department } },
      }) || await prisma.department.findFirst({ where: { isActive: true } })

      if (dept) targetDeptId = dept.id
    }

    // Execute updates in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update application status
      await tx.authorityApplication.update({
        where: { id },
        data: {
          status,
          reviewedBy: adminId,
          reviewNotes,
          reviewedAt: new Date(),
        },
      })

      // 2. If approved, upgrade user role and create AuthorityProfile
      if (status === 'APPROVED' && targetDeptId) {
        await tx.user.update({
          where: { id: application.userId },
          data: { role: 'AUTHORITY' },
        })

        await tx.authorityProfile.upsert({
          where: { userId: application.userId },
          create: {
            userId: application.userId,
            displayName: application.applicantName,
            designation: application.designation,
            departmentId: targetDeptId,
            jurisdictionId: jurisdictionId || null,
          },
          update: {
            displayName: application.applicantName,
            designation: application.designation,
            departmentId: targetDeptId,
            jurisdictionId: jurisdictionId || null,
          },
        })

        // Ensure department has an active AuthorityDirectory entry so it appears in the public directory
        const existingDir = await tx.authorityDirectory.findFirst({
          where: { departmentId: targetDeptId },
        })
        if (!existingDir) {
          await tx.authorityDirectory.create({
            data: {
              departmentId: targetDeptId,
              isActive: true,
              dataSource: 'ADMIN_APPROVED',
              lastVerifiedAt: new Date(),
            },
          })
        } else if (!existingDir.isActive) {
          await tx.authorityDirectory.update({
            where: { id: existingDir.id },
            data: { isActive: true, lastVerifiedAt: new Date() },
          })
        }
      } else if (status === 'REJECTED' || status === 'SUSPENDED' || status === 'REVOKED') {
        // Demote user back to citizen role if revoked
        await tx.user.update({
          where: { id: application.userId },
          data: { role: 'CITIZEN' },
        })
      }

      // 3. Create restricted audit log
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: `AUTHORITY_APP_${status}`,
          entity: 'AuthorityApplication',
          entityId: id,
          details: JSON.stringify({
            userId: application.userId,
            applicantName: application.applicantName,
            department: application.department,
            reviewNotes,
            assignedDeptId: targetDeptId,
          }),
        },
      })

      // 4. In-app notification to applicant
      await tx.notification.create({
        data: {
          userId: application.userId,
          type: `AUTHORITY_APP_${status}`,
          title: `Authority Application ${status.replace(/_/g, ' ')}`,
          body: `Your application to register as an authorized officer for ${application.department} has been ${status.toLowerCase()}. Notes: ${reviewNotes}`,
        },
      })
    })

    const updated = await prisma.authorityApplication.findUnique({
      where: { id },
      include: { user: true },
    })

    res.json({
      success: true,
      data: { application: updated },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/admin/users - User management
router.get('/users', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { role, status, search, page: pg, limit: lim } = req.query as Record<string, string>
    const page = Math.max(1, parseInt(pg || '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(lim || '20', 10) || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (status) where.status = status
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { citizenProfile: { displayName: { contains: search } } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          citizenProfile: {
            select: { displayName: true, city: true, totalPoints: true },
          },
          authorityProfile: {
            select: {
              displayName: true,
              designation: true,
              department: { select: { name: true, city: true } },
            },
          },
          _count: {
            select: { reports: true, comments: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        users,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/admin/users/:id/status - Suspend / activate user
const updateUserStatusSchema = z.object({
  status: z.nativeEnum(AccountStatus),
  reason: z.string().min(5),
})

router.patch('/users/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const adminId = req.user!.id

    const parsed = updateUserStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
      })
      return
    }

    const { status, reason } = parsed.data

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true, role: true },
    })

    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: `USER_STATUS_${status}`,
        entity: 'User',
        entityId: id,
        details: JSON.stringify({ newStatus: status, reason }),
      },
    })

    res.json({
      success: true,
      data: { user: updated },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/admin/audit-logs - Audit trail
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page: pg, limit: lim } = req.query as Record<string, string>
    const page = Math.max(1, parseInt(pg || '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(lim || '25', 10) || 25))
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count(),
    ])

    res.json({
      success: true,
      data: {
        logs,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
