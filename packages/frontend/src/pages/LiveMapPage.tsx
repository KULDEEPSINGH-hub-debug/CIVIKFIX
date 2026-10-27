import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin,
  List,
  Filter,
  Layers,
  Info,
  Navigation,
  ExternalLink,
  ThumbsUp,
  AlertTriangle,
} from 'lucide-react'
import { StatusBadge } from '../components/reports/StatusBadge'
import { CategoryIcon } from '../components/reports/CategoryIcon'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/Spinner'
import api from '../lib/api'
import type { Report, IssueCategory, ReportStatus, Severity } from '../types'

// Fix default leaflet marker icon issue in Vite
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom SVG Pin creator with distinct status color for WCAG accessibility
function createCustomIcon(status: string) {
  let color = '#2463A6' // blue default
  if (status === 'IN_PROGRESS') color = '#986000' // orange
  else if (status === 'RESOLUTION_CLAIMED') color = '#0284C7' // teal/cyan
  else if (status === 'VERIFIED_RESOLVED') color = '#197447' // green
  else if (status === 'DISPUTED') color = '#B42318' // red
  else if (status === 'REOPENED') color = '#D97706' // amber
  else if (status === 'ASSIGNED') color = '#7C3AED' // purple

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="12" cy="12" r="4.5" fill="#FFFFFF"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'custom-map-pin',
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -38],
  })
}

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export default function LiveMapPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [category, setCategory] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [severity, setSeverity] = useState<string>('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([26.9124, 75.7873]) // Demo City / Jaipur center
  const [locating, setLocating] = useState<boolean>(false)

  const fetchMapReports = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { limit: 100 }
      if (category) params.category = category
      if (status) params.status = status
      if (severity) params.severity = severity

      const res = await api.get('/reports', { params })
      if (res.data.success) {
        setReports(res.data.data.items || res.data.data.reports || [])
      }
    } catch (err) {
      console.error('Failed to load map reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMapReports()
  }, [category, status, severity])

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude])
        setLocating(false)
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err.message)
        alert('Could not detect location. Using default map center.')
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-page-bg">
      {/* Top Banner & Control Bar */}
      <div className="bg-white border-b border-border shadow-sm px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-civic-blue" />
              <h1 className="text-xl font-bold text-navy">Interactive Civic Issue Map</h1>
              <span className="text-xs bg-blue-100 text-civic-blue font-semibold px-2 py-0.5 rounded-full">
                {reports.length} Incidents
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Geographic distribution of reported infrastructure issues and their current resolution status.
            </p>
          </div>

          {/* Action and view toggle buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="gap-1.5 text-xs"
            >
              <Navigation className={`h-3.5 w-3.5 ${locating ? 'animate-spin' : ''}`} />
              {locating ? 'Detecting...' : 'Center Near Me'}
            </Button>

            {/* WCAG Accessible List Alternative Toggle */}
            <div className="inline-flex rounded-md shadow-sm border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
                  viewMode === 'map'
                    ? 'bg-navy text-white'
                    : 'bg-white text-text-secondary hover:bg-page-bg'
                }`}
                aria-pressed={viewMode === 'map'}
              >
                <Layers className="h-3.5 w-3.5" />
                Map View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-navy text-white'
                    : 'bg-white text-text-secondary hover:bg-page-bg'
                }`}
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-3.5 w-3.5" />
                Accessible List
              </button>
            </div>

            <Link to="/report">
              <Button variant="primary" size="sm" className="bg-navy hover:bg-navy-700 text-xs">
                + Report Issue
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Row */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs py-1"
          >
            <option value="">All Problem Categories</option>
            <option value="ROAD_DAMAGE">Potholes & Roads</option>
            <option value="STREETLIGHT">Streetlights</option>
            <option value="GARBAGE">Garbage & Sanitation</option>
            <option value="WATER_LEAKAGE">Water Leakage</option>
            <option value="DRAINAGE">Drainage & Sewage</option>
            <option value="TRAFFIC_SIGNAL">Traffic Signals</option>
            <option value="PUBLIC_INFRASTRUCTURE">Public Infrastructure</option>
          </Select>

          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs py-1"
          >
            <option value="">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ASSIGNED">Assigned to Authority</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLUTION_CLAIMED">Resolution Claimed</option>
            <option value="VERIFIED_RESOLVED">Verified Resolved</option>
            <option value="DISPUTED">Disputed</option>
          </Select>

          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-xs py-1"
          >
            <option value="">All Severity Levels</option>
            <option value="CRITICAL">Critical Public Risk</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </Select>
        </div>
      </div>

      {/* Main Map Content Area */}
      <div className="flex-1 relative flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-page-bg">
            <LoadingSpinner message="Plotting verified coordinates on map..." />
          </div>
        ) : viewMode === 'map' ? (
          <div className="flex-1 relative min-h-[500px]">
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom={true}
              className="w-full h-full min-h-[550px] z-0"
            >
              <MapCenterController center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {reports.map((report) => (
                <Marker
                  key={report.id}
                  position={[report.latitude, report.longitude]}
                  icon={createCustomIcon(report.status)}
                >
                  <Popup className="civicfix-popup">
                    <div className="p-1 max-w-xs text-xs">
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[10px] text-text-secondary bg-gray-100 px-1 py-0.5 rounded">
                          {report.publicId}
                        </span>
                        <StatusBadge status={report.status} />
                      </div>
                      <h4 className="font-bold text-navy text-sm mb-1 leading-snug line-clamp-2">
                        {report.title}
                      </h4>
                      <p className="text-text-secondary text-xs line-clamp-2 mb-2">
                        {report.description}
                      </p>
                      <div className="text-[11px] text-text-secondary mb-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-civic-blue flex-shrink-0" />
                        <span className="truncate">{report.address}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-[10px] text-text-secondary flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3 text-text-secondary" />
                          {report._count?.support || 0} supporters
                        </span>
                        <Link
                          to={`/reports/${report.publicId}`}
                          className="text-civic-blue font-semibold hover:underline flex items-center gap-0.5 text-xs"
                        >
                          Details &rsaquo;
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur border border-border shadow-md rounded-md p-2.5 z-10 text-xs hidden sm:block max-w-xs">
              <div className="font-semibold text-text-primary text-[11px] mb-1.5 uppercase tracking-wide">
                Status Legend
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span>Reported</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-600"></span>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                  <span>Resolution Claimed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
                  <span>Verified Resolved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                  <span>Disputed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <span>Assigned</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Accessible List Alternative for Screen Readers & Non-Map Users */
          <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
            <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-navy text-sm">
                    Accessible Tabular List of Mapped Incidents
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    WCAG 2.2 AA compliant table listing all {reports.length} issues currently matching selected filters.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-left text-xs">
                  <thead className="bg-page-bg text-text-secondary font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Report ID</th>
                      <th className="px-4 py-3">Title & Category</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white text-text-primary">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-navy whitespace-nowrap">
                          {r.publicId}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-semibold text-text-primary line-clamp-1">{r.title}</div>
                          <div className="text-[11px] text-text-secondary capitalize">
                            {r.category.toLowerCase().replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                          {r.address}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.severity === 'CRITICAL'
                                ? 'bg-red-100 text-danger'
                                : r.severity === 'HIGH'
                                ? 'bg-orange-100 text-warning'
                                : 'bg-gray-100 text-text-secondary'
                            }`}
                          >
                            {r.severity}
                          </span>
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
                            View &rsaquo;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
