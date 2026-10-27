import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const router = Router()

// GET /api/v1/stats
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalReports,
      reportedCount,
      underReviewCount,
      assignedCount,
      inProgressCount,
      resolutionClaimedCount,
      verifiedResolvedCount,
      disputedCount,
      reopenedCount,
      categoryStats,
      recentActivity,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'REPORTED' } }),
      prisma.report.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.report.count({ where: { status: 'ASSIGNED' } }),
      prisma.report.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.report.count({ where: { status: 'RESOLUTION_CLAIMED' } }),
      prisma.report.count({ where: { status: 'VERIFIED_RESOLVED' } }),
      prisma.report.count({ where: { status: 'DISPUTED' } }),
      prisma.report.count({ where: { status: 'REOPENED' } }),
      prisma.report.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      prisma.report.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          publicId: true,
          title: true,
          category: true,
          status: true,
          severity: true,
          createdAt: true,
          city: true,
        },
      }),
    ])

    const openIssues = reportedCount + underReviewCount + assignedCount + inProgressCount + disputedCount + reopenedCount
    const resolutionRate = totalReports > 0 ? Math.round((verifiedResolvedCount / totalReports) * 100) : 0

    res.json({
      success: true,
      data: {
        totalReports,
        openIssues,
        inProgress: inProgressCount,
        verifiedResolved: verifiedResolvedCount,
        resolutionClaimed: resolutionClaimedCount,
        disputed: disputedCount,
        reopened: reopenedCount,
        resolutionRate,
        byCategory: categoryStats.map((c) => ({
          category: c.category,
          count: c._count.category,
        })),
        recentActivity,
        isDemoData: true,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
