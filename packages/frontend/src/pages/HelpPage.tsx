import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle,
  MapPin,
  Sparkles,
  Building2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Wrench,
  Mail,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

interface HelpSection {
  id: string
  title: string
  icon: React.ElementType
  summary: string
  faqs: { q: string; a: string }[]
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<string>('getting-started')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const sections: HelpSection[] = [
    {
      id: 'getting-started',
      title: '1. Getting Started with CivicFix',
      icon: BookOpen,
      summary: 'Learn how to register, browse issues, and file your first civic problem report.',
      faqs: [
        {
          q: 'What is CivicFix?',
          a: 'CivicFix is an independent public civic-technology platform designed to help Indian citizens report public infrastructure issues, identify the legally responsible government authority, prevent duplicate complaints, and track evidence-based resolution progress.',
        },
        {
          q: 'Do I need an account to report an issue?',
          a: 'Yes. To maintain public integrity, prevent automated spam, and allow you to verify repairs or dispute false resolutions, filing a report requires a verified citizen account. You can, however, freely browse, search, and view issues without logging in.',
        },
        {
          q: 'Is CivicFix free to use?',
          a: 'Yes, CivicFix is 100% free for all citizens. There are no fees or charges for filing reports, tracking status, or viewing public authorities.',
        },
      ],
    },
    {
      id: 'location',
      title: '2. Location & Mapping',
      icon: MapPin,
      summary: 'Understanding GPS coordinates, reverse geocoding, and jurisdictional boundaries.',
      faqs: [
        {
          q: 'How does CivicFix determine the location of a problem?',
          a: 'CivicFix uses the HTML5 Geolocation API to read your device coordinates with your permission, and OpenStreetMap Nominatim reverse geocoding to automatically populate the street name, municipal ward, and city.',
        },
        {
          q: 'Why does the map require location permissions?',
          a: 'Location permissions allow your browser to accurately geotag the civic hazard so municipal field inspection teams can navigate straight to the physical defect without confusion.',
        },
        {
          q: 'Can I report an issue if my GPS is inaccurate or unavailable?',
          a: 'Yes. If GPS access is denied or inaccurate, you can manually type the street name, prominent landmark, and postal area in the location field.',
        },
      ],
    },
    {
      id: 'ai-classification',
      title: '3. AI Problem Classification',
      icon: Sparkles,
      summary: 'How artificial intelligence assists in analyzing photographic evidence and issue severity.',
      faqs: [
        {
          q: 'How does the AI Assistant analyze my report?',
          a: 'CivicFix integrates Gemini Vision API capabilities. When you upload a photo or write an issue description, our AI engine checks the visible defect, compares it to municipal fault taxonomies, and suggests the appropriate category and severity score.',
        },
        {
          q: 'Can I override the AI recommendations?',
          a: 'Absolutely. AI suggestions are provided as an engineering aid. You have complete control to change the category, adjust the severity rating, or add supplemental description notes before submitting.',
        },
      ],
    },
    {
      id: 'authority-discovery',
      title: '4. Authority Discovery & Routing',
      icon: Building2,
      summary: 'How CivicFix determines whether Municipal Corporation, PWD, or NHAI is responsible.',
      faqs: [
        {
          q: 'How does CivicFix route complaints to the right department?',
          a: 'Our smart authority discovery engine matches the category (e.g., Road Damage vs. Drainage vs. Streetlights) and geographic location with our municipal department directory. It identifies whether a road falls under Municipal Corporation, State PWD, or National Highways Authority of India (NHAI).',
        },
        {
          q: 'What if the identified authority rejects jurisdiction?',
          a: 'If a department clarifies that the jurisdiction belongs to another entity (e.g., an internal colony road under a Resident Welfare Association or a state highway under PWD), the ticket can be reassigned or transferred transparently on the public log.',
        },
      ],
    },
    {
      id: 'issue-tracking',
      title: '5. Issue Tracking & Status Lifecycle',
      icon: Clock,
      summary: 'Understanding the stages from submission to verified resolution.',
      faqs: [
        {
          q: 'What are the different status stages for a report?',
          a: 'Reports move through 6 transparent stages: (1) REPORTED (submitted to registry), (2) UNDER REVIEW (verified by moderation/triage), (3) ASSIGNED (transmitted to department), (4) IN PROGRESS (crews dispatched or repair underway), (5) RESOLUTION CLAIMED (department claims fix), and (6) VERIFIED RESOLVED (confirmed by citizens).',
        },
        {
          q: 'What is a Public Tracking ID?',
          a: 'Every report receives a unique identifier format: CF-YYYY-XXXXXX (e.g., CF-2026-000042). You can use this ID in the search bar or URL to inspect the public audit log at any time.',
        },
      ],
    },
    {
      id: 'disputes-reopening',
      title: '6. Disputes, Reopening & Community Verification',
      icon: AlertTriangle,
      summary: 'What to do when an issue is improperly marked resolved or repairs fail quickly.',
      faqs: [
        {
          q: 'What happens when an authority claims a problem is resolved?',
          a: 'The status changes to RESOLUTION CLAIMED, and the reporting citizen as well as nearby community members are prompted to verify the repair. If at least 3 community verifications confirm the fix, the issue reaches VERIFIED RESOLVED.',
        },
        {
          q: 'Can I reopen a report if the repair was substandard or not done?',
          a: 'Yes. If an authority claims resolution but the pothole remains open or streetlight is still dark, the original reporter can click "Reopen Issue" with a counter-explanation, returning the ticket to an active state.',
        },
      ],
    },
    {
      id: 'privacy-protection',
      title: '7. Privacy, Anonymity & Data Protection',
      icon: ShieldCheck,
      summary: 'How your personal details, email, and location data are safeguarded.',
      faqs: [
        {
          q: 'Is my email or phone number visible to the public?',
          a: 'No. CivicFix never exposes your email address, phone number, or private account details on public report pages. Only your chosen public display name is displayed alongside reports and comments.',
        },
        {
          q: 'Can I report with a pseudonym?',
          a: 'Yes. You can edit your Citizen Profile display name to any respectful pseudonym while keeping your registered email secure and private.',
        },
      ],
    },
    {
      id: 'troubleshooting',
      title: '8. Troubleshooting & Common Issues',
      icon: Wrench,
      summary: 'Resolving file upload errors, map loading glitches, and validation issues.',
      faqs: [
        {
          q: 'Why am I getting "String must contain at least 20 character(s)" error?',
          a: 'To ensure municipal inspectors receive enough actionable detail to locate and assess the defect, CivicFix requires titles to be at least 10 characters and descriptions to be at least 20 characters. Brief one-word complaints are rejected by engineering standards.',
        },
        {
          q: 'Why did my image upload fail?',
          a: 'Image uploads must be in JPEG, PNG, or WebP format and under 10 megabytes in size. If your photo is larger, please resize or take a standard resolution photo.',
        },
      ],
    },
    {
      id: 'contact-feedback',
      title: '9. Contact, Support & Feedback',
      icon: Mail,
      summary: 'Get in touch with the CivicFix engineering team and community moderators.',
      faqs: [
        {
          q: 'How do I contact CivicFix support?',
          a: 'For platform bugs, data corrections, or security disclosures, email support@civicfix.org or use our community feedback channels.',
        },
        {
          q: 'How do government departments register for official authority access?',
          a: 'Municipal officers and department representatives can click "Apply as an Authority" on the navigation bar, submitting official government credentials and jurisdiction details for administrative verification.',
        },
      ],
    },
  ]

