import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'

// Ensure .env is loaded if this module is invoked standalone or before server bootstrap
if (!process.env.GEMINI_API_KEY) {
  const envCandidates = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), 'packages/backend/.env'),
    path.resolve(process.cwd(), '.env'),
  ]
  for (const p of envCandidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p })
      break
    }
  }
}

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

export const VALID_CATEGORIES = [
  'ROAD_DAMAGE',
  'STREETLIGHT',
  'GARBAGE',
  'WATER_LEAKAGE',
  'DRAINAGE',
  'TRAFFIC_SIGNAL',
  'PUBLIC_INFRASTRUCTURE',
  'OTHER',
] as const

export const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export const aiResponseSchema = z.object({
  isCivicIssue: z.boolean().default(true),
  title: z.string().default(''),
  description: z.string().default(''),
  category: z.preprocess((val) => {
    if (typeof val === 'string') {
      const normalized = val.trim().toUpperCase().replace(/[\s-]+/g, '_')
      if ((VALID_CATEGORIES as readonly string[]).includes(normalized)) return normalized
      if (normalized.includes('ROAD') || normalized.includes('POTHOLE') || normalized.includes('ASPHALT')) return 'ROAD_DAMAGE'
      if (normalized.includes('LIGHT') || normalized.includes('LAMP')) return 'STREETLIGHT'
      if (normalized.includes('WASTE') || normalized.includes('TRASH') || normalized.includes('GARBAGE')) return 'GARBAGE'
      if (normalized.includes('WATER') || normalized.includes('PIPE')) return 'WATER_LEAKAGE'
      if (normalized.includes('DRAIN') || normalized.includes('SEWER') || normalized.includes('MANHOLE')) return 'DRAINAGE'
      if (normalized.includes('SIGNAL') || normalized.includes('TRAFFIC')) return 'TRAFFIC_SIGNAL'
      if (normalized.includes('INFRASTRUCTURE') || normalized.includes('FOOTPATH') || normalized.includes('SIDEWALK')) return 'PUBLIC_INFRASTRUCTURE'
    }
    return val
  }, z.enum(VALID_CATEGORIES).default('OTHER')),
  severity: z.preprocess((val) => {
    if (typeof val === 'string') {
      const normalized = val.trim().toUpperCase()
      if ((VALID_SEVERITIES as readonly string[]).includes(normalized)) return normalized
    }
    return val
  }, z.enum(VALID_SEVERITIES).default('MEDIUM')),
  confidence: z.number().min(0).max(1).default(0.85),
  evidenceSummary: z.string().optional(),
  additionalInformationNeeded: z.array(z.string()).optional(),
})

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'
export const FALLBACK_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
]

export function getModelsToTry(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim()
  const primary = configured || DEFAULT_GEMINI_MODEL
  const fallbacks = FALLBACK_GEMINI_MODELS.filter((m) => m !== primary)
  return [primary, ...fallbacks]
}

