import { z } from 'zod'

export interface AiAnalysisResult {
  isCivicIssue: boolean
  title: string
  description: string
  category: string
  severity: string
  confidence: number
  evidenceSummary?: string
  additionalInformationNeeded?: string[]
  isDemoMode?: boolean
}

const aiResponseSchema = z.object({
  isCivicIssue: z.boolean().default(true),
  title: z.string().default(''),
  description: z.string().default(''),
  category: z
    .enum([
      'ROAD_DAMAGE',
      'STREETLIGHT',
      'GARBAGE',
      'WATER_LEAKAGE',
      'DRAINAGE',
      'TRAFFIC_SIGNAL',
      'PUBLIC_INFRASTRUCTURE',
      'OTHER',
    ])
    .default('OTHER'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  confidence: z.number().min(0).max(1).default(0.85),
  evidenceSummary: z.string().optional(),
  additionalInformationNeeded: z.array(z.string()).optional(),
})

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function getTestOrMockAnalysis(
  title?: string,
  description?: string,
  imageBase64?: string
): AiAnalysisResult {
  const combined = `${title || ''} ${description || ''}`.toLowerCase()
  let category = 'ROAD_DAMAGE'
  let severity = 'MEDIUM'
  let genTitle = 'Deep Road Pothole and Asphalt Breakdown'
  let genDesc =
    'The uploaded evidence photograph shows substantial asphalt surface breakdown and an open pothole creating vehicle damage risk. Surrounding road surface requires immediate municipal road maintenance.'

  if (combined.includes('light') || combined.includes('bulb') || combined.includes('lamp')) {
    category = 'STREETLIGHT'
    severity = 'LOW'
    genTitle = 'Non-Functional Streetlight Luminaire'
    genDesc =
      'Visible public streetlight pole with non-functioning lamp fixture. Needs electrical crew inspection and bulb/wiring replacement.'
  } else if (combined.includes('garbage') || combined.includes('waste') || combined.includes('trash')) {
    category = 'GARBAGE'
    severity = 'MEDIUM'
    genTitle = 'Solid Waste and Refuse Accumulation on Public Way'
    genDesc =
      'Photographic evidence reveals accumulated municipal waste on the public sidewalk/roadside causing sanitary concern and obstruction.'
  } else if (combined.includes('water') || combined.includes('pipe')) {
    category = 'WATER_LEAKAGE'
    severity = 'HIGH'
    genTitle = 'Water Supply Pipeline Leakage and Surface Water Runoff'
    genDesc =
      'Visible pressurized water pipeline joint failure discharging water onto public thoroughfare. Demands water utility maintenance response.'
  } else if (combined.includes('drain') || combined.includes('sewer') || combined.includes('manhole')) {
    category = 'DRAINAGE'
    severity = 'CRITICAL'
    genTitle = 'Open Drainage Chamber and Overflow Hazard'
    genDesc =
      'Evidence displays an uncovered drainage manhole or overflow condition presenting immediate fall hazard and public health risk.'
  } else if (combined.includes('traffic') || combined.includes('signal')) {
    category = 'TRAFFIC_SIGNAL'
    severity = 'HIGH'
    genTitle = 'Malfunctioning Traffic Control Signal'
    genDesc =
      'Traffic light signals are unpowered or displaying conflicting indicators creating high accident risk at intersection.'
  }

  // If user already supplied title/description, respect their intent
  if (title && title.trim().length >= 10) {
    genTitle = title.trim()
  }
  if (description && description.trim().length >= 20) {
    genDesc = description.trim()
  }

  return {
    isCivicIssue: true,
    title: genTitle,
    description: genDesc,
    category,
    severity,
    confidence: 0.91,
    evidenceSummary: `Photographic evidence analyzed showing visible municipal infrastructure defect (${category.toLowerCase().replace(/_/g, ' ')}).`,
    additionalInformationNeeded: ['Exact landmark confirmation by citizen'],
    isDemoMode: true,
  }
}

export async function analyzeReport(
  title: string,
  description: string,
  imageBase64?: string,
  imageMimeType: string = 'image/jpeg'
): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  let effectiveMime = (imageMimeType || 'image/jpeg').toLowerCase()
  if (imageBase64 && imageBase64.startsWith('data:')) {
    const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,/i)
    if (dataUrlMatch) {
      effectiveMime = dataUrlMatch[1].toLowerCase()
    }
  }

  // Validate image mime type if image is provided
  if (imageBase64 && !ALLOWED_MIME_TYPES.includes(effectiveMime)) {
    const error = new Error(`Unsupported image format: ${effectiveMime}. Please upload JPEG, PNG, or WebP.`)
    ;(error as any).code = 'INVALID_IMAGE_FORMAT'
    throw error
  }

  // Check if image data exceeds reasonable limits (e.g. 15MB base64)
  if (imageBase64 && imageBase64.length > 20 * 1024 * 1024) {
    const error = new Error('Image file payload exceeds maximum allowed size (10 MB).')
    ;(error as any).code = 'PAYLOAD_TOO_LARGE'
    throw error
  }

  // If no Gemini API key configured:
  if (!apiKey) {
    // In test environment or if explicit MOCK_AI is enabled, return valid test structured result
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_AI === 'true') {
      console.log('[AI] Running in test/mock mode (NODE_ENV=test or MOCK_AI=true).')
      return getTestOrMockAnalysis(title, description, imageBase64)
    }

    // In normal operation without an API key, honestly report missing configuration
    const error = new Error(
      'Gemini Vision API key is not configured. Please set GEMINI_API_KEY in packages/backend/.env.'
    )
    ;(error as any).code = 'API_KEY_MISSING'
    throw error
  }

  try {
    const prompt = `
You are an expert AI civic engineer for CivicFix, an Indian public infrastructure problem reporting platform.
Examine this photograph (and any optional title/description provided) and determine:

1. Does the photograph or text show a genuine civic infrastructure or public maintenance problem in a city, neighborhood, or road (e.g. potholes, road cave-ins, broken streetlights, dark public lamps, garbage dumping, sewage or drainage overflow, water pipeline burst, broken footpath, damaged traffic signals)?
2. If YES:
   - "isCivicIssue": true
   - "title": A concise, clear, factual title (between 10 and 60 characters) describing the primary civic issue (e.g. "Deep Road Pothole Near Intersection").
   - "description": A factual, detailed engineering observation (minimum 25 words) describing the physical defect visible in the photograph, surrounding road or neighborhood context, and safety hazards to citizens and vehicles. Do NOT invent unobservable facts like exact street names or how long it has been broken.
   - "category": Must be one exact match from: ["ROAD_DAMAGE", "STREETLIGHT", "GARBAGE", "WATER_LEAKAGE", "DRAINAGE", "TRAFFIC_SIGNAL", "PUBLIC_INFRASTRUCTURE", "OTHER"].
   - "severity": Must be one exact match from: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].
   - "confidence": A number between 0.0 and 1.0 indicating visual certainty.
   - "evidenceSummary": A one-sentence summary of the visual evidence.
3. If NO (for example: an indoor selfie, random pet, receipt, screenshot of text, or irrelevant image):
   - "isCivicIssue": false
   - "title": ""
   - "description": ""
   - "category": "OTHER"
   - "severity": "LOW"
   - "confidence": 0.2
   - "evidenceSummary": "No visible civic infrastructure issue was identified in this image."

Return ONLY a raw JSON object matching the schema. No markdown code blocks, no backticks, no explanations.`

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: prompt },
    ]

    if (title || description) {
      parts.push({
        text: `Citizen Context:\nTitle: ${title || 'Not provided'}\nDescription: ${description || 'Not provided'}`,
      })
    }

    if (imageBase64) {
      // Strip data URL prefix if present (e.g. data:image/jpeg;base64,...)
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/i, '').trim()
      if (cleanBase64.length > 0) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: cleanBase64,
          },
        })
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errBody}`)
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
      }>
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

    const rawJson = JSON.parse(text)
    const validated = aiResponseSchema.parse(rawJson)

    return {
      isCivicIssue: validated.isCivicIssue,
      title: validated.title,
      description: validated.description,
      category: validated.category,
      severity: validated.severity,
      confidence: validated.confidence,
      evidenceSummary: validated.evidenceSummary,
      additionalInformationNeeded: validated.additionalInformationNeeded,
      isDemoMode: false,
    }
  } catch (err: any) {
    console.error('[AI] Gemini Vision analysis failed:', err?.message || err)
    const serviceErr = new Error(
      err?.message || 'Image analysis is temporarily unavailable. You can retry or continue manually.'
    )
    ;(serviceErr as any).code = 'AI_SERVICE_UNAVAILABLE'
    throw serviceErr
  }
}
