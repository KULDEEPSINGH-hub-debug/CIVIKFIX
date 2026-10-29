import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Bookmark,
  Bell,
  User as UserIcon,
  Award,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCheck,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { StatusBadge } from '../components/reports/StatusBadge'
import { CategoryIcon } from '../components/reports/CategoryIcon'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { Report } from '../types'

interface NotificationItem {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
  report?: {
    id: string
    publicId: string
    title: string
  }
}

interface CitizenStats {
  totalReports: number
  allTimeReports?: number
  openIssues: number
  inProgress: number
  resolutionClaimed: number
  verifiedResolved: number
}

export default function CitizenDashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'my-reports' | 'followed' | 'notifications' | 'profile'>('my-reports')
  const [myReports, setMyReports] = useState<Report[]>([])
  const [followedReports, setFollowedReports] = useState<Report[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [stats, setStats] = useState<CitizenStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/dashboard')
    }
  }, [authLoading, isAuthenticated, navigate])

  const fetchDashboardData = async (silent: boolean = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    else setIsRefreshing(true)
    setErrorMessage(null)

    try {
      const [reportsRes, followedRes, notifRes] = await Promise.all([
        api.get('/reports/mine'),
        api.get('/reports/followed'),
        api.get('/notifications'),
      ])

      if (reportsRes.data.success) {
        const items: Report[] = reportsRes.data.data.items || []
        setMyReports(items)
        if (reportsRes.data.data.stats) {
          setStats(reportsRes.data.data.stats)
        }
      }

      if (followedRes.data.success) {
        const items: Report[] = followedRes.data.data.items || []
        setFollowedReports(items)
      }

      if (notifRes.data.success) {
        setNotifications(notifRes.data.data.notifications || [])
        setUnreadCount(notifRes.data.data.unreadCount || 0)
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err)
      setErrorMessage(
        err?.response?.data?.error?.message ||
        'Unable to load your citizen reports from database. Please check connection and retry.'
      )
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchDashboardData()
  }, [isAuthenticated])

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await api.patch(`/notifications/${notifId}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (err) {
      console.error('Mark read failed:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Mark all read failed:', err)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-page-bg py-20 flex justify-center items-center">
        <LoadingSpinner message="Loading your citizen dashboard..." />
      </div>
    )
  }

  const resolvedCount = myReports.filter((r) => r.status === 'VERIFIED_RESOLVED').length
  const inProgressCount = myReports.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED').length
  const openCount = myReports.filter((r) => r.status === 'REPORTED' || r.status === 'UNDER_REVIEW').length

  return (
    <div className="min-h-screen bg-page-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-border rounded-lg shadow-sm p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy">
                Welcome, {user?.citizenProfile?.displayName || user?.email.split('@')[0]}
              </h1>
              <Badge variant="default" className="text-xs bg-blue-100 text-civic-blue">
                Verified Citizen
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Registered ID: <span className="font-mono">{user?.email}</span> &bull; Civic participation score:{' '}
              <strong className="text-navy">{user?.citizenProfile?.totalPoints || 150} Points</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="text-xs font-semibold gap-1.5 border-border hover:bg-gray-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-navy' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Sync Reports'}
            </Button>
            <Link to="/report">
              <Button variant="primary" size="md" className="bg-navy hover:bg-navy-700 text-xs font-semibold gap-2">
                <PlusCircle className="h-4 w-4" />
                Submit New Civic Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Optional Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3 text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchDashboardData()} className="text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* 4 Overview Metric Cards - Derived Directly from Database */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">My Submitted Reports</div>
            <div className="text-2xl font-bold text-navy mt-1">
              {stats ? stats.totalReports : myReports.length}
            </div>
            <div className="text-[11px] text-text-secondary mt-1">Total recorded grievances</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Awaiting Inspection</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {stats ? stats.openIssues : openCount}
            </div>
            <div className="text-[11px] text-text-secondary mt-1">Reported or under review</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Currently In Progress</div>
            <div className="text-2xl font-bold text-warning mt-1">
              {stats ? stats.inProgress : inProgressCount}
            </div>
            <div className="text-[11px] text-text-secondary mt-1">Active repair assignments</div>
          </Card>

          <Card className="bg-white border-border shadow-sm p-4">
            <div className="text-xs text-text-secondary font-medium">Verified Resolved</div>
            <div className="text-2xl font-bold text-success mt-1">
              {stats ? stats.verifiedResolved : resolvedCount}
            </div>
            <div className="text-[11px] text-text-secondary mt-1">Citizen-confirmed fixes</div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('my-reports')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'my-reports'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            <FileText className="h-4 w-4" />
            My Reports ({myReports.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('followed')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'followed'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            Followed Issues ({followedReports.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors relative ${
              activeTab === 'notifications'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            <Bell className="h-4 w-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'profile'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            Profile & Badges
          </button>
        </div>

        {/* Tab 1: My Reports Table */}
        {activeTab === 'my-reports' && (
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            {myReports.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-10 w-10 text-text-secondary mx-auto mb-2 opacity-50" />
                <h3 className="font-bold text-navy text-sm">No Reports Submitted Yet</h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1 mb-4">
                  When you report road damage, streetlights, or waste accumulation, track their full resolution history here.
                </p>
                <Link to="/report">
                  <Button variant="primary" size="sm" className="bg-navy hover:bg-navy-700 text-xs">
                    Report Your First Issue
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-left text-xs">
                  <thead className="bg-page-bg text-text-secondary font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Public ID</th>
                      <th className="px-4 py-3">Title & Category</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reported On</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white text-text-primary">
                    {myReports.map((r) => (
                      <tr key={r.id} className="hover:bg-page-bg/60">
                        <td className="px-4 py-3 font-mono font-medium text-navy">
                          {r.publicId}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-bold text-text-primary line-clamp-1">{r.title}</div>
                          <span className="text-[11px] text-text-secondary capitalize">
                            {r.category.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                          {r.address}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <Link
                            to={`/reports/${r.publicId}`}
                            className="text-civic-blue font-semibold hover:underline"
                          >
                            Track Timeline &rsaquo;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Followed Issues */}
        {activeTab === 'followed' && (
          <div className="bg-white border border-border rounded-lg shadow-sm p-6">
            {followedReports.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-secondary">
                <Bookmark className="h-10 w-10 text-text-secondary mx-auto mb-2 opacity-50" />
                <h3 className="font-bold text-navy text-sm">Not Following Any Issues</h3>
                <p className="mt-1 mb-4">
                  Click the "Follow" button on any public issue in your neighborhood to receive status update notifications.
                </p>
                <Link to="/issues">
                  <Button variant="outline" size="sm" className="text-xs">
                    Browse Public Issues Explorer
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {followedReports.map((fr) => (
                  <div
                    key={fr.id}
                    className="p-3 bg-page-bg border border-border rounded-md flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-text-secondary">{fr.publicId}</span>
                        <StatusBadge status={fr.status} />
                      </div>
                      <h4 className="font-bold text-navy text-sm">{fr.title}</h4>
                      <span className="text-text-secondary">{fr.address}</span>
                    </div>
                    <Link to={`/reports/${fr.publicId}`}>
                      <Button variant="outline" size="sm" className="text-xs flex-shrink-0">
                        View &rsaquo;
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Notifications Center */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-navy text-sm">In-App Notifications Log</h3>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-civic-blue hover:underline font-semibold flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark All as Read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-secondary">
                <Bell className="h-8 w-8 text-text-secondary mx-auto mb-2 opacity-50" />
                No notification alerts received yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border text-xs transition-colors flex items-start justify-between gap-3 ${
                      n.isRead
                        ? 'bg-page-bg/40 border-border'
                        : 'bg-blue-50/60 border-blue-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <strong className="text-navy font-bold">{n.title}</strong>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-civic-blue"></span>
                        )}
                      </div>
                      <p className="text-text-primary leading-relaxed">{n.body}</p>
                      <span className="text-[10px] text-text-secondary block mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-[11px] text-civic-blue hover:underline whitespace-nowrap"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Profile & Gamification Badges */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-border shadow-sm p-6">
              <h3 className="font-bold text-navy text-base mb-4">Citizen Profile Data</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-text-secondary block">Display Name:</span>
                  <span className="font-bold text-text-primary text-sm">
                    {user?.citizenProfile?.displayName || 'Citizen'}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary block">Email Identifier:</span>
                  <span className="font-medium text-text-primary">{user?.email}</span>
                </div>
                <div>
                  <span className="text-text-secondary block">Account Verification:</span>
                  <span className="text-success font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Email Verified
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary block">Member Since:</span>
                  <span className="text-text-primary">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'October 2026'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="bg-white border-border shadow-sm p-6">
              <h3 className="font-bold text-navy text-base mb-2 flex items-center gap-2">
                <Award className="h-5 w-5 text-warning" />
                Civic Achievement Badges
              </h3>
              <p className="text-xs text-text-secondary mb-4">
                CivicFix awards non-monetary participation badges to recognize active citizens who report authentic civic issues and confirm repairs.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-page-bg rounded border border-border text-center">
                  <div className="text-xl mb-1">🚩</div>
                  <strong className="block text-navy font-bold text-xs">First Report</strong>
                  <span className="text-[10px] text-success font-semibold">Earned</span>
                </div>

                <div className="p-3 bg-page-bg rounded border border-border text-center">
                  <div className="text-xl mb-1">🤝</div>
                  <strong className="block text-navy font-bold text-xs">Community Helper</strong>
                  <span className="text-[10px] text-success font-semibold">Earned</span>
                </div>

                <div className="p-3 bg-page-bg rounded border border-border text-center opacity-70">
                  <div className="text-xl mb-1">🛠️</div>
                  <strong className="block text-navy font-bold text-xs">Problem Solver</strong>
                  <span className="text-[10px] text-text-secondary">In Progress</span>
                </div>

                <div className="p-3 bg-page-bg rounded border border-border text-center opacity-70">
                  <div className="text-xl mb-1">🛡️</div>
                  <strong className="block text-navy font-bold text-xs">Verified Contributor</strong>
                  <span className="text-[10px] text-text-secondary">In Progress</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
