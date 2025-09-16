import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'

export const TASK_NAME = 'BACKGROUND_LOCATION_TASK'

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error)
    return
  }

  try {
    const locations = data?.locations || []
    if (locations.length === 0) return

    const latest = locations[locations.length - 1]
    const { latitude, longitude } = latest.coords || {}
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return

    const geoPoint = `SRID=4326;POINT(${longitude} ${latitude})`

    // Reverse geocode for a human readable address
    let locationText = `${latitude},${longitude}`
    try {
      const address = await Location.reverseGeocodeAsync({ latitude, longitude })
      const components = []
      if (address[0]?.street) {
        const streetAddress = []
        if (address[0]?.streetNumber) streetAddress.push(address[0].streetNumber)
        streetAddress.push(address[0].street)
        components.push(streetAddress.join(' '))
      }
      const cityState = []
      if (address[0]?.city) cityState.push(address[0].city)
      if (address[0]?.region) cityState.push(address[0].region)
      if (cityState.length > 0) components.push(cityState.join(', '))
      const postalCountry = []
      if (address[0]?.postalCode) postalCountry.push(address[0].postalCode)
      if (address[0]?.country) postalCountry.push(address[0].country)
      if (postalCountry.length > 0) components.push(postalCountry.join(', '))
      if (address[0]?.district) components.push(`${address[0].district}`)
      if (address[0]?.subregion) components.push(`${address[0].subregion}`)
      if (components.length > 0) locationText = components.join(', ')
    } catch (reverseError) {
      // Non-fatal, continue with coordinates
      console.warn('Reverse geocoding failed in background:', reverseError?.message || reverseError)
    }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) {
      console.warn('Background task: no authenticated user; skipping location update')
      return
    }

    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        current_location: locationText,
        current_location_geo: geoPoint,
      })
      .eq('delivery_id', user.id)
      .eq('contract_status_id', 4)

    if (updateError) {
      console.error('Background task: failed to update location in Supabase:', updateError)
    }
  } catch (taskError) {
    console.error('Unhandled error in background location task:', taskError)
  }
})


