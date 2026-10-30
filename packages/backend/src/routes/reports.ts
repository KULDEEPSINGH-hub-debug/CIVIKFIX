import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { analyzeReport } from '../lib/ai'
import { reverseGeocode } from '../lib/geocoding'
import { generatePublicId } from '../lib/publicId'
import { getUploadsDir, getFileSizeBytes } from '../lib/storage'
import type { AuthenticatedRequest } from '../types'
import { IssueCategory, Severity, ReportStatus } from '../types'

const router = Router()

// ─── Multer Setup ─────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getUploadsDir()),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    cb(null, allowed.includes(file.mimetype))
  },
})

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createReportSchema = z.object({
  title: z.string().min(10, 'Title must contain at least 10 characters').max(200),
  description: z.string().min(20, 'Description must contain at least 20 characters').max(2000),
  category: z.nativeEnum(IssueCategory),
  severity: z.nativeEnum(Severity).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
})

// ─── Helper ───────────────────────────────────────────────────────────────────

function parsePagination(query: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10) || 20))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

// ─── GET /reports (list with filters) ────────────────────────────────────────

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { category, status, severity, city, search, sort, page: pg, limit: lim } = req.query as Record<string, string>
    const { page, limit, skip } = parsePagination({ page: pg, limit: lim })

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (status) where.status = status
    if (severity) where.severity = severity
    if (city) where.city = { contains: city }
    if (search && search.trim()) {
      const s = search.trim()
      where.OR = [
        { title: { contains: s } },
        { description: { contains: s } },
        { publicId: { contains: s } },
        { address: { contains: s } },
      ]
    }

    const orderBy: Record<string, string> =
      sort === 'oldest' ? { createdAt: 'asc' }
      : sort === 'severity' ? { severity: 'desc' }
      : { createdAt: 'desc' }

    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          publicId: true,
          reporterId: true,
          title: true,
          description: true,
          category: true,
          severity: true,
          status: true,
          latitude: true,
          longitude: true,
          address: true,
          city: true,
          state: true,
          isDemoData: true,
          createdAt: true,
          updatedAt: true,
          reporter: {
            select: {
              citizenProfile: { select: { displayName: true, avatarUrl: true } },
            },
          },
          _count: { select: { support: true, comments: true, followers: true } },
        },
      }),
      prisma.report.count({ where }),
    ])

    res.json({
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /reports/nearby ──────────────────────────────────────────────────────

router.get('/nearby', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const radius = parseFloat(req.query.radius as string) || 5 // km
    const category = req.query.category as string | undefined

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({
        success: false,
        error: { message: 'lat and lng are required', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const latDelta = radius / 111
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180))

    const where: Record<string, unknown> = {
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
    }
    if (category) where.category = category

    const reports = await prisma.report.findMany({
      where,
      take: 50,
      select: {
        id: true,
        publicId: true,
        title: true,
        category: true,
        severity: true,
        status: true,
        latitude: true,
        longitude: true,
        address: true,
        createdAt: true,
      },
    })

    res.json({ success: true, data: reports })
  } catch (err) {
    next(err)
  }
})

// ─── GET /reports/duplicates ──────────────────────────────────────────────────

router.get('/duplicates', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const category = req.query.category as string | undefined

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({
        success: false,
        error: { message: 'lat and lng are required', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const radius = 0.5 // 500m
    const latDelta = radius / 111
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180))

    const where: Record<string, unknown> = {
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      status: { notIn: ['VERIFIED_RESOLVED', 'REJECTED', 'DUPLICATE'] },
    }
    if (category) where.category = category

    const reports = await prisma.report.findMany({
      where,
      take: 10,
      select: {
        id: true,
        publicId: true,
        title: true,
        category: true,
        status: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    })

    res.json({ success: true, data: reports })
  } catch (err) {
    next(err)
  }
})

// ─── POST /reports/analyze-ai ────────────────────────────────────────────────
router.post('/analyze-ai', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, imageBase64, imageMimeType } = req.body
    if (!imageBase64 && !title?.trim() && !description?.trim()) {
      res.status(400).json({
        success: false,
        error: { message: 'Upload an evidence photo to analyze it with AI.', code: 'NO_IMAGE_OR_TEXT' },
      })
      return
    }

    const ai = await analyzeReport(title || '', description || '', imageBase64, imageMimeType)
    res.json({ success: true, data: ai })
  } catch (err: any) {
    if (err?.code === 'API_KEY_MISSING') {
      res.status(503).json({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'Gemini Vision API key is not configured. Please set GEMINI_API_KEY in packages/backend/.env.',
        },
      })
      return
    }
    if (err?.code === 'API_KEY_INVALID') {
      res.status(502).json({
        success: false,
        error: {
          code: 'API_KEY_INVALID',
          message: err.message || 'Gemini API authentication failed. Please verify GEMINI_API_KEY in packages/backend/.env.',
        },
      })
      return
    }
    if (err?.code === 'QUOTA_EXCEEDED') {
      res.status(429).json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: err.message || 'Gemini API rate limit or quota exceeded. Please retry in a moment or continue manually.',
        },
      })
      return
    }
    if (err?.code === 'INVALID_IMAGE_FORMAT' || err?.code === 'UNSUPPORTED_MEDIA_TYPE' || err?.code === 'PAYLOAD_TOO_LARGE') {
      res.status(400).json({
        success: false,
        error: {
          code: err.code === 'UNSUPPORTED_MEDIA_TYPE' ? 'INVALID_IMAGE_FORMAT' : err.code,
          message: err.message,
        },
      })
      return
    }
    if (err?.code === 'NETWORK_ERROR' || err?.code === 'INVALID_AI_RESPONSE') {
      res.status(502).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      })
      return
    }
    res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: err?.message || 'Image analysis is temporarily unavailable. You can retry or continue manually.',
      },
    })
  }
})

