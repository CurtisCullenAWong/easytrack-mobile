// useLocationForwarder.js
import * as Location from 'expo-location'

let locationSubscription = null
let isInitializing = false

export default function useLocationForwarder(forwardLocationFn) {
  const startForwarding = async () => {
    if (locationSubscription || isInitializing) return

    isInitializing = true
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.warn('Location permission not granted')
        return
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2500,
          distanceInterval: 10,
        },
        (location) => {
          forwardLocationFn(location.coords)
        }
      )

      console.log('Location forwarding started')
    } catch (err) {
      console.error('Failed to start location forwarding:', err)
    } finally {
      isInitializing = false
    }
  }

  const stopForwarding = async () => {
    if (locationSubscription) {
      await locationSubscription.remove()
      locationSubscription = null
      console.log('Location forwarding stopped')
    }
  }

  return { startForwarding, stopForwarding }
}
