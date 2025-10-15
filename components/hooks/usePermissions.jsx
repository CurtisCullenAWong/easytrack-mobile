import { useCallback, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { Alert, Linking } from 'react-native'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'

// Requests permissions when the hosting screen gains focus or on mount
// Usage: useRequestPermissions({ locationForeground: true, notifications: true, onPermissionDenied: (type) => {} })
export default function useRequestPermissions(options = {}) {
  const {
    locationForeground = false,
    locationBackground = false,
    notifications = false,
    onPermissionDenied = null,
    showAlerts = true,
  } = options

  const handlePermissionDenied = useCallback((permissionType, canAskAgain = true) => {
    console.log(`Permission denied for ${permissionType}, canAskAgain: ${canAskAgain}`)
    
    if (onPermissionDenied) {
      onPermissionDenied(permissionType, canAskAgain)
      return
    }

    if (!showAlerts) return

    const messages = {
      location: {
        title: 'Location Permission Required',
        message: 'This feature requires location access to work properly. Please enable location permissions in your device settings.',
        canAskAgain: 'Location access is needed for map features and delivery tracking.'
      },
      notifications: {
        title: 'Notification Permission Required', 
        message: 'Enable notifications to receive updates about your deliveries and important app notifications.',
        canAskAgain: 'Notifications help you stay updated on delivery status and app updates.'
      }
    }

    const config = messages[permissionType]
    if (!config) return

    // Only show alert if user can still be asked (not permanently denied)
    if (canAskAgain) {
      Alert.alert(
        config.title,
        config.canAskAgain,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings(),
            style: 'default'
          }
        ]
      )
    } else {
      // Permission permanently denied, show settings message
      Alert.alert(
        config.title,
        config.message,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings(),
            style: 'default'
          }
        ]
      )
    }
  }, [onPermissionDenied, showAlerts])

  const requestPermissions = useCallback(async () => {
    try {
      if (locationForeground) {
        // Check current permission status first
        const { status: currentStatus } = await Location.getForegroundPermissionsAsync()
        
        // Always request if not granted (including if denied)
        if (currentStatus !== 'granted') {
          console.log(' Requesting foreground location permission...')
          const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync()
          console.log(' Location permission result:', { status, canAskAgain })
          
          if (status !== 'granted') {
            console.log('Location permission denied, handling denial...')
            // Only redirect if user actively denied (canAskAgain is false means permanently denied)
            handlePermissionDenied('location', canAskAgain)
            return // Don't request background if foreground is denied
          }
        }
        
        // Request background permission if foreground is granted
        if (locationBackground && (currentStatus === 'granted' || await Location.getForegroundPermissionsAsync().then(r => r.status === 'granted'))) {
          try {
            console.log(' Requesting background location permission...')
            const bgResult = await Location.requestBackgroundPermissionsAsync()
            console.log(' Background location permission result:', bgResult.status)
            if (bgResult.status !== 'granted') {
              // Background permission denied, but foreground is granted - this is acceptable
              console.log('Background location permission denied, but foreground is available')
            }
          } catch (_e) {
            // ignore background request errors silently
          }
        }
      }

      if (notifications) {
        try {
          // Check current notification permission status first
          const { status: currentStatus } = await Notifications.getPermissionsAsync()
          console.log(' Current notification permission status:', currentStatus)
          
          // Always request if not granted (including if denied)
          if (currentStatus !== 'granted') {
            console.log('🔔 Requesting notification permission...')
            const { status, canAskAgain } = await Notifications.requestPermissionsAsync()
            console.log('🔔 Notification permission result:', { status, canAskAgain })
            if (status !== 'granted') {
              // Only redirect if user actively denied
              handlePermissionDenied('notifications', canAskAgain)
            }
          } else {
            console.log('🔔 Notification permission already granted')
          }
        } catch (_e) {
          // ignore notification permission errors
        }
      }
    } catch (_e) {
      console.error('Permission request error:', _e)
    }
  }, [locationForeground, locationBackground, notifications, handlePermissionDenied])

  // Try to use navigation focus effect, fallback to useEffect if not in navigation context
  try {
    useFocusEffect(
      useCallback(() => {
        // Always request permissions on every focus, regardless of previous state
        requestPermissions()
      }, [requestPermissions])
    )
  } catch (error) {
    // Not in navigation context, use useEffect instead
    useEffect(() => {
      requestPermissions()
    }, [requestPermissions])
  }
}


