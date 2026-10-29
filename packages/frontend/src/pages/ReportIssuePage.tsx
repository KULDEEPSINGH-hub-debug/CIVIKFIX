import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  Upload,
  Camera,
  Trash2,
  Sparkles,
  MapPin,
  Navigation,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldCheck,
  ThumbsUp,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Spinner, LoadingSpinner } from '../components/ui/Spinner'
import { StatusBadge } from '../components/reports/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { IssueCategory, Severity, Report } from '../types'

const CATEGORY_OPTIONS: { label: string; value: IssueCategory }[] = [
  { label: 'Potholes & Road Damage', value: 'ROAD_DAMAGE' },
  { label: 'Broken Streetlights', value: 'STREETLIGHT' },
  { label: 'Garbage & Solid Waste Accumulation', value: 'GARBAGE' },
  { label: 'Water Pipeline Leakage / Burst', value: 'WATER_LEAKAGE' },
  { label: 'Open Drainage & Sewage Overflow', value: 'DRAINAGE' },
  { label: 'Malfunctioning Traffic Signals', value: 'TRAFFIC_SIGNAL' },
  { label: 'Damaged Public Footpath & Structures', value: 'PUBLIC_INFRASTRUCTURE' },
  { label: 'Other Civic Infrastructure Issue', value: 'OTHER' },
]

