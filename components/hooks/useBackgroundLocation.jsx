import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

export function useBackgroundLocation() {
  const isTracking = useRef(false);

  useEffect(() => {
    // Define background task
    TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
      if (error) {
        console.error('Background location error:', error);
        return;
      }
      if (data) {
        const { locations } = data;
        console.log('Background location:', locations[0]);
      }
    });

    return () => {
      stopTracking(); // Stop on unmount
    };
  }, []);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

    if (status !== 'granted' || bgStatus !== 'granted') {
      console.warn('Permission to access location was denied');
      return;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Minimum time (ms) between updates
        distanceInterval: 10, // Minimum distance (meters) between updates
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Tracking Your Location',
          notificationBody: 'Location tracking is on',
        },
      });
      isTracking.current = true;
      console.log('Started background location tracking');
    }
  };

  const stopTracking = async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      isTracking.current = false;
      console.log('Stopped background location tracking');
    }
  };

  return { startTracking, stopTracking };
}