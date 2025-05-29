import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { supabase } from './supabase'

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK'

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  try {
    if (error) {
      console.error('Background location error:', error)
      return
    }
    if (!data || !data.locations || data.locations.length === 0) {
      console.error('No location data received')
      return
    }

    const { locations } = data
    const location = locations[0]
    console.log('\n')
    console.log('Background location:', location)
    
    // Update Supabase with current location
    const { latitude, longitude } = location.coords
    const geoPoint = `SRID=4326;POINT(${longitude} ${latitude})`
    
    // Convert coordinates to address
    const [address] = await Location.reverseGeocodeAsync({
      latitude,
      longitude
    })

    // Format address components in a Google Maps compatible format
    const addressComponents = []
    
    // Street address
    if (address?.street) {
      const streetAddress = []
      if (address?.streetNumber) streetAddress.push(address.streetNumber)
      streetAddress.push(address.street)
      addressComponents.push(streetAddress.join(' '))
    }
    
    // City and State/Region
    const cityState = []
    if (address?.city) cityState.push(address.city)
    if (address?.region) cityState.push(address.region)
    if (cityState.length > 0) addressComponents.push(cityState.join(', '))
    
    // Postal code and Country
    const postalCountry = []
    if (address?.postalCode) postalCountry.push(address.postalCode)
    if (address?.country) postalCountry.push(address.country)
    if (postalCountry.length > 0) addressComponents.push(postalCountry.join(', '))
    
    // Additional details that might be useful
    if (address?.district) addressComponents.push(`${address.district}`)
    if (address?.subregion) addressComponents.push(`${address.subregion}`)
    
    const locationText = addressComponents.join(', ') || `${latitude},${longitude}`
    console.log('Formatted address:', locationText)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('No authenticated user found')
      return
    }

    const { error: updateError } = await supabase
      .from('contract')
      .update({
        current_location: locationText,
        current_location_geo: geoPoint,
      })
      .eq('delivery_id', user.id)
      .eq('contract_status_id', 4) // Only update contracts that are in transit

    if (updateError) {
      console.error('Failed to update location in Supabase:', updateError)
    } else {
      console.log('Location updated in Supabase successfully')
    }
  } catch (err) {
    console.error('Error in background location task:', err)
  }
})

export { LOCATION_TASK_NAME } 