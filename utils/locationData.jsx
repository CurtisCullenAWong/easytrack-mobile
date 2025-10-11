import regionData from '../assets/locations-json/region.json'
import provinceData from '../assets/locations-json/province.json'
import cityData from '../assets/locations-json/city.json'
import barangayData from '../assets/locations-json/barangay.json'
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
 * Now uses city.json data which includes postal codes
 */
export const getPostalCodes = ({ regionName = '', cityName = '', barangayName = '' } = {}) => {
  const norm = (s) => String(s || '').toLowerCase().trim()
  const r = norm(regionName)
  const c = norm(cityName)
  const b = norm(barangayName)

  const key = `${r}|${c}|${b}`
  if (cache.postalCodes.has(key)) return cache.postalCodes.get(key)

  if (!c) {
    cache.postalCodes.set(key, [])
    return []
  }

  // Filter cities based on the provided criteria
  const filteredCities = cityData.filter(city => {
    const cityNameNorm = norm(city.city_name)
    const regionCode = city.region_desc
    
    // Match city name
    const cityMatch = cityNameNorm === c || cityNameNorm.includes(c) || c.includes(cityNameNorm)
    
    // Match region if provided
    const regionMatch = !r || regionCode === r
    
    return cityMatch && regionMatch
  })

  // Convert to postal code format and dedupe
  const postalCodes = filteredCities
    .filter(city => city.postal_code) // Only include cities with postal codes
    .map(city => ({
      id: String(city.postal_code),
      code: String(city.postal_code),
      name: String(city.postal_code),
      city: city.city_name,
      municipality: city.city_name,
      region: city.region_desc
    }))

  // Dedupe by postal code
  const byCode = new Map()
  for (const item of postalCodes) {
    if (!byCode.has(item.code)) byCode.set(item.code, item)
  }

  const result = Array.from(byCode.values())
    .sort((a, b) => a.code.localeCompare(b.code))
  
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
      return cityData.find(c => c.postal_code === code)
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
