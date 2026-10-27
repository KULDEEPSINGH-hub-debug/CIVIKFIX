import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  Filter,
  SlidersHorizontal,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { ReportCard } from '../components/reports/ReportCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/Spinner'
import api from '../lib/api'
import type { Report, IssueCategory, ReportStatus, Severity } from '../types'

const CATEGORIES: { label: string; value: IssueCategory | '' }[] = [
  { label: 'All Categories', value: '' },
  { label: 'Potholes & Roads', value: 'ROAD_DAMAGE' },
  { label: 'Streetlights', value: 'STREETLIGHT' },
  { label: 'Garbage & Sanitation', value: 'GARBAGE' },
  { label: 'Water Leakage', value: 'WATER_LEAKAGE' },
  { label: 'Drainage & Sewage', value: 'DRAINAGE' },
  { label: 'Traffic Signals', value: 'TRAFFIC_SIGNAL' },
  { label: 'Public Infrastructure', value: 'PUBLIC_INFRASTRUCTURE' },
  { label: 'Other Civic Issues', value: 'OTHER' },
]

const STATUSES: { label: string; value: ReportStatus | '' }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Reported', value: 'REPORTED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolution Claimed', value: 'RESOLUTION_CLAIMED' },
  { label: 'Verified Resolved', value: 'VERIFIED_RESOLVED' },
  { label: 'Disputed', value: 'DISPUTED' },
  { label: 'Reopened', value: 'REOPENED' },
]

const SEVERITIES: { label: string; value: Severity | '' }[] = [
  { label: 'All Severities', value: '' },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical Safety Risk', value: 'CRITICAL' },
]

export default function ExploreIssuesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = (searchParams.get('category') as IssueCategory) || ''

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(initialCategory)
  const [status, setStatus] = useState<string>('')
  const [severity, setSeverity] = useState<string>('')
  const [sort, setSort] = useState<string>('newest')
  const [page, setPage] = useState<number>(1)

  const [reports, setReports] = useState<Report[]>([])
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 12,
        sort,
      }
      if (category) params.category = category
      if (status) params.status = status
      if (severity) params.severity = severity
      if (search.trim()) params.search = search.trim()

      const res = await api.get('/reports', { params })
      if (res.data.success) {
        setReports(res.data.data.items || res.data.data.reports || [])
        setTotal(res.data.data.total || 0)
        setTotalPages(Math.ceil((res.data.data.total || 0) / 12) || 1)
      } else {
        setError(res.data.error?.message || 'Failed to load reports')
      }
    } catch (err: unknown) {
      console.error('Failed to load reports:', err)
      setError('Unable to connect to the CivicFix server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [category, status, severity, sort, page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchReports()
  }

  const handleResetFilters = () => {
    setSearch('')
    setCategory('')
    setStatus('')
    setSeverity('')
    setSort('newest')
    setPage(1)
    setSearchParams({})
  }

  return (
    <div className="min-h-screen bg-page-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <div className="text-xs text-text-secondary mb-1">
              <Link to="/" className="hover:underline">Home</Link> &rsaquo; <span>Public Issues Explorer</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy">
              Public Civic Issues Directory
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Transparent, real-time civic problem reports verified by citizens and municipal authorities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/map">
              <Button variant="outline" size="sm" className="gap-2">
                <MapPin className="h-4 w-4 text-civic-blue" />
                Live Map View
              </Button>
            </Link>
            <Link to="/report">
              <Button variant="primary" size="sm" className="gap-2 bg-navy hover:bg-navy-700">
                <PlusCircle className="h-4 w-4" />
                Report an Issue
              </Button>
            </Link>
          </div>
        </div>

        {/* Demo Data Disclaimer Banner */}
        <div className="my-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-text-secondary flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-civic-blue flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-text-primary">CivicTech Platform Demonstration:</span> Records displayed below include sample and community-submitted complaints. Each report tracks independent authority routing and citizen verification history.
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-lg shadow-sm border border-border p-4 my-6">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search input */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-text-secondary mb-1">Search Keywords</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Keyword, street name, public ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
                <Search className="h-4 w-4 text-text-secondary absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Problem Category</label>
              <Select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setPage(1)
                }}
                className="text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Current Status</label>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Severity Level</label>
              <Select
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value)
                  setPage(1)
                }}
                className="text-sm"
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev.value} value={sev.value}>
                    {sev.label}
                  </option>
                ))}
              </Select>
            </div>
          </form>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-border gap-2 text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <span>Showing {reports.length} of {total} registered issues</span>
              {(category || status || severity || search) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-danger hover:underline ml-2"
                >
                  Clear all filters
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary font-medium">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-border rounded px-2 py-1 text-xs bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="severity">Highest Priority</option>
              </select>
              <button
                type="button"
                onClick={fetchReports}
                className="p-1 rounded border border-border text-text-secondary hover:text-navy hover:bg-page-bg"
                title="Refresh list"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Reports Content Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner message="Loading civic issues..." />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 p-8 rounded-lg text-center max-w-lg mx-auto my-12">
            <ShieldAlert className="h-10 w-10 text-danger mx-auto mb-3" />
            <h3 className="text-lg font-bold text-danger">Data Retrieval Error</h3>
            <p className="text-sm text-text-secondary mt-1 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchReports}>
              Try Again
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-border rounded-lg p-12 text-center my-6">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-navy">No Matching Reports Found</h3>
            <p className="text-sm text-text-secondary max-w-md mx-auto mt-1 mb-6">
              No civic issues match your current filter parameters. Try adjusting your search keywords, category, or status.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Reset Filters
              </Button>
              <Link to="/report">
                <Button variant="primary" size="sm" className="bg-navy hover:bg-navy-700">
                  Submit New Report
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-text-secondary px-3">
                  Page <strong className="text-text-primary">{page}</strong> of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
