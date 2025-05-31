import 'react-native-get-random-values'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Button, Appbar, Surface, useTheme, IconButton } from 'react-native-paper'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import React from 'react'

const INITIAL_CENTER = {
  latitude: 14.51974293733431,
  longitude: 121.01383118650679,
}

const PHILIPPINES_BOUNDS = {
  northEast: {
    latitude: 21.3217809,
    longitude: 126.6015244
  },
  southWest: {
    latitude: 4.6415,
    longitude: 116.9535
  }
}

// Memoized Google Places Autocomplete component
const MemoizedGooglePlacesAutocomplete = React.memo(({ onPlaceSelect, colors, fonts }) => (
  <GooglePlacesAutocomplete
    placeholder="Search location"
    onPress={onPlaceSelect}
    query={{
      key: 'AIzaSyDFmfy3j09egUbTeDImVNnMCFgOjVvLUUM',
      language: 'en',
      components: 'country:ph',
    }}
    styles={{
      container: styles.searchContainer,
      textInput: {
        ...styles.searchInput,
        backgroundColor: colors.surface,
        color: colors.onSurface,
        borderColor: colors.outline,
        ...fonts.bodyMedium,
      },
      listView: {
        backgroundColor: colors.surface,
        borderColor: colors.outline,
      },
      row: {
        backgroundColor: colors.surface,
      },
      description: {
        color: colors.onSurface,
        ...fonts.bodyMedium,
      },
    }}
    fetchDetails={true}
    enablePoweredByContainer={false}
  />
))

const LocationSelection = ({ navigation, route }) => {
  const { colors, fonts } = useTheme()
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isMapExpanded, setIsMapExpanded] = useState(true)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Request location permissions
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
    })();
  }, []);

  const handlePlaceSelect = useCallback((data, details = null) => {
    if (details) {
      const newLocation = {
        location: details.formatted_address,
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng
      }
      setSelectedLocation(newLocation)
      
      // Center map on selected location with faster animation
      mapRef.current?.animateToRegion({
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 100, 'easeInOut')
    }
  }, [])

  const handleMarkerDragEnd = useCallback(async (e) => {
    const newPosition = {
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
    }

    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: newPosition.latitude,
        longitude: newPosition.longitude
      });

      if (address) {
        const formattedAddress = [
          address.name,
          address.street,
          address.district,
          address.subregion,
          address.city,
          address.region,
          address.postalCode,
          address.country
        ].filter(Boolean).join(', ');

        const newLocation = {
          location: formattedAddress,
          lat: newPosition.latitude,
          lng: newPosition.longitude,
        }
        setSelectedLocation(newLocation)
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, [])

  const handleRegionChange = useCallback(async (region) => {
    const { latitude, longitude } = region;
    
    // Update marker position immediately
    setSelectedLocation(prev => ({
      ...prev,
      lat: latitude,
      lng: longitude
    }));

    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (address) {
        const formattedAddress = [
          address.name,
          address.street,
          address.district,
          address.subregion,
          address.city,
          address.region,
          address.postalCode,
          address.country
        ].filter(Boolean).join(', ');

        setSelectedLocation(prev => ({
          ...prev,
          location: formattedAddress
        }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, [])

  const handleCenterMap = useCallback(() => {
    mapRef.current?.animateToRegion({
      ...INITIAL_CENTER,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 100, 'easeInOut')
  }, [])

  const handleConfirm = useCallback(() => {
    if (selectedLocation) {
      // Format the location data for Supabase
      const locationData = {
        drop_off_location: selectedLocation.location,
        drop_off_location_geo: `POINT(${selectedLocation.lng} ${selectedLocation.lat})`
      }
      
      // Navigate back to MakeContracts with the location data
      navigation.navigate('BookingManagement', { 
        screen: 'create',
        locationData
      })
    }
  }, [selectedLocation, navigation])

  // Memoized render functions
  const renderSearchSection = useMemo(() => (
    <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
      <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 8 }]}>
        Search Location
      </Text>
      <MemoizedGooglePlacesAutocomplete
        onPlaceSelect={handlePlaceSelect}
        colors={colors}
        fonts={fonts}
      />
    </Surface>
  ), [colors, fonts, handlePlaceSelect])

  const renderMapSection = useMemo(() => (
    <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
      <View style={styles.mapHeader}>
        <Text style={[fonts.titleMedium, { color: colors.primary }]}>
          Map View
        </Text>
          <IconButton
            icon={isMapExpanded ? "chevron-down" : "chevron-up"}
            onPress={() => setIsMapExpanded(!isMapExpanded)}
            size={24}
          />
          
      </View>
      {isMapExpanded && (
        <>
        <Button
            mode="contained"
            onPress={handleCenterMap}
            icon="map-marker"
            style={[styles.centerButton, { backgroundColor: colors.primary, marginBottom: 20, alignSelf:'center' }]}
            labelStyle={[fonts.labelLarge, { color: colors.onPrimary }]}
          >
            Center to Terminal 3
          </Button>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            ...INITIAL_CENTER,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onRegionChange={handleRegionChange}
          maxZoomLevel={18}
          minZoomLevel={5}
          restrictToBounds={true}
          bounds={PHILIPPINES_BOUNDS}
          showsCompass={true}
          showsZoomControls={true}
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng,
              }}
              draggable
              onDragEnd={handleMarkerDragEnd}
              title='Move map or Hold and drag the marker'
              description={selectedLocation.location}
            />
          )}
        </MapView>
        </>
        
      )}
    </Surface>
  ), [colors, fonts, handleCenterMap, handleRegionChange, handleMarkerDragEnd, selectedLocation, isMapExpanded])

  const renderSelectedLocation = useMemo(() => (
    selectedLocation && (
      <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
        <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 8 }]}>
          Selected Location
        </Text>
        <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
          {selectedLocation.location}
        </Text>
      </Surface>
    )
  ), [selectedLocation, colors, fonts])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement', { 
          screen: 'create'
        })} />
        <Appbar.Content title="Drop-Off Location" />
      </Appbar.Header>
      <View style={styles.content}>
        {renderSearchSection}
        <ScrollView>
        {renderMapSection}
        {renderSelectedLocation}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleConfirm}
            disabled={!selectedLocation}
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            labelStyle={[fonts.labelLarge, { color: colors.onPrimary }]}
          >
            Confirm Location
          </Button>
        </View>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  surface: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 0,
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    paddingBottom: 16,
  },
  confirmButton: {
    width: '100%',
    height: 50,
    justifyContent:'center'
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  centerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
})

export default React.memo(LocationSelection)