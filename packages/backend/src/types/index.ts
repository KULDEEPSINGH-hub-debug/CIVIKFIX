import { Request } from 'express'

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum UserRole {
  CITIZEN = 'CITIZEN',
  AUTHORITY = 'AUTHORITY',
  ADMIN = 'ADMIN',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum AuthorityAppStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

export enum ReportStatus {
  REPORTED = 'REPORTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLUTION_CLAIMED = 'RESOLUTION_CLAIMED',
  VERIFIED_RESOLVED = 'VERIFIED_RESOLVED',
  DISPUTED = 'DISPUTED',
  REOPENED = 'REOPENED',
  REJECTED = 'REJECTED',
  DUPLICATE = 'DUPLICATE',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IssueCategory {
  ROAD_DAMAGE = 'ROAD_DAMAGE',
  STREETLIGHT = 'STREETLIGHT',
  GARBAGE = 'GARBAGE',
  WATER_LEAKAGE = 'WATER_LEAKAGE',
  DRAINAGE = 'DRAINAGE',
  TRAFFIC_SIGNAL = 'TRAFFIC_SIGNAL',
  PUBLIC_INFRASTRUCTURE = 'PUBLIC_INFRASTRUCTURE',
  OTHER = 'OTHER',
}

// ─── Request Types ────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string
  role: string
  status: string
  email: string
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

export interface PaginationQuery {
  page?: string
  limit?: string
}

export interface ReportFilters {
  category?: string
  status?: string
  severity?: string
  city?: string
  sort?: string
  page?: string
  limit?: string
}