export function getTestOrMockAnalysis(
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
      return getTestOrMockAnalysis(title, description, imageBase64)
    }

    // In normal operation without an API key, honestly report missing configuration
    const error = new Error(
      'Gemini Vision API key is not configured. Please set GEMINI_API_KEY in packages/backend/.env.'
    )
    ;(error as any).code = 'API_KEY_MISSING'
    throw error
  }

  // In test environment when MOCK_AI is enabled, skip external API calls
  if (process.env.NODE_ENV === 'test' && process.env.MOCK_AI === 'true') {
    return getTestOrMockAnalysis(title, description, imageBase64)
  }

  const prompt = `You are an expert AI civic engineer for CivicFix, an Indian public infrastructure problem reporting platform.
Examine this photograph (and any optional citizen title or description context provided) and determine:

1. Does the photograph or context show a genuine civic infrastructure or public municipal maintenance problem in a city, neighborhood, or public road (such as road damage, potholes, asphalt cracks, broken streetlights, dark public lamps, garbage dumping, sewage or drainage overflow, water pipeline burst, broken footpath, damaged traffic signals)?
2. If YES:
   - "isCivicIssue": true
   - "title": A concise, clear, factual title (between 10 and 60 characters) describing the primary civic issue (e.g. "Deep Road Pothole Near Intersection").
   - "description": A factual, detailed engineering observation (minimum 25 words) describing the physical defect visible in the photograph, surrounding roadway or neighborhood context, and safety hazards to citizens and vehicles. Do NOT invent unobservable facts like exact street names or how long it has been broken.
   - "category": Must be one exact match from: ["ROAD_DAMAGE", "STREETLIGHT", "GARBAGE", "WATER_LEAKAGE", "DRAINAGE", "TRAFFIC_SIGNAL", "PUBLIC_INFRASTRUCTURE", "OTHER"].
   - "severity": Must be one exact match from: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].
   - "confidence": A number between 0.0 and 1.0 indicating visual certainty.
   - "evidenceSummary": A one-sentence summary of the visual evidence.
   - "additionalInformationNeeded": An array of strings describing any missing details needed from the citizen (e.g. ["Nearest cross street landmark"]).
3. If NO (for example: an indoor selfie, random pet, receipt, screenshot of text, household furniture, or irrelevant photo):
   - "isCivicIssue": false
   - "title": ""
   - "description": ""
   - "category": "OTHER"
   - "severity": "LOW"
   - "confidence": 0.2
   - "evidenceSummary": "No visible civic infrastructure issue was identified in this image."
   - "additionalInformationNeeded": []

Return ONLY a raw JSON object matching the schema. No markdown code blocks, no backticks, no markdown formatting.`

  try {
    const aiClient = new GoogleGenAI({ apiKey })
    const modelsToTry = getModelsToTry()
    let lastError: any = null
    let responseText = ''

    for (const modelName of modelsToTry) {
      try {
        const contentParts: any[] = [{ text: prompt }]

        if (title?.trim() || description?.trim()) {
          contentParts.push({
            text: `Citizen Context:\nTitle: ${title?.trim() || 'Not provided'}\nDescription: ${description?.trim() || 'Not provided'}`,
          })
        }

        if (imageBase64) {
          const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/i, '').trim()
          if (cleanBase64.length > 0) {
            contentParts.push({
              inlineData: {
                mimeType: effectiveMime,
                data: cleanBase64,
              },
            })
          }
        }

        const result = await aiClient.models.generateContent({
          model: modelName,
          contents: contentParts,
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        })

        responseText = result.text || ''
        if (responseText) {
          break // Successfully generated
        }
      } catch (callErr: any) {
        lastError = callErr
        const status = callErr?.status || callErr?.statusCode || callErr?.code
        const msg = String(callErr?.message || '').toLowerCase()
        // If 404 (model deprecated, retired, or not available), try next fallback model
        if (status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('is not supported')) {
          continue
        }
        // For other fatal errors (auth, quota, network), fail fast
        throw callErr
      }
    }

    if (!responseText) {
      throw lastError || new Error('No response generated from Gemini Vision models.')
    }

    let cleanJson = responseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
    const rawJson = JSON.parse(cleanJson)
    const validated = aiResponseSchema.parse(rawJson)

    // Ensure minimum lengths required by reporting wizard form validation if civic issue is detected
    let finalTitle = validated.title.trim()
    let finalDesc = validated.description.trim()

    if (validated.isCivicIssue) {
      if (finalTitle.length < 10) {
        finalTitle = `${validated.category.replace(/_/g, ' ')} Issue Reported`
      }
      if (finalDesc.length < 20) {
        finalDesc =
          validated.evidenceSummary ||
          `Visible infrastructure defect identified: ${validated.category.toLowerCase().replace(/_/g, ' ')}. Requires municipal inspection.`
      }
    }

    return {
      isCivicIssue: validated.isCivicIssue,
      title: finalTitle,
      description: finalDesc,
      category: validated.category,
      severity: validated.severity,
      confidence: validated.confidence,
      evidenceSummary: validated.evidenceSummary,
      additionalInformationNeeded: validated.additionalInformationNeeded,
      isDemoMode: false,
    }
  } catch (err: any) {
    const rawMsg = (err?.message || '').toLowerCase()
    const errStatus = err?.status || err?.statusCode || err?.code

    if (
      errStatus === 400 ||
      errStatus === 401 ||
      errStatus === 403 ||
      rawMsg.includes('api key not valid') ||
      rawMsg.includes('api_key_invalid') ||
      rawMsg.includes('invalid_argument') ||
      rawMsg.includes('unauthorized') ||
      rawMsg.includes('permission_denied')
    ) {
      const authErr = new Error(
        'Google Gemini API authentication failed. The provided API key is invalid or unauthorized. Please verify GEMINI_API_KEY in packages/backend/.env.'
      )
      ;(authErr as any).code = 'API_KEY_INVALID'
      throw authErr
    }

    if (
      errStatus === 429 ||
      rawMsg.includes('resource_exhausted') ||
      rawMsg.includes('quota') ||
      rawMsg.includes('rate limit')
    ) {
      const quotaErr = new Error(
        'Google Gemini API rate limit or quota exceeded. Please retry in a few moments or continue manually.'
      )
      ;(quotaErr as any).code = 'QUOTA_EXCEEDED'
      throw quotaErr
    }

    if (
      rawMsg.includes('enotfound') ||
      rawMsg.includes('fetch failed') ||
      rawMsg.includes('econnrefused') ||
      rawMsg.includes('network') ||
      rawMsg.includes('etimedout')
    ) {
      const netErr = new Error(
        'Network connection to Google Gemini API failed. Please check network connectivity or continue manually.'
      )
      ;(netErr as any).code = 'NETWORK_ERROR'
      throw netErr
    }

    if (err instanceof SyntaxError || err?.name === 'ZodError') {
      const parseErr = new Error('AI provider returned an unparseable response structure. You can continue manually.')
      ;(parseErr as any).code = 'INVALID_AI_RESPONSE'
      throw parseErr
    }

    const serviceErr = new Error(
      'Image analysis is temporarily unavailable. You can retry or continue manually.'
    )
    ;(serviceErr as any).code = 'AI_SERVICE_UNAVAILABLE'
    throw serviceErr
  }
}
