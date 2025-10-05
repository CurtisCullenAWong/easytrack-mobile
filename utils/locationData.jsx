import regionData from '../components/screens/airline/subscreen/locations-json/region.json'
import provinceData from '../components/screens/airline/subscreen/locations-json/province.json'
import cityData from '../components/screens/airline/subscreen/locations-json/city.json'
import barangayData from '../components/screens/airline/subscreen/locations-json/barangay.json'
import postalCodeData from '../components/screens/airline/subscreen/locations-json/postal-codes.json'
/**
 * Location data utilities for systematic autofill
 */

// Cache for filtered data to improve performance
const cache = {
  provinces: new Map(),
  cities: new Map(),
  barangays: new Map(),
  postalCodes: new Map()
}

/**
 * Get all regions
 */
export const getRegions = () => {
  return regionData.map(region => ({
    id: region.id,
    code: region.region_code,
    name: region.region_name,
    psgcCode: region.psgc_code
  }))
}

/**
 * Get provinces by region code
 */
export const getProvincesByRegion = (regionCode) => {
  if (!regionCode) return []
  
  if (cache.provinces.has(regionCode)) {
    return cache.provinces.get(regionCode)
  }
  
  const provinces = provinceData
    .filter(province => province.region_code === regionCode)
    .map(province => ({
      id: province.province_code,
      code: province.province_code,
      name: province.province_name,
      regionCode: province.region_code,
      psgcCode: province.psgc_code
    }))
  
  cache.provinces.set(regionCode, provinces)
  return provinces
}

/**
 * Get cities by province code
 */
export const getCitiesByProvince = (provinceCode) => {
  if (!provinceCode) return []
  
  if (cache.cities.has(provinceCode)) {
    return cache.cities.get(provinceCode)
  }
  
  const cities = cityData
    .filter(city => city.province_code === provinceCode)
    .map(city => ({
      id: city.city_code,
      code: city.city_code,
      name: city.city_name,
      provinceCode: city.province_code,
      regionCode: city.region_desc,
      psgcCode: city.psgc_code
    }))
  
  cache.cities.set(provinceCode, cities)
  return cities
}

/**
 * Get barangays by city code
 */
export const getBarangaysByCity = (cityCode) => {
  if (!cityCode) return []
  
  if (cache.barangays.has(cityCode)) {
    return cache.barangays.get(cityCode)
  }
  
  const barangays = barangayData
    .filter(barangay => barangay.city_code === cityCode)
    .map(barangay => ({
      id: barangay.brgy_code,
      code: barangay.brgy_code,
      name: barangay.brgy_name,
      cityCode: barangay.city_code,
      provinceCode: barangay.province_code,
      regionCode: barangay.region_code,
      psgcCode: barangay.brgy_code
    }))
  
  cache.barangays.set(cityCode, barangays)
  return barangays
}

/**
 * Search locations with fuzzy matching
 */
export const searchLocations = (locations, query) => {
  if (!query || query.trim() === '') return locations
  
  const normalizedQuery = query.toLowerCase().trim()
  
  return locations.filter(location => 
    location.name.toLowerCase().includes(normalizedQuery)
  )
}

/**
 * Get postal codes filtered by selected location names
 * Accepts names to avoid coupling to PSGC codes since dataset is name-based
 */
export const getPostalCodes = ({ regionName = '', cityName = '', barangayName = '' } = {}) => {
  const norm = (s) => String(s || '').toLowerCase().trim()
  const r = norm(regionName)
  const c = norm(cityName)
  const b = norm(barangayName)

  const key = `${r}|${c}|${b}`
  if (cache.postalCodes.has(key)) return cache.postalCodes.get(key)

  if (!c && !b) {
    cache.postalCodes.set(key, [])
    return []
  }

  // Score-based matching to handle schema differences (location vs municipality) and abbreviations
  const scored = postalCodeData.map(p => {
    const loc = norm(p.location)
    const mun = norm(p.municipality)
    const reg = norm(p.region)

    let score = 0

    // City match signals
    if (c) {
      if (loc === c || mun === c) score += 3
      else if (loc.includes(c) || c.includes(loc) || mun.includes(c) || c.includes(mun)) score += 2
    }

    // Barangay/district refinement
    if (b) {
      if (mun === b) score += 3
      else if (mun.includes(b) || b.includes(mun)) score += 2
    }

    // Region hint, do not over-restrict
    if (r) {
      if (reg === r) score += 1
      else if (reg.includes(r) || r.includes(reg)) score += 0.5
    }

    return {
      id: String(p.post_code),
      code: String(p.post_code),
      name: String(p.post_code),
      city: p.location || '',
      municipality: p.municipality || '',
      region: p.region || '',
      _score: score
    }
  })

  // Keep items with non-zero score; sort by score desc, then code asc
  const filtered = scored.filter(x => x._score > 0)
    .sort((a, b) => (b._score - a._score) || a.code.localeCompare(b.code))

  // Dedupe by postal code, retain highest score
  const byCode = new Map()
  for (const item of filtered) {
    if (!byCode.has(item.code)) byCode.set(item.code, item)
  }

  const result = Array.from(byCode.values()).map(({ _score, ...rest }) => rest)
  cache.postalCodes.set(key, result)
  return result
}

/**
 * Get location by code at any level
 */
export const getLocationByCode = (code, level) => {
  switch (level) {
    case 'region':
      return getRegions().find(r => r.code === code)
    case 'province':
      return provinceData.find(p => p.province_code === code)
    case 'city':
      return cityData.find(c => c.city_code === code)
    case 'barangay':
      return barangayData.find(b => b.brgy_code === code)
    case 'postalCode':
      return postalCodeData.find(p => p.post_code === code)
    default:
      return null
  }
}

/**
 * Clear cache to free memory
 */
export const clearCache = () => {
  cache.provinces.clear()
  cache.cities.clear()
  cache.barangays.clear()
  cache.postalCodes.clear()
}
