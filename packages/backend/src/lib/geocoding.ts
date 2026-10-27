export interface GeocodingResult {
  address: string
  city: string
  state: string
  road?: string
  landmark?: string
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult> {
  const enabled = process.env.GEOCODING_ENABLED

  if (enabled === 'false' || enabled === '0') {
    return {
      address: `Location at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
      city: 'Unknown',
      state: 'Unknown',
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicFix/1.0 (civic-tech platform; demo)',
        'Accept-Language': 'en',
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
    }

    const data = await response.json() as {
      display_name?: string
      address?: {
        city?: string
        town?: string
        village?: string
        state?: string
        road?: string
        suburb?: string
        neighbourhood?: string
        county?: string
      }
    }

    const addr = data.address || {}
    const city = addr.city || addr.town || addr.village || addr.county || 'Unknown'
    const state = addr.state || 'Unknown'
    const road = addr.road || undefined
    const landmark = addr.suburb || addr.neighbourhood || undefined

    return {
      address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city,
      state,
      road,
      landmark,
    }
  } catch (err) {
    console.error('[Geocoding] Reverse geocode failed:', err)
    return {
      address: `Location at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
      city: 'Unknown',
      state: 'Unknown',
    }
  }
}
