import { useCallback } from 'react'
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK'

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error)
    return
  }
  if (data) {
    const { locations } = data
    console.log('Received background location:', locations)
  }
})

export default function useBackgroundLocation() {
  const startTracking = useCallback(async () => {
    const fg = await Location.requestForegroundPermissionsAsync()
    const bg = await Location.requestBackgroundPermissionsAsync()

    if (fg.status !== 'granted' || bg.status !== 'granted') {
      console.log('Permissions not granted')
      return
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // in milliseconds
        distanceInterval: 50, // in meters
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
      })
      console.log('Background location tracking started.')
    }
  }, [])

  const stopTracking = useCallback(async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      console.log('Background location tracking stopped.')
    }
  }, [])

  return { startTracking, stopTracking }
}