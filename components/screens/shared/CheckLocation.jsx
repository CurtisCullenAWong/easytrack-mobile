import { useEffect, useRef, useState, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, useTheme, Appbar, IconButton } from 'react-native-paper'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import MapViewDirections from 'react-native-maps-directions'
import Constants from 'expo-constants'
import * as Location from 'expo-location'
import useSnackbar from '../../hooks/useSnackbar'

const { GOOGLE_MAPS_API_KEY } = Constants.expoConfig?.extra || {}

const CheckLocation = ({ route, navigation }) => {
  const { colors, fonts } = useTheme()
  const { dropOffLocation, dropOffLocationGeo, pickupLocation, pickupLocationGeo, contractStatusId } = route.params || {}
  const mapRef = useRef(null)
  const { showSnackbar, SnackbarElement } = useSnackbar()

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        showSnackbar('Permission to access location was denied')
        return
      }
    })()
  }, [])

  const parseGeometry = (geoString) => {
    if (!geoString) return null

    try {
      if (typeof geoString === 'string') {
        const coords = geoString.replace('POINT(', '').replace(')', '').split(' ')
        return {
          longitude: parseFloat(coords[0]),
          latitude: parseFloat(coords[1]),
        }
      } else if (typeof geoString === 'object' && geoString.coordinates) {
        return {
          longitude: parseFloat(geoString.coordinates[0]),
          latitude: parseFloat(geoString.coordinates[1]),
        }
      }
    } catch (error) {
      console.error('Error parsing geometry:', error)
    }

    return null
  }

  // --- Directions hook (copied from TrackLuggage) ---
  let globalLastFetchTime = 0

  const useDirections = ({ pickup, current, dropOff, showSnackbar, cooldownMs = 60000 }) => {
    const [routeData, setRouteData] = useState(null)
    const [cooldownActive, setCooldownActive] = useState(true)
    const [directionElements, setDirectionElements] = useState(null)

    const requestDirections = useCallback(() => {
      const now = Date.now()
      const timeSinceLast = now - globalLastFetchTime

      if (timeSinceLast < cooldownMs) {
          setCooldownActive(true)
          return
      }

      globalLastFetchTime = now
      setCooldownActive(true)

      setTimeout(() => {
          if (Date.now() - globalLastFetchTime >= cooldownMs) {
              setCooldownActive(false)
          }
      }, cooldownMs)

      if (!pickup || !dropOff) return
      if (!GOOGLE_MAPS_API_KEY) {
          showSnackbar("Directions are currently unavailable.")
          return
      }
      const pickupToDropoff = (
          <MapViewDirections
              key="pickupToDropoff"
              origin={pickup}
              destination={dropOff}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={0}
              strokeColor="transparent"
              onReady={(result) => {
                  setRouteData((prev) => ({
                    ...prev,
                    totalDistance: result.distance,
                    duration: result.duration,
                  }))
              }}
              onError={() => showSnackbar("Unable to fetch pickup → dropoff route")}
          />
      )

      const currentToDropoff = (
          <MapViewDirections
              key="currentToDropoff"
              origin={current || pickup}
              destination={dropOff}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={4}
              strokeColor="#0a6f12ff"
              onReady={(result) => {
                  setRouteData((prev) => ({
                    ...prev,
                    remainingDistance: result.distance,
                  }))
              }}
              onError={() => showSnackbar("Unable to fetch current → dropoff route")}
          />
      )

      setDirectionElements([pickupToDropoff, currentToDropoff])
  }, [pickup, current, dropOff, cooldownMs, showSnackbar])

    useEffect(() => {
      const interval = setInterval(() => {
        const isActive = Date.now() - globalLastFetchTime < cooldownMs
        setCooldownActive(isActive)
      }, 1000)
      return () => clearInterval(interval)
    }, [cooldownMs])

    return { routeData, requestDirections, cooldownActive, directionElements }
  }
  // --- end directions hook ---

  const dropOffCoords = parseGeometry(dropOffLocationGeo)
  const pickupCoords = parseGeometry(pickupLocationGeo)

  // Initialize directions hook using parsed coords and snackbar
  const { routeData, requestDirections: localRequestDirections, cooldownActive: localCooldownActive, directionElements } =
    useDirections({ pickup: pickupCoords, current: null, dropOff: dropOffCoords, showSnackbar })

  // Allow route params to override (backwards compatibility) otherwise use local hook
  const requestDirections = route.params?.requestDirections ?? localRequestDirections
  const cooldownActive = route.params?.cooldownActive ?? localCooldownActive

  const defaultRegion = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }

  const mapRegion = dropOffCoords
    ? {
        latitude: dropOffCoords.latitude,
        longitude: dropOffCoords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : defaultRegion

  const centerOnMarker = (coords) => {
    if (mapRef.current && coords) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        1000
      )
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement')} />
        <Appbar.Content title="Drop-Off Location" />
      </Appbar.Header>
      {SnackbarElement}
      <View style={styles.header}>
        <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
          {dropOffLocation || 'No address provided'}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={true}
          showsCompass={true}
          showsScale={true}
          showsMyLocationButton={true}
          showsTraffic={false}
          showsBuildings={true}
          showsIndoors={true}
          loadingEnabled={true}
        >
          {/* Pickup Marker */}
          {pickupCoords && (
            <Marker
              coordinate={pickupCoords}
              title="Pickup Location"
              description={pickupLocation || 'Pickup Point'}
              pinColor={colors.tertiary} // distinguish color
            />
          )}

          {/* Drop-off Marker */}
          {dropOffCoords && (
            <Marker
              coordinate={dropOffCoords}
              title="Drop-off Location"
              description={dropOffLocation}
              pinColor={colors.primary}
            />
          )}
          {/* Render directions elements when available */}
          {contractStatusId === 4 && directionElements}
        </MapView>

        {/* Control Buttons */}
        <View style={styles.buttonContainer}>
          {/* Center on Drop-off */}
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.primary }]}
            onPress={() => centerOnMarker(dropOffCoords)}
          >
            <IconButton icon="map-marker" size={24} iconColor={colors.onPrimary} />
          </TouchableOpacity>

          {/* Center on Pickup */}
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.primary }]}
            onPress={() => centerOnMarker(pickupCoords)}
          >
            <IconButton icon="map-marker-radius" size={24} iconColor={colors.onPrimary} />
          </TouchableOpacity>

          {/* Directions control (copied from TrackLuggage) */}
          {contractStatusId === 4 && (
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.primary }]}
              onPress={requestDirections}
              disabled={cooldownActive}
            >
              <IconButton icon="routes" size={24} iconColor={colors.onPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  mapContainer: {
    flex: 1,
    borderRadius: 8,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  buttonContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    gap: 8,
  },
  controlButton: {
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
})

export default CheckLocation
