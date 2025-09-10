import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, useTheme, Appbar, IconButton } from 'react-native-paper'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import MapViewDirections from 'react-native-maps-directions'
import { GOOGLE_MAPS_API_KEY } from '@env'
import * as Location from 'expo-location'
import useSnackbar from '../../hooks/useSnackbar'

const CheckLocation = ({ route, navigation }) => {
  const { colors, fonts } = useTheme()
  const { dropOffLocation, dropOffLocationGeo } = route.params
  const mapRef = useRef(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const { showSnackbar, SnackbarElement } = useSnackbar()

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        showSnackbar('Permission to access location was denied')
        return
      }

      let location = await Location.getCurrentPositionAsync({})
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
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

  const dropOffCoords = parseGeometry(dropOffLocationGeo)

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

  const centerOnMarker = () => {
    if (mapRef.current && dropOffCoords) {
      mapRef.current.animateToRegion({
        latitude: dropOffCoords.latitude,
        longitude: dropOffCoords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000)
    }
  }

  const centerOnCurrentLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000)
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
          {dropOffCoords && (
            <Marker
              coordinate={dropOffCoords}
              title="Drop-off Location"
              description={dropOffLocation}
              pinColor={colors.primary}
            />
          )}
          {currentLocation && dropOffCoords && (
            <MapViewDirections
              origin={currentLocation}
              destination={dropOffCoords}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={4}
              strokeColor={colors.primary}
              optimizeWaypoints={false}
              onError={() => {
                showSnackbar('Unable to fetch route from Google Maps API')
              }}
            />
          )}
        </MapView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: colors.primary }]} 
            onPress={centerOnMarker}
          >
            <IconButton
              icon="map-marker"
              size={24}
              iconColor={colors.onPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: colors.primary }]} 
            onPress={centerOnCurrentLocation}
          >
            {/* <IconButton
              icon="crosshairs-gps"
              size={24}
              iconColor={colors.onPrimary}
            /> */}
          </TouchableOpacity>
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
