import prisma from './prisma'

export interface AuthorityRoutingParams {
  category: string
  city?: string
  latitude?: number
  longitude?: number
  road?: string
  address?: string
}

export interface MatchedDepartment {
  id: string
  name: string
  type: string
  city: string
  state: string
  categories: string
  websiteUrl?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  portalUrl?: string | null
  lastVerifiedAt?: Date | null
  isFallback?: boolean
}

export interface AuthorityRoutingResult {
  confidence: 'HIGH' | 'MODERATE' | 'LOW'
  confidenceExplanation: string
  isFallback: boolean
  primaryAuthority: MatchedDepartment | null
  alternativeAuthorities: Array<{
    id: string
    name: string
    city: string
    portalUrl?: string | null
  }>
  disclaimer: string
}

/**
 * Checks if two city names match using direct substring or token overlap.
 * e.g., 'Jaipur Municipal Corporation' matches 'Jaipur', 'Demo City' matches 'Demo City'.
 */
export function isCityMatch(deptCity: string, queryCity?: string): boolean {
  if (!queryCity || !queryCity.trim()) return false
  const d = deptCity.toLowerCase().trim()
  const q = queryCity.toLowerCase().trim()

  if (d === q || q.includes(d) || d.includes(q)) {
    return true
  }

  // Extract alphanumeric tokens with length >= 3
  const dTokens = d.split(/[^a-z0-9]+/).filter((t) => t.length >= 3)
  const qTokens = q.split(/[^a-z0-9]+/).filter((t) => t.length >= 3)

  // Ignore generic words like 'city', 'corporation', 'municipal', 'state'
  const stopWords = new Set(['city', 'corporation', 'municipal', 'state', 'district', 'division', 'area', 'zone'])
  const dFiltered = dTokens.filter((t) => !stopWords.has(t))
  const qFiltered = qTokens.filter((t) => !stopWords.has(t))

  return dFiltered.some((dt) => qFiltered.includes(dt))
}

/**
 * Smart Authority Routing Engine:
 * Resolves the most accurate responsible department based on category, road, and city jurisdiction.
 * Provides transparent fallback routing to the General Municipal Grievance Cell when no specialized authority exists.
 */
export async function matchAuthorityDepartment(params: AuthorityRoutingParams): Promise<AuthorityRoutingResult> {
  const { category, city, road, address } = params

  const disclaimer =
    'CivicFix suggests responsible civic bodies based on published municipal charter rules and jurisdiction bounds. Official assignment may adjust based on exact road ownership or administrative zone.'

  // Fetch all active departments with their directory records
  const allDepartments = await prisma.department.findMany({
    where: { isActive: true },
    include: {
      authorityDirectory: {
        where: { isActive: true },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  })

  if (allDepartments.length === 0) {
    return {
      confidence: 'LOW',
      confidenceExplanation: 'No civic departments are currently registered in the system.',
      isFallback: true,
      primaryAuthority: null,
      alternativeAuthorities: [],
      disclaimer,
    }
  }

  // 1. Highway / PWD road heuristic check
  const isHighway = Boolean(
    (road && /\b(nh|national highway|sh|state highway|expressway|tollway)\b/i.test(road)) ||
    (address && /\b(nh|national highway|sh|state highway|expressway|tollway)\b/i.test(address))
  )

  // 2. Filter by category, prioritizing specialized departments over generic grievance cells
  const rawMatches = allDepartments.filter((d) => {
    if (!category) return false
    const cats = d.categories.split(',').map((c) => c.trim().toUpperCase())
    return cats.includes(category.toUpperCase())
  })

  const categoryMatches = [...rawMatches].sort((a, b) => {
    const aGrievance = /grievance/i.test(a.name) || a.type.toUpperCase() === 'MUNICIPAL'
    const bGrievance = /grievance/i.test(b.name) || b.type.toUpperCase() === 'MUNICIPAL'
    if (aGrievance && !bGrievance) return 1
    if (!aGrievance && bGrievance) return -1
    return 0
  })

  // 3. Find primary match based on city and road characteristics
  let primaryDept = categoryMatches[0] || null
  let confidence: 'HIGH' | 'MODERATE' | 'LOW' = 'MODERATE'
  let isFallback = false
  let confidenceExplanation = ''

  if (isHighway) {
    const highwayDept =
      categoryMatches.find(
        (d) =>
          (isCityMatch(d.city, city) || isCityMatch(d.city, address)) &&
          (d.type.toUpperCase() === 'PWD' || /highway|pwd|public works/i.test(d.name))
      ) ||
      categoryMatches.find(
        (d) =>
          d.type.toUpperCase() === 'PWD' ||
          /highway|pwd|public works/i.test(d.name)
      )

    if (highwayDept) {
      primaryDept = highwayDept
      confidence = 'HIGH'
      confidenceExplanation = `Road identified as arterial highway corridor. Routed to ${primaryDept.name} (${primaryDept.type}) responsible for state and national infrastructure.`
    }
  }

  if (categoryMatches.length > 0) {
    // If not already resolved by highway rule, match by city
    if (!primaryDept || !isHighway) {
      const cityMatch = categoryMatches.find(
        (d) => isCityMatch(d.city, city) || isCityMatch(d.city, address)
      )

      if (cityMatch) {
        primaryDept = cityMatch
        confidence = 'HIGH'
        confidenceExplanation = `Verified municipal jurisdiction for ${category.replace(/_/g, ' ')} under ${primaryDept.name} in ${primaryDept.city}.`
      } else if (!confidenceExplanation) {
        confidence = 'MODERATE'
        confidenceExplanation = `Probable department match for ${category.replace(/_/g, ' ')} under ${primaryDept.name}. Exact jurisdiction subject to local municipal ward boundaries.`
      }
    }
  } else {
    // No specialized category match -> Route to General Municipal Grievance Cell
    isFallback = true
    confidence = 'LOW'

    const grievanceCell =
      allDepartments.find(
        (d) =>
          (isCityMatch(d.city, city) || isCityMatch(d.city, address)) &&
          (d.type.toUpperCase() === 'MUNICIPAL' || /grievance|municipal/i.test(d.name))
      ) ||
      allDepartments.find(
        (d) => d.type.toUpperCase() === 'MUNICIPAL' || /grievance|municipal/i.test(d.name)
      ) ||
      allDepartments[0]

    primaryDept = grievanceCell
    confidenceExplanation =
      'No specialized authority registered for this exact location and category. The report will be dispatched to the General Municipal Grievance Cell.'
  }

  // Format primary authority
  const primaryAuthority: MatchedDepartment = {
    id: primaryDept.id,
    name: primaryDept.name,
    type: primaryDept.type,
    city: primaryDept.city,
    state: primaryDept.state,
    categories: primaryDept.categories,
    websiteUrl: primaryDept.websiteUrl,
    contactEmail: primaryDept.contactEmail,
    contactPhone: primaryDept.contactPhone,
    portalUrl: primaryDept.authorityDirectory[0]?.officialPortalUrl || primaryDept.websiteUrl,
    lastVerifiedAt: primaryDept.authorityDirectory[0]?.lastVerifiedAt,
    isFallback,
  }

  // Alternative authorities
  const alternativeAuthorities = categoryMatches
    .filter((d) => d.id !== primaryDept?.id)
    .map((a) => ({
      id: a.id,
      name: a.name,
      city: a.city,
      portalUrl: a.authorityDirectory[0]?.officialPortalUrl || a.websiteUrl,
    }))

  return {
    confidence,
    confidenceExplanation,
    isFallback,
    primaryAuthority,
    alternativeAuthorities,
    disclaimer,
  }
}
