import React from 'react'
import { Link } from 'react-router-dom'
import {
  Camera,
  MapPin,
  Sparkles,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

export default function HowItWorksPage() {
  const workflowSteps = [
    {
      step: '01',
      title: 'Citizen Reporting',
      icon: Camera,
      badge: 'Step 1: Submission',
      badgeColor: 'bg-blue-50 text-civic-blue border-blue-200',
      description:
        'Citizens document civic hazards such as deep potholes, broken streetlights, water pipeline bursts, or open manholes directly from mobile or desktop.',
      details: [
        'Take or upload photographic evidence showing the exact defect and surroundings.',
        'Provide a concise title and detailed engineering description of the hazard.',
        'Indicate preliminary urgency level (Low, Medium, High, or Critical safety hazard).',
      ],
    },
    {
      step: '02',
      title: 'Evidence Capture & Integrity Checks',
      icon: FileText,
      badge: 'Step 2: Verification',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description:
        'To maintain public trust and prevent frivolous complaints, CivicFix runs photographic and metadata verification.',
      details: [
        'Supports standard formats (JPEG, PNG, WebP) with up to 10 MB file inspection.',
        'Timestamps and location coordinates are tied to the complaint dossier.',
        'Spam filtering and content moderation ensure genuine civic grievances receive priority attention.',
      ],
    },
    {
      step: '03',
      title: 'Smart Location & Reverse Geocoding',
      icon: MapPin,
      badge: 'Step 3: Geotagging',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description:
        'Precise coordinates are mapped to physical ward boundaries, streets, and administrative zones using open geospatial standards.',
      details: [
        'One-click browser GPS acquisition reads device latitude and longitude.',
        'OpenStreetMap Nominatim reverse geocodes coordinates to street names, wards, and city.',
        'Citizens can fine-tune prominent landmarks (e.g. "Opposite Pillar 42, Sector 5").',
      ],
    },
    {
      step: '04',
      title: 'AI Problem Classification & Authority Discovery',
      icon: Sparkles,
      badge: 'Step 4: AI & Routing',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description:
        'Our Gemini Vision-powered AI assistant and authority discovery engine route complaints to the legally responsible municipal body.',
      details: [
        'Natural language analysis classifies problems into municipal domain categories.',
        'Jurisdiction matcher resolves whether a road is managed by Municipal Corporation, State PWD, or NHAI.',
        'Transparent confidence scores and explanations display which department is responsible.',
      ],
    },
    {
      step: '05',
      title: 'Duplicate Detection & Community Upvoting',
      icon: Layers,
      badge: 'Step 5: Consolidation',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description:
        'Instead of fragmenting civic complaints across 50 separate tickets, CivicFix identifies matching reports in the immediate vicinity.',
      details: [
        'Proximity radius and semantic matching cluster duplicate grievance submissions.',
        'Citizens can upvote existing reports to elevate collective civic priority.',
        'Municipal officers receive a single high-priority ticket representing all affected citizens.',
      ],
    },
    {
      step: '06',
      title: 'Transparent Lifecycle Tracking',
      icon: Clock,
      badge: 'Step 6: Real Progress',
      badgeColor: 'bg-blue-50 text-navy border-blue-200',
      description:
        'Every report receives a tamper-evident Public Tracking ID (e.g., CF-2026-000042) visible on the live public ledger.',
      details: [
        'Audited status stages: Reported → Under Review → Assigned → In Progress → Resolution Claimed.',
        'Department officers post official updates and inspection notes.',
        'Citizens receive status alerts and can follow the public timeline in real time.',
      ],
    },
    {
      step: '07',
      title: 'Evidence-Based Resolution Verification',
      icon: ShieldCheck,
      badge: 'Step 7: Accountability',
      badgeColor: 'bg-green-50 text-green-700 border-green-200',
      description:
        'A complaint is never closed unilaterally. True resolution requires community verification on the ground.',
      details: [
        'When an authority claims an issue is fixed, they must upload proof of repair.',
        'Reporting citizens and local residents confirm whether the repair was executed properly.',
        'Disputed resolutions can be reopened with photographic counter-evidence.',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-page-bg py-10">
      <div className="container-app">
        {/* Header Breadcrumbs & Title */}
        <div className="max-w-4xl mx-auto mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-civic-blue px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            CivicFix Operational Lifecycle & Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy tracking-tight mb-4">
            How CivicFix Works: From Report to Verified Resolution
          </h1>
          <p className="text-base text-text-secondary leading-relaxed max-w-2xl mx-auto">
            CivicFix connects citizens, artificial intelligence, and municipal authorities into a
            transparent, evidence-backed workflow for fixing urban infrastructure.
          </p>
        </div>

        {/* 7 Workflow Step Cards */}
        <div className="max-w-4xl mx-auto space-y-6 mb-16">
          {workflowSteps.map((item) => {
            const Icon = item.icon
            return (
              <Card
                key={item.step}
                className="bg-white border-border shadow-sm hover:border-civic-blue hover:shadow-md transition-all"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    {/* Step Icon Badge */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                      <div className="h-14 w-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-civic-blue shrink-0 shadow-sm">
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-xs font-mono font-bold text-text-secondary">
                        {item.step}
                      </span>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-2">
                        <h2 className="text-xl font-bold text-navy">{item.title}</h2>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="bg-page-bg rounded-lg p-4 border border-border space-y-2">
                        {item.details.map((detail, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-text-primary">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Civic Integrity & Public Service Notice */}
        <div className="max-w-4xl mx-auto bg-navy text-white rounded-2xl p-8 shadow-xl mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-300 text-sm font-semibold">
                <Building2 className="h-4 w-4" />
                Independent Public Service Architecture
              </div>
              <h3 className="text-2xl font-bold">Ready to improve your neighborhood?</h3>
              <p className="text-sm text-white/80 max-w-xl">
                Submit your first civic report in less than 2 minutes. All tracking is free, transparent, and open to the public.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button size="lg" className="bg-white text-navy hover:bg-white/90 font-semibold" asChild>
                <Link to="/report">
                  <Camera className="h-4 w-4 mr-1.5" />
                  Report an Issue
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 text-white bg-transparent hover:bg-white/10" asChild>
                <Link to="/explore">
                  Explore Live Map
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
