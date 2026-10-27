// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN'
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
export type AuthorityAppStatus =
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REVOKED'

export type ReportStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLUTION_CLAIMED'
  | 'VERIFIED_RESOLVED'
  | 'DISPUTED'
  | 'REOPENED'
  | 'REJECTED'
  | 'DUPLICATE'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IssueCategory =
  | 'ROAD_DAMAGE'
  | 'STREETLIGHT'
  | 'GARBAGE'
  | 'WATER_LEAKAGE'
  | 'DRAINAGE'
  | 'TRAFFIC_SIGNAL'
  | 'PUBLIC_INFRASTRUCTURE'
  | 'OTHER'

// ─── User Models ─────────────────────────────────────────────────────────────

export interface CitizenProfile {
  id: string
  userId: string
  displayName: string
  phone?: string
  city?: string
  state?: string
  bio?: string
  avatarUrl?: string
  totalPoints: number
}

export interface User {
  id: string
  email: string
  role: UserRole
  status: AccountStatus
  emailVerified: boolean
  mfaEnabled: boolean
  createdAt: string
  updatedAt: string
  citizenProfile?: CitizenProfile
  authorityProfile?: {
    displayName: string
    designation: string
    department?: Department
  }
}

// ─── Report Models ────────────────────────────────────────────────────────────

export interface ReportAttachment {
  id: string
  reportId: string
  url: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

export interface ReportComment {
  id: string
  reportId: string
  authorId: string
  content: string
  isModerated: boolean
  createdAt: string
  author?: {
    citizenProfile?: { displayName: string; avatarUrl?: string }
    authorityProfile?: { displayName: string }
  }
}

export interface ReportStatusHistory {
  id: string
  reportId: string
  prevStatus?: ReportStatus
  newStatus: ReportStatus
  actorId: string
  reason?: string
  evidenceUrl?: string
  createdAt: string
}

export interface Report {
  id: string
  publicId: string
  reporterId: string
  title: string
  description: string
  category: IssueCategory
  severity: Severity
  status: ReportStatus
  latitude: number
  longitude: number
  address: string
  landmark?: string
  road?: string
  city?: string
  state?: string
  suggestedDeptId?: string
  assignedDeptId?: string
  assignedUserId?: string
  aiCategory?: string
  aiSeverity?: string
  aiDescription?: string
  aiConfidence?: number
  isDemoData: boolean
  createdAt: string
  updatedAt: string
  reporter?: {
    citizenProfile?: { displayName: string; avatarUrl?: string }
  }
  attachments?: ReportAttachment[]
  comments?: ReportComment[]
  statusHistory?: ReportStatusHistory[]
  assignedDept?: Department
  suggestedDept?: Department
  support?: { userId: string }[]
  followers?: { userId: string }[]
  _count?: {
    support: number
    comments: number
    followers: number
  }
}

// ─── Department / Authority ───────────────────────────────────────────────────

export interface Department {
  id: string
  name: string
  type: string
  city: string
  state: string
  categories: string[]
  websiteUrl?: string
  contactEmail?: string
  contactPhone?: string
  isActive: boolean
  createdAt: string
}

export interface Jurisdiction {
  id: string
  name: string
  city: string
  state: string
  createdAt: string
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  totalReports: number
  openIssues: number
  inProgress: number
  verifiedResolved: number
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  userId: string
  reportId?: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    message: string
    code: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Authority Application ────────────────────────────────────────────────────

export interface AuthorityApplication {
  id: string
  userId: string
  applicantName: string
  designation: string
  department: string
  officialEmail: string
  workPhone?: string
  officeLocation: string
  requestedJurisdiction: string
  requestedResponsibilities: string
  supervisorName?: string
  supervisorContact?: string
  evidenceDocumentUrl?: string
  status: AuthorityAppStatus
  reviewedBy?: string
  reviewNotes?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export interface Badge {
  id: string
  name: string
  description: string
  iconName: string
  threshold: number
}

export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  earnedAt: string
  badge: Badge
}

// ─── Status Colors ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<ReportStatus, string> = {
  REPORTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  RESOLUTION_CLAIMED: 'bg-teal-100 text-teal-800',
  VERIFIED_RESOLVED: 'bg-green-100 text-green-800',
  DISPUTED: 'bg-red-100 text-red-800',
  REOPENED: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-gray-100 text-gray-800',
  DUPLICATE: 'bg-gray-100 text-gray-500',
}

export const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  ROAD_DAMAGE: 'Potholes & Road Damage',
  STREETLIGHT: 'Streetlights',
  GARBAGE: 'Garbage & Waste',
  WATER_LEAKAGE: 'Water Leakage',
  DRAINAGE: 'Drainage & Sewage',
  TRAFFIC_SIGNAL: 'Traffic Signals',
  PUBLIC_INFRASTRUCTURE: 'Public Infrastructure',
  OTHER: 'Other Issues',
}
