import bcrypt from 'bcryptjs'
import prisma from './prisma'

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Controlled, safe, idempotent demo provisioning mechanism.
 * Runs non-destructively on startup ONLY when ENABLE_DEMO_ACCOUNTS='true' or DEMO_MODE='true',
 * or when called explicitly via admin script.
 * Never drops, truncates, or deletes any existing data.
 */
export async function initDemoAccounts(options?: { force?: boolean }): Promise<{
  provisioned: boolean
  message: string
}> {
  const isEnabled =
    options?.force ||
    process.env.ENABLE_DEMO_ACCOUNTS === 'true' ||
    process.env.DEMO_MODE === 'true'

  if (!isEnabled) {
    return {
      provisioned: false,
      message: 'Demo provisioning skipped (ENABLE_DEMO_ACCOUNTS is not enabled).',
    }
  }

  console.log('[CivicFix Demo] Initializing safe demo accounts and departments...')

  // 1. Jurisdictions
  const jurisdictions = [
    {
      id: 'demo-jurisdiction-jaipur',
      name: 'Jaipur Municipal Corporation Jurisdiction',
      city: 'Jaipur',
      state: 'Rajasthan',
      boundaries: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [75.7, 26.8],
          [75.9, 26.8],
          [75.9, 27.0],
          [75.7, 27.0],
          [75.7, 26.8],
        ],
      }),
    },
    {
      id: 'demo-jurisdiction-001',
      name: 'Demo City Municipal Corporation',
      city: 'Demo City',
      state: 'Demo State',
      boundaries: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [75.7, 26.8],
          [75.9, 26.8],
          [75.9, 27.0],
          [75.7, 27.0],
          [75.7, 26.8],
        ],
      }),
    },
  ]

  for (const j of jurisdictions) {
    await prisma.jurisdiction.upsert({
      where: { id: j.id },
      update: { name: j.name, city: j.city, state: j.state },
      create: j,
    })
  }

  // 2. Departments
  const departments = [
    // General Municipal Grievance Cell (Fallback for unmapped or generic issues)
    {
      id: 'demo-dept-jaipur-grievance',
      name: 'Jaipur Municipal Grievance Cell',
      type: 'MUNICIPAL',
      city: 'Jaipur',
      state: 'Rajasthan',
      categories: 'OTHER',
      contactEmail: 'grievance@jaipurmc.demo',
      contactPhone: '+91-141-2741122',
      websiteUrl: 'https://jaipurmc.demo',
    },
    // Specialized Jaipur Departments
    {
      id: 'demo-dept-001',
      name: 'Public Works Department (PWD) - Roads & Bridges',
      type: 'PWD',
      city: 'Jaipur',
      state: 'Rajasthan',
      categories: ['ROAD_DAMAGE', 'PUBLIC_INFRASTRUCTURE'].join(','),
      contactEmail: 'demo-road@civicfix.demo',
      contactPhone: '+91-141-2223344',
      websiteUrl: 'https://pwd.rajasthan.demo',
    },
    {
      id: 'demo-dept-002',
      name: 'Jaipur Vidyut Vitran Nigam (Streetlight & Power)',
      type: 'ELECTRICITY',
      city: 'Jaipur',
      state: 'Rajasthan',
      categories: ['STREETLIGHT'].join(','),
      contactEmail: 'demo-light@civicfix.demo',
      contactPhone: '+91-141-2200112',
      websiteUrl: 'https://jvvnl.demo',
    },
    {
      id: 'demo-dept-003',
      name: 'Public Health Engineering Dept (PHED - Water & Drainage)',
      type: 'WATER',
      city: 'Jaipur',
      state: 'Rajasthan',
      categories: ['WATER_LEAKAGE', 'DRAINAGE', 'GARBAGE'].join(','),
      contactEmail: 'demo-water@civicfix.demo',
      contactPhone: '+91-141-2224455',
      websiteUrl: 'https://phed.rajasthan.demo',
    },
    {
      id: 'demo-dept-004',
      name: 'Jaipur Traffic Police & Control Management',
      type: 'TRAFFIC',
      city: 'Jaipur',
      state: 'Rajasthan',
      categories: ['TRAFFIC_SIGNAL'].join(','),
      contactEmail: 'demo-traffic@civicfix.demo',
      contactPhone: '+91-141-2561258',
      websiteUrl: 'https://jaipurtrafficpolice.demo',
    },
    // Demo City Departments (For test/demo suite consistency)
    {
      id: 'demo-dept-city-001',
      name: 'Demo Road & Infrastructure Dept',
      type: 'PWD',
      city: 'Demo City',
      state: 'Demo State',
      categories: ['ROAD_DAMAGE', 'PUBLIC_INFRASTRUCTURE'].join(','),
      contactEmail: 'demo-road@civicfix.demo',
      contactPhone: '+91-00000-00001',
      websiteUrl: 'https://civicfix.demo/authority',
    },
    {
      id: 'demo-dept-city-002',
      name: 'Demo Streetlight & Power Dept',
      type: 'ELECTRICITY',
      city: 'Demo City',
      state: 'Demo State',
      categories: ['STREETLIGHT'].join(','),
      contactEmail: 'demo-light@civicfix.demo',
      contactPhone: '+91-00000-00002',
      websiteUrl: 'https://civicfix.demo/authority',
    },
    {
      id: 'demo-dept-city-003',
      name: 'Demo Water & Sanitation Dept',
      type: 'WATER',
      city: 'Demo City',
      state: 'Demo State',
      categories: ['WATER_LEAKAGE', 'DRAINAGE', 'GARBAGE'].join(','),
      contactEmail: 'demo-water@civicfix.demo',
      contactPhone: '+91-00000-00003',
      websiteUrl: 'https://civicfix.demo/authority',
    },
    {
      id: 'demo-dept-city-004',
      name: 'Demo Traffic & Transport Dept',
      type: 'TRAFFIC',
      city: 'Demo City',
      state: 'Demo State',
      categories: ['TRAFFIC_SIGNAL'].join(','),
      contactEmail: 'demo-traffic@civicfix.demo',
      contactPhone: '+91-00000-00004',
      websiteUrl: 'https://civicfix.demo/authority',
    },
  ]

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: {
        name: dept.name,
        type: dept.type,
        city: dept.city,
        state: dept.state,
        categories: dept.categories,
        contactEmail: dept.contactEmail,
        contactPhone: dept.contactPhone,
        websiteUrl: dept.websiteUrl,
        isActive: true,
      },
      create: {
        ...dept,
        isActive: true,
      },
    })

    // Upsert AuthorityDirectory record
    const existingDir = await prisma.authorityDirectory.findFirst({
      where: { departmentId: dept.id },
    })

    if (!existingDir) {
      await prisma.authorityDirectory.create({
        data: {
          departmentId: dept.id,
          officialPortalUrl: dept.websiteUrl,
          dataSource: 'OFFICIAL_DIRECTORY',
          isActive: true,
          lastVerifiedAt: new Date(),
        },
      })
    } else if (!existingDir.isActive) {
      await prisma.authorityDirectory.update({
        where: { id: existingDir.id },
        data: { isActive: true, lastVerifiedAt: new Date() },
      })
    }
  }

  // 3. Badges
  const badges = [
    { name: 'First Report', description: 'Submitted your first civic report', iconName: 'flag', threshold: 1 },
    { name: 'Active Citizen', description: 'Submitted 10 or more reports', iconName: 'trending-up', threshold: 10 },
    { name: 'Community Helper', description: 'Supported 25 or more community reports', iconName: 'heart', threshold: 25 },
    { name: 'Problem Solver', description: 'Had 5 reports verified as resolved', iconName: 'check-circle', threshold: 5 },
    { name: 'Verified Contributor', description: 'Verified 20 resolution claims in your area', iconName: 'shield-check', threshold: 20 },
  ]
  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    })
  }

  // 4. Demo Users
  // 4a. Demo Authority Official
  const authorityEmail = 'demo-authority@civicfix.demo'
  const authorityUser = await prisma.user.upsert({
    where: { email: authorityEmail },
    update: {
      passwordHash: await hashPassword('DemoAuthority123!'),
      role: 'AUTHORITY',
      status: 'ACTIVE',
      emailVerified: true,
    },
    create: {
      email: authorityEmail,
      passwordHash: await hashPassword('DemoAuthority123!'),
      role: 'AUTHORITY',
      status: 'ACTIVE',
      emailVerified: true,
      citizenProfile: {
        create: {
          displayName: 'Demo Authority Official',
          city: 'Jaipur',
          state: 'Rajasthan',
          bio: 'Demo authority official account for PWD Roads & Infrastructure.',
        },
      },
      authorityProfile: {
        create: {
          displayName: 'Demo Authority Official',
          designation: 'Executive Engineer (Roads)',
          departmentId: 'demo-dept-001',
          jurisdictionId: 'demo-jurisdiction-jaipur',
        },
      },
      authorityApplication: {
        create: {
          applicantName: 'Demo Authority Official',
          designation: 'Executive Engineer',
          department: 'Public Works Department (PWD) - Roads & Bridges',
          officialEmail: authorityEmail,
          officeLocation: 'PWD Headquarters, Jaipur',
          requestedJurisdiction: 'Jaipur Municipal Corporation',
          requestedResponsibilities: 'Road maintenance, pothole repairs and bridge structural integrity.',
          status: 'APPROVED',
          reviewNotes: 'Demo authority account — verified and approved.',
          reviewedAt: new Date(),
        },
      },
    },
  })

  // Ensure authority profile & application are linked if user already existed
  const existingAuthProfile = await prisma.authorityProfile.findUnique({
    where: { userId: authorityUser.id },
  })
  if (!existingAuthProfile) {
    await prisma.authorityProfile.create({
      data: {
        userId: authorityUser.id,
        displayName: 'Demo Authority Official',
        designation: 'Executive Engineer (Roads)',
        departmentId: 'demo-dept-001',
        jurisdictionId: 'demo-jurisdiction-jaipur',
      },
    })
  } else if (existingAuthProfile.departmentId !== 'demo-dept-001') {
    await prisma.authorityProfile.update({
      where: { userId: authorityUser.id },
      data: { departmentId: 'demo-dept-001' },
    })
  }

  const existingAuthApp = await prisma.authorityApplication.findUnique({
    where: { userId: authorityUser.id },
  })
  if (!existingAuthApp) {
    await prisma.authorityApplication.create({
      data: {
        userId: authorityUser.id,
        applicantName: 'Demo Authority Official',
        designation: 'Executive Engineer',
        department: 'Public Works Department (PWD) - Roads & Bridges',
        officialEmail: authorityEmail,
        officeLocation: 'PWD Headquarters, Jaipur',
        requestedJurisdiction: 'Jaipur Municipal Corporation',
        requestedResponsibilities: 'Road maintenance, pothole repairs and bridge structural integrity.',
        status: 'APPROVED',
        reviewNotes: 'Demo authority account — verified and approved.',
        reviewedAt: new Date(),
      },
    })
  } else if (existingAuthApp.status !== 'APPROVED') {
    await prisma.authorityApplication.update({
      where: { userId: authorityUser.id },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    })
  }

  // 4b. Demo Citizen
  const citizenEmail = 'demo-citizen@civicfix.demo'
  await prisma.user.upsert({
    where: { email: citizenEmail },
    update: {
      passwordHash: await hashPassword('DemoCitizen123!'),
      role: 'CITIZEN',
      status: 'ACTIVE',
      emailVerified: true,
    },
    create: {
      email: citizenEmail,
      passwordHash: await hashPassword('DemoCitizen123!'),
      role: 'CITIZEN',
      status: 'ACTIVE',
      emailVerified: true,
      citizenProfile: {
        create: {
          displayName: 'Demo Citizen',
          city: 'Jaipur',
          state: 'Rajasthan',
          bio: 'Demo citizen account for submitting and tracking civic issues.',
          totalPoints: 120,
        },
      },
    },
  })

  // 4c. Demo Admin
  const adminEmail = 'demo-admin@civicfix.demo'
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: await hashPassword('DemoAdmin123!'),
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
    create: {
      email: adminEmail,
      passwordHash: await hashPassword('DemoAdmin123!'),
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      citizenProfile: {
        create: {
          displayName: 'Demo Administrator',
          city: 'Jaipur',
          state: 'Rajasthan',
          bio: 'CivicFix System Administrator.',
          totalPoints: 0,
        },
      },
    },
  })

  // 5. Backfill unlinked reports to matching departments if suggestedDeptId is null
  const unlinkedReports = await prisma.report.findMany({
    where: { suggestedDeptId: null },
    select: { id: true, category: true, city: true },
  })

  for (const rep of unlinkedReports) {
    const match =
      departments.find(
        (d) =>
          d.categories.includes(rep.category) &&
          rep.city &&
          rep.city.toLowerCase().includes(d.city.toLowerCase())
      ) ||
      departments.find((d) => d.categories.includes(rep.category)) ||
      departments.find((d) => d.id === 'demo-dept-jaipur-grievance')

    if (match) {
      await prisma.report.update({
        where: { id: rep.id },
        data: { suggestedDeptId: match.id },
      })
    }
  }

  console.log('[CivicFix Demo] Successfully provisioned demo accounts, departments, and directory.')
  return {
    provisioned: true,
    message: 'Demo accounts, departments, and directory successfully provisioned.',
  }
}

// Allow standalone execution via `ts-node src/lib/demoAccounts.ts`
if (require.main === module) {
  initDemoAccounts({ force: true })
    .then((res) => {
      console.log(res.message)
      process.exit(0)
    })
    .catch((err) => {
      console.error('[CivicFix Demo Error]', err)
      process.exit(1)
    })
}