  const filteredSections = sections.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.title.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.faqs.some((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-page-bg py-10">
      <div className="container-app">
        {/* Header Breadcrumb & Title */}
        <div className="max-w-4xl mx-auto mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-civic-blue px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4">
            <HelpCircle className="h-3.5 w-3.5" />
            CivicFix Documentation & Knowledge Base
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy tracking-tight mb-4">
            CivicFix Help & Citizen Guidance Center
          </h1>
          <p className="text-base text-text-secondary leading-relaxed max-w-2xl mx-auto mb-8">
            Detailed guides, troubleshooting resources, and answers to frequently asked questions about reporting, authority routing, and resolution tracking.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto relative">
            <Search className="h-5 w-5 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search help topics, error messages, or questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-3 h-12 text-sm bg-white shadow-sm border-border"
            />
          </div>
        </div>

        {/* 9 Category Navigation Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          {sections.map((s) => {
            const Icon = s.icon
            const isSelected = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id)
                  const el = document.getElementById(s.id)
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'border-civic-blue bg-blue-50/60 shadow-sm'
                    : 'border-border bg-white hover:border-civic-blue/50'
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-civic-blue text-white' : 'bg-page-bg text-civic-blue'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-navy leading-snug">{s.title}</div>
                  <div className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{s.summary}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Section FAQ Accordions */}
        <div className="max-w-4xl mx-auto space-y-8 mb-16">
          {filteredSections.map((sec) => {
            const Icon = sec.icon
            return (
              <div key={sec.id} id={sec.id} className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-4 pb-2 border-b border-border">
                  <div className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-navy">{sec.title}</h2>
                    <p className="text-xs text-text-secondary">{sec.summary}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {sec.faqs.map((faq, idx) => {
                    const faqId = `${sec.id}-${idx}`
                    const isExpanded = expandedFaq === faqId
                    return (
                      <div
                        key={idx}
                        className="border border-border rounded-xl bg-white overflow-hidden shadow-xs"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : faqId)}
                          className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-navy hover:bg-page-bg transition-colors"
                        >
                          <span className="pr-4">{faq.q}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-text-secondary shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-text-secondary shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border bg-page-bg/40">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Need more assistance CTA */}
        <div className="max-w-4xl mx-auto bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold text-navy mb-1">Still have questions or facing technical trouble?</h3>
            <p className="text-xs text-text-secondary max-w-xl">
              Our community moderators and engineering team are available to help ensure your civic reports are properly logged and routed.
            </p>
          </div>
          <div className="flex gap-3">
            <Button size="md" className="bg-navy hover:bg-navy-700 text-xs font-semibold" asChild>
              <Link to="/report">File a Report</Link>
            </Button>
            <Button size="md" variant="outline" className="text-xs" asChild>
              <Link to="/how-it-works">Review Workflow Guide</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
