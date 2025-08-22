import 'react-native-get-random-values'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native'
import { Text, Button, Appbar, Surface, useTheme, IconButton, Divider } from 'react-native-paper'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import GooglePlacesTextInput from 'react-native-google-places-textinput'
import { GOOGLE_MAPS_PLACES_API_KEY } from '@env'

const { height: screenHeight } = Dimensions.get('window')

const INITIAL_CENTER = {
  latitude: 14.51974293733431,
  longitude: 121.01383118650679,
}

const SelectLocation = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [selectedLocation, setSelectedLocation] = useState({
    location: 'Terminal 3, NAIA, Pasay, Metro Manila, Philippines',
    lat: INITIAL_CENTER.latitude,
    lng: INITIAL_CENTER.longitude,
  })
  const [isMapExpanded, setIsMapExpanded] = useState(true)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const mapRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.error('Permission to access location was denied')
        return
      }
      mapRef.current?.animateToRegion(
        { ...INITIAL_CENTER, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500
      )
    })()
    return () => {
      geocodeTimeoutRef.current && clearTimeout(geocodeTimeoutRef.current)
    }
  }, [])

  // Function to fetch place details (including lat/lng) using a placeId
  const fetchPlaceDetails = useCallback(async (placeId) => {
    setIsFetchingLocation(true)
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_PLACES_API_KEY}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'OK' && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location
        const newLocation = data.result.formatted_address || data.result.name
        
        // Update the state with the new location and coordinates
        setSelectedLocation({ location: newLocation, lat, lng })
        
        // Animate the map to the new coordinates
        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        )
      } else {
        console.error('Error fetching place details:', data.status)
        // You could show an alert or a message to the user here
      }
    } catch (error) {
      console.error('Network or API error:', error)
    } finally {
      setIsFetchingLocation(false)
    }
  }, [])

  const handleMarkerDragEnd = useCallback(async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
      const formatted = address
        ? [address.name, address.street, address.district, address.city, address.region, address.postalCode, address.country]
            .filter(Boolean)
            .join(', ')
        : null
      setSelectedLocation({ location: formatted, lat: latitude, lng: longitude })
    } catch {
      setSelectedLocation({ location: null, lat: latitude, lng: longitude })
    }
  }, [])

  const handleRegionChange = useCallback((region) => {
    const { latitude, longitude } = region
    setSelectedLocation((prev) => ({ ...prev, lat: latitude, lng: longitude }))
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current)
    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
        const formatted = address
          ? [address.name, address.street, address.district, address.city, address.region, address.postalCode, address.country]
              .filter(Boolean)
              .join(', ')
          : null
        setSelectedLocation((prev) => ({ ...prev, location: formatted }))
      } catch {
        setSelectedLocation((prev) => ({ ...prev, location: null }))
      }
    }, 500)
  }, [])

  const handleCenterMap = useCallback(() => {
    mapRef.current?.animateToRegion(
      { ...INITIAL_CENTER, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500
    )
  }, [])

  const handleConfirm = useCallback(() => {
    if (!selectedLocation) return
    navigation.navigate('BookingManagement', {
      screen: 'create',
      locationData: {
        drop_off_location: selectedLocation.location,
        drop_off_location_geo: `POINT(${selectedLocation.lng} ${selectedLocation.lat})`,
      },
    })
  }, [selectedLocation, navigation])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement', { screen: 'create' })} />
        <Appbar.Content title="Drop-Off Location" titleStyle={[fonts.titleLarge, { color: colors.onSurface }]} />
      </Appbar.Header>
      <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
        <GooglePlacesTextInput
          placeholder="Search for a location"
          apiKey={GOOGLE_MAPS_PLACES_API_KEY}
          language="en"
          components="country:ph"
          debounce={3000}
          onPlaceSelect={(place) => {
            if (place.placeId) {
              fetchPlaceDetails(place.placeId)
            }
          }}
          placeHolderText='Search for a Location'
        />
      </Surface>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {/* Map Section */}
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.sectionHeader}>
            <IconButton icon="map" size={20} iconColor={colors.primary} />
            <Text style={[fonts.titleMedium, { color: colors.primary, flex: 1 }]}>Map View</Text>
            <IconButton
              icon={isMapExpanded ? 'chevron-up' : 'chevron-down'}
              onPress={() => setIsMapExpanded(!isMapExpanded)}
              size={24}
              iconColor={colors.primary}
            />
          </View>
          <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
          {isMapExpanded && (
            <View style={styles.mapContainer}>
              <Button
                mode="outlined"
                onPress={handleCenterMap}
                icon="crosshairs-gps"
                style={[styles.centerButton, { borderColor: colors.primary, marginBottom: 16 }]}
                labelStyle={[fonts.labelMedium, { color: colors.primary }]}
                contentStyle={styles.centerButtonContent}
              >
                Center to Terminal 3
              </Button>
              <View style={styles.mapWrapper}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={PROVIDER_DEFAULT}
                  initialRegion={{ ...INITIAL_CENTER, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                  onRegionChangeComplete={handleRegionChange}
                  maxZoomLevel={18}
                  minZoomLevel={5}
                  showsCompass
                  showsUserLocation={true}
                >
                  <Marker
                    coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
                    draggable
                    onDragEnd={handleMarkerDragEnd}
                    title="Selected Location"
                    description="Drag to adjust"
                    pinColor={colors.primary}
                  />
                </MapView>
              </View>
              <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, fontStyle: 'italic' }]}>
                Drag the marker or move the map to select a location
              </Text>
            </View>
          )}
        </Surface>

        {/* Selected Location Section */}
        {selectedLocation && (
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
            <View style={styles.sectionHeader}>
              <IconButton icon="map-marker-check" size={20} iconColor={colors.primary} />
              <Text style={[fonts.titleMedium, { color: colors.primary, flex: 1 }]}>Selected Location</Text>
            </View>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
            <View style={styles.locationDetails}>
              <Text style={[fonts.bodyMedium, { color: colors.onSurface, lineHeight: 22 }]}>
                {selectedLocation.location || 'No address found. Please drag the marker.'}
              </Text>
              <View style={styles.coordinatesContainer}>
                <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
                  Lat: {selectedLocation.lat?.toFixed(6) || 'N/A'}
                </Text>
                <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
                  Lng: {selectedLocation.lng?.toFixed(6) || 'N/A'}
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Confirm Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleConfirm}
            // Disable the button while fetching location or if no location is selected
            disabled={!selectedLocation || isFetchingLocation}
            style={[styles.confirmButton, { backgroundColor: selectedLocation && !isFetchingLocation ? colors.primary : colors.surfaceVariant }]}
            labelStyle={[fonts.labelLarge, { color: selectedLocation && !isFetchingLocation ? colors.onPrimary : colors.onSurfaceVariant }]}
            contentStyle={styles.confirmButtonContent}
            icon={selectedLocation ? 'check' : 'map-marker-off'}
          >
            {isFetchingLocation ? (
              <ActivityIndicator size="small" color={colors.onSurface} />
            ) : selectedLocation ? (
              'Confirm Location'
            ) : (
              'Select a Location First'
            )}
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { elevation: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 80 },
  surface: { borderRadius: 12, marginVertical: 10, marginHorizontal: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  divider: { height: 1, opacity: 0.3 },
  mapContainer: { padding: 12 },
  mapWrapper: { borderRadius: 12, overflow: 'hidden', elevation: 3, marginTop: 12 },
  map: { width: '100%', height: Math.min(screenHeight * 0.45, 320), borderRadius: 12 },
  input: { borderColor: '#bbb', borderWidth: 1, borderRadius: 8, padding: 10, margin: 12 },
  centerButton: { borderRadius: 8, borderWidth: 1.5, marginTop: 8 },
  centerButtonContent: { height: 42 },
  locationDetails: { padding: 16, paddingTop: 12 },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: { borderRadius: 12, elevation: 3 },
  confirmButtonContent: { height: 54 },
})

export default SelectLocation