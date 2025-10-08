import { supabase } from '../lib/supabase'

// Normalize string for case-insensitive, accent-insensitive comparisons (ñ → n, etc.)
// Also trims whitespace and removes "city" keyword for better matching
const normalize = (value) => {
  const s = String(value || '').toLowerCase().trim()
  return s
    .normalize('NFD') // Remove diacritics (ñ → n, á → a)
    .replace(/[\u0300-\u036f]/g, '') // Strip combining marks
    .replace(/\bcity\b/g, '') // Remove standalone "city"
    .replace(/\s*,\s*/g, ', ') // Normalize comma spacing
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

// Find matching pricing entry by checking if normalized city+region appears in address
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
// Returns an object: { fee: number, status: 'ok' | 'no_pricing' | 'no_match' }
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
      const fee = Number(matched.price) || 0
      return { fee, status: 'ok' }
    }

    return { fee: 0, status: 'no_match' }
  } catch (err) {
    console.error('fetchBaseDeliveryFeeForAddress error:', err)
    return { fee: 0, status: 'no_match' }
  }
}
