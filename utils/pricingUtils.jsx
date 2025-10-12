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

const findPricingMatch = (pricingList, address) => {
  const normAddress = normalize(address)
  return (
    pricingList.find((entry) => {
      const normCity = normalize(entry.city)
      return normAddress.includes(normCity)
    }) || null
  )
}

// Fetch base delivery fee for a given free-form address string.
// Returns: { fee: number, status: 'ok' | 'no_pricing' | 'no_match', city?: string }
export const fetchBaseDeliveryFeeForAddress = async (address) => {
  try {
    const { data: pricingList, error } = await supabase
      .from('pricing')
      .select('city, price')

    if (error) throw error

    if (!Array.isArray(pricingList) || pricingList.length === 0) {
      return { fee: 0, status: 'no_pricing' }
    }

    const matched = findPricingMatch(pricingList, address)
    if (matched) {
      const cityName = matched.city.replace(/Kalakhang Maynila/gi, 'Metro Manila')
      const fee = Number(matched.price) || 0
      return { fee, status: 'ok', city: cityName }
    }

    return { fee: 0, status: 'no_match' }
  } catch (err) {
    console.error('fetchBaseDeliveryFeeForAddress error:', err)
    return { fee: 0, status: 'no_match' }
  }
}
