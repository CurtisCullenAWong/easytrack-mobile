import { useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'

export function useLocation() {
  const locationSubscription = useRef(null)

  const handleLocation = async () => {
    try {
      const { coords: location } = await Location.getCurrentPositionAsync({})
      console.log('\n')
      console.log('Location:', location)
      
      // Update Supabase with current location
      const { latitude, longitude } = location
      const geoPoint = `SRID=4326;POINT(${longitude} ${latitude})`
      
      // Convert coordinates to address
      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      })

      // Format address components in a Google Maps compatible format
      const addressComponents = []
      
      // Street address
      if (address[0]?.street) {
        const streetAddress = []
        if (address[0]?.streetNumber) streetAddress.push(address[0].streetNumber)
        streetAddress.push(address[0].street)
        addressComponents.push(streetAddress.join(' '))
      }
      
      // City and State/Region
      const cityState = []
      if (address[0]?.city) cityState.push(address[0].city)
      if (address[0]?.region) cityState.push(address[0].region)
      if (cityState.length > 0) addressComponents.push(cityState.join(', '))
      
      // Postal code and Country
      const postalCountry = []
      if (address[0]?.postalCode) postalCountry.push(address[0].postalCode)
      if (address[0]?.country) postalCountry.push(address[0].country)
      if (postalCountry.length > 0) addressComponents.push(postalCountry.join(', '))
      
      // Additional details that might be useful
      if (address[0]?.district) addressComponents.push(`${address[0].district}`)
      if (address[0]?.subregion) addressComponents.push(`${address[0].subregion}`)
      
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
      console.error('Error in location task:', err)
    }
  }

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      console.warn('Permission to access location was denied')
      return
    }

    if (!locationSubscription.current) {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        handleLocation
      )
      console.log('Started location tracking')
    }
  }

  const stopTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove()
      locationSubscription.current = null
      console.log('Stopped location tracking')
    }
  }

  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove()
      }
    }
  }, [])

  return { startTracking, stopTracking }
}