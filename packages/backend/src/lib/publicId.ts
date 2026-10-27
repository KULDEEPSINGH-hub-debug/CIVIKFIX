import prisma from './prisma'

/**
 * Generate a public-facing report ID like CF-2026-001234
 * Ensures uniqueness by checking the database.
 */
export async function generatePublicId(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `CF-${year}-`

  // Find the latest report for this year
  const latest = await prisma.report.findFirst({
    where: { publicId: { startsWith: prefix } },
    orderBy: { publicId: 'desc' },
    select: { publicId: true },
  })

  let nextNum = 1
  if (latest?.publicId) {
    const lastNum = parseInt(latest.publicId.replace(prefix, ''), 10)
    nextNum = isNaN(lastNum) ? 1 : lastNum + 1
  }

  // Pad to 6 digits
  const padded = String(nextNum).padStart(6, '0')
  return `${prefix}${padded}`
}
