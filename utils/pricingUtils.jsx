import { supabase } from '../lib/supabase'

// Normalize string for case-insensitive, accent-insensitive comparisons
// Also trims whitespace, removes "city" keyword, and converts "Kalakhang Maynila" → "Metro Manila"
const normalize = (value) => {
  const s = String(value || '').toLowerCase().trim()
  return s
    .normalize('NFD') // Remove diacritics (ñ → n, á → a)
    .replace(/[\u0300-\u036f]/g, '') // Strip combining marks
    .replace(/\bkalakhang maynila\b/g, 'metro manila') // Replace phrase in both city and address
    .replace(/\bcity\b/g, '') // Remove standalone "city"
    .replace(/\s*,\s*/g, ', ') // Normalize comma spacing
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

// Find exact pricing match based on city and region
const findExactPricingMatch = (pricingList, city, region) => {
  const normCity = normalize(city)
  const normRegion = normalize(region)
  
  return (
    pricingList.find((entry) => {
      const normEntryCity = normalize(entry.city)
      const normEntryRegion = normalize(entry.region_id?.region || '')
      return normEntryCity === normCity && normEntryRegion === normRegion
    }) || null
  )
}

// Fetch base delivery fee based on exact city and region match from geocoded location.
// Returns: { fee: number, status: 'ok' | 'no_pricing' | 'no_match', city?: string, region?: string }
export const fetchBaseDeliveryFeeForAddress = async (city, region) => {
  try {
    const { data: pricingList, error } = await supabase
      .from('pricing')
      .select('city, region_id (region), price')

    if (error) throw error

    if (!Array.isArray(pricingList) || pricingList.length === 0) {
      return { fee: 0, status: 'no_pricing' }
    }

    const matched = findExactPricingMatch(pricingList, city, region)
    if (matched) {
      const cityName = matched.city.replace(/Kalakhang Maynila/gi, 'Metro Manila')
      const regionName = matched.region_id?.region || null
      const fee = Number(matched.price) || 0
      return { fee, status: 'ok', city: cityName, region: regionName }
    }

    return { fee: 0, status: 'no_match' }
  } catch (err) {
    console.error('fetchBaseDeliveryFeeForAddress error:', err)
    return { fee: 0, status: 'no_match' }
  }
}
