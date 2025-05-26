import * as Location from 'expo-location'
import { useRef } from 'react'

export default function useLocationForwarder(forwardLocationFn) {
  const locationSubscription = useRef(null)

  // Start sending location updates
  const startForwarding = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      console.warn('Location permission not granted')
      return
    }

    // Prevent duplicate subscriptions
    if (locationSubscription.current) return

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // every 5 seconds
        distanceInterval: 10, // or every 10 meters
      },
      (location) => {
        forwardLocationFn(location.coords) // send location
      }
    )

    console.log('Location forwarding started')
  }

  // Stop sending location updates
  const stopForwarding = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove()
      locationSubscription.current = null
      console.log('Location forwarding stopped')
    }
  }

  return { startForwarding, stopForwarding }
}