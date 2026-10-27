import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Compass,
  ArrowRight,
  Info,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/Spinner'
import api from '../lib/api'

interface AuthorityMatch {
  confidence: 'HIGH' | 'MODERATE' | 'LOW'
  confidenceExplanation: string
  primaryAuthority: {
    id: string
    name: string
    type: string
    city: string
    state: string
    websiteUrl?: string
    contactEmail?: string
    contactPhone?: string
    portalUrl?: string
    lastVerifiedAt?: string
  } | null
  alternativeAuthorities: {
    id: string
    name: string
    city: string
    portalUrl?: string
  }[]
  disclaimer: string
}

interface DepartmentDirectoryItem {
  id: string
  name: string
  type: string
  city: string
  state: string
  categories: string
  websiteUrl?: string
  contactEmail?: string
  contactPhone?: string
  directoryInfo?: {
    officialPortalUrl?: string
    dataSource: string
    lastVerifiedAt?: string
  }
}

export default function AuthorityFinderPage() {
  const [activeTab, setActiveTab] = useState<'finder' | 'directory'>('finder')
  const [category, setCategory] = useState<string>('ROAD_DAMAGE')
  const [city, setCity] = useState<string>('Demo City')
  const [searching, setSearching] = useState<boolean>(false)
  const [matchResult, setMatchResult] = useState<AuthorityMatch | null>(null)

  // Directory state
  const [departments, setDepartments] = useState<DepartmentDirectoryItem[]>([])
  const [dirSearch, setDirSearch] = useState<string>('')
  const [dirLoading, setDirLoading] = useState<boolean>(false)

  const handleFindAuthority = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSearching(true)
    try {
      const res = await api.get('/authority/find', {
        params: { category, city },
      })
      if (res.data.success) {
        setMatchResult(res.data.data)
      }
    } catch (err) {
      console.error('Failed to find authority:', err)
    } finally {
      setSearching(false)
    }
  }

  const fetchDirectory = async () => {
    setDirLoading(true)
    try {
      const res = await api.get('/authority/directory')
      if (res.data.success) {
        setDepartments(res.data.data.departments || [])
      }
    } catch (err) {
      console.error('Failed to fetch directory:', err)
    } finally {
      setDirLoading(false)
    }
  }

  useEffect(() => {
    handleFindAuthority()
    fetchDirectory()
  }, [])

  const filteredDirectory = departments.filter((d) => {
    if (!dirSearch.trim()) return true
    const q = dirSearch.toLowerCase()
    return (
      d.name.toLowerCase().includes(q) ||
      d.city.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q) ||
      d.categories.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-page-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumb */}
        <div className="pb-6 border-b border-border">
          <div className="text-xs text-text-secondary mb-1">
            <Link to="/" className="hover:underline">Home</Link> &rsaquo; <span>Smart Authority Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy flex items-center gap-2.5">
            <Compass className="h-7 w-7 text-civic-blue" />
            Smart Civic Authority Discovery Engine
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Determine which municipal department, state board, or public works agency is responsible for resolving your civic issue based on verified jurisdiction rules.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border my-6">
          <button
            type="button"
            onClick={() => setActiveTab('finder')}
            className={`py-2.5 px-5 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'finder'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            Routing Discovery Wizard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`py-2.5 px-5 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'directory'
                ? 'border-navy text-navy bg-white'
                : 'border-transparent text-text-secondary hover:text-navy'
            }`}
          >
            Public Department Directory ({departments.length})
          </button>
        </div>

        {activeTab === 'finder' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input Form Column */}
            <div className="lg:col-span-5">
              <Card className="bg-white border-border shadow-sm p-5 sticky top-6">
                <h3 className="font-bold text-navy text-base mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4 text-civic-blue" />
                  Select Problem Parameters
                </h3>

                <form onSubmit={handleFindAuthority} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Problem Category
                    </label>
                    <Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="text-sm"
                    >
                      <option value="ROAD_DAMAGE">Potholes & Road Damage</option>
                      <option value="STREETLIGHT">Broken Streetlights</option>
                      <option value="GARBAGE">Garbage & Waste Collection</option>
                      <option value="WATER_LEAKAGE">Water Pipeline Leakage</option>
                      <option value="DRAINAGE">Open Drainage & Sewage Overflow</option>
                      <option value="TRAFFIC_SIGNAL">Malfunctioning Traffic Signal</option>
                      <option value="PUBLIC_INFRASTRUCTURE">Public Footpath & Parks</option>
                      <option value="OTHER">Other Public Grievances</option>
                    </Select>
                    <p className="text-[11px] text-text-secondary mt-1">
                      Routing logic maps each category to documented municipal department charters.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      City / Municipal Area
                    </label>
                    <Input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Demo City, Jaipur, Pune..."
                      className="text-sm"
                    />
                    <p className="text-[11px] text-text-secondary mt-1">
                      Jurisdiction boundary varies by municipal limits and highway authorities.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={searching}
                    className="w-full bg-navy hover:bg-navy-700 font-semibold text-sm"
                  >
                    {searching ? 'Querying Responsibility Rules...' : 'Identify Responsible Authority'}
                  </Button>
                </form>

                {/* Information Callout */}
                <div className="mt-5 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-text-secondary space-y-1">
                  <div className="font-semibold text-navy flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-civic-blue" />
                    How Routing Works
                  </div>
                  <p>
                    Road ownership may differ: National Highways (NHAI), State Highways (State PWD), and internal colony roads (Municipal Corporation) operate under distinct bodies. CivicFix notes alternative authorities when boundary data is ambiguous.
                  </p>
                </div>
              </Card>
            </div>

            {/* Match Results Column */}
            <div className="lg:col-span-7">
              {searching ? (
                <div className="bg-white border border-border rounded-lg p-12 text-center">
                  <LoadingSpinner message="Evaluating jurisdiction data..." />
                </div>
              ) : matchResult && matchResult.primaryAuthority ? (
                <div className="space-y-6">
                  {/* Primary Suggestion Card */}
                  <Card className="bg-white border-2 border-civic-blue shadow-sm overflow-hidden">
                    <div className="bg-navy text-white px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-200" />
                        <span className="font-bold text-sm tracking-wide uppercase">Primary Responsible Body</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                          matchResult.confidence === 'HIGH'
                            ? 'bg-success text-white'
                            : matchResult.confidence === 'MODERATE'
                            ? 'bg-warning text-white'
                            : 'bg-gray-200 text-text-primary'
                        }`}
                      >
                        {matchResult.confidence} Confidence Match
                      </span>
                    </div>

                    <div className="p-6">
                      <h2 className="text-xl font-bold text-navy">
                        {matchResult.primaryAuthority.name}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mt-1 mb-4">
                        <span className="bg-page-bg px-2 py-0.5 rounded border border-border font-medium">
                          Type: {matchResult.primaryAuthority.type}
                        </span>
                        <span>
                          Jurisdiction: {matchResult.primaryAuthority.city}, {matchResult.primaryAuthority.state}
                        </span>
                      </div>

                      {/* Explanation box */}
                      <div className="bg-page-bg border border-border rounded-md p-3 text-xs text-text-primary mb-5">
                        <strong className="text-navy block mb-0.5">Basis of Identification:</strong>
                        {matchResult.confidenceExplanation}
                      </div>

                      {/* Contact & Verification details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-border pt-4">
                        <div>
                          <span className="text-text-secondary block">Official Website / Portal:</span>
                          {matchResult.primaryAuthority.portalUrl || matchResult.primaryAuthority.websiteUrl ? (
                            <a
                              href={matchResult.primaryAuthority.portalUrl || matchResult.primaryAuthority.websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-civic-blue hover:underline font-semibold flex items-center gap-1 mt-0.5"
                            >
                              Visit Grievance Portal
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-text-secondary">Not provided in seed</span>
                          )}
                        </div>

                        <div>
                          <span className="text-text-secondary block">Contact Number:</span>
                          <span className="font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-text-secondary" />
                            {matchResult.primaryAuthority.contactPhone || 'Public Helpline 1800-DEMO-001'}
                          </span>
                        </div>

                        <div>
                          <span className="text-text-secondary block">Official Support Email:</span>
                          <span className="font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-text-secondary" />
                            {matchResult.primaryAuthority.contactEmail || 'grievance@civicfix.demo'}
                          </span>
                        </div>

                        <div>
                          <span className="text-text-secondary block">Last Directory Verification:</span>
                          <span className="font-medium text-text-primary mt-0.5 block">
                            {matchResult.primaryAuthority.lastVerifiedAt
                              ? new Date(matchResult.primaryAuthority.lastVerifiedAt).toLocaleDateString()
                              : 'Verified Q3 2026 (Demo)'}
                          </span>
                        </div>
                      </div>

                      {/* Next Step Action CTA */}
                      <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-xs text-text-secondary">
                          Ready to submit your complaint with this authority attached?
                        </span>
                        <Link to={`/report?category=${category}&city=${encodeURIComponent(city)}`}>
                          <Button variant="primary" size="sm" className="bg-navy hover:bg-navy-700 gap-1.5">
                            Report Under This Authority
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>

                  {/* Alternative authorities if present */}
                  {matchResult.alternativeAuthorities.length > 0 && (
                    <Card className="bg-white border-border shadow-sm p-5">
                      <h4 className="font-bold text-navy text-sm mb-2 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-warning" />
                        Possible Alternative or Overlapping Bodies
                      </h4>
                      <p className="text-xs text-text-secondary mb-3">
                        Depending on whether the site is on a private society road, defense land, or railway perimeter, responsibility may alternate to:
                      </p>
                      <div className="space-y-2">
                        {matchResult.alternativeAuthorities.map((alt) => (
                          <div
                            key={alt.id}
                            className="p-2.5 bg-page-bg rounded border border-border flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-text-primary">{alt.name}</span>
                            <span className="text-text-secondary">{alt.city}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Mandatory Transparency Notice */}
                  <div className="p-3 bg-gray-100 rounded text-xs text-text-secondary border border-gray-200">
                    <strong className="text-text-primary block mb-0.5">Public Information Integrity Notice:</strong>
                    {matchResult.disclaimer} CivicFix does not claim to officially forward grievances unless confirmed by a real API bridge. Always verify critical safety hazards with local emergency services.
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-border rounded-lg p-12 text-center">
                  <AlertCircle className="h-10 w-10 text-text-secondary mx-auto mb-2 opacity-60" />
                  <h3 className="font-bold text-navy text-base">Select parameters to discover authority</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Choose a problem category and city to see the verified department charter mapping.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Public Department Directory Tab */
          <div>
            <div className="mb-4 max-w-md">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Filter departments by name, city, or type..."
                  value={dirSearch}
                  onChange={(e) => setDirSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
                <Search className="h-4 w-4 text-text-secondary absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {dirLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner message="Loading authority directory..." />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDirectory.map((dept) => (
                  <Card key={dept.id} className="bg-white border-border shadow-sm p-4 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-navy text-sm">{dept.name}</h4>
                        <span className="text-text-secondary block mt-0.5">
                          {dept.city}, {dept.state} &bull; Type: <strong className="text-text-primary">{dept.type}</strong>
                        </span>
                      </div>
                      <Badge variant="default" className="text-[10px] bg-green-100 text-success">
                        Active
                      </Badge>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-text-secondary">
                      <div>
                        <span className="font-semibold text-text-primary">Covered Categories:</span>{' '}
                        {dept.categories.split(',').join(', ')}
                      </div>
                      <div className="flex items-center gap-4 pt-1">
                        {dept.contactPhone && (
                          <span className="flex items-center gap-1 text-text-primary">
                            <Phone className="h-3 w-3 text-text-secondary" /> {dept.contactPhone}
                          </span>
                        )}
                        {dept.contactEmail && (
                          <span className="flex items-center gap-1 text-text-primary">
                            <Mail className="h-3 w-3 text-text-secondary" /> {dept.contactEmail}
                          </span>
                        )}
                      </div>
                    </div>

                    {dept.directoryInfo?.officialPortalUrl && (
                      <div className="mt-3 pt-2 border-t border-border flex justify-end">
                        <a
                          href={dept.directoryInfo.officialPortalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-civic-blue font-semibold hover:underline flex items-center gap-1 text-[11px]"
                        >
                          Official Grievance Portal &rsaquo;
                        </a>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