export default function ReportIssuePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated } = useAuth()

  // Wizard Step: 1 to 6
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Step 1: Evidence & Image
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // Step 2: Content & AI Analysis
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [category, setCategory] = useState<IssueCategory>(
    (searchParams.get('category') as IssueCategory) || 'ROAD_DAMAGE'
  )
  const [severity, setSeverity] = useState<Severity>('MEDIUM')
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false)
  type AiStatusType = 'idle' | 'analyzing' | 'success' | 'non_civic' | 'error' | 'no_image'
  const [aiStatus, setAiStatus] = useState<AiStatusType>('idle')
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null)
  const [aiEvidenceSummary, setAiEvidenceSummary] = useState<string | null>(null)
  const [aiFilledFields, setAiFilledFields] = useState<boolean>(false)
  const [aiSuggestion, setAiSuggestion] = useState<{
    category?: string
    severity?: string
    description?: string
    confidence?: number
  } | null>(null)

  // Tracking refs to prevent re-render loops and preserve manual user edits
  const lastAnalyzedImageRef = useRef<string | null>(null)
  const userEditedTitleRef = useRef<boolean>(false)
  const userEditedDescRef = useRef<boolean>(false)

  // Step 3: Location
  const [latitude, setLatitude] = useState<number>(26.9124)
  const [longitude, setLongitude] = useState<number>(75.7873)
  const [address, setAddress] = useState<string>('Civic Center Road, Near Central Bus Stand, Jaipur')
  const [landmark, setLandmark] = useState<string>('')
  const [detectingGps, setDetectingGps] = useState<boolean>(false)

  // Step 4: Suggested Authority
  const [suggestedDept, setSuggestedDept] = useState<{
    id: string
    name: string
    type: string
    city: string
    confidence?: string
    explanation?: string
  } | null>(null)
  const [loadingAuthority, setLoadingAuthority] = useState<boolean>(false)

  // Step 5: Duplicate check
  const [potentialDuplicates, setPotentialDuplicates] = useState<Report[]>([])
  const [checkingDuplicates, setCheckingDuplicates] = useState<boolean>(false)

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Handle File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Validations: type and size (10MB)
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setFileError('Please select a valid image file (JPEG, PNG, or WebP).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds the 10 MB limit.')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreviewUrl(dataUrl)
      // Reset analysis tracking for the new image
      lastAnalyzedImageRef.current = null
      userEditedTitleRef.current = false
      userEditedDescRef.current = false
      setAiStatus('idle')
      setAiStatusMessage(null)
      setAiFilledFields(false)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setFileError(null)
    lastAnalyzedImageRef.current = null
    userEditedTitleRef.current = false
    userEditedDescRef.current = false
    setAiStatus('idle')
    setAiStatusMessage(null)
    setAiFilledFields(false)
  }

  // Trigger AI Vision Assistant (Primary image input)
  const runAiVisionAnalysis = async (force: boolean = false) => {
    if (!previewUrl) {
      setAiStatus('no_image')
      setAiStatusMessage('Upload an evidence photo to analyze it with AI.')
      return
    }

    if (!force && lastAnalyzedImageRef.current === previewUrl) {
      // Image already analyzed, prevent duplicate runs
      return
    }

    if (aiAnalyzing) return

    setAiAnalyzing(true)
    setAiStatus('analyzing')
    setAiStatusMessage('Analyzing your image and preparing report details...')

    try {
      lastAnalyzedImageRef.current = previewUrl

      const res = await api.post('/reports/analyze-ai', {
        title: userEditedTitleRef.current ? title : undefined,
        description: userEditedDescRef.current ? description : undefined,
        imageBase64: previewUrl,
        imageMimeType: selectedFile?.type || 'image/jpeg',
      })

      if (res.data.success && res.data.data) {
        const result = res.data.data

        if (result.isCivicIssue === false) {
          setAiStatus('non_civic')
          setAiStatusMessage("We couldn't confidently identify a civic issue in this image. You can enter the details manually.")
          return
        }

        let filledAny = false

        // Automatically populate Title if not manually edited by user
        if (!userEditedTitleRef.current && result.title) {
          setTitle(result.title)
          filledAny = true
        }

        // Automatically populate Description if not manually edited by user
        if (!userEditedDescRef.current && result.description) {
          setDescription(result.description)
          filledAny = true
        }

        // Suggest Category
        if (result.category) {
          setCategory(result.category as IssueCategory)
          filledAny = true
        }

        // Suggest Severity
        if (result.severity) {
          setSeverity(result.severity as Severity)
          filledAny = true
        }

        setAiFilledFields(filledAny)
        setAiEvidenceSummary(result.evidenceSummary || null)
        setAiSuggestion({
          category: result.category,
          severity: result.severity,
          description: result.evidenceSummary || result.description,
          confidence: result.confidence,
        })
        setAiStatus('success')
        setAiStatusMessage('AI analysis complete. Review the suggested details before continuing.')
      }
    } catch (err: any) {
      console.warn('AI analysis error:', err)
      setAiStatus('error')
      const serverCode = err?.response?.data?.error?.code
      if (serverCode === 'API_KEY_MISSING') {
        setAiStatusMessage(
          'Image analysis is temporarily unavailable (GEMINI_API_KEY is not configured in packages/backend/.env). You can retry or continue manually.'
        )
      } else {
        setAiStatusMessage('Image analysis is temporarily unavailable. You can retry or continue manually.')
      }
    } finally {
      setAiAnalyzing(false)
    }
  }

  // Automatically initiate image analysis when an image is available
  useEffect(() => {
    if (previewUrl && lastAnalyzedImageRef.current !== previewUrl && !aiAnalyzing) {
      runAiVisionAnalysis(false)
    }
  }, [previewUrl, currentStep])

  // GPS detection
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported.')
      return
    }
    setDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLatitude(lat)
        setLongitude(lng)
        try {
          const res = await api.post('/reports/reverse-geocode', { latitude: lat, longitude: lng })
          if (res.data.success && res.data.data?.address) {
            setAddress(res.data.data.address)
            if (res.data.data.landmark && !landmark) {
              setLandmark(res.data.data.landmark)
            }
          } else {
            setAddress(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`)
          }
        } catch {
          setAddress(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`)
        } finally {
          setDetectingGps(false)
        }
      },
      (err) => {
        console.warn('Geolocation error:', err)
        alert('Could not retrieve GPS coordinates. You can enter the street address manually.')
        setDetectingGps(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Fetch authority routing on Step 4
  useEffect(() => {
    if (currentStep === 4) {
      setLoadingAuthority(true)
      api
        .get('/authority/find', { params: { category, latitude, longitude } })
        .then((res) => {
          if (res.data.success && res.data.data.primaryAuthority) {
            setSuggestedDept({
              ...res.data.data.primaryAuthority,
              confidence: res.data.data.confidence,
              explanation: res.data.data.confidenceExplanation,
            })
          }
        })
        .catch(console.error)
        .finally(() => setLoadingAuthority(false))
    }
  }, [currentStep, category, latitude, longitude])

  // Check for duplicates on Step 5
  useEffect(() => {
    if (currentStep === 5) {
      setCheckingDuplicates(true)
      api
        .get('/reports', { params: { category, limit: 3 } })
        .then((res) => {
          if (res.data.success) {
            setPotentialDuplicates(res.data.data.items || res.data.data.reports || [])
          }
        })
        .catch(console.error)
        .finally(() => setCheckingDuplicates(false))
    }
  }, [currentStep, category])

  // Final Submission
  const handleSubmitReport = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      // 1. Submit report payload
      const payload = {
        title,
        description,
        category,
        severity,
        latitude,
        longitude,
        address,
        landmark,
      }

      const res = await api.post('/reports', payload)
      if (!res.data.success) {
        throw new Error(res.data.error?.message || 'Failed to submit report')
      }

      const created = res.data.data?.report || res.data.data

      // 2. Upload attachment if photo selected
      if (selectedFile) {
        const formData = new FormData()
        formData.append('files', selectedFile)
        await api.post(`/reports/${created.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch((err) => console.warn('Attachment upload failed:', err))
      }

      setSubmittedReport(created)
      setCurrentStep(7) // Success screen
    } catch (err: unknown) {
      console.error('Submission failed:', err)
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Could not save report. Please check required fields or log in.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Require Auth guard message if not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-page-bg py-16 px-4 flex justify-center items-center">
        <Card className="max-w-md w-full p-8 text-center bg-white shadow-sm border-border">
          <ShieldCheck className="h-12 w-12 text-navy mx-auto mb-4" />
          <h2 className="text-xl font-bold text-navy mb-2">Citizen Authentication Required</h2>
          <p className="text-xs text-text-secondary mb-6 leading-relaxed">
            In accordance with CivicFix public integrity guidelines, citizens must log in to submit civic reports, track status changes, and verify resolutions.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link to="/login?redirect=/report">
              <Button variant="primary" size="md" className="w-full bg-navy hover:bg-navy-700">
                Log In to Continue
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" size="md" className="w-full">
                Register New Citizen Account
              </Button>
            </Link>
          </div>
          <div className="mt-6 pt-4 border-t border-border text-xs text-text-secondary">
            <span>Or explore issues anonymously: </span>
            <Link to="/issues" className="text-civic-blue hover:underline font-semibold">
              Browse Public Issues
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Steps Progress labels
  const steps = [
    { num: 1, label: 'Evidence Photo' },
    { num: 2, label: 'Issue Details' },
    { num: 3, label: 'Location' },
    { num: 4, label: 'Authority' },
    { num: 5, label: 'Duplicates' },
    { num: 6, label: 'Review' },
  ]

  return (
    <div className="min-h-screen bg-page-bg py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="text-xs text-text-secondary mb-1">
            <Link to="/" className="hover:underline">Home</Link> &rsaquo; <span>Report a Civic Problem</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">Public Problem Reporting Wizard</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Step-by-step grievance documentation with AI analysis, duplicate filtering, and authority discovery.
          </p>
        </div>

        {/* Multi-Step Horizontal Progress Bar */}
        {currentStep <= 6 && (
          <div className="bg-white p-4 rounded-lg border border-border shadow-sm mb-6">
            <div className="flex items-center justify-between relative">
              {steps.map((st) => (
                <div key={st.num} className="flex flex-col items-center flex-1 relative z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      st.num < currentStep
                        ? 'bg-success text-white'
                        : st.num === currentStep
                        ? 'bg-navy text-white ring-4 ring-blue-100'
                        : 'bg-page-bg text-text-secondary border border-border'
                    }`}
                  >
                    {st.num < currentStep ? '✓' : st.num}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-medium hidden sm:block ${
                      st.num === currentStep ? 'text-navy font-bold' : 'text-text-secondary'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wizard Form Panels */}
        <Card className="bg-white border-border shadow-sm p-6 sm:p-8">
          {/* STEP 1: UPLOAD EVIDENCE */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <Camera className="h-5 w-5 text-civic-blue" />
                  Step 1: Upload Photographic Evidence
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Clear photographs help field inspection officers verify the problem rapidly and prevent invalid reports.
                </p>
              </div>

              {previewUrl ? (
                <div className="relative border border-border rounded-lg overflow-hidden bg-page-bg p-2 text-center">
                  <img
                    src={previewUrl}
                    alt="Problem Preview"
                    className="max-h-72 w-auto mx-auto rounded object-cover shadow-sm"
                  />
                  <div className="mt-3 flex justify-center gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="gap-1.5 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove & Replace Photo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-civic-blue transition-colors bg-page-bg/50">
                  <Upload className="h-10 w-10 text-civic-blue mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-text-primary">
                    Upload image from your device or camera
                  </p>
                  <p className="text-xs text-text-secondary mt-1 mb-4">
                    Supports JPEG, PNG, WebP up to 10 MB. Personal privacy is protected.
                  </p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <span className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-border text-xs font-semibold rounded-md shadow-sm text-navy bg-white hover:bg-page-bg">
                      Choose Photograph
                    </span>
                  </label>
                  {fileError && <p className="text-xs text-danger mt-3">{fileError}</p>}
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-text-secondary flex items-start gap-2">
                <Info className="h-4 w-4 text-civic-blue flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> You may also continue without an image if camera access is unavailable. Text-based descriptions are accepted.
                </span>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(2)}
                  className="bg-navy hover:bg-navy-700 gap-1.5 text-xs font-semibold"
                >
                  Continue to Issue Details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: ISSUE DETAILS & AI ASSISTANT */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <FileText className="h-5 w-5 text-civic-blue" />
                  Step 2: Describe the Civic Problem
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Provide factual details. You can click "Analyze with AI" to auto-suggest the optimal category and severity.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <span>Report Title *</span>
                    {aiFilledFields && !userEditedTitleRef.current && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-civic-blue font-medium">
                        AI Suggested
                      </span>
                    )}
                  </label>
                  <span
                    className={`text-[11px] font-medium ${
                      title.trim().length >= 10
                        ? 'text-emerald-600'
                        : title.length > 0
                        ? 'text-amber-600'
                        : 'text-text-secondary'
                    }`}
                  >
                    {title.trim().length >= 10
                      ? '✓ Valid'
                      : title.length > 0
                      ? `Min 10 characters (${title.trim().length}/10)`
                      : 'Min 10 characters'}
                  </span>
                </div>
                <Input
                  type="text"
                  placeholder="e.g. Deep pothole damaging vehicles near Sector 4 market"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    userEditedTitleRef.current = true
                  }}
                  className="text-sm"
                  maxLength={200}
                  required
                />
                {title.length > 0 && title.trim().length < 10 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Title must be at least 10 characters long (currently {title.trim().length} chars).
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <span>Detailed Description *</span>
                    {aiFilledFields && !userEditedDescRef.current && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-civic-blue font-medium">
                        AI Suggested
                      </span>
                    )}
                  </label>
                  <span
                    className={`text-[11px] font-medium ${
                      description.trim().length >= 20
                        ? 'text-emerald-600'
                        : description.length > 0
                        ? 'text-amber-600'
                        : 'text-text-secondary'
                    }`}
                  >
                    {description.trim().length >= 20
                      ? '✓ Valid'
                      : description.length > 0
                      ? `Min 20 characters (${description.trim().length}/20)`
                      : 'Min 20 characters'}
                  </span>
                </div>
                <Textarea
                  rows={4}
                  placeholder="Describe the exact nature of the defect, physical dimensions, duration of occurrence, and hazards..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    userEditedDescRef.current = true
                  }}
                  className="text-sm"
                  maxLength={2000}
                  required
                />
                {description.length > 0 && description.trim().length < 20 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Description must be at least 20 characters long for engineering inspection (currently {description.trim().length} chars).
                  </p>
                )}
              </div>

              {/* AI Vision Status & Control Container */}
              {aiStatus === 'analyzing' && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <Spinner size="sm" />
                  <div className="text-xs">
                    <strong className="text-navy block font-semibold">
                      Analyzing your image and preparing report details...
                    </strong>
                    <span className="text-text-secondary text-[11px]">
                      Gemini Vision is inspecting the defect and auto-generating title, description, category, and severity.
                    </span>
                  </div>
                </div>
              )}

              {aiStatus === 'success' && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-900 font-semibold block">
                          AI analysis complete. Review the suggested details before continuing.
                        </strong>
                        <span className="text-emerald-700 text-[11px] block mt-0.5">
                          {aiEvidenceSummary || 'Report fields have been pre-filled from your uploaded photograph. You can freely edit any field below.'}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => runAiVisionAnalysis(true)}
                      disabled={aiAnalyzing}
                      className="text-[11px] h-7 px-2.5 border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-100 shrink-0"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Re-Analyze
                    </Button>
                  </div>
                </div>
              )}

              {aiStatus === 'non_civic' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-amber-900 font-semibold block">
                      We couldn't confidently identify a civic issue in this image. You can enter the details manually.
                    </strong>
                    <span className="text-amber-800 text-[11px] block mt-0.5">
                      Please review your photograph in Step 1 or describe the defect manually in the fields below.
                    </span>
                  </div>
                </div>
              )}

              {aiStatus === 'error' && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-danger font-semibold block">
                        Image analysis is temporarily unavailable. You can retry or continue manually.
                      </strong>
                      <span className="text-text-secondary text-[11px] block mt-0.5">
                        {aiStatusMessage || 'You can manually enter the problem title, description, and category below.'}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => runAiVisionAnalysis(true)}
                    disabled={aiAnalyzing}
                    className="text-xs border-red-300 text-danger bg-white hover:bg-red-50 shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Retry Analysis
                  </Button>
                </div>
              )}

              {aiStatus === 'no_image' && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-civic-blue shrink-0" />
                    <span className="text-navy font-medium">
                      Upload an evidence photo to analyze it with AI.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] h-7 px-2 border-civic-blue text-civic-blue bg-white hover:bg-blue-50"
                  >
                    Back to Step 1
                  </Button>
                </div>
              )}

              {aiStatus === 'idle' && (
                <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    <strong className="text-navy flex items-center gap-1.5 font-bold">
                      <Sparkles className="h-4 w-4 text-civic-blue" />
                      AI Vision Assistant
                    </strong>
                    <span className="text-text-secondary block mt-0.5">
                      Automatically drafts report title, factual description, category, and severity from your uploaded photo.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => runAiVisionAnalysis(true)}
                    disabled={aiAnalyzing}
                    className="border-civic-blue text-civic-blue bg-white hover:bg-blue-50 text-xs flex-shrink-0"
                  >
                    Auto-Classify with AI
                  </Button>
                </div>
              )}

              {/* Category & Severity Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Problem Category *
                  </label>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as IssueCategory)}
                    className="text-sm"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Estimated Public Severity
                  </label>
                  <Select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Severity)}
                    className="text-sm"
                  >
                    <option value="LOW">Low (Minor nuisance, no safety risk)</option>
                    <option value="MEDIUM">Medium (General infrastructure defect)</option>
                    <option value="HIGH">High (Substantial traffic/health hazard)</option>
                    <option value="CRITICAL">Critical (Immediate danger to life/limb)</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="md" onClick={() => setCurrentStep(1)} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={aiAnalyzing || title.trim().length < 10 || description.trim().length < 20}
                  onClick={() => setCurrentStep(3)}
                  className="bg-navy hover:bg-navy-700 text-xs font-semibold gap-1.5"
                >
                  {aiAnalyzing ? 'Analyzing Image...' : 'Next: Select Location'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION SELECTION */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-civic-blue" />
                  Step 3: Pinpoint Location
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Accurate location ensures the complaint is dispatched to the correct municipal ward officer.
                </p>
              </div>

              {/* GPS Auto-detect button */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectGps}
                  disabled={detectingGps}
                  className="gap-2 text-xs border-civic-blue text-civic-blue bg-blue-50/50"
                >
                  <Navigation className={`h-3.5 w-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                  {detectingGps ? 'Detecting Location...' : 'Use Browser GPS Coordinate'}
                </Button>
                <span className="text-[11px] text-text-secondary">
                  Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Physical Address / Road Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Opposite Community Hall, Demo Main Road, Demo City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Prominent Landmark (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Near City Water Tank / Metro Pillar 42"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-[11px] text-text-secondary">
                <strong className="text-text-primary block mb-0.5">Jurisdiction Integrity Disclaimer:</strong>
                GPS coordinates alone do not establish government road ownership. Internal colony roads, state public works roads, and highway authorities have separate jurisdictional domains.
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="md" onClick={() => setCurrentStep(2)} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!address.trim()}
                  onClick={() => setCurrentStep(4)}
                  className="bg-navy hover:bg-navy-700 text-xs font-semibold gap-1.5"
                >
                  Next: Identify Authority
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: SMART AUTHORITY SUGGESTION */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-civic-blue" />
                  Step 4: Responsible Civic Authority Match
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  CivicFix routes grievances to verified municipal bodies based on category rules and jurisdiction boundaries.
                </p>
              </div>

              {loadingAuthority ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner message="Matching responsible department..." />
                </div>
              ) : suggestedDept ? (
                <Card className="bg-white border-2 border-civic-blue p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold bg-green-100 text-success px-2 py-0.5 rounded uppercase">
                      {suggestedDept.confidence || 'HIGH'} Confidence Match
                    </span>
                    <span className="text-xs text-text-secondary font-medium">
                      City: {suggestedDept.city}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-navy">{suggestedDept.name}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Department Type: <strong className="text-text-primary">{suggestedDept.type}</strong>
                  </p>

                  <div className="mt-3 p-2.5 bg-page-bg rounded border border-border text-xs text-text-secondary">
                    {suggestedDept.explanation ||
                      'Matched via municipal charter for this problem classification.'}
                  </div>
                </Card>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-xs text-text-secondary">
                  No specialized authority registered for this exact location. The report will be dispatched to the General Municipal Grievance Cell.
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="md" onClick={() => setCurrentStep(3)} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(5)}
                  className="bg-navy hover:bg-navy-700 text-xs font-semibold gap-1.5"
                >
                  Next: Check Duplicate Reports
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: DUPLICATE CHECK */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Step 5: Duplicate Issue Verification
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  To prevent duplicate work for municipal teams, check if fellow citizens have already reported this issue.
                </p>
              </div>

              {checkingDuplicates ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner message="Checking nearby reports..." />
                </div>
              ) : potentialDuplicates.length > 0 ? (
                <div>
                  <p className="text-xs text-text-secondary font-semibold mb-3">
                    Similar active issues in your category:
                  </p>
                  <div className="space-y-3">
                    {potentialDuplicates.map((dup) => (
                      <div
                        key={dup.id}
                        className="p-3 bg-page-bg border border-border rounded-lg flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[10px] text-text-secondary">{dup.publicId}</span>
                            <StatusBadge status={dup.status} />
                          </div>
                          <h4 className="font-bold text-text-primary text-sm">{dup.title}</h4>
                          <span className="text-text-secondary">{dup.address}</span>
                        </div>
                        <Link to={`/reports/${dup.publicId}`} target="_blank">
                          <Button variant="outline" size="sm" className="text-xs flex-shrink-0">
                            Support Existing &rsaquo;
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded text-xs text-text-secondary flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>No duplicate reports detected for this specific location. Proceed to final review.</span>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="md" onClick={() => setCurrentStep(4)} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(6)}
                  className="bg-navy hover:bg-navy-700 text-xs font-semibold gap-1.5"
                >
                  Next: Final Review
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: FINAL REVIEW AND SUBMISSION */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Step 6: Review and Confirm Report
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Verify the information before submitting to the public register.
                </p>
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-danger">
                  {submitError}
                </div>
              )}

              <div className="bg-page-bg rounded-lg p-4 border border-border space-y-3 text-xs">
                {previewUrl && (
                  <div>
                    <span className="font-semibold text-text-secondary block mb-1">Attached Evidence:</span>
                    <img
                      src={previewUrl}
                      alt="Thumbnail"
                      className="h-24 w-auto rounded border border-border object-cover"
                    />
                  </div>
                )}
                <div>
                  <span className="font-semibold text-text-secondary block">Title:</span>
                  <strong className="text-navy text-sm font-bold">{title}</strong>
                </div>
                <div>
                  <span className="font-semibold text-text-secondary block">Description:</span>
                  <p className="text-text-primary whitespace-pre-wrap">{description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold text-text-secondary block">Category:</span>
                    <span className="text-text-primary capitalize">{category.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-text-secondary block">Severity:</span>
                    <span className="text-text-primary font-bold">{severity}</span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-text-secondary block">Location:</span>
                  <span className="text-text-primary">{address} {landmark && `(Near ${landmark})`}</span>
                </div>
                <div>
                  <span className="font-semibold text-text-secondary block">Routing Destination:</span>
                  <span className="text-navy font-semibold">{suggestedDept?.name || 'General Municipal Grievance Cell'}</span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentStep(5)}
                  disabled={submitting}
                  className="text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Edit Details
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSubmitReport}
                  disabled={submitting}
                  className="bg-navy hover:bg-navy-700 text-xs font-semibold gap-2"
                >
                  {submitting ? 'Submitting to Database...' : 'Confirm & Submit Report'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7: SUBMISSION SUCCESS SCREEN */}
          {currentStep === 7 && submittedReport && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              <h2 className="text-2xl font-bold text-navy">Civic Report Successfully Registered</h2>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                Your report has been entered into the public civic registry and transmitted to the responsible municipal department.
              </p>

              <div className="p-4 bg-page-bg border border-border rounded-lg inline-block text-left my-4">
                <div className="text-xs text-text-secondary">Unique Public Tracking ID:</div>
                <div className="text-xl font-mono font-bold text-navy">{submittedReport.publicId}</div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <Link to={`/reports/${submittedReport.publicId}`}>
                  <Button variant="primary" size="md" className="bg-navy hover:bg-navy-700 text-xs font-semibold">
                    View Report & Status Timeline &rsaquo;
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline" size="md" className="text-xs">
                    My Citizen Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
