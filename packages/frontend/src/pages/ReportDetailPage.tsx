import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MapPin,
  Calendar,
  ThumbsUp,
  Bookmark,
  Share2,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  ShieldCheck,
  Send,
  ArrowLeft,
  Camera,
  ExternalLink,
} from 'lucide-react'
import { StatusBadge } from '../components/reports/StatusBadge'
import { CategoryIcon } from '../components/reports/CategoryIcon'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { Report } from '../types'

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuth()

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Interaction states
  const [supported, setSupported] = useState<boolean>(false)
  const [supportCount, setSupportCount] = useState<number>(0)
  const [following, setFollowing] = useState<boolean>(false)
  const [supportLoading, setSupportLoading] = useState<boolean>(false)

  // Comment state
  const [commentText, setCommentText] = useState<string>('')
  const [submittingComment, setSubmittingComment] = useState<boolean>(false)

  // Verification response state (for RESOLUTION_CLAIMED)
  const [verifying, setVerifying] = useState<boolean>(false)
  const [verifyComment, setVerifyComment] = useState<string>('')
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null)

  // Reopen modal/state
  const [reopenReason, setReopenReason] = useState<string>('')
  const [reopening, setReopening] = useState<boolean>(false)
  const [reopenSuccess, setReopenSuccess] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/reports/${id}`)
      if (res.data.success) {
        const rep = res.data.data.report || res.data.data
        setReport(rep)
        setSupportCount(rep._count?.support || rep.support?.length || 0)
        if (user && rep.support) {
          setSupported(rep.support.some((s: { userId: string }) => s.userId === user.id))
        }
        if (user && rep.followers) {
          setFollowing(rep.followers.some((f: { userId: string }) => f.userId === user.id))
        }
      } else {
        setError(res.data.error?.message || 'Report not found')
      }
    } catch (err) {
      console.error('Failed to load report:', err)
      setError('Unable to load report details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchReport()
  }, [id])

  const handleToggleSupport = async () => {
    if (!isAuthenticated) {
      alert('Please log in as a citizen to support this report.')
      return
    }
    if (!report) return

    setSupportLoading(true)
    try {
      const res = await api.post(`/reports/${report.id}/support`)
      if (res.data.success) {
        const isNowSupported = res.data.data.supported
        setSupported(isNowSupported)
        setSupportCount((prev) => (isNowSupported ? prev + 1 : Math.max(0, prev - 1)))
      }
    } catch (err) {
      console.error('Failed to toggle support:', err)
    } finally {
      setSupportLoading(false)
    }
  }

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      alert('Please log in to follow status updates on this issue.')
      return
    }
    if (!report) return

    try {
      const res = await api.post(`/reports/${report.id}/follow`)
      if (res.data.success) {
        setFollowing(res.data.data.following)
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !report) return

    setSubmittingComment(true)
    try {
      const res = await api.post(`/reports/${report.id}/comments`, {
        content: commentText.trim(),
      })
      if (res.data.success) {
        setCommentText('')
        fetchReport() // Refresh comments list
      }
    } catch (err) {
      console.error('Failed to post comment:', err)
      alert('Failed to submit comment. Minimum 5 characters required.')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Citizen confirms or disputes authority resolution claim
  const handleVerificationResponse = async (isFixed: boolean) => {
    if (!isAuthenticated) {
      alert('Please log in to submit a resolution verification audit.')
      return
    }
    if (!report) return

    setVerifying(true)
    setVerifySuccess(null)
    try {
      const res = await api.post(`/reports/${report.id}/verify`, {
        isFixed,
        comment: verifyComment.trim(),
      })
      if (res.data.success) {
        setVerifySuccess(
          isFixed
            ? 'Thank you. Your confirmation has been recorded.'
            : 'Dispute recorded. Case flagged for supervisor review.'
        )
        fetchReport()
      }
    } catch (err) {
      console.error('Verification submission failed:', err)
      alert('Could not submit verification response.')
    } finally {
      setVerifying(false)
    }
  }

  // Citizen requests reopening if defect reoccurs
  const handleRequestReopen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reopenReason.trim() || !report) return

    setReopening(true)
    setReopenSuccess(null)
    try {
      const res = await api.post(`/reports/${report.id}/reopen`, {
        reason: reopenReason.trim(),
      })
      if (res.data.success) {
        setReopenSuccess('Reopening request processed. Report status reverted to REOPENED.')
        fetchReport()
      }
    } catch (err) {
      console.error('Reopening failed:', err)
      alert('Only the original reporter can request reopening.')
    } finally {
      setReopening(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page-bg py-20 flex justify-center items-center">
        <LoadingSpinner message="Retrieving certified grievance audit record..." />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-page-bg py-16 px-4 flex justify-center items-center">
        <Card className="max-w-md w-full p-8 text-center bg-white border-border shadow-sm">
          <AlertTriangle className="h-12 w-12 text-danger mx-auto mb-3" />
          <h2 className="text-xl font-bold text-navy">Record Not Found</h2>
          <p className="text-xs text-text-secondary mt-1 mb-6">
            {error || 'The requested public report ID does not exist in the register.'}
          </p>
          <Link to="/issues">
            <Button variant="outline" size="sm">
              &larr; Back to Public Issues Explorer
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const isReporter = user?.id === report.reporterId
  const isResolutionClaimed = report.status === 'RESOLUTION_CLAIMED'
  const isResolved = report.status === 'VERIFIED_RESOLVED'

  return (
    <div className="min-h-screen bg-page-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center justify-between text-xs text-text-secondary">
          <Link to="/issues" className="hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Public Explorer
          </Link>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-border">
            Public Registry ID: <strong>{report.publicId}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Details & Timeline Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Main Header Card */}
            <Card className="bg-white border-border shadow-sm p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <CategoryIcon category={report.category} className="h-4 w-4" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {report.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      report.severity === 'CRITICAL'
                        ? 'bg-red-100 text-danger'
                        : report.severity === 'HIGH'
                        ? 'bg-orange-100 text-warning'
                        : 'bg-gray-100 text-text-secondary'
                    }`}
                  >
                    Severity: {report.severity}
                  </span>
                  <StatusBadge status={report.status} />
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-navy leading-snug">
                {report.title}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-text-secondary mt-3 pb-4 border-b border-border">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-civic-blue" />
                  {report.address} {report.landmark && `(Near ${report.landmark})`}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                  Reported on {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Description Body */}
              <div className="mt-4">
                <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-1">
                  Official Citizen Description
                </h3>
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {report.description}
                </p>
              </div>

              {/* Attachments / Photos Gallery */}
              {report.attachments && report.attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border">
                  <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-civic-blue" />
                    Submitted Photographic Evidence ({report.attachments.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {report.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative rounded-md overflow-hidden border border-border bg-page-bg block aspect-video hover:opacity-95"
                      >
                        <img
                          src={att.url}
                          alt="Evidence Attachment"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                          View Full Size &rsaquo;
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Community Actions Row */}
              <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant={supported ? 'primary' : 'outline'}
                    size="sm"
                    onClick={handleToggleSupport}
                    disabled={supportLoading}
                    className={`text-xs gap-1.5 ${
                      supported ? 'bg-navy text-white hover:bg-navy-700' : 'text-text-primary'
                    }`}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${supported ? 'fill-current' : ''}`} />
                    {supported ? 'Supported' : 'Support Issue'} ({supportCount})
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleFollow}
                    className="text-xs gap-1.5"
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${following ? 'fill-current text-civic-blue' : ''}`} />
                    {following ? 'Following Updates' : 'Follow'}
                  </Button>
                </div>

                <div className="text-xs text-text-secondary">
                  Reported by: <span className="font-semibold text-text-primary">Verified Citizen</span> (Protected ID)
                </div>
              </div>
            </Card>

            {/* RESOLUTION VERIFICATION PANEL (For RESOLUTION_CLAIMED status) */}
            {isResolutionClaimed && (
              <Card className="bg-blue-50/60 border-2 border-civic-blue shadow-sm p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-6 w-6 text-civic-blue flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-navy text-base">
                      Authority Resolution Verification Pending
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      The responsible department has claimed that this issue was repaired. As part of CivicFix's transparency model, a case only becomes <strong>Verified Resolved</strong> after confirmation by local citizens.
                    </p>
                  </div>
                </div>

                {verifySuccess ? (
                  <div className="mt-4 p-3 bg-green-100 text-success text-xs font-semibold rounded">
                    {verifySuccess}
                  </div>
                ) : (
                  <div className="mt-5 space-y-3 pt-3 border-t border-blue-200">
                    <label className="block text-xs font-semibold text-text-secondary">
                      Have you inspected this location? Please verify:
                    </label>
                    <Input
                      type="text"
                      placeholder="Optional inspection remarks (e.g. 'Pothole properly filled with asphalt')..."
                      value={verifyComment}
                      onChange={(e) => setVerifyComment(e.target.value)}
                      className="text-xs bg-white"
                    />
                    <div className="flex gap-3 pt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleVerificationResponse(true)}
                        disabled={verifying}
                        className="bg-success hover:bg-green-700 text-xs gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Fixed (Satisfactory)
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleVerificationResponse(false)}
                        disabled={verifying}
                        className="text-xs gap-1.5"
                      >
                        <XCircle className="h-4 w-4" />
                        Dispute (Defect Still Exists)
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* REOPEN REQUEST PANEL (If citizen wishes to dispute resolution or report recurrence) */}
            {(isResolved || report.status === 'DISPUTED') && (
              <Card className="bg-white border-border shadow-sm p-6">
                <h3 className="font-bold text-navy text-sm mb-1 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Has the Problem Reoccurred? Request Reopening
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  If the repair deteriorated or the defect re-emerged, the original reporter can reopen this grievance for re-inspection.
                </p>

                {reopenSuccess ? (
                  <div className="p-3 bg-green-50 text-success text-xs font-semibold rounded">
                    {reopenSuccess}
                  </div>
                ) : (
                  <form onSubmit={handleRequestReopen} className="space-y-3">
                    <Textarea
                      rows={2}
                      placeholder="Explain why reopening is required (e.g. 'Road sank again after rains')..."
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="text-xs"
                      required
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={reopening || !reopenReason.trim()}
                      className="text-xs text-warning border-warning hover:bg-amber-50"
                    >
                      {reopening ? 'Processing Reopening...' : 'Submit Reopening Request'}
                    </Button>
                  </form>
                )}
              </Card>
            )}

            {/* Complete Status Audit Trail / Timeline */}
            <Card className="bg-white border-border shadow-sm p-6">
              <h3 className="font-bold text-navy text-base mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-civic-blue" />
                Traceable Status Timeline & Action Log
              </h3>

              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {report.statusHistory && report.statusHistory.length > 0 ? (
                  report.statusHistory.map((hist, index) => (
                    <div key={hist.id || index} className="relative">
                      {/* Timeline circle icon */}
                      <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-navy"></span>
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={hist.newStatus} />
                          <span className="text-[11px] text-text-secondary">
                            {new Date(hist.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {hist.reason && (
                          <p className="text-xs text-text-primary mt-1 font-medium bg-page-bg p-2 rounded border border-border">
                            {hist.reason}
                          </p>
                        )}
                        {hist.evidenceUrl && (
                          <div className="mt-2">
                            <span className="text-[10px] text-text-secondary block mb-1">
                              Repair Evidence Uploaded:
                            </span>
                            <img
                              src={hist.evidenceUrl}
                              alt="Repair Evidence"
                              className="h-20 w-auto rounded border border-border"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-text-secondary">
                    Initial status: <strong>REPORTED</strong> on {new Date(report.createdAt).toLocaleDateString()}.
                  </div>
                )}
              </div>
            </Card>

            {/* Citizen Comments & Moderation Section */}
            <Card className="bg-white border-border shadow-sm p-6">
              <h3 className="font-bold text-navy text-base mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-civic-blue" />
                Community & Authority Comments ({report.comments?.length || 0})
              </h3>

              {/* Add Comment Form */}
              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="mb-6 space-y-2">
                  <Textarea
                    rows={3}
                    placeholder="Provide additional factual evidence or comment on this civic issue..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="text-xs"
                    required
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={submittingComment || commentText.trim().length < 5}
                      className="bg-navy hover:bg-navy-700 text-xs gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-page-bg rounded border border-border text-xs text-text-secondary mb-6 text-center">
                  <Link to="/login" className="text-civic-blue font-semibold hover:underline">
                    Log in
                  </Link>{' '}
                  to participate in public problem discussion and resolution verification.
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4 divide-y divide-border">
                {report.comments && report.comments.length > 0 ? (
                  report.comments.map((comm) => (
                    <div key={comm.id} className="pt-3 first:pt-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-navy">
                          {comm.author?.authorityProfile?.displayName ||
                            comm.author?.citizenProfile?.displayName ||
                            'Verified Citizen'}
                          {comm.author?.authorityProfile && (
                            <span className="ml-1.5 text-[10px] bg-blue-100 text-civic-blue font-bold px-1.5 py-0.5 rounded">
                              Official Response
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          {new Date(comm.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                        {comm.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-secondary py-3 text-center">
                    No comments yet. Verified citizens and officers may add remarks above.
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Right Sidebar: Assigned Department & Civic Details */}
          <div className="lg:col-span-4 space-y-6">
            {/* Responsible Authority Info Box */}
            <Card className="bg-white border-border shadow-sm p-5">
              <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-civic-blue" />
                Assigned Responsible Authority
              </h3>

              {report.assignedDept || report.suggestedDept ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <h4 className="font-bold text-navy text-sm">
                      {report.assignedDept?.name || report.suggestedDept?.name}
                    </h4>
                    <span className="text-text-secondary block mt-0.5">
                      Type: <strong className="text-text-primary">{report.assignedDept?.type || report.suggestedDept?.type}</strong> &bull; {report.city}
                    </span>
                  </div>

                  <div className="p-2.5 bg-page-bg rounded border border-border space-y-1">
                    <div className="text-text-secondary">
                      Jurisdiction: <span className="font-semibold text-text-primary">{report.city}, {report.state}</span>
                    </div>
                    {(report.assignedDept?.contactPhone || report.suggestedDept?.contactPhone) && (
                      <div className="text-text-secondary">
                        Contact: <span className="text-text-primary font-medium">{report.assignedDept?.contactPhone || report.suggestedDept?.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {(report.assignedDept?.websiteUrl || report.suggestedDept?.websiteUrl) && (
                    <div className="pt-2 border-t border-border">
                      <a
                        href={report.assignedDept?.websiteUrl || report.suggestedDept?.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-civic-blue hover:underline font-semibold flex items-center gap-1 text-xs"
                      >
                        Official Municipal Portal
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-text-secondary">
                  Routed to General Municipal Grievance Cell for inspection.
                </div>
              )}
            </Card>

            {/* Incident Specifications */}
            <Card className="bg-white border-border shadow-sm p-5">
              <h3 className="font-bold text-navy text-sm mb-3">Grievance Specifications</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-secondary">Report ID:</span>
                  <span className="font-mono font-bold text-navy">{report.publicId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-secondary">Category:</span>
                  <span className="font-semibold text-text-primary capitalize">{report.category.toLowerCase().replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-secondary">Severity:</span>
                  <span className="font-bold text-text-primary">{report.severity}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-secondary">Coordinates:</span>
                  <span className="font-mono text-text-secondary">
                    {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-text-secondary">Supporters:</span>
                  <span className="font-semibold text-text-primary">{supportCount} verified citizens</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-secondary">Data Source:</span>
                  <span className="text-text-secondary">
                    {report.isDemoData ? 'Synthetic Sample' : 'Live Community Report'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Institutional Disclaimer */}
            <div className="p-3 bg-gray-100 border border-gray-200 rounded text-[11px] text-text-secondary">
              CivicFix is an independent public-interest technology platform. Status updates are audited via traceable timestamps and citizen verification responses.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
