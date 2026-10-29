/**
 * Non-destructive SQLite to PostgreSQL Data Migration Script
 * Reads existing records from local dev.db and replicates them to PostgreSQL
 * preserving all UUIDs, foreign keys, timestamps, and relations.
 */

import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const targetUrl = process.env.TARGET_DATABASE_URL || (
  process.env.DATABASE_URL?.startsWith('postgres') ? process.env.DATABASE_URL : null
)

async function runMigration() {
  if (!targetUrl) {
    console.error('❌ Error: TARGET_DATABASE_URL (or a PostgreSQL DATABASE_URL) must be set.')
    console.error('Usage: TARGET_DATABASE_URL="postgresql://user:pass@host/db" ts-node scripts/migrate-to-pg.ts')
    process.exit(1)
  }

  const sqlitePath = path.resolve(__dirname, '../prisma/dev.db')
  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ Error: Source SQLite database not found at ${sqlitePath}`)
    process.exit(1)
  }

  console.log('🚀 Starting non-destructive data migration from SQLite to PostgreSQL...')
  console.log(`📁 Source: SQLite (${sqlitePath})`)
  console.log(`🌐 Target: PostgreSQL (${targetUrl.replace(/:[^:@]+@/, ':****@')})`)

  // 1. Initialize SQLite Source Client
  const sourcePrisma = new PrismaClient({
    datasources: { db: { url: `file:${sqlitePath}` } },
  })

  // 2. Initialize PostgreSQL Target Client
  const targetPrisma = new PrismaClient({
    datasources: { db: { url: targetUrl } },
  })

  try {
    // ── 1. Departments ────────────────────────────────────────────────────────
    const departments = await sourcePrisma.department.findMany()
    console.log(`📦 Migrating ${departments.length} departments...`)
    for (const d of departments) {
      await targetPrisma.department.upsert({
        where: { id: d.id },
        update: d,
        create: d,
      })
    }

    // ── 2. Jurisdictions ──────────────────────────────────────────────────────
    const jurisdictions = await sourcePrisma.jurisdiction.findMany()
    console.log(`📦 Migrating ${jurisdictions.length} jurisdictions...`)
    for (const j of jurisdictions) {
      await targetPrisma.jurisdiction.upsert({
        where: { id: j.id },
        update: j,
        create: j,
      })
    }

    // ── 3. Users ──────────────────────────────────────────────────────────────
    const users = await sourcePrisma.user.findMany()
    console.log(`📦 Migrating ${users.length} users...`)
    for (const u of users) {
      await targetPrisma.user.upsert({
        where: { id: u.id },
        update: u,
        create: u,
      })
    }

    // ── 4. Citizen Profiles ───────────────────────────────────────────────────
    const citizenProfiles = await sourcePrisma.citizenProfile.findMany()
    console.log(`📦 Migrating ${citizenProfiles.length} citizen profiles...`)
    for (const cp of citizenProfiles) {
      await targetPrisma.citizenProfile.upsert({
        where: { id: cp.id },
        update: cp,
        create: cp,
      })
    }

    // ── 5. Authority Profiles ─────────────────────────────────────────────────
    const authorityProfiles = await sourcePrisma.authorityProfile.findMany()
    console.log(`📦 Migrating ${authorityProfiles.length} authority profiles...`)
    for (const ap of authorityProfiles) {
      await targetPrisma.authorityProfile.upsert({
        where: { id: ap.id },
        update: ap,
        create: ap,
      })
    }

    // ── 6. Authority Applications ─────────────────────────────────────────────
    const apps = await sourcePrisma.authorityApplication.findMany()
    console.log(`📦 Migrating ${apps.length} authority applications...`)
    for (const a of apps) {
      await targetPrisma.authorityApplication.upsert({
        where: { id: a.id },
        update: a,
        create: a,
      })
    }

    // ── 7. Reports ────────────────────────────────────────────────────────────
    const reports = await sourcePrisma.report.findMany()
    console.log(`📦 Migrating ${reports.length} reports...`)
    for (const r of reports) {
      await targetPrisma.report.upsert({
        where: { id: r.id },
        update: r,
        create: r,
      })
    }

    // ── 8. Report Status History ──────────────────────────────────────────────
    const statusHistories = await sourcePrisma.reportStatusHistory.findMany()
    console.log(`📦 Migrating ${statusHistories.length} status histories...`)
    for (const sh of statusHistories) {
      await targetPrisma.reportStatusHistory.upsert({
        where: { id: sh.id },
        update: sh,
        create: sh,
      })
    }

    // ── 9. Resolution Evidence ────────────────────────────────────────────────
    const evidences = await sourcePrisma.resolutionEvidence.findMany()
    console.log(`📦 Migrating ${evidences.length} resolution evidences...`)
    for (const ev of evidences) {
      await targetPrisma.resolutionEvidence.upsert({
        where: { id: ev.id },
        update: ev,
        create: ev,
      })
    }

    // ── 10. Comments ──────────────────────────────────────────────────────────
    const comments = await sourcePrisma.reportComment.findMany()
    console.log(`📦 Migrating ${comments.length} comments...`)
    for (const c of comments) {
      await targetPrisma.reportComment.upsert({
        where: { id: c.id },
        update: c,
        create: c,
      })
    }

    // ── 11. Report Supports ───────────────────────────────────────────────────
    const supports = await sourcePrisma.reportSupport.findMany()
    console.log(`📦 Migrating ${supports.length} report supports...`)
    for (const s of supports) {
      await targetPrisma.reportSupport.upsert({
        where: { id: s.id },
        update: s,
        create: s,
      })
    }

    // ── 12. Verification Responses ────────────────────────────────────────────
    const verifications = await sourcePrisma.verificationResponse.findMany()
    console.log(`📦 Migrating ${verifications.length} verifications...`)
    for (const v of verifications) {
      await targetPrisma.verificationResponse.upsert({
        where: { id: v.id },
        update: v,
        create: v,
      })
    }

    // ── 13. Notifications ─────────────────────────────────────────────────────
    const notifications = await sourcePrisma.notification.findMany()
    console.log(`📦 Migrating ${notifications.length} notifications...`)
    for (const n of notifications) {
      await targetPrisma.notification.upsert({
        where: { id: n.id },
        update: n,
        create: n,
      })
    }

    console.log('\n✅ Verification of record counts:')
    const [pgUsers, pgReports, pgDepts, pgApps] = await Promise.all([
      targetPrisma.user.count(),
      targetPrisma.report.count(),
      targetPrisma.department.count(),
      targetPrisma.authorityApplication.count(),
    ])
    console.log(`  Users:        ${users.length} (SQLite) -> ${pgUsers} (PostgreSQL)`)
    console.log(`  Reports:      ${reports.length} (SQLite) -> ${pgReports} (PostgreSQL)`)
    console.log(`  Departments:  ${departments.length} (SQLite) -> ${pgDepts} (PostgreSQL)`)
    console.log(`  Applications: ${apps.length} (SQLite) -> ${pgApps} (PostgreSQL)`)
    console.log('\n🎉 Data migration completed successfully! SQLite dev.db was preserved intact.')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  } finally {
    await sourcePrisma.$disconnect()
    await targetPrisma.$disconnect()
  }
}

runMigration()
