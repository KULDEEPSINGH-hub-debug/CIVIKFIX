import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Lightbulb, Trash2, Droplets, Wind, TrafficCone,
  Building2, HelpCircle, ArrowRight, CheckCircle, TrendingUp,
  Users, ChevronDown, ChevronUp, Star, Shield, MapPin,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { ReportCard } from '../components/reports/ReportCard'
import type { PlatformStats, Report, IssueCategory } from '../types'
import { CATEGORY_LABELS } from '../types'
import api from '../lib/api'

// ─── City SVG Illustration ────────────────────────────────────────────────────

function CityIllustration() {
  return (
    <svg
      viewBox="0 0 500 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-lg mx-auto"
      aria-label="City illustration with civic issue pins"
    >
      {/* Sky */}
      <rect width="500" height="400" fill="#E8F1FB" rx="16" />
      {/* Ground */}
      <rect y="300" width="500" height="100" fill="#DCE4ED" rx="0" />
      {/* Roads */}
      <rect x="0" y="290" width="500" height="20" fill="#B8C4D0" />
      <rect x="200" y="0" width="20" height="400" fill="#B8C4D0" />
      {/* Road markings */}
      <rect x="207" y="50" width="6" height="30" fill="white" opacity="0.7" />
      <rect x="207" y="130" width="6" height="30" fill="white" opacity="0.7" />
      <rect x="207" y="210" width="6" height="30" fill="white" opacity="0.7" />
      <rect x="50" y="297" width="30" height="6" fill="white" opacity="0.7" />
      <rect x="130" y="297" width="30" height="6" fill="white" opacity="0.7" />
      <rect x="290" y="297" width="30" height="6" fill="white" opacity="0.7" />
      <rect x="380" y="297" width="30" height="6" fill="white" opacity="0.7" />
      {/* Buildings left */}
      <rect x="20" y="150" width="70" height="145" fill="#163A63" rx="4" />
      <rect x="30" y="165" width="14" height="14" fill="#E8F1FB" opacity="0.7" rx="2" />
      <rect x="52" y="165" width="14" height="14" fill="#E8F1FB" opacity="0.7" rx="2" />
      <rect x="66" y="165" width="14" height="14" fill="white" opacity="0.3" rx="2" />
      <rect x="30" y="195" width="14" height="14" fill="#E8F1FB" opacity="0.7" rx="2" />
      <rect x="52" y="195" width="14" height="14" fill="white" opacity="0.3" rx="2" />
      <rect x="66" y="195" width="14" height="14" fill="#E8F1FB" opacity="0.7" rx="2" />
      <rect x="30" y="225" width="14" height="14" fill="white" opacity="0.3" rx="2" />
      <rect x="52" y="225" width="14" height="14" fill="#E8F1FB" opacity="0.7" rx="2" />
      {/* Tall building left */}
      <rect x="100" y="100" width="85" height="195" fill="#2463A6" rx="4" />
      <rect x="110" y="115" width="12" height="12" fill="white" opacity="0.5" rx="2" />
      <rect x="130" y="115" width="12" height="12" fill="white" opacity="0.8" rx="2" />
      <rect x="150" y="115" width="12" height="12" fill="white" opacity="0.5" rx="2" />
      <rect x="110" y="140" width="12" height="12" fill="white" opacity="0.8" rx="2" />
      <rect x="130" y="140" width="12" height="12" fill="white" opacity="0.5" rx="2" />
      <rect x="150" y="140" width="12" height="12" fill="white" opacity="0.8" rx="2" />
      <rect x="110" y="165" width="12" height="12" fill="white" opacity="0.5" rx="2" />
      <rect x="130" y="165" width="12" height="12" fill="white" opacity="0.8" rx="2" />
      <rect x="150" y="165" width="12" height="12" fill="white" opacity="0.5" rx="2" />
      <rect x="110" y="190" width="12" height="12" fill="white" opacity="0.8" rx="2" />
      <rect x="130" y="190" width="12" height="12" fill="white" opacity="0.5" rx="2" />
      <rect x="150" y="190" width="12" height="12" fill="white" opacity="0.8" rx="2" />
      {/* Buildings right */}
      <rect x="240" y="130" width="90" height="165" fill="#163A63" rx="4" />
      <rect x="250" y="145" width="14" height="14" fill="white" opacity="0.5" rx="2" />
      <rect x="274" y="145" width="14" height="14" fill="white" opacity="0.8" rx="2" />
      <rect x="298" y="145" width="14" height="14" fill="white" opacity="0.5" rx="2" />
      <rect x="250" y="175" width="14" height="14" fill="white" opacity="0.8" rx="2" />
      <rect x="274" y="175" width="14" height="14" fill="white" opacity="0.5" rx="2" />
      <rect x="298" y="175" width="14" height="14" fill="white" opacity="0.8" rx="2" />
      <rect x="350" y="160" width="110" height="135" fill="#2463A6" rx="4" />
      <rect x="365" y="175" width="14" height="14" fill="white" opacity="0.6" rx="2" />
      <rect x="390" y="175" width="14" height="14" fill="white" opacity="0.9" rx="2" />
      <rect x="415" y="175" width="14" height="14" fill="white" opacity="0.6" rx="2" />
      <rect x="365" y="205" width="14" height="14" fill="white" opacity="0.9" rx="2" />
      <rect x="390" y="205" width="14" height="14" fill="white" opacity="0.6" rx="2" />
      <rect x="415" y="205" width="14" height="14" fill="white" opacity="0.9" rx="2" />
      {/* Trees */}
      <ellipse cx="35" cy="300" rx="14" ry="18" fill="#197447" />
      <rect x="32" y="295" width="6" height="12" fill="#6B4226" />
      <ellipse cx="460" cy="300" rx="14" ry="18" fill="#197447" />
      <rect x="457" y="295" width="6" height="12" fill="#6B4226" />
      {/* Location Pins */}
      {/* Pin 1 - red (pothole) */}
      <g transform="translate(140, 260)">
        <circle cx="0" cy="-20" r="14" fill="#B42318" />
        <path d="M0 0 L-7 -14 Q0 -28 7 -14 Z" fill="#B42318" />
        <circle cx="0" cy="-20" r="6" fill="white" />
      </g>
      {/* Pin 2 - orange (streetlight) */}
      <g transform="translate(270, 200)">
        <circle cx="0" cy="-20" r="14" fill="#986000" />
        <path d="M0 0 L-7 -14 Q0 -28 7 -14 Z" fill="#986000" />
        <circle cx="0" cy="-20" r="6" fill="white" />
      </g>
      {/* Pin 3 - green (resolved) */}
      <g transform="translate(400, 240)">
        <circle cx="0" cy="-20" r="14" fill="#197447" />
        <path d="M0 0 L-7 -14 Q0 -28 7 -14 Z" fill="#197447" />
        <path d="M-5 -20 L-1 -16 L5 -24" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
      {/* Pulse animation circles */}
      <circle cx="140" cy="240" r="20" fill="#B42318" opacity="0.2">
        <animate attributeName="r" values="14;24;14" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="270" cy="180" r="20" fill="#986000" opacity="0.2">
        <animate attributeName="r" values="14;24;14" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────────

const FALLBACK_STATS: PlatformStats = {
  totalReports: 12847,
  openIssues: 4231,
  inProgress: 2109,
  verifiedResolved: 6507,
}

function StatsBar() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/stats')
      .then((res) => {
        if (res.data.success) setStats(res.data.data)
        else setStats(FALLBACK_STATS)
      })
      .catch(() => setStats(FALLBACK_STATS))
      .finally(() => setLoading(false))
  }, [])

  const displayStats = stats || FALLBACK_STATS

  const metrics = [
    {
      label: 'Total Reports',
      value: displayStats.totalReports.toLocaleString('en-IN'),
      icon: TrendingUp,
      color: 'text-civic-blue',
      bg: 'bg-civic-blue-light',
    },
    {
      label: 'Open Issues',
      value: displayStats.openIssues.toLocaleString('en-IN'),
      icon: AlertTriangle,
      color: 'text-warning',
      bg: 'bg-yellow-50',
    },
    {
      label: 'In Progress',
      value: displayStats.inProgress.toLocaleString('en-IN'),
      icon: ArrowRight,
      color: 'text-info',
      bg: 'bg-blue-50',
    },
    {
      label: 'Verified Resolved',
      value: displayStats.verifiedResolved.toLocaleString('en-IN'),
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-green-50',
    },
  ]

  return (
    <section className="bg-surface border-y border-border">
      <div className="container-app py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon
            return (
              <div key={m.label} className="flex items-center gap-3 p-3 rounded-xl">
                <div className={`h-10 w-10 rounded-lg ${m.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${m.color}`} />
                </div>
                <div>
                  {loading ? (
                    <>
                      <Skeleton className="h-6 w-16 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-text-primary">{m.value}</div>
                      <div className="text-xs text-text-secondary">{m.label}</div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Category Card ─────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<IssueCategory, { Icon: React.ElementType; bg: string; color: string }> = {
  ROAD_DAMAGE: { Icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-600' },
  STREETLIGHT: { Icon: Lightbulb, bg: 'bg-yellow-50', color: 'text-yellow-600' },
  GARBAGE: { Icon: Trash2, bg: 'bg-green-50', color: 'text-green-700' },
  WATER_LEAKAGE: { Icon: Droplets, bg: 'bg-blue-50', color: 'text-blue-600' },
  DRAINAGE: { Icon: Wind, bg: 'bg-teal-50', color: 'text-teal-600' },
  TRAFFIC_SIGNAL: { Icon: TrafficCone, bg: 'bg-orange-50', color: 'text-orange-600' },
  PUBLIC_INFRASTRUCTURE: { Icon: Building2, bg: 'bg-purple-50', color: 'text-purple-600' },
  OTHER: { Icon: HelpCircle, bg: 'bg-gray-50', color: 'text-gray-600' },
}

function IssueCategories() {
  return (
    <section className="container-app py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
          What Issue Are You Facing?
        </h2>
        <p className="text-text-secondary max-w-xl mx-auto">
          Select a category to report an issue or browse existing reports. We route your issue
          to the responsible authority automatically.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map((cat) => {
          const { Icon, bg, color } = CATEGORY_ICONS[cat]
          return (
            <Link
              key={cat}
              to={`/explore?category=${cat}`}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-surface hover:border-civic-blue hover:shadow-md transition-all group"
            >
              <div className={`h-14 w-14 rounded-xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`h-7 w-7 ${color}`} />
              </div>
              <span className="text-sm font-medium text-text-primary text-center leading-snug">
                {CATEGORY_LABELS[cat]}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ─── Recent Reports ────────────────────────────────────────────────────────────

function RecentReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/reports', { params: { limit: 6, sort: 'newest' } })
      .then((res) => {
        if (res.data.success) setReports(res.data.data.items || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="bg-page-bg py-16">
      <div className="container-app">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
              Recent Reports
            </h2>
            <p className="text-text-secondary">Latest civic issues reported by citizens</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/explore">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reports.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-text-secondary">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No reports yet. Be the first to report an issue!</p>
            <Button className="mt-4" asChild>
              <Link to="/report">Report an Issue</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    step: '01',
    title: 'Report the Issue',
    desc: 'Snap a photo, pin the location, describe the problem. Takes less than 2 minutes.',
    icon: MapPin,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    step: '02',
    title: 'AI Routing',
    desc: 'Our AI analyzes the report and routes it to the most appropriate government department.',
    icon: Shield,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    step: '03',
    title: 'Authority Responds',
    desc: 'Verified government officials acknowledge, assign, and update progress on the issue.',
    icon: Users,
    color: 'bg-orange-50 text-orange-600',
  },
  {
    step: '04',
    title: 'Verified Resolution',
    desc: 'Citizens verify fixes. Points and badges are earned. Your city improves.',
    icon: CheckCircle,
    color: 'bg-green-50 text-green-600',
  },
]

function HowItWorks() {
  return (
    <section className="container-app py-16">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">How CivicFix Works</h2>
        <p className="text-text-secondary max-w-xl mx-auto">
          A transparent, accountable process from report to resolution — with citizens in control.
        </p>
      </div>
      <div className="relative">
        {/* Connector line (desktop) */}
        <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.step} className="relative flex flex-col items-center text-center">
                <div className={`h-16 w-16 rounded-2xl ${step.color} flex items-center justify-center mb-4 relative z-10 border-2 border-white shadow-sm`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className="text-xs font-bold text-text-secondary mb-2">STEP {step.step}</div>
                <h3 className="font-semibold text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Community Impact ─────────────────────────────────────────────────────────

function CommunityImpact() {
  return (
    <section className="bg-navy text-white py-16">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Building Better Cities, Together
            </h2>
            <p className="text-white/75 leading-relaxed mb-6">
              CivicFix empowers communities by making civic participation easy and impactful.
              Every report, every vote, every verification drives real change in your neighbourhood.
            </p>
            <ul className="space-y-3">
              {[
                'Earn points and badges for civic contributions',
                'Follow issues that matter to you',
                'Verify resolutions in your area',
                'Build a transparent public record',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/80">
                  <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button
                className="bg-white text-navy hover:bg-white/90"
                asChild
              >
                <Link to="/register">Join as a Citizen</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Active Cities', value: '12+', icon: Building2 },
              { label: 'Citizens Registered', value: '8,400+', icon: Users },
              { label: 'Issues Resolved', value: '6,500+', icon: CheckCircle },
              { label: 'Authorities Verified', value: '45+', icon: Star },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-white/10 rounded-xl p-5 backdrop-blur-sm">
                  <Icon className="h-8 w-8 text-white/70 mb-3" />
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Authority Verification Explainer ─────────────────────────────────────────

function AuthorityVerification() {
  return (
    <section className="bg-surface py-16">
      <div className="container-app">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-civic-blue-light text-civic-blue px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Verified Authority Program
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            How We Verify Government Authorities
          </h2>
          <p className="text-text-secondary leading-relaxed mb-8">
            CivicFix operates a rigorous verification program to ensure that only genuine
            government officials represent their departments on our platform. Every authority
            account is manually reviewed.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                title: 'Document Verification',
                desc: 'Official ID, appointment letter, and department credentials are reviewed.',
                icon: Shield,
              },
              {
                title: 'Manual Review',
                desc: 'Our admin team cross-checks submissions against public records.',
                icon: CheckCircle,
              },
              {
                title: 'Ongoing Monitoring',
                desc: 'Authority actions are audited. Misuse leads to immediate suspension.',
                icon: TrendingUp,
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="p-5 rounded-xl border border-border">
                  <Icon className="h-8 w-8 text-civic-blue mb-3" />
                  <h3 className="font-semibold text-text-primary mb-2">{item.title}</h3>
                  <p className="text-sm text-text-secondary">{item.desc}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-8">
            <Button variant="outline" asChild>
              <Link to="/authority/apply">Apply as an Authority</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Is CivicFix affiliated with the government?',
    a: 'No. CivicFix is an independent civic-technology platform. We are not affiliated with, endorsed by, or officially connected to any government department or municipality. Our authority accounts are verified individuals who choose to use our platform.',
  },
  {
    q: 'How do I report a civic issue?',
    a: 'Register as a citizen, then click "Report an Issue". Take a photo, mark the location on the map, describe the problem, and submit. Our AI will suggest the right department.',
  },
  {
    q: 'Will my issue definitely be resolved?',
    a: 'CivicFix cannot guarantee resolution. We provide a transparent platform for reporting and tracking. The actual resolution depends on the relevant government department.',
  },
  {
    q: 'How do authorities get verified?',
    a: 'Authorities apply with official documents (ID, appointment letter, department credentials). Our admin team manually reviews each application before granting access.',
  },
  {
    q: 'What do I earn from reporting issues?',
    a: 'You earn civic points and badges for reporting issues, getting them verified, supporting others reports, and verifying resolutions. These are purely for recognition — there is no monetary reward.',
  },
  {
    q: 'Can I report anonymously?',
    a: 'Currently, you need to register with an email address to report issues. However, your display name does not have to be your real name. We never share your email publicly.',
  },
]

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="container-app py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-text-secondary">Everything you need to know about CivicFix.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-text-primary hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span>{faq.q}</span>
                {openIndex === i ? (
                  <ChevronUp className="h-5 w-5 text-text-secondary shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-text-secondary shrink-0" />
                )}
              </button>
              {openIndex === i && (
                <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed border-t border-border pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-700 to-civic-blue pt-12 pb-0">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white py-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Independent Civic-Tech Platform
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-6 text-blue-300">
              <span className="block">Report Civic Problems.</span>
              <span className="block">Find the Right Authority.</span>
              <span className="block">Track Real Progress.</span>
            </h1>
            <p className="text-lg text-white/75 leading-relaxed mb-8">
              CivicFix helps Indian citizens report civic issues, automatically routes them to
              the right government department, and provides transparent tracking — all in one
              platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-white text-navy hover:bg-white/90 font-semibold"
                asChild
              >
                <Link to="/report">
                  <MapPin className="h-5 w-5" />
                  Report an Issue
                </Link>
              </Button>
              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 py-3 rounded-lg text-base font-semibold border-2 border-white/40 text-white bg-transparent hover:bg-white/10 hover:border-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Explore Issues</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-white/60">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Free to use
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                No spam
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Open source
              </span>
            </div>
          </div>
          <div className="hidden lg:block pb-8">
            <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-navy-800/50 group">
              <img
                src="/images/hero-street.jpg"
                alt="Indian urban civic infrastructure and road network"
                className="w-full h-[400px] object-cover rounded-2xl transform transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent pointer-events-none" />
              {/* Civic Monitoring Badges Overlay */}
              <div className="absolute top-4 left-4 bg-navy/90 backdrop-blur-md border border-white/20 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Civic Infrastructure Monitoring
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-lg flex items-center justify-between text-navy border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-civic-blue shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">Urban Ward #42 — Jaipur / Delhi NCR</div>
                    <div className="text-[11px] text-text-secondary">Streetlights & Pothole Repair Tracked</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-success bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                  Active Area
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Main HomePage ─────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div>
      <Hero />
      <StatsBar />
      <IssueCategories />
      <RecentReports />
      <HowItWorks />
      <CommunityImpact />
      <AuthorityVerification />
      <FAQ />
    </div>
  )
}
