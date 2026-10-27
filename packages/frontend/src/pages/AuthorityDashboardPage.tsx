import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Camera,
  Filter,
  Search,
  ArrowRight,
  ShieldAlert,
  Send,
  X,
  UserCheck,
} from 'lucide-react'
import { StatusBadge } from '../components/reports/StatusBadge'
import { CategoryIcon } from '../components/reports/CategoryIcon'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { Report, ReportStatus } from '../types'

export default function AuthorityDashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [departmentInfo, setDepartmentInfo] = useState<{ id: string; name: string; city: string } | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  // Modal 1: Update Status
  const [statusModalReport, setStatusModalReport] = useState<Report | null>(null)
  const [newStatus, setNewStatus] = useState<ReportStatus>('IN_PROGRESS')
  const [statusReason, setStatusReason] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false)

  // Modal 2: Submit Resolution Evidence
  const [evidenceModalReport, setEvidenceModalReport] = useState<Report | null>(null)
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string>('')
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string>('')
  const [repairNotes, setRepairNotes] = useState<string>('')
  const [submittingEvidence, setSubmittingEvidence] = useState<boolean>(false)

  // Check role guard
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/authority/login')
      } else if (user?.role !== 'AUTHORITY' && user?.role !== 'ADMIN') {
        setError('Unauthorized: Your account does not have approved authority permissions.')
      }
    }
  }, [authLoading, isAuthenticated, user, navigate])

  const fetchAuthorityReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (severityFilter) params.severity = severityFilter

      const res = await api.get('/authority/reports', { params })
      if (res.data.success) {
        setDepartmentInfo(res.data.data.department)
        setReports(res.data.data.reports || [])
        setTotal(res.data.data.pagination?.total || 0)
      } else {
        setError(res.data.error?.message || 'Failed to load department records')
      }
    } catch (err: unknown) {
      console.error('Authority reports fetch error:', err)
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Access denied. Ensure your authority application is approved by a platform administrator.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'AUTHORITY' || user?.role === 'ADMIN')) {
      fetchAuthorityReports()
    }
  }, [isAuthenticated, user, statusFilter, severityFilter])

  // Handle status update
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusModalReport || !statusReason.trim()) return

    setUpdatingStatus(true)
    try {
      const res = await api.patch(`/authority/reports/${statusModalReport.id}/status`, {
        status: newStatus,
        reason: statusReason.trim(),
      })

      if (res.data.success) {
        setStatusModalReport(null)
        setStatusReason('')
        fetchAuthorityReports()
      } else {
        alert(res.data.error?.message || 'Status transition failed')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Status update failed'
      alert(msg)
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Handle resolution evidence upload
  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evidenceModalReport || !afterPhotoUrl.trim() || !repairNotes.trim()) return

    setSubmittingEvidence(true)
    try {
      const res = await api.post(`/authority/reports/${evidenceModalReport.id}/evidence`, {
        beforeUrl: beforePhotoUrl.trim() || undefined,
        afterUrl: afterPhotoUrl.trim(),
        notes: repairNotes.trim(),
      })

      if (res.data.success) {
        setEvidenceModalReport(null)
        setAfterPhotoUrl('')
        setBeforePhotoUrl('')
        setRepairNotes('')
        fetchAuthorityReports()
      } else {
        alert(res.data.error?.message || 'Evidence submission failed')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Evidence submission failed'
      alert(msg)
    } finally {
      setSubmittingEvidence(false)
    }
  }

  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen bg-page-bg py-20 flex justify-center items-center">
        <LoadingSpinner message="Authenticating departmental credentials..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-page-bg py-16 px-4 flex justify-center items-center">
        <Card className="max-w-md w-full p-8 text-center bg-white border-border shadow-sm">
          <ShieldAlert className="h-12 w-12 text-danger mx-auto mb-3" />
          <h2 className="text-xl font-bold text-navy">Authority Access Restricted</h2>
          <p className="text-xs text-text-secondary mt-2 mb-6 leading-relaxed">
            {error}
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/authority/apply">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Apply for Institutional Authorization
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="primary" size="sm" className="w-full bg-navy text-xs">
                Go to Citizen Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const assignedCount = reports.filter((r) => r.status === 'ASSIGNED').length
  const inProgressCount = reports.filter((r) => r.status === 'IN_PROGRESS').length
  const resolutionClaimedCount = reports.filter((r) => r.status === 'RESOLUTION_CLAIMED').length
  const criticalCount = reports.filter((r) => r.severity === 'CRITICAL').length

  const filteredReports = reports.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return r.title.toLowerCase().includes(q) || r.publicId.toLowerCase().includes(q) || r.address.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-page-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Officer & Department Header Banner */}
        <div className="bg-white border-b-4 border-navy border border-border rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-civic-blue" />
                <h1 className="text-2xl font-bold text-navy">
                  {departmentInfo?.name || 'Municipal Works Department'}
                </h1>
                <Badge variant="default" className="text-xs bg-green-100 text-success">
                  Active Jurisdiction
                </Badge>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Authorized Officer:{' '}
                <strong className="text-text-primary">
                  {user?.authorityProfile?.displayName || user?.email}
                </strong>{' '}
                &bull; Designation:{' '}
                <span className="font-semibold">{user?.authorityProfile?.designation || 'Executive Engineer'}</span>{' '}
                &bull; Jurisdiction: {departmentInfo?.city || 'Demo City'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-text-secondary block">Assigned Caseload:</span>
              <strong className="text-xl font-mono text-navy font-bold">{total} Cases</strong>
            </div>
          </div>
        </div>

        {/* Department KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">New Assignments</div>
            <div className="text-2xl font-bold text-navy mt-1">{assignedCount}</div>
            <div className="text-[11px] text-text-secondary mt-1">Awaiting field inspection</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Active Repairs</div>
            <div className="text-2xl font-bold text-warning mt-1">{inProgressCount}</div>
            <div className="text-[11px] text-text-secondary mt-1">Under active remediation</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Awaiting Citizen Audit</div>
            <div className="text-2xl font-bold text-civic-blue mt-1">{resolutionClaimedCount}</div>
            <div className="text-[11px] text-text-secondary mt-1">Resolution evidence uploaded</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Critical Safety Risk</div>
            <div className="text-2xl font-bold text-danger mt-1">{criticalCount}</div>
            <div className="text-[11px] text-danger font-semibold mt-1">Immediate priority cases</div>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-border p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                type="text"
                placeholder="Search by ID, keyword, street..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs"
              >
                <option value="">All Department Statuses</option>
                <option value="ASSIGNED">Assigned (Awaiting Inspection)</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLUTION_CLAIMED">Resolution Claimed</option>
                <option value="VERIFIED_RESOLVED">Verified Resolved</option>
                <option value="DISPUTED">Disputed by Citizen</option>
              </Select>
            </div>
            <div>
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs"
              >
                <option value="">All Severity Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Caseload Table */}
        <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-page-bg border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-navy text-sm">
              Jurisdiction Grievance Docket ({filteredReports.length})
            </h3>
            <span className="text-xs text-text-secondary">
              Strict RBAC: Actions logged to public immutable audit record
            </span>
          </div>

          {filteredReports.length === 0 ? (
            <div className="p-12 text-center text-xs text-text-secondary">
              No active reports assigned to your department matching the filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-xs">
                <thead className="bg-page-bg text-text-secondary font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Public ID</th>
                    <th className="px-4 py-3">Incident & Category</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Current Status</th>
                    <th className="px-4 py-3 text-right">Officer Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white text-text-primary">
                  {filteredReports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-page-bg/60">
                      <td className="px-4 py-3 font-mono font-bold text-navy">
                        <Link to={`/reports/${rep.publicId}`} className="hover:underline">
                          {rep.publicId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-bold text-text-primary line-clamp-1">{rep.title}</div>
                        <span className="text-[11px] text-text-secondary capitalize">
                          {rep.category.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                        {rep.address}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            rep.severity === 'CRITICAL'
                              ? 'bg-red-100 text-danger'
                              : rep.severity === 'HIGH'
                              ? 'bg-orange-100 text-warning'
                              : 'bg-gray-100 text-text-secondary'
                          }`}
                        >
                          {rep.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={rep.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                        {/* Status Update Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStatusModalReport(rep)
                            setNewStatus('IN_PROGRESS')
                            setStatusReason('')
                          }}
                          className="text-[11px] py-1 px-2.5 h-auto"
                        >
                          Update Status
                        </Button>

                        {/* Evidence Upload Button */}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setEvidenceModalReport(rep)
                            setAfterPhotoUrl('')
                            setBeforePhotoUrl('')
                            setRepairNotes('')
                          }}
                          className="text-[11px] py-1 px-2.5 h-auto bg-navy hover:bg-navy-700"
                        >
                          Upload Evidence
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: STATUS UPDATE */}
        {statusModalReport && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <h3 className="font-bold text-navy text-sm">
                  Update Caseload Status: {statusModalReport.publicId}
                </h3>
                <button
                  type="button"
                  onClick={() => setStatusModalReport(null)}
                  className="text-text-secondary hover:text-navy"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Permitted Target Status
                  </label>
                  <Select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                    className="text-xs"
                  >
                    <option value="UNDER_REVIEW">Under Review / Inspection Scheduled</option>
                    <option value="ASSIGNED">Assigned to Field Crew</option>
                    <option value="IN_PROGRESS">In Progress (Remediation Underway)</option>
                    <option value="REJECTED">Rejected (Out of Municipal Scope / Invalid)</option>
                  </Select>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Official Remediation Reason / Inspection Log *
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Provide mandatory reason for official audit log (e.g. 'Field team dispatched under JE Sharma')..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="text-xs"
                    required
                  />
                  <p className="text-[10px] text-text-secondary mt-1">
                    This reason is permanently preserved in the public transparency timeline.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusModalReport(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={updatingStatus || !statusReason.trim()}
                    className="bg-navy hover:bg-navy-700"
                  >
                    {updatingStatus ? 'Recording...' : 'Record Status Transition'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: RESOLUTION EVIDENCE UPLOAD */}
        {evidenceModalReport && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 text-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-civic-blue" />
                  <h3 className="font-bold text-navy text-sm">
                    Submit Resolution Repair Evidence: {evidenceModalReport.publicId}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEvidenceModalReport(null)}
                  className="text-text-secondary hover:text-navy"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEvidenceSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    After-Repair Photograph URL *
                  </label>
                  <Input
                    type="url"
                    placeholder="https://... or /uploads/... (Mandatory photographic proof)"
                    value={afterPhotoUrl}
                    onChange={(e) => setAfterPhotoUrl(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Before-Repair Photograph URL (Optional)
                  </label>
                  <Input
                    type="url"
                    placeholder="Optional reference to pre-repair site inspection photo..."
                    value={beforePhotoUrl}
                    onChange={(e) => setBeforePhotoUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Remediation Notes & Work Order Details *
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Detail the materials used, contractor/crew name, date of physical completion..."
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-text-secondary">
                  <strong>Notice:</strong> Submitting evidence shifts status to <strong>Resolution Claimed</strong> and automatically dispatches an audit prompt to eligible citizens in the area to inspect and verify.
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEvidenceModalReport(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submittingEvidence || !afterPhotoUrl.trim() || !repairNotes.trim()}
                    className="bg-navy hover:bg-navy-700"
                  >
                    {submittingEvidence ? 'Uploading...' : 'Claim Resolution & Notify Citizens'}
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
