import React, { useRef, useEffect, useState, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, useTheme, Appbar, FAB, Divider } from 'react-native-paper'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import MapViewDirections from 'react-native-maps-directions'
import useSnackbar from '../../hooks/useSnackbar'

const CheckLocation = ({ route, navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar } = useSnackbar()
  const { pickupLocation, pickupLocationGeo, dropOffLocation, dropOffLocationGeo } = route.params
  const mapRef = useRef(null)
  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  const [directionElement, setDirectionElement] = useState(null)
  const [cooldownActive, setCooldownActive] = useState(false)
  const cooldownMs = 150000
  const [lastFetchTs, setLastFetchTs] = useState(0)

  const parseGeometry = (geoString) => {
    if (!geoString) return null
    try {
      if (typeof geoString === 'string') {
        const coords = geoString.replace('POINT(', '').replace(')', '').split(' ')
        return { longitude: parseFloat(coords[0]), latitude: parseFloat(coords[1]) }
      } else if (typeof geoString === 'object' && geoString.coordinates) {
        return { longitude: parseFloat(geoString.coordinates[0]), latitude: parseFloat(geoString.coordinates[1]) }
      }
    } catch (error) {
      console.error('Error parsing geometry:', error)
    }
    return null
  }

  const dropOffCoords = parseGeometry(dropOffLocationGeo)
  const pickupCoords = parseGeometry(pickupLocationGeo)

  const defaultRegion = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }

  // Auto-fit both markers when available
  useEffect(() => {
    if (mapRef.current && pickupCoords && dropOffCoords) {
      mapRef.current.fitToCoordinates([pickupCoords, dropOffCoords], {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      })
    }
  }, [pickupCoords, dropOffCoords])

  const mapRegion = dropOffCoords || pickupCoords
    ? {
        latitude: dropOffCoords?.latitude || pickupCoords.latitude,
        longitude: dropOffCoords?.longitude || pickupCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : defaultRegion

  const centerOnMarker = (coords) => {
    if (mapRef.current && coords) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      )
    }
  }

  // Directions handling (pickup -> dropoff)
  const requestDirections = useCallback(() => {
    const now = Date.now()
    if (now - lastFetchTs < cooldownMs) {
      setCooldownActive(true)
      return
    }
    setLastFetchTs(now)
    setCooldownActive(true)
    setTimeout(() => setCooldownActive(false), cooldownMs)

    if (!pickupCoords || !dropOffCoords) return
    if (!GOOGLE_MAPS_API_KEY) {
      showSnackbar('Directions are currently unavailable.')
      return
    }

    const elem = (
      <MapViewDirections
        key={`pickupToDropoff-${now}`}
        origin={pickupCoords}
        destination={dropOffCoords}
        apikey={GOOGLE_MAPS_API_KEY}
        strokeWidth={4}
        strokeColor={colors.primary}
        onError={() => showSnackbar('Unable to fetch pickup → dropoff route')}
      />
    )
    setDirectionElement(elem)
  }, [pickupCoords, dropOffCoords, GOOGLE_MAPS_API_KEY, colors.primary, cooldownMs, lastFetchTs, showSnackbar])

  useEffect(() => {
    const interval = setInterval(() => {
      const active = Date.now() - lastFetchTs < cooldownMs
      setCooldownActive(active)
    }, 1000)
    return () => clearInterval(interval)
  }, [lastFetchTs, cooldownMs])

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement')} />
        <Appbar.Content title="Delivery Locations" />
      </Appbar.Header>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation
        showsCompass
        loadingEnabled
      >
        {pickupCoords && (
          <Marker
            coordinate={pickupCoords}
            title="Pickup"
            description={pickupLocation}
            pinColor={colors.error} // red for pickup
          />
        )}
        {dropOffCoords && (
          <Marker
            coordinate={dropOffCoords}
            title="Drop-off"
            description={dropOffLocation}
            pinColor={colors.primary} // primary for drop-off
          />
        )}
        {pickupCoords && dropOffCoords && directionElement}
      </MapView>

      {/* Overlay card for addresses */}
      <View style={[styles.addressCard, { backgroundColor: colors.surface }]}>
        <Text style={[fonts.titleMedium, { color: colors.error }]}>Pickup</Text>
        <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>{pickupLocation || 'No address provided'}</Text>

        <Divider style={{ marginVertical: 12 }} />

        <Text style={[fonts.titleMedium, { color: colors.primary }]}>Drop-off</Text>
        <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>{dropOffLocation || 'No address provided'}</Text>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {pickupCoords && (
          <FAB
            small
            icon="map-marker"
            style={{ backgroundColor: colors.error }}
            color={colors.onPrimary}
            onPress={() => centerOnMarker(pickupCoords)}
          />
        )}
        {dropOffCoords && (
          <FAB
            small
            icon="map-marker-radius"
            style={{ backgroundColor: colors.primary }}
            color={colors.onPrimary}
            onPress={() => centerOnMarker(dropOffCoords)}
          />
        )}
        {pickupCoords && dropOffCoords && (
          <FAB
            small
            icon="routes"
            style={{ backgroundColor: colors.primary }}
            color={colors.onPrimary}
            onPress={requestDirections}
            disabled={cooldownActive}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  addressCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 4,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    gap: 12,
  },
})

export default CheckLocation