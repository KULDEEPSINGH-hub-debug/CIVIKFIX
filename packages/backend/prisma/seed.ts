import { PrismaClient } from '@prisma/client'
import {
  UserRole,
  AccountStatus,
  AuthorityAppStatus,
  IssueCategory,
  Severity,
  ReportStatus,
} from '../src/types'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function main() {
  console.log('🌱 Starting seed...')

  // ─── Badges ─────────────────────────────────────────────────────────────────

  const badges = [
    {
      name: 'First Report',
      description: 'Submitted your first civic report',
      iconName: 'flag',
      threshold: 1,
    },
    {
      name: 'Active Citizen',
      description: 'Submitted 10 or more reports',
      iconName: 'trending-up',
      threshold: 10,
    },
    {
      name: 'Community Helper',
      description: 'Supported 25 or more community reports',
      iconName: 'heart',
      threshold: 25,
    },
    {
      name: 'Problem Solver',
      description: 'Had 5 reports verified as resolved',
      iconName: 'check-circle',
      threshold: 5,
    },
    {
      name: 'Verified Contributor',
      description: 'Verified 20 resolution claims in your area',
      iconName: 'shield-check',
      threshold: 20,
    },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    })
  }
  console.log('✅ Badges seeded')

  // ─── Jurisdiction ─────────────────────────────────────────────────────────

  const jurisdiction = await prisma.jurisdiction.upsert({
    where: { id: 'demo-jurisdiction-001' },
    update: {},
    create: {
      id: 'demo-jurisdiction-001',
      name: 'Demo City Municipal Corporation (FICTIONAL)',
      city: 'Demo City',
      state: 'Demo State',
      boundaries: JSON.stringify({
        type: 'Polygon',
        note: 'This is fictional boundary data for demo purposes only',
        coordinates: [
          [75.7, 26.8],
          [75.9, 26.8],
          [75.9, 27.0],
          [75.7, 27.0],
          [75.7, 26.8],
        ],
      }),
    },
  })
  console.log('✅ Jurisdiction seeded')

  // ─── Departments ──────────────────────────────────────────────────────────

  const departments = [
    {
      id: 'demo-dept-001',
      name: 'Demo Road & Infrastructure Dept (FICTIONAL)',
      type: 'PWD',
      city: 'Demo City',
      state: 'Demo State',
      categories: ['ROAD_DAMAGE', 'PUBLIC_INFRASTRUCTURE'].join(','),
      contactEmail: 'demo-road@civicfix.demo',
      contactPhone: '+91-00000-00001',
    },
    {
      id: 'demo-dept-002',
      name: 'Demo Streetlight & Power Dept (FICTIONAL)',
      type: 'ELECTRICITY',
      city: 'Demo City',
      state: 'Demo State',
      categories: ['STREETLIGHT'].join(','),
      contactEmail: 'demo-light@civicfix.demo',
      contactPhone: '+91-00000-00002',
    },
    {
      id: 'demo-dept-003',
      name: 'Demo Water & Sanitation Dept (FICTIONAL)',
      type: 'WATER',
      city: 'Demo City',
      state: 'Demo State',
      categories: ['WATER_LEAKAGE', 'DRAINAGE', 'GARBAGE'].join(','),
      contactEmail: 'demo-water@civicfix.demo',
      contactPhone: '+91-00000-00003',
    },
    {
      id: 'demo-dept-004',
      name: 'Demo Traffic & Transport Dept (FICTIONAL)',
      type: 'TRAFFIC',
      city: 'Demo City',
      state: 'Demo State',
      categories: ['TRAFFIC_SIGNAL'].join(','),
      contactEmail: 'demo-traffic@civicfix.demo',
      contactPhone: '+91-00000-00004',
    },
  ]

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: {},
      create: dept,
    })
  }
  console.log('✅ Departments seeded')

  // ─── Authority Directory ──────────────────────────────────────────────────

  for (const dept of departments) {
    const existing = await prisma.authorityDirectory.findFirst({
      where: { departmentId: dept.id },
    })
    if (!existing) {
      await prisma.authorityDirectory.create({
        data: {
          departmentId: dept.id,
          officialPortalUrl: 'https://civicfix.demo/authority',
          dataSource: 'DEMO_SEED',
          isActive: true,
        },
      })
    }
  }
  console.log('✅ Authority Directory seeded')

  // ─── Users ────────────────────────────────────────────────────────────────

  // Demo Citizen
  const citizenUser = await prisma.user.upsert({
    where: { email: 'demo-citizen@civicfix.demo' },
    update: {},
    create: {
      email: 'demo-citizen@civicfix.demo',
      passwordHash: await hashPassword('DemoCitizen123!'),
      role: UserRole.CITIZEN,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
      citizenProfile: {
        create: {
          displayName: 'Demo Citizen',
          city: 'Demo City',
          state: 'Demo State',
          bio: 'Demo citizen account for testing CivicFix. Not a real user.',
          totalPoints: 150,
        },
      },
    },
  })

  // Demo Authority
  const authorityUser = await prisma.user.upsert({
    where: { email: 'demo-authority@civicfix.demo' },
    update: {},
    create: {
      email: 'demo-authority@civicfix.demo',
      passwordHash: await hashPassword('DemoAuthority123!'),
      role: UserRole.AUTHORITY,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
      authorityProfile: {
        create: {
          displayName: 'Demo Authority Official',
          designation: 'Executive Engineer (Demo)',
          departmentId: 'demo-dept-001',
          jurisdictionId: 'demo-jurisdiction-001',
        },
      },
      authorityApplication: {
        create: {
          applicantName: 'Demo Authority Official',
          designation: 'Executive Engineer',
          department: 'Demo Road & Infrastructure Dept (FICTIONAL)',
          officialEmail: 'demo-authority@civicfix.demo',
          officeLocation: 'Demo Office, Demo City',
          requestedJurisdiction: 'Demo City Municipal Corporation',
          requestedResponsibilities: 'Road maintenance and pothole repairs in Demo City (fictional)',
          status: AuthorityAppStatus.APPROVED,
          reviewNotes: 'Demo account — automatically approved for testing.',
        },
      },
    },
  })

  // Demo Admin
  await prisma.user.upsert({
    where: { email: 'demo-admin@civicfix.demo' },
    update: {},
    create: {
      email: 'demo-admin@civicfix.demo',
      passwordHash: await hashPassword('DemoAdmin123!'),
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
      citizenProfile: {
        create: {
          displayName: 'Demo Admin',
          city: 'Demo City',
          state: 'Demo State',
          bio: 'Demo admin account.',
          totalPoints: 0,
        },
      },
    },
  })

  // Demo Pending Authority
  await prisma.user.upsert({
    where: { email: 'demo-pending@civicfix.demo' },
    update: {},
    create: {
      email: 'demo-pending@civicfix.demo',
      passwordHash: await hashPassword('DemoPending123!'),
      role: UserRole.CITIZEN,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
      citizenProfile: {
        create: {
          displayName: 'Demo Pending Authority',
          city: 'Demo City',
          state: 'Demo State',
          totalPoints: 0,
        },
      },
      authorityApplication: {
        create: {
          applicantName: 'Demo Pending Official',
          designation: 'Junior Engineer',
          department: 'Demo Water & Sanitation Dept (FICTIONAL)',
          officialEmail: 'demo-pending@civicfix.demo',
          officeLocation: 'Demo Office, Demo City',
          requestedJurisdiction: 'Demo City North Zone',
          requestedResponsibilities: 'Water supply and drainage maintenance in North Zone (fictional)',
          status: AuthorityAppStatus.UNDER_REVIEW,
          reviewNotes: 'Under review — demo account.',
        },
      },
    },
  })

  console.log('✅ Users seeded')

  // ─── Sample Reports ───────────────────────────────────────────────────────

  const sampleReports = [
    // ROAD_DAMAGE
    {
      title: 'Large pothole on Main Street near Demo Roundabout',
      description:
        'A large pothole has formed on the main street near the demo roundabout. It is about 2 feet wide and 6 inches deep. Several vehicles have been damaged. This is fictional demo data.',
      category: IssueCategory.ROAD_DAMAGE,
      severity: Severity.HIGH,
      status: ReportStatus.IN_PROGRESS,
      latitude: 26.912,
      longitude: 75.787,
      address: '12, Main Street, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      assignedDeptId: 'demo-dept-001',
    },
    {
      title: 'Road cave-in on Demo Colony Lane',
      description:
        'A section of the road has completely caved in due to a suspected water pipe leak underneath. The area is dangerous for pedestrians. This is fictional demo data.',
      category: IssueCategory.ROAD_DAMAGE,
      severity: Severity.CRITICAL,
      status: ReportStatus.ASSIGNED,
      latitude: 26.905,
      longitude: 75.802,
      address: '7, Demo Colony Lane, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      assignedDeptId: 'demo-dept-001',
    },
    // STREETLIGHT
    {
      title: 'Five streetlights out on Demo Park Road',
      description:
        'Five consecutive streetlights on Demo Park Road have been non-functional for over two weeks. The area becomes very dark at night, causing safety concerns. This is fictional demo data.',
      category: IssueCategory.STREETLIGHT,
      severity: Severity.MEDIUM,
      status: ReportStatus.REPORTED,
      latitude: 26.921,
      longitude: 75.793,
      address: 'Demo Park Road, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      suggestedDeptId: 'demo-dept-002',
    },
    {
      title: 'Streetlight flickering dangerously on Demo Highway',
      description:
        'A streetlight on Demo Highway flickers on and off every few seconds. This causes distraction to motorists. Reported to demonstrate the platform. Fictional data.',
      category: IssueCategory.STREETLIGHT,
      severity: Severity.LOW,
      status: ReportStatus.VERIFIED_RESOLVED,
      latitude: 26.898,
      longitude: 75.811,
      address: 'Demo Highway, KM 3, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      assignedDeptId: 'demo-dept-002',
    },
    // GARBAGE
    {
      title: 'Garbage pile not collected for 5 days near Demo Market',
      description:
        'The community garbage collection point near Demo Market has not been cleared for 5 days. Waste is overflowing. Health hazard. Fictional demo report.',
      category: IssueCategory.GARBAGE,
      severity: Severity.HIGH,
      status: ReportStatus.UNDER_REVIEW,
      latitude: 26.913,
      longitude: 75.796,
      address: 'Demo Market Area, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      suggestedDeptId: 'demo-dept-003',
    },
    {
      title: 'Illegal dumping site created near Demo Nala',
      description:
        'Residents have been illegally dumping garbage near the Demo Nala, polluting the area. This fictional report demonstrates the garbage category.',
      category: IssueCategory.GARBAGE,
      severity: Severity.MEDIUM,
      status: ReportStatus.REPORTED,
      latitude: 26.901,
      longitude: 75.782,
      address: 'Demo Nala Area, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      suggestedDeptId: 'demo-dept-003',
    },
    // WATER_LEAKAGE
    {
      title: 'Water main burst on Demo Sector 5 Road',
      description:
        'A water main has burst on Demo Sector 5 Road, flooding the area and wasting thousands of litres of water. Urgent action needed. Fictional data.',
      category: IssueCategory.WATER_LEAKAGE,
      severity: Severity.CRITICAL,
      status: ReportStatus.IN_PROGRESS,
      latitude: 26.917,
      longitude: 75.799,
      address: 'Demo Sector 5 Road, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      assignedDeptId: 'demo-dept-003',
    },
    {
      title: 'Leaking municipal tap at Demo Public Park',
      description:
        'A municipal water tap at the Demo Public Park has been leaking constantly for two weeks. This fictional report demonstrates the water leakage category.',
      category: IssueCategory.WATER_LEAKAGE,
      severity: Severity.LOW,
      status: ReportStatus.REPORTED,
      latitude: 26.909,
      longitude: 75.804,
      address: 'Demo Public Park, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      suggestedDeptId: 'demo-dept-003',
    },
    // DRAINAGE
    {
      title: 'Blocked drainage causing flooding on Demo Bazaar Street',
      description:
        'The main drainage channel on Demo Bazaar Street is completely blocked, causing flooding even during light rain. Fictional demo report for drainage category.',
      category: IssueCategory.DRAINAGE,
      severity: Severity.HIGH,
      status: ReportStatus.ASSIGNED,
      latitude: 26.924,
      longitude: 75.788,
      address: 'Demo Bazaar Street, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      assignedDeptId: 'demo-dept-003',
    },
    {
      title: 'Open manhole without cover on Demo Residential Lane',
      description:
        'An open manhole without a cover poses extreme danger to pedestrians and motorists on Demo Residential Lane. Fictional report for demo purposes.',
      category: IssueCategory.DRAINAGE,
      severity: Severity.CRITICAL,
      status: ReportStatus.REPORTED,
      latitude: 26.895,
      longitude: 75.808,
      address: 'Demo Residential Lane, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      suggestedDeptId: 'demo-dept-003',
    },
    // TRAFFIC_SIGNAL
    {
      title: 'Traffic signal not working at Demo Chowk Intersection',
      description:
        'The traffic signal at the busy Demo Chowk intersection has been malfunctioning for 3 days, causing traffic jams and accidents. Fictional demo data.',
      category: IssueCategory.TRAFFIC_SIGNAL,
      severity: Severity.HIGH,
      status: ReportStatus.IN_PROGRESS,
      latitude: 26.908,
      longitude: 75.792,
      address: 'Demo Chowk Intersection, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      assignedDeptId: 'demo-dept-004',
    },
    {
      title: 'Faded road markings near Demo School Zone',
      description:
        'Road markings, zebra crossing, and speed limit signs near Demo School Zone are completely faded, making it unsafe for children. This is a fictional demo report.',
      category: IssueCategory.TRAFFIC_SIGNAL,
      severity: Severity.MEDIUM,
      status: ReportStatus.REPORTED,
      latitude: 26.915,
      longitude: 75.783,
      address: 'Demo School Zone, Demo City',
      city: 'Demo City',
      state: 'Demo State',
      suggestedDeptId: 'demo-dept-004',
    },
  ]

  let counter = 1
  for (const reportData of sampleReports) {
    const paddedCounter = String(counter).padStart(6, '0')
    const year = new Date().getFullYear()
    const publicId = `CF-${year}-${paddedCounter}`

    const existing = await prisma.report.findUnique({ where: { publicId } })
    if (!existing) {
      const report = await prisma.report.create({
        data: {
          publicId,
          reporterId: citizenUser.id,
          isDemoData: true,
          ...reportData,
        },
      })

      // Add initial status history
      await prisma.reportStatusHistory.create({
        data: {
          reportId: report.id,
          newStatus: ReportStatus.REPORTED,
          actorId: citizenUser.id,
          reason: 'Issue reported by citizen (demo data)',
        },
      })

      // Add some support
      if (counter % 2 === 0) {
        await prisma.reportSupport.create({
          data: {
            reportId: report.id,
            userId: citizenUser.id,
          },
        }).catch(() => {})
      }
    }
    counter++
  }
  console.log('✅ Sample reports seeded')

  // ─── Escalation Rules ─────────────────────────────────────────────────────

  const rules = [
    { hoursToAcknowledge: 24, hoursToAssign: 48, hoursToResolve: 72, severity: Severity.CRITICAL },
    { hoursToAcknowledge: 48, hoursToAssign: 72, hoursToResolve: 120, severity: Severity.HIGH },
    { hoursToAcknowledge: 72, hoursToAssign: 96, hoursToResolve: 168, severity: Severity.MEDIUM },
    { hoursToAcknowledge: 96, hoursToAssign: 120, hoursToResolve: 240, severity: Severity.LOW },
  ]

  for (const rule of rules) {
    await prisma.escalationRule.create({ data: rule }).catch(() => {})
  }
  console.log('✅ Escalation rules seeded')

  // ─── Gamification Points for Demo Citizen ────────────────────────────────

  const pointsExist = await prisma.gamificationPoint.findFirst({
    where: { userId: citizenUser.id },
  })
  if (!pointsExist) {
    await prisma.gamificationPoint.createMany({
      data: [
        { userId: citizenUser.id, points: 100, reason: 'First report submitted (demo)' },
        { userId: citizenUser.id, points: 50, reason: 'Community engagement (demo)' },
      ],
    })

    // Award first badge
    const firstBadge = await prisma.badge.findUnique({ where: { name: 'First Report' } })
    if (firstBadge) {
      await prisma.userBadge.create({
        data: { userId: citizenUser.id, badgeId: firstBadge.id },
      }).catch(() => {})
    }
  }
  console.log('✅ Gamification data seeded')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\nDemo accounts:')
  console.log('  Citizen:   demo-citizen@civicfix.demo  / DemoCitizen123!')
  console.log('  Authority: demo-authority@civicfix.demo / DemoAuthority123!')
  console.log('  Admin:     demo-admin@civicfix.demo    / DemoAdmin123!')
  console.log('  Pending:   demo-pending@civicfix.demo  / DemoPending123!')
  console.log('\n⚠️  All data is fictional and for demonstration purposes only.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
