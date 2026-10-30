import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireApprovedAuthority, requireAuth } from '../middleware/auth'
import { getUploadsDir, uploadEvidenceFile } from '../lib/storage'
import { matchAuthorityDepartment } from '../lib/routingEngine'
import type { AuthenticatedRequest } from '../types'
import { ReportStatus } from '../types'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    cb(null, allowed.includes(file.mimetype))
  },
})

const router = Router()

// GET /api/v1/authority/directory - Public directory of civic authorities
router.get('/directory', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        authorityDirectory: true,
        _count: {
          select: {
            assignedReports: true,
            authorityProfiles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    res.json({
      success: true,
      data: {
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          city: d.city,
          state: d.state,
          categories: d.categories,
          websiteUrl: d.websiteUrl,
          contactEmail: d.contactEmail,
          contactPhone: d.contactPhone,
          directoryInfo: d.authorityDirectory[0] || null,
          totalAssignedReports: d._count.assignedReports,
          officerCount: d._count.authorityProfiles,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/authority/find - Smart Authority Finder based on category, location & road
router.get('/find', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, city, latitude, longitude, address, road } = req.query as Record<string, string>

    if (!category) {
      res.status(400).json({
        success: false,
        error: { message: 'Category is required', code: 'MISSING_PARAM' },
      })
      return
    }

    const latNum = latitude ? parseFloat(latitude) : undefined
    const lngNum = longitude ? parseFloat(longitude) : undefined

    const result = await matchAuthorityDepartment({
      category,
      city,
      latitude: Number.isFinite(latNum) ? latNum : undefined,
      longitude: Number.isFinite(lngNum) ? lngNum : undefined,
      address,
      road,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/authority/reports - Reports assigned to current officer's department
router.get('/reports', requireApprovedAuthority, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id

    const profile = await prisma.authorityProfile.findUnique({
      where: { userId },
      include: { department: true },
    })

    if (!profile) {
      res.status(404).json({
        success: false,
        error: { message: 'Authority profile not found', code: 'PROFILE_NOT_FOUND' },
      })
      return
    }

    const { status, severity, sort, page: pg, limit: lim } = req.query as Record<string, string>
    const page = Math.max(1, parseInt(pg || '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(lim || '20', 10) || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      OR: [
        { assignedDeptId: profile.departmentId },
        { suggestedDeptId: profile.departmentId },
      ],
    }

    if (status) where.status = status
    if (severity) where.severity = severity

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort === 'severity' ? { severity: 'desc' } : { createdAt: 'desc' },
        include: {
          attachments: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { actor: { select: { email: true } } },
          },
          resolutionEvidences: true,
          _count: {
            select: { support: true, comments: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        department: {
          id: profile.department.id,
          name: profile.department.name,
          city: profile.department.city,
        },
        reports,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/authority/reports/:id/status - Update report status
const updateStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus),
  reason: z.string().min(5).max(1000),
  evidenceUrl: z.string().optional(),
})

router.patch('/reports/:id/status', requireApprovedAuthority, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const userId = req.user!.id

    const parsed = updateStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
      })
      return
    }

    const report = await prisma.report.findUnique({
      where: { id },
    })

    if (!report) {
      res.status(404).json({
        success: false,
        error: { message: 'Report not found', code: 'NOT_FOUND' },
      })
      return
    }

    const { status: newStatus, reason, evidenceUrl } = parsed.data

    // Permitted transitions
    const validTransitions: Record<string, string[]> = {
      REPORTED: ['UNDER_REVIEW', 'ASSIGNED', 'REJECTED', 'DUPLICATE'],
      UNDER_REVIEW: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'],
      ASSIGNED: ['IN_PROGRESS', 'UNDER_REVIEW'],
      IN_PROGRESS: ['RESOLUTION_CLAIMED', 'UNDER_REVIEW'],
      RESOLUTION_CLAIMED: ['IN_PROGRESS'], // Citizens verify or dispute; authorities can re-open to in_progress
      DISPUTED: ['IN_PROGRESS', 'UNDER_REVIEW'],
      REOPENED: ['UNDER_REVIEW', 'IN_PROGRESS'],
    }

    const allowed = validTransitions[report.status] || []
    if (!allowed.includes(newStatus)) {
      res.status(400).json({
        success: false,
        error: {
          message: `Cannot transition status from ${report.status} to ${newStatus}. Permitted: ${allowed.join(', ') || 'None'}`,
          code: 'INVALID_TRANSITION',
        },
      })
      return
    }

    // Execute update and history log in a transaction
    const [updatedReport] = await prisma.$transaction([
      prisma.report.update({
        where: { id },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }),
      prisma.reportStatusHistory.create({
        data: {
          reportId: id,
          prevStatus: report.status,
          newStatus,
          actorId: userId,
          reason,
          evidenceUrl,
        },
      }),
      // Notification to reporter
      prisma.notification.create({
        data: {
          userId: report.reporterId,
          reportId: id,
          type: 'STATUS_CHANGED',
          title: `Report Status Updated: ${newStatus.replace(/_/g, ' ')}`,
          body: `Your report "${report.title}" status changed to ${newStatus.replace(/_/g, ' ')}. Reason: ${reason}`,
        },
      }),
    ])

    res.json({
      success: true,
      data: { report: updatedReport },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/authority/upload-evidence - Upload evidence image to Cloudinary/storage
router.post(
  '/upload-evidence',
  requireApprovedAuthority,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = req.file
      if (!file) {
        res.status(400).json({ success: false, error: { message: 'No file uploaded', code: 'NO_FILE' } })
        return
      }

      const result = await uploadEvidenceFile(file, 'civicfix/resolution-evidence')
      res.json({
        success: true,
        data: {
          url: result.url,
          publicId: result.publicId,
          provider: result.provider,
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

// POST /api/v1/authority/reports/:id/evidence - Upload resolution evidence
const evidenceSchema = z.object({
  beforeUrl: z.string().optional(),
  afterUrl: z.string().min(1, 'After photo is required to claim resolution'),
  notes: z.string().min(10, 'Repair notes are required'),
})

router.post('/reports/:id/evidence', requireApprovedAuthority, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const userId = req.user!.id

    const parsed = evidenceSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
      })
      return
    }

    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) {
      res.status(404).json({
        success: false,
        error: { message: 'Report not found', code: 'NOT_FOUND' },
      })
      return
    }

    const { beforeUrl, afterUrl, notes } = parsed.data

    const [evidence, updatedReport] = await prisma.$transaction([
      prisma.resolutionEvidence.create({
        data: {
          reportId: id,
          uploadedBy: userId,
          beforeUrl: beforeUrl || null,
          afterUrl,
          notes,
        },
      }),
      prisma.report.update({
        where: { id },
        data: { status: 'RESOLUTION_CLAIMED' },
      }),
      prisma.reportStatusHistory.create({
        data: {
          reportId: id,
          prevStatus: report.status,
          newStatus: 'RESOLUTION_CLAIMED',
          actorId: userId,
          reason: `Resolution evidence provided: ${notes}`,
          evidenceUrl: afterUrl,
        },
      }),
      prisma.notification.create({
        data: {
          userId: report.reporterId,
          reportId: id,
          type: 'RESOLUTION_CLAIMED',
          title: 'Resolution Claimed by Authority',
          body: `Authority has submitted repair evidence for "${report.title}". Please inspect and confirm or dispute resolution.`,
        },
      }),
    ])

    res.json({
      success: true,
      data: { evidence, report: updatedReport },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/authority/analytics - Department specific metrics
router.get('/analytics', requireApprovedAuthority, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id

    const profile = await prisma.authorityProfile.findUnique({
      where: { userId },
      include: { department: true },
    })

    if (!profile) {
      res.status(404).json({
        success: false,
        error: { message: 'Profile not found', code: 'NOT_FOUND' },
      })
      return
    }

    const deptId = profile.departmentId

    const [
      totalAssigned,
      inProgress,
      resolutionClaimed,
      verifiedResolved,
      disputed,
      criticalCount,
    ] = await Promise.all([
      prisma.report.count({ where: { assignedDeptId: deptId } }),
      prisma.report.count({ where: { assignedDeptId: deptId, status: 'IN_PROGRESS' } }),
      prisma.report.count({ where: { assignedDeptId: deptId, status: 'RESOLUTION_CLAIMED' } }),
      prisma.report.count({ where: { assignedDeptId: deptId, status: 'VERIFIED_RESOLVED' } }),
      prisma.report.count({ where: { assignedDeptId: deptId, status: 'DISPUTED' } }),
      prisma.report.count({ where: { assignedDeptId: deptId, severity: 'CRITICAL' } }),
    ])

    res.json({
      success: true,
      data: {
        department: profile.department.name,
        metrics: {
          totalAssigned,
          inProgress,
          resolutionClaimed,
          verifiedResolved,
          disputed,
          criticalCount,
          resolutionRate: totalAssigned > 0 ? Math.round((verifiedResolved / totalAssigned) * 100) : 0,
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
