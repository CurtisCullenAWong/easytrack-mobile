import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, useTheme, Appbar, IconButton, Button } from 'react-native-paper'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { supabase } from '../../../../lib/supabaseAdmin' // Adjust path as needed

const AdminCheckLocation = ({ route, navigation }) => {
  const { colors, fonts } = useTheme()
  const { id } = route.params
  const mapRef = useRef(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [dropOffLocationGeo, setDropOffLocationGeo] = useState(null)
  const [contract_status_id, setContractStatusId] = useState(null)

  useEffect(() => {
    // Fetch contract info from Supabase
    const fetchContract = async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('drop_off_location, drop_off_location_geo, contract_status_id')
        .eq('id', id)
        .single()
      if (error) {
        console.error('Supabase error:', error)
        return
      }
      setDropOffLocation(data.drop_off_location)
      setDropOffLocationGeo(data.drop_off_location_geo)
      setContractStatusId(data.contract_status_id)
    }
    fetchContract()
  }, [id])

  useEffect(() => {
    if (contract_status_id !== 1) return
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.log('Permission to access location was denied')
        return
      }
      let location = await Location.getCurrentPositionAsync({})
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
    })()
  }, [contract_status_id])

  const parseGeometry = (geoString) => {
    if (!geoString) return null
    try {
      if (typeof geoString === 'string') {
        // Handles "POINT(lon lat)" or "POINT(lat lon)"
        const coords = geoString.replace('POINT(', '').replace(')', '').split(' ')
        // Try both orders, fallback to default if invalid
        const lon = parseFloat(coords[0])
        const lat = parseFloat(coords[1])
        if (!isNaN(lat) && !isNaN(lon)) {
          // If latitude is in valid range, use as is
          if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            return { latitude: lat, longitude: lon }
          }
          // If reversed, swap
          if (lon >= -90 && lon <= 90 && lat >= -180 && lat <= 180) {
            return { latitude: lon, longitude: lat }
          }
        }
      } else if (typeof geoString === 'object' && geoString.coordinates) {
        // Handles GeoJSON: [lon, lat]
        const lon = parseFloat(geoString.coordinates[0])
        const lat = parseFloat(geoString.coordinates[1])
        if (!isNaN(lat) && !isNaN(lon)) {
          return { latitude: lat, longitude: lon }
        }
      }
    } catch (error) {
      console.error('Error parsing geometry:', error)
    }
    return null
  }

  const dropOffCoords = parseGeometry(dropOffLocationGeo)
  console.log('dropOffLocationGeo:', dropOffLocationGeo)
  console.log('dropOffCoords:', dropOffCoords)
  console.log('Route Params:', route.params)
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

  if (contract_status_id !== 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Drop-Off Location" />
        </Appbar.Header>
        <Text style={[fonts.bodyLarge, { color: colors.error, marginTop: 32 }]}>
          Location can only be checked for Pending contracts.
        </Text>
        <Button mode="contained" style={{ marginTop: 24 }} onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Drop-Off Location" />
      </Appbar.Header>

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
          {dropOffCoords && dropOffCoords.latitude && dropOffCoords.longitude && (
            <Marker
              coordinate={{
                latitude: dropOffCoords.latitude,
                longitude: dropOffCoords.longitude,
              }}
              title="Drop-off Location"
              description={dropOffLocation}
              pinColor={colors.primary}
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

export default AdminCheckLocation