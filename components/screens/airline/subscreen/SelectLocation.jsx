  import 'react-native-get-random-values'
  import { useState, useRef, useEffect, useCallback } from 'react'
  import { View, StyleSheet, ScrollView, Dimensions } from 'react-native'
  import { Text, Button, Appbar, Surface, useTheme, IconButton, Divider } from 'react-native-paper'
  import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
  import * as Location from 'expo-location'
  import GooglePlacesTextInput from 'react-native-google-places-textinput'
  import { GOOGLE_MAPS_API_KEY } from '@env'
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
        {/* Google Places Text Input */}
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
          <GooglePlacesTextInput
            placeholder="Search for a location"
            apiKey='AIzaSyB2fvlh9AZvzqY82xWrZ13aRPh2F3iNMhQ'
            language="en"
            components="country:ph"
            debounce={500}
            onPlaceSelect={(place) => {
              if (!place?.place_id) return
              fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key='AIzaSyB2fvlh9AZvzqY82xWrZ13aRPh2F3iNMhQ'`
              )
                .then((res) => res.json())
                .then((data) => {
                  if (data.result?.geometry) {
                    const { lat, lng } = data.result.geometry.location
                    // Use your existing callback to update state + center map
                    handlePlaceSelect({
                      formatted_address: data.result.formatted_address,
                      geometry: { location: { lat, lng } },
                    })
                  }
                })
                .catch((err) => console.error(err))
            }}
            styles={{
              textInput: styles.input,
              listView: { zIndex: 10 },
            }}
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
                    provider={PROVIDER_GOOGLE}
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
    scrollContent: { padding: 12, paddingBottom: 80 }, // leave space for sticky button
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
    footer: {
      position: 'absolute',
      bottom: 10,
      left: 16,
      right: 16,
    },
    confirmButton: { borderRadius: 12, elevation: 3 },
    confirmButtonContent: { height: 54 },
    helperText: {
      marginTop: 8,
      textAlign: 'center',
      fontStyle: 'italic',
      color: '#666',
    },
  })



  export default LocationSelection
