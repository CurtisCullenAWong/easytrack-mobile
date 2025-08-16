import 'react-native-get-random-values'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native'
import { Text, Button, Appbar, Surface, useTheme, IconButton, Divider } from 'react-native-paper'
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'

const { height: screenHeight } = Dimensions.get('window')

const INITIAL_CENTER = {
  latitude: 14.51974293733431,
  longitude: 121.01383118650679,
}

const LocationSelection = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [selectedLocation, setSelectedLocation] = useState({
    location: 'Terminal 3, NAIA, Pasay, Metro Manila, Philippines',
    lat: INITIAL_CENTER.latitude,
    lng: INITIAL_CENTER.longitude,
  })
  const [isMapExpanded, setIsMapExpanded] = useState(true)
  const mapRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') console.log('Permission to access location was denied')
    })()
    return () => geocodeTimeoutRef.current && clearTimeout(geocodeTimeoutRef.current)
  }, [])

  const handlePlaceSelect = useCallback((details) => {
    if (!details) return
    const { lat, lng } = details.geometry.location
    setSelectedLocation({ location: details.formatted_address, lat, lng })
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      100
    )
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
    mapRef.current?.animateToRegion({ ...INITIAL_CENTER, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 100)
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Google Places Autocomplete Input */}
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
          {/* <GooglePlacesAutocomplete
            placeholder="Search for a location"
            fetchDetails
            onPress={(data, details = null) => handlePlaceSelect(details)}
            query={{ key: 'AIzaSyARe0LxsbiUCEOhJqwuvUSa6EaSgWgBYPQ', language: 'en', components: 'country:ph' }}
            styles={{ textInput: styles.input }}
          /> */}
        </Surface>

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

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleConfirm}
            disabled={!selectedLocation}
            style={[styles.confirmButton, { backgroundColor: selectedLocation ? colors.primary : colors.surfaceVariant }]}
            labelStyle={[fonts.labelLarge, { color: selectedLocation ? colors.onPrimary : colors.onSurfaceVariant }]}
            contentStyle={styles.confirmButtonContent}
            icon={selectedLocation ? 'check' : 'map-marker-off'}
          >
            {selectedLocation ? 'Confirm Location' : 'Select a Location First'}
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
  scrollContent: { padding: 16, paddingBottom: 32 },
  surface: { borderRadius: 12, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  divider: { height: 1, opacity: 0.3 },
  mapContainer: { padding: 16, paddingTop: 8 },
  mapWrapper: { borderRadius: 12, overflow: 'hidden', elevation: 4 },
  map: { width: '100%', height: Math.min(screenHeight * 0.4, 300), borderRadius: 12 },
  input: { borderColor: '#888', borderWidth: 1, borderRadius: 8, padding: 8, margin: 8 },
  centerButton: { borderRadius: 8, borderWidth: 1.5 },
  centerButtonContent: { height: 44 },
  locationDetails: { padding: 16, paddingTop: 12 },
  coordinatesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  buttonContainer: { marginTop: 8, paddingHorizontal: 4 },
  confirmButton: { borderRadius: 12, elevation: 4 },
  confirmButtonContent: { height: 56 },
})

export default LocationSelection
