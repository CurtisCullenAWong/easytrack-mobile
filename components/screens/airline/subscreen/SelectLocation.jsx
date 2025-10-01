import 'react-native-get-random-values'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native'
import { Text, Button, Appbar, Surface, useTheme, IconButton, Divider } from 'react-native-paper'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
import useSnackbar from '../../../hooks/useSnackbar'

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
  const [isGeocodingInProgress, setIsGeocodingInProgress] = useState(false)
  const mapRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [addressDetails, setAddressDetails] = useState(null)

  const isAnyGeocodingInProgress = isGeocodingInProgress

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        showSnackbar('Permission to access location was denied')
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

  const handleMarkerDragEnd = useCallback(async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate
    setIsGeocodingInProgress(true)
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
      const formatted = address
        ? [address.name, address.street, address.district, address.city, address.region, address.postalCode, address.country]
            .filter(Boolean)
            .join(', ')
        : null
      setSelectedLocation({ location: formatted, lat: latitude, lng: longitude })
      setAddressDetails(address || null)
    } catch (error) {
      console.error('Error in reverse geocoding:', error)
      setSelectedLocation({ location: null, lat: latitude, lng: longitude })
      setAddressDetails(null)
    } finally {
      setIsGeocodingInProgress(false)
    }
  }, [])

  const handleRegionChange = useCallback((region) => {
    const { latitude, longitude } = region
    setSelectedLocation((prev) => ({ ...prev, lat: latitude, lng: longitude }))
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current)
    geocodeTimeoutRef.current = setTimeout(async () => {
      setIsGeocodingInProgress(true)
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
        const formatted = address
          ? [address.name, address.street, address.district, address.city, address.region, address.postalCode, address.country]
              .filter(Boolean)
              .join(', ')
          : null
        setSelectedLocation((prev) => ({ ...prev, location: formatted }))
        setAddressDetails(address || null)
        console.log(address)
      } catch (error) {
        console.error('Error in reverse geocoding:', error)
        setSelectedLocation((prev) => ({ ...prev, location: null }))
        setAddressDetails(null)
      } finally {
        setIsGeocodingInProgress(false)
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
    if (!selectedLocation || isAnyGeocodingInProgress) return
    navigation.navigate('BookingManagement', {
      screen: 'create',
      locationData: {
        drop_off_location: selectedLocation.location,
        drop_off_location_geo: `POINT(${selectedLocation.lng} ${selectedLocation.lat})`,
        address_details: addressDetails,
      },
    })
  }, [selectedLocation, navigation, isAnyGeocodingInProgress, addressDetails])
  const placesRef = useRef(null)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement', { screen: 'create' })} />
        <Appbar.Content title="Drop-Off Location" titleStyle={[fonts.titleLarge, { color: colors.onSurface }]} />
      </Appbar.Header>
      {SnackbarElement}
      <Surface style={[styles.searchSurface, { backgroundColor: colors.surface }]} elevation={2}>
        <GooglePlacesAutocomplete
          placeholder="Search for a location..."
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
            components: 'country:ph',
            type: ['establishment', 'geocoding']
          }}
          minLength={3}
          debounce={1500}
          timeout={15000}
          fetchDetails={true}
          keepResultsAfterBlur={true}
          ref={placesRef}
          onPress={(data, details) => {
            if (details) {
              const { lat, lng } = details.geometry.location
              const newLocation = {
                location: data.description,
                lat,
                lng,
              }
              setSelectedLocation(newLocation)
              mapRef.current?.animateToRegion(
                {
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                },
                1000
              )
            }
            if (placesRef.current) {
              placesRef.current.setAddressText('')
            }
          }}
          predefinedPlaces={[]}
          textInputProps={{}}
          styles={{
            container: styles.autocompleteContainer,
            textInputContainer: {
              ...styles.textInputContainer,
              borderColor: colors.outlineVariant,
            },
            textInput: {
              ...styles.textInput,
              color: colors.onSurface,
            },
            listView: {
              ...styles.listView,
              backgroundColor: colors.surface,
            },
            row: {
              ...styles.row,
              borderBottomColor: colors.outlineVariant,
            },
            separator: {
              ...styles.separator,
              backgroundColor: colors.outlineVariant,
            },
            description: { color: colors.onSurface },
          }}
        />
      </Surface>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
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

        {selectedLocation && (
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
            <View style={styles.sectionHeader}>
              <IconButton icon="map-marker-check" size={20} iconColor={colors.primary} />
              <Text style={[fonts.titleMedium, { color: colors.primary, flex: 1 }]}>Selected Location</Text>
              {isAnyGeocodingInProgress && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
            <View style={styles.locationDetails}>
              <Text style={[fonts.bodyMedium, { color: colors.onSurface, lineHeight: 22 }]}>
                {isAnyGeocodingInProgress
                  ? 'Getting address...'
                  : selectedLocation.location || 'No address found. Please drag the marker.'
                }
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
            disabled={!selectedLocation || isAnyGeocodingInProgress}
            style={[styles.confirmButton, { backgroundColor: selectedLocation && !isAnyGeocodingInProgress ? colors.primary : colors.surfaceVariant }]}
            labelStyle={[fonts.labelLarge, { color: selectedLocation && !isAnyGeocodingInProgress ? colors.onPrimary : colors.onSurfaceVariant }]}
            contentStyle={styles.confirmButtonContent}
            icon={selectedLocation && !isAnyGeocodingInProgress ? 'check' : 'map-marker-off'}
          >
            {isAnyGeocodingInProgress ? (
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
  container: { 
    flex: 1 
  },
  header: { 
    elevation: 4 
  },
  searchSurface: {
    margin: 12,
    borderRadius: 12,
    padding: 12,
  },
  autocompleteContainer: { 
    flex: 0 
  },
  textInputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    fontSize: 16,
    paddingHorizontal: 12,
  },
  listView: {
    borderRadius: 8,
    marginTop: 4,
    elevation: 4,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    maxHeight: 80,
    zIndex: 999
  },
  emptyListContainer: {
    padding: 16,
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    padding: 12, 
    paddingBottom: 80 
  },
  surface: { 
    borderRadius: 12, 
    marginVertical: 10, 
    marginHorizontal: 10 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12 
  },
  divider: { 
    height: 1, 
    opacity: 0.3 
  },
  mapContainer: { 
    padding: 12 
  },
  mapWrapper: { 
    borderRadius: 12, 
    overflow: 'hidden', 
    elevation: 3, 
    marginTop: 12 
  },
  map: { 
    width: '100%', 
    height: Math.min(screenHeight * 0.45, 320), 
    borderRadius: 12 
  },
  centerButton: { 
    borderRadius: 8, 
    borderWidth: 1.5, 
    marginTop: 8 
  },
  centerButtonContent: { 
    height: 42 
  },
  locationDetails: { 
    padding: 16, 
    paddingTop: 12 
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  buttonContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  confirmButton: { 
    borderRadius: 12, 
    elevation: 3 
  },
  confirmButtonContent: { 
    height: 54 
  },
})

export default SelectLocation