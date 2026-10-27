export interface AiAnalysisResult {
  category: string
  severity: string
  description: string
  confidence: number
  isDemoMode: boolean
}

const DEMO_CATEGORIES = [
  'ROAD_DAMAGE',
  'STREETLIGHT',
  'GARBAGE',
  'WATER_LEAKAGE',
  'DRAINAGE',
  'TRAFFIC_SIGNAL',
  'PUBLIC_INFRASTRUCTURE',
  'OTHER',
]

const DEMO_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getMockAnalysis(description: string): AiAnalysisResult {
  // Simple keyword-based mock for demo
  const lower = description.toLowerCase()
  let category = 'OTHER'
  let severity = 'MEDIUM'

  if (lower.includes('pothole') || lower.includes('road') || lower.includes('crack')) {
    category = 'ROAD_DAMAGE'
    severity = lower.includes('large') || lower.includes('deep') ? 'HIGH' : 'MEDIUM'
  } else if (lower.includes('light') || lower.includes('streetlight') || lower.includes('lamp')) {
    category = 'STREETLIGHT'
    severity = 'LOW'
  } else if (lower.includes('garbage') || lower.includes('waste') || lower.includes('trash')) {
    category = 'GARBAGE'
    severity = 'MEDIUM'
  } else if (lower.includes('water') && (lower.includes('leak') || lower.includes('burst'))) {
    category = 'WATER_LEAKAGE'
    severity = lower.includes('burst') || lower.includes('flood') ? 'CRITICAL' : 'HIGH'
  } else if (lower.includes('drain') || lower.includes('sewer') || lower.includes('manhole')) {
    category = 'DRAINAGE'
    severity = lower.includes('open') || lower.includes('flood') ? 'CRITICAL' : 'MEDIUM'
  } else if (lower.includes('traffic') || lower.includes('signal') || lower.includes('sign')) {
    category = 'TRAFFIC_SIGNAL'
    severity = 'HIGH'
  } else if (lower.includes('bridge') || lower.includes('footpath') || lower.includes('infrastructure')) {
    category = 'PUBLIC_INFRASTRUCTURE'
    severity = 'MEDIUM'
  } else {
    category = pickRandom(DEMO_CATEGORIES)
    severity = pickRandom(DEMO_SEVERITIES)
  }

  return {
    category,
    severity,
    description: `[Demo AI] This appears to be a ${category.toLowerCase().replace('_', ' ')} issue with ${severity.toLowerCase()} severity based on the description provided.`,
    confidence: 0.72 + Math.random() * 0.15,
    isDemoMode: true,
  }
}

export async function analyzeReport(
  title: string,
  description: string,
  imageBase64?: string,
  imageMimeType: string = 'image/jpeg'
): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    // Demo mode — return intelligent keyword analysis with clear demo status
    console.log('[AI] No GEMINI_API_KEY configured. Running in demo mode.')
    return getMockAnalysis(`${title} ${description}`)
  }

  try {
    const prompt = `
You are an expert AI civic engineer for CivicFix, an Indian civic problem reporting platform.
Analyze this civic issue report (and attached photograph if provided) and return JSON matching this exact schema:
{
  "category": "ROAD_DAMAGE" | "STREETLIGHT" | "GARBAGE" | "WATER_LEAKAGE" | "DRAINAGE" | "TRAFFIC_SIGNAL" | "PUBLIC_INFRASTRUCTURE" | "OTHER",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "description": "A concise 1-2 sentence engineering assessment explaining what the issue is, potential hazard, and department action needed.",
  "confidence": 0.85
}

Title: ${title}
Description: ${description}

Return ONLY raw JSON, with no markdown code fences or other text.`

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: prompt },
    ]

    if (imageBase64) {
      // Remove data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: cleanBase64,
        },
      })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
      }>
    }
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(text) as {
      category: string
      severity: string
      description: string
      confidence: number
    }
    return { ...parsed, isDemoMode: false }
  } catch (err) {
    console.error('[AI] Gemini API call failed, falling back to mock:', err)
    return getMockAnalysis(`${title} ${description}`)
  }
}
