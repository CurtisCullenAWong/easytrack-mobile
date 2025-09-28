// Reusable geometry and vicinity helpers for experimental vicinity gating
export const VICINITY_FEATURE_ENABLED=false

export const deg2rad = (degrees) => degrees * (Math.PI / 180)

export const parseGeometry = (geo) => {
  if (!geo) return null
  try {
    if (typeof geo === 'string') {
      const parts = geo.replace(/[POINT()]/g, '').trim().split(/\s+/)
      if (parts.length >= 2) {
        const longitude = parseFloat(parts[0])
        const latitude = parseFloat(parts[1])
        if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
          return { latitude, longitude }
        }
      }
    }
    if (geo?.coordinates?.length >= 2) {
      const longitude = parseFloat(geo.coordinates[0])
      const latitude = parseFloat(geo.coordinates[1])
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        return { latitude, longitude }
      }
    }
  } catch (err) {
    console.warn('parseGeometry error:', err)
  }
  return null
}

// Returns distance in kilometers (km)
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const earthRadiusKm = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

// Compare two geometry values (Supabase geography/text), return { distanceKm, withinMeters }
export const compareGeometriesVicinity = (geoA, geoB, metersThreshold = 50) => {
  const a = parseGeometry(geoA)
  const b = parseGeometry(geoB)
  if (!a || !b) {
    return { distanceKm: null, withinMeters: false }
  }
  const distanceKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude)
  const withinMeters = distanceKm !== null && distanceKm <= (metersThreshold / 1000)
  return { distanceKm, withinMeters }
}

export const formatDistanceDisplay = (distanceKm) => {
  if (distanceKm === null || typeof distanceKm !== 'number') return 'Location unavailable'
  if (distanceKm < 1) return `${Math.max(0, Math.round(distanceKm * 1000))} m`
  return `${distanceKm.toFixed(2)} km`
}