// ─── POST /reports/reverse-geocode ──────────────────────────────────────────
router.post('/reverse-geocode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude } = req.body
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({
        success: false,
        error: { message: 'Valid latitude and longitude numbers are required', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const geo = await reverseGeocode(latitude, longitude)
    res.json({ success: true, data: geo })
  } catch (err) {
    next(err)
  }
})

// ─── GET /reports/mine (Authenticated Citizen's Own Reports & Database Metrics) ───
router.get('/mine', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { status, category, search, page: pg, limit: lim } = req.query as Record<string, string>
    const { page, limit, skip } = parsePagination({ page: pg, limit: lim })

    const where: any = { reporterId: userId }
    if (status) where.status = status
    if (category) where.category = category
    if (search && search.trim()) {
      const s = search.trim()
      where.OR = [
        { title: { contains: s } },
        { description: { contains: s } },
        { publicId: { contains: s } },
        { address: { contains: s } },
      ]
    }

    const [
      items,
      filteredTotal,
      allTimeCount,
      reportedCount,
      underReviewCount,
      assignedCount,
      inProgressCount,
      resolutionClaimedCount,
      verifiedResolvedCount,
      disputedCount,
      reopenedCount,
    ] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          attachments: true,
          assignedDept: { select: { id: true, name: true, contactEmail: true, contactPhone: true } },
          suggestedDept: { select: { id: true, name: true } },
          _count: { select: { support: true, comments: true, followers: true } },
        },
      }),
      prisma.report.count({ where }),
      prisma.report.count({ where: { reporterId: userId } }),
      prisma.report.count({ where: { reporterId: userId, status: 'REPORTED' } }),
      prisma.report.count({ where: { reporterId: userId, status: 'UNDER_REVIEW' } }),
      prisma.report.count({ where: { reporterId: userId, status: 'ASSIGNED' } }),
      prisma.report.count({ where: { reporterId: userId, status: 'IN_PROGRESS' } }),
      prisma.report.count({ where: { reporterId: userId, status: 'RESOLUTION_CLAIMED' } }),
      prisma.report.count({ where: { reporterId: userId, status: 'VERIFIED_RESOLVED' } }),
      prisma.report.count({ where: { reporterId: userId, status: 'DISPUTED' } }),
      prisma.report.count({ where: { reporterId: userId, status: 'REOPENED' } }),
    ])

    // Mutually exclusive, accurate database-backed metrics for this citizen
    const stats = {
      totalReports: allTimeCount,
      openIssues: reportedCount + underReviewCount + disputedCount + reopenedCount,
      inProgress: assignedCount + inProgressCount,
      resolutionClaimed: resolutionClaimedCount,
      verifiedResolved: verifiedResolvedCount,
    }

    res.json({
      success: true,
      data: {
        items,
        total: filteredTotal,
        page,
        limit,
        totalPages: Math.ceil(filteredTotal / limit),
        stats,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /reports/followed (Issues followed by the Citizen) ───────────────────
router.get('/followed', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const follows = await prisma.followedIssue.findMany({
      where: { userId },
      include: {
        report: {
          include: {
            attachments: true,
            assignedDept: { select: { id: true, name: true } },
            _count: { select: { support: true, comments: true, followers: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const items = follows.map((f) => f.report).filter(Boolean)

    res.json({
      success: true,
      data: {
        items,
        total: items.length,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /reports/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const report = await prisma.report.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
      include: {
        reporter: {
          select: {
            citizenProfile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        attachments: true,
        comments: {
          where: { isModerated: false },
          include: {
            author: {
              select: {
                citizenProfile: { select: { displayName: true, avatarUrl: true } },
                authorityProfile: { select: { displayName: true, designation: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: {
                citizenProfile: { select: { displayName: true } },
                authorityProfile: { select: { displayName: true } },
              },
            },
          },
        },
        assignedDept: { select: { name: true, contactEmail: true, contactPhone: true } },
        suggestedDept: { select: { name: true } },
        _count: { select: { support: true, comments: true, followers: true } },
      },
    })

    if (!report) {
      res.status(404).json({
        success: false,
        error: { message: 'Report not found', code: 'NOT_FOUND' },
      })
      return
    }

    res.json({ success: true, data: report })
  } catch (err) {
    next(err)
  }
})

// ─── POST /reports (create) ───────────────────────────────────────────────────

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createReportSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' },
      })
      return
    }

    const data = parsed.data

    // Geocode & address resolution
    const geo = await reverseGeocode(data.latitude, data.longitude)
    const finalAddress = data.address && data.address !== 'Demo Colony, Demo City' ? data.address : geo.address
    const finalCity = data.city || (geo.city !== 'Unknown' ? geo.city : 'Jaipur')
    const finalState = data.state || (geo.state !== 'Unknown' ? geo.state : 'Rajasthan')

    // AI analysis (failsafe: preserve manual report submission when AI is unavailable)
    let ai: any = {
      category: data.category,
      severity: data.severity || 'MEDIUM',
      description: data.description,
      confidence: 0,
    }
    try {
      ai = await analyzeReport(data.title, data.description)
    } catch {
      // AI analysis failure must NOT block manual citizen report submission
    }

    // Generate public ID
    const publicId = await generatePublicId()

    // Find suggested department based on category & city, with category fallback
    let suggestedDept = await prisma.department.findFirst({
      where: {
        categories: { contains: data.category },
        isActive: true,
        city: { contains: finalCity },
      },
    })
    if (!suggestedDept) {
      suggestedDept = await prisma.department.findFirst({
        where: {
          categories: { contains: data.category },
          isActive: true,
        },
      })
    }

    const report = await prisma.report.create({
      data: {
        publicId,
        reporterId: req.user!.id,
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity || (ai.severity as Severity) || 'MEDIUM',
        latitude: data.latitude,
        longitude: data.longitude,
        address: finalAddress,
        city: finalCity,
        state: finalState,
        road: geo.road,
        landmark: data.landmark || geo.landmark,
        aiCategory: ai.category,
        aiSeverity: ai.severity,
        aiDescription: ai.description,
        aiConfidence: ai.confidence,
        suggestedDeptId: suggestedDept?.id,
      },
    })

    // Create initial status history
    await prisma.reportStatusHistory.create({
      data: {
        reportId: report.id,
        newStatus: 'REPORTED',
        actorId: req.user!.id,
        reason: 'Issue reported by citizen',
      },
    })

    // Award gamification points
    await prisma.gamificationPoint.create({
      data: {
        userId: req.user!.id,
        points: 10,
        reason: 'New report submitted',
        reportId: report.id,
      },
    })

    await prisma.citizenProfile.updateMany({
      where: { userId: req.user!.id },
      data: { totalPoints: { increment: 10 } },
    })

    res.status(201).json({ success: true, data: report })
  } catch (err) {
    next(err)
  }
})

// ─── POST /reports/:id/attachments ────────────────────────────────────────────

router.post(
  '/:id/attachments',
  requireAuth,
  upload.array('files', 5),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const report = await prisma.report.findFirst({ where: { OR: [{ id }, { publicId: id }] } })
      if (!report) {
        res.status(404).json({ success: false, error: { message: 'Report not found', code: 'NOT_FOUND' } })
        return
      }

      const files = req.files as Express.Multer.File[]
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: { message: 'No files uploaded', code: 'NO_FILES' } })
        return
      }

      const attachments = await prisma.reportAttachment.createMany({
        data: files.map((file) => ({
          reportId: report.id,
          url: `/uploads/${file.filename}`,
          mimeType: file.mimetype,
          sizeBytes: getFileSizeBytes(file.path),
        })),
      })

      res.json({ success: true, data: { count: attachments.count } })
    } catch (err) {
      next(err)
    }
  }
)

// ─── POST /reports/:id/support ────────────────────────────────────────────────

router.post('/:id/support', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id as string
    const report = await prisma.report.findFirst({ where: { OR: [{ id: rawId }, { publicId: rawId }] } })
    if (!report) {
      res.status(404).json({ success: false, error: { message: 'Report not found', code: 'NOT_FOUND' } })
      return
    }
    const reportId = report.id

    const existing = await prisma.reportSupport.findUnique({
      where: { reportId_userId: { reportId, userId: req.user!.id } },
    })

    if (existing) {
      await prisma.reportSupport.delete({ where: { id: existing.id } })
      res.json({ success: true, data: { supported: false } })
    } else {
      await prisma.reportSupport.create({
        data: { reportId, userId: req.user!.id },
      })
      res.json({ success: true, data: { supported: true } })
    }
  } catch (err) {
    next(err)
  }
})

// ─── POST /reports/:id/follow ─────────────────────────────────────────────────

router.post('/:id/follow', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id as string
    const report = await prisma.report.findFirst({ where: { OR: [{ id: rawId }, { publicId: rawId }] } })
    if (!report) {
      res.status(404).json({ success: false, error: { message: 'Report not found', code: 'NOT_FOUND' } })
      return
    }
    const reportId = report.id

    const existing = await prisma.followedIssue.findUnique({
      where: { reportId_userId: { reportId, userId: req.user!.id } },
    })

    if (existing) {
      await prisma.followedIssue.delete({ where: { id: existing.id } })
      res.json({ success: true, data: { following: false } })
    } else {
      await prisma.followedIssue.create({
        data: { reportId, userId: req.user!.id },
      })
      res.json({ success: true, data: { following: true } })
    }
  } catch (err) {
    next(err)
  }
})

