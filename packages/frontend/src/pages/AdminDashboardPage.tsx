import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldAlert,
  Users,
  FileCheck,
  Building2,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  Lock,
  Server,
  Sparkles,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'

interface AuthorityApplication {
  id: string
  applicantName: string
  designation: string
  department: string
  officialEmail: string
  workPhone?: string
  officeLocation: string
  requestedJurisdiction: string
  requestedResponsibilities: string
  status: string
  createdAt: string
  user: {
    id: string
    email: string
    emailVerified: boolean
  }
}

interface UserItem {
  id: string
  email: string
  role: string
  status: string
  emailVerified: boolean
  createdAt: string
  citizenProfile?: { displayName: string }
  authorityProfile?: { displayName: string; designation: string; department?: { name: string } }
}

interface AuditLogItem {
  id: string
  action: string
  entity: string
  entityId: string
  details?: string
  createdAt: string
  actor?: {
    email: string
    role: string
  }
}

export default function AdminDashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'applications' | 'users' | 'audit' | 'system'>('applications')

  // Stats
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Applications
  const [applications, setApplications] = useState<AuthorityApplication[]>([])
  const [appFilter, setAppFilter] = useState<string>('PENDING_VERIFICATION')
  const [reviewModalApp, setReviewModalApp] = useState<AuthorityApplication | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED'>('APPROVED')
  const [reviewNotes, setReviewNotes] = useState<string>('')
  const [reviewing, setReviewing] = useState<boolean>(false)

  // Users
  const [usersList, setUsersList] = useState<UserItem[]>([])
  const [userSearch, setUserSearch] = useState<string>('')
  const [userRoleFilter, setUserRoleFilter] = useState<string>('')

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])

  // RBAC Guard
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/admin/login')
      } else if (user?.role !== 'ADMIN') {
        setError('Access Forbidden: Administrator role is required.')
      }
    }
  }, [authLoading, isAuthenticated, user, navigate])

  const fetchAdminData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, appsRes, usersRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/applications', { params: { status: appFilter || undefined } }),
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
      ])

      if (statsRes.data.success) setStats(statsRes.data.data)
      if (appsRes.data.success) setApplications(appsRes.data.data.applications || [])
      if (usersRes.data.success) setUsersList(usersRes.data.data.users || [])
      if (logsRes.data.success) setAuditLogs(logsRes.data.data.logs || [])
    } catch (err: unknown) {
      console.error('Admin data fetch error:', err)
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Unauthorized: Failed to fetch administrative dataset.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchAdminData()
    }
  }, [isAuthenticated, user, appFilter])

  // Handle application decision
  const handleReviewApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewModalApp || !reviewNotes.trim()) return

    setReviewing(true)
    try {
      const res = await api.patch(`/admin/applications/${reviewModalApp.id}`, {
        status: reviewStatus,
        reviewNotes: reviewNotes.trim(),
      })

      if (res.data.success) {
        setReviewModalApp(null)
        setReviewNotes('')
        fetchAdminData()
      } else {
        alert(res.data.error?.message || 'Review processing failed')
      }
    } catch (err) {
      console.error('Application review failed:', err)
      alert('Failed to process authority application review.')
    } finally {
      setReviewing(false)
    }
  }

  // Toggle user suspension
  const handleToggleUserStatus = async (targetUser: UserItem) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const reason = prompt(`Enter administrative reason to change status to ${nextStatus}:`, 'Platform policy compliance review')
    if (!reason) return

    try {
      await api.patch(`/admin/users/${targetUser.id}/status`, {
        status: nextStatus,
        reason,
      })
      fetchAdminData()
    } catch (err) {
      console.error('User status update failed:', err)
      alert('Could not update user status.')
    }
  }

  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen bg-page-bg py-20 flex justify-center items-center">
        <LoadingSpinner message="Verifying administrative authority privileges..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-page-bg py-16 px-4 flex justify-center items-center">
        <Card className="max-w-md w-full p-8 text-center bg-white border-border shadow-sm">
          <Lock className="h-12 w-12 text-danger mx-auto mb-3" />
          <h2 className="text-xl font-bold text-navy">Administrative Access Prohibited</h2>
          <p className="text-xs text-text-secondary mt-2 mb-6">
            {error} Administrator credentials and verification keys are required.
          </p>
          <Link to="/admin/login">
            <Button variant="primary" size="sm" className="bg-navy">
              Administrative Sign In
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const filteredUsers = usersList.filter((u) => {
    if (userRoleFilter && u.role !== userRoleFilter) return false
    if (!userSearch.trim()) return true
    const q = userSearch.toLowerCase()
    return u.email.toLowerCase().includes(q) || u.citizenProfile?.displayName.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-page-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Banner */}
        <div className="bg-white border-b-4 border-navy border border-border rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-navy" />
                <h1 className="text-2xl font-bold text-navy">CivicFix Platform Administration</h1>
                <Badge variant="default" className="text-xs bg-purple-100 text-purple-800">
                  Root Admin
                </Badge>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Signed in as <strong className="text-text-primary">{user?.email}</strong> &bull; All administrative operations are preserved in the immutable audit log.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-page-bg border border-border px-3 py-1.5 rounded font-mono text-text-secondary">
                Demo Mode: <strong>ACTIVE</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Pending Authority Requests</div>
            <div className="text-2xl font-bold text-warning mt-1">{stats.pendingApplications ?? 1}</div>
            <div className="text-[11px] text-text-secondary mt-1">Awaiting credential review</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Total Registered Users</div>
            <div className="text-2xl font-bold text-navy mt-1">{stats.totalUsers ?? 4}</div>
            <div className="text-[11px] text-text-secondary mt-1">Citizens & Officers</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Total Registered Reports</div>
            <div className="text-2xl font-bold text-civic-blue mt-1">{stats.totalReports ?? 12}</div>
            <div className="text-[11px] text-text-secondary mt-1">In public docket</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Recorded Audit Operations</div>
            <div className="text-2xl font-bold text-text-primary mt-1">{stats.auditLogsCount ?? 8}</div>
            <div className="text-[11px] text-text-secondary mt-1">Immutable security log</div>
          </Card>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'applications'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Authority Applications ({applications.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'users'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            <Users className="h-4 w-4" />
            User Management ({usersList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'audit'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            <Activity className="h-4 w-4" />
            Audit Trail ({auditLogs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'system'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            <Server className="h-4 w-4" />
            Integrations & Adapters
          </button>
        </div>

        {/* TAB 1: AUTHORITY APPLICATIONS QUEUE */}
        {activeTab === 'applications' && (
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-page-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <h3 className="font-bold text-navy text-sm">
                  Institutional Authority Access Requests
                </h3>
                <p className="text-text-secondary mt-0.5">
                  An official email address alone is insufficient proof. Administrators must independently confirm authorization before granting departmental write permissions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium text-text-secondary">Filter:</span>
                <select
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="border border-border rounded px-2 py-1 text-xs bg-white text-text-primary"
                >
                  <option value="">All Applications</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="p-12 text-center text-xs text-text-secondary">
                No authority applications match the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-left text-xs">
                  <thead className="bg-page-bg text-text-secondary font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Applicant Name</th>
                      <th className="px-4 py-3">Designation & Department</th>
                      <th className="px-4 py-3">Official Email</th>
                      <th className="px-4 py-3">Jurisdiction</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Verification Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white text-text-primary">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-page-bg/60">
                        <td className="px-4 py-3 font-bold text-navy">
                          {app.applicantName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{app.designation}</div>
                          <span className="text-[11px] text-text-secondary">{app.department}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-text-secondary">
                          {app.officialEmail}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {app.requestedJurisdiction}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              app.status === 'APPROVED'
                                ? 'bg-green-100 text-success'
                                : app.status === 'REJECTED'
                                ? 'bg-red-100 text-danger'
                                : 'bg-yellow-100 text-warning'
                            }`}
                          >
                            {app.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setReviewModalApp(app)
                              setReviewStatus('APPROVED')
                              setReviewNotes('')
                            }}
                            className="text-[11px] py-1 px-3 h-auto bg-navy hover:bg-navy-700"
                          >
                            Review & Decide
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-page-bg border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Search user email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="text-xs py-1"
                >
                  <option value="">All Roles</option>
                  <option value="CITIZEN">Citizens</option>
                  <option value="AUTHORITY">Authority Officers</option>
                  <option value="ADMIN">Administrators</option>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-xs">
                <thead className="bg-page-bg text-text-secondary font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">User Email</th>
                    <th className="px-4 py-3">Display Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registered On</th>
                    <th className="px-4 py-3 text-right">Account Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white text-text-primary">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-page-bg/60">
                      <td className="px-4 py-3 font-mono font-medium text-navy">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        {u.authorityProfile?.displayName || u.citizenProfile?.displayName || 'Citizen'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'AUTHORITY'
                              ? 'bg-blue-100 text-civic-blue'
                              : 'bg-gray-100 text-text-secondary'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.status === 'ACTIVE'
                              ? 'bg-green-100 text-success'
                              : 'bg-red-100 text-danger'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {u.role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className={`text-[11px] font-semibold hover:underline ${
                              u.status === 'ACTIVE' ? 'text-danger' : 'text-success'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: IMMUTABLE AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-page-bg border-b border-border">
              <h3 className="font-bold text-navy text-sm">
                System Audit Trail & Security Logs
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Every privileged status transition, authority verification, and account modification is permanently logged with timestamps.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-xs">
                <thead className="bg-page-bg text-text-secondary font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Actor Email</th>
                    <th className="px-4 py-3">Entity Affected</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white text-text-primary">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-page-bg/60">
                      <td className="px-4 py-3 whitespace-nowrap text-text-secondary font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-navy">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-mono">
                        {log.actor?.email || 'SYSTEM'}
                      </td>
                      <td className="px-4 py-3">
                        {log.entity} <span className="font-mono text-text-secondary">({log.entityId.slice(0, 8)}...)</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-mono max-w-xs truncate text-[11px]">
                        {log.details || 'Operation completed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INTEGRATIONS & ADAPTERS */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-border shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-navy text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-civic-blue" />
                AI Vision & Categorization Adapter
              </h3>
              <div className="p-3 bg-page-bg rounded border border-border text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Adapter Status:</span>
                  <strong className="text-success">Demo Simulation Adapter Active</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Configured Engine:</span>
                  <span className="font-mono">Gemini Vision API (Fallback)</span>
                </div>
                <p className="text-text-secondary text-[11px] pt-1 border-t border-border">
                  In demo mode without a live API key, CivicFix uses simulated image analysis and description keyword classification to prevent service halts.
                </p>
              </div>
            </Card>

            <Card className="bg-white border-border shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-navy text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-civic-blue" />
                Geocoding & Reverse-Lookup Service
              </h3>
              <div className="p-3 bg-page-bg rounded border border-border text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Provider:</span>
                  <span className="font-mono">OpenStreetMap Nominatim</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Demo Fallback:</span>
                  <strong className="text-success">Local Coordinate Resolver</strong>
                </div>
                <p className="text-text-secondary text-[11px] pt-1 border-t border-border">
                  Reverse-geocodes latitude and longitude coordinates into human-readable road names while respecting rate limits.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* APPLICATION REVIEW MODAL */}
        {reviewModalApp && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <h3 className="font-bold text-navy text-sm">
                  Review Authority Application
                </h3>
                <button
                  type="button"
                  onClick={() => setReviewModalApp(null)}
                  className="text-text-secondary hover:text-navy"
                >
                  &times;
                </button>
              </div>

              <div className="p-3 bg-page-bg rounded border border-border space-y-1 mb-4">
                <div><strong>Applicant:</strong> {reviewModalApp.applicantName}</div>
                <div><strong>Designation:</strong> {reviewModalApp.designation}</div>
                <div><strong>Department:</strong> {reviewModalApp.department}</div>
                <div><strong>Official Email:</strong> {reviewModalApp.officialEmail}</div>
                <div><strong>Jurisdiction Scope:</strong> {reviewModalApp.requestedJurisdiction}</div>
              </div>

              <form onSubmit={handleReviewApplicationSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Administrative Decision
                  </label>
                  <Select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as 'APPROVED' | 'REJECTED' | 'SUSPENDED')}
                    className="text-xs"
                  >
                    <option value="APPROVED">Approve (Assign Authority Permissions)</option>
                    <option value="REJECTED">Reject Application</option>
                    <option value="SUSPENDED">Suspend Account</option>
                  </Select>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Formal Verification Notes (Required for Audit Log) *
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Document the verified telephone or institutional check conducted..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewModalApp(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={reviewing || !reviewNotes.trim()}
                    className="bg-navy hover:bg-navy-700"
                  >
                    {reviewing ? 'Recording Decision...' : 'Record Decision in Audit Log'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