// ─── POST /reports/:id/comments ───────────────────────────────────────────────

router.post('/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id as string
    const report = await prisma.report.findFirst({ where: { OR: [{ id: rawId }, { publicId: rawId }] } })
    if (!report) {
      res.status(404).json({ success: false, error: { message: 'Report not found', code: 'NOT_FOUND' } })
      return
    }
    const reportId = report.id

    const { content } = req.body
    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      res.status(400).json({
        success: false,
        error: { message: 'Comment must be at least 5 characters', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const comment = await prisma.reportComment.create({
      data: {
        reportId,
        authorId: req.user!.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            citizenProfile: { select: { displayName: true, avatarUrl: true } },
            authorityProfile: { select: { displayName: true, designation: true } },
          },
        },
      },
    })

    res.status(201).json({ success: true, data: comment })
  } catch (err) {
    next(err)
  }
})

// ─── POST /reports/:id/verify ─────────────────────────────────────────────────

router.post('/:id/verify', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id as string
    const report = await prisma.report.findFirst({ where: { OR: [{ id: rawId }, { publicId: rawId }] } })
    if (!report) {
      res.status(404).json({ success: false, error: { message: 'Report not found', code: 'NOT_FOUND' } })
      return
    }
    const reportId = report.id

    const { isFixed, comment } = req.body

    if (typeof isFixed !== 'boolean') {
      res.status(400).json({
        success: false,
        error: { message: 'isFixed (boolean) is required', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const verification = await prisma.verificationResponse.create({
      data: {
        reportId,
        userId: req.user!.id,
        isFixed,
        comment: comment?.trim(),
      },
    })

    // If enough verifications say fixed, mark as VERIFIED_RESOLVED
    if (isFixed) {
      const fixedCount = await prisma.verificationResponse.count({
        where: { reportId, isFixed: true },
      })

      if (fixedCount >= 3) {
        if (report.status === 'RESOLUTION_CLAIMED') {
          await prisma.report.update({
            where: { id: reportId },
            data: { status: 'VERIFIED_RESOLVED' },
          })
          await prisma.reportStatusHistory.create({
            data: {
              reportId,
              prevStatus: report.status,
              newStatus: 'VERIFIED_RESOLVED',
              actorId: req.user!.id,
              reason: 'Verified resolved by citizens',
            },
          })
        }
      }
    }

    res.json({ success: true, data: verification })
  } catch (err) {
    next(err)
  }
})

// ─── POST /reports/:id/reopen ─────────────────────────────────────────────────

router.post('/:id/reopen', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id as string
    const report = await prisma.report.findFirst({ where: { OR: [{ id: rawId }, { publicId: rawId }] } })
    if (!report) {
      res.status(404).json({ success: false, error: { message: 'Report not found', code: 'NOT_FOUND' } })
      return
    }
    const reportId = report.id
    const { reason } = req.body

    if (report.reporterId !== req.user!.id) {
      res.status(403).json({ success: false, error: { message: 'Only the reporter can reopen', code: 'FORBIDDEN' } })
      return
    }

    await prisma.report.update({ where: { id: reportId }, data: { status: 'REOPENED' } })
    await prisma.reportStatusHistory.create({
      data: {
        reportId,
        prevStatus: report.status,
        newStatus: 'REOPENED',
        actorId: req.user!.id,
        reason: reason || 'Reporter requested reopening',
      },
    })

    res.json({ success: true, data: { message: 'Report reopened' } })
  } catch (err) {
    next(err)
  }
})

export default router
