import 'react-native-get-random-values'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native'
import { Text, Button, Appbar, Surface, useTheme, IconButton, Divider } from 'react-native-paper'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import React from 'react'
import { GOOGLE_MAPS_PLACES_API_KEY } from '@env'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

// Memoized Google Places Autocomplete component with debouncing
const MemoizedGooglePlacesAutocomplete = React.memo(({ onPlaceSelect, colors, fonts }) => {
  // const [isLoading, setIsLoading] = useState(false);
  // const [searchText, setSearchText] = useState('');
  const debounceTimeoutRef = useRef(null);

  // const handleTextChange = useCallback((text) => {
  //   setSearchText(text);
    
  //   // Clear any existing timeout
  //   if (debounceTimeoutRef.current) {
  //     clearTimeout(debounceTimeoutRef.current);
  //   }

  //   // Set loading state immediately if text is long enough
  //   if (text.length >= 3) {
  //     setIsLoading(true);
  //   } else {
  //     setIsLoading(false);
  //   }

  //   // Set a new timeout for 2 seconds
  //   debounceTimeoutRef.current = setTimeout(() => {
  //     setIsLoading(false);
  //   }, 2000);
  // }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <GooglePlacesAutocomplete
      placeholder="Search for a location..."
      onPress={onPlaceSelect}
      query={{
        key: GOOGLE_MAPS_PLACES_API_KEY,
        language: 'en',
        components: 'country:ph',
        types: ['establishment', 'geocode'], // Limit to establishments and addresses
      }}
      debounce={2000} // 2 second debounce
      minLength={3} // Minimum 3 characters before searching
      enableHighAccuracyLocation={true}
      timeout={15000} // 15 second timeout
      styles={{
        container: styles.searchContainer,
        textInput: {
          ...styles.searchInput,
          backgroundColor: colors.surfaceVariant,
          color: colors.onSurfaceVariant,
          borderColor: colors.outline,
          ...fonts.bodyMedium,
        },
        listView: {
          backgroundColor: colors.surface,
          borderColor: colors.outline,
          borderRadius: 8,
          marginTop: 4,
          elevation: 4,
          shadowColor: colors.outline,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          maxHeight: 200, // Limit the height to prevent overflow
        },
        row: {
          backgroundColor: colors.surface,
          paddingVertical: 12,
          paddingHorizontal: 16,
        },
        description: {
          color: colors.onSurfaceVariant,
          ...fonts.bodyMedium,
        },
        separator: {
          height: 1,
          backgroundColor: colors.outline,
          opacity: 0.3,
        },
        poweredContainer: {
          display: 'none', // Hide powered by Google
        },
      }}
      fetchDetails={true}
      enablePoweredByContainer={false}
      listEmptyComponent={
        <View style={styles.emptyListContainer}>
          <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
            'Start typing to search for locations'
          </Text>
        </View>
      }
      renderRow={(data) => (
        <View style={styles.searchRow}>
          <Text style={[fonts.bodyMedium, { color: colors.onSurface, flex: 1 }]}>
            {data.structured_formatting?.main_text || data.description}
          </Text>
          {data.structured_formatting?.secondary_text && (
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
              {data.structured_formatting.secondary_text}
            </Text>
          )}
        </View>
      )}
    />
  );
});

const LocationSelection = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isMapExpanded, setIsMapExpanded] = useState(true)
  const mapRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)

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

    // Clear any existing timeout
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    // Set a new timeout to geocode after 500ms of no movement
    geocodeTimeoutRef.current = setTimeout(async () => {
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
    }, 500);
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, []);

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
    <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
      <View style={styles.sectionHeader}>
        <IconButton
          icon="magnify"
          size={20}
          iconColor={colors.primary}
        />
        <Text style={[fonts.titleMedium, { color: colors.primary, flex: 1 }]}>
          Search Location
        </Text>
      </View>
      <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
      <View style={styles.searchWrapper}>
        <MemoizedGooglePlacesAutocomplete
          onPlaceSelect={handlePlaceSelect}
          colors={colors}
          fonts={fonts}
        />
      </View>
    </Surface>
  ), [colors, fonts, handlePlaceSelect])

  const renderMapSection = useMemo(() => (
    <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
      <View style={styles.sectionHeader}>
        <IconButton
          icon="map"
          size={20}
          iconColor={colors.primary}
        />
        <Text style={[fonts.titleMedium, { color: colors.primary, flex: 1 }]}>
          Map View
        </Text>
        <IconButton
          icon={isMapExpanded ? "chevron-up" : "chevron-down"}
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
            style={[styles.centerButton, { 
              borderColor: colors.primary,
              marginBottom: 16
            }]}
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
              showsMyLocationButton={false}
              showsUserLocation={false}
            >
              {selectedLocation && (
                <Marker
                  coordinate={{
                    latitude: selectedLocation.lat,
                    longitude: selectedLocation.lng,
                  }}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                  title='Selected Location'
                  description='Drag to adjust or tap to view details'
                  pinColor={colors.primary}
                />
              )}
            </MapView>
          </View>
          <Text style={[fonts.bodySmall, { 
            color: colors.onSurfaceVariant, 
            textAlign: 'center', 
            marginTop: 8,
            fontStyle: 'italic'
          }]}>
            Drag the marker or move the map to select a location
          </Text>
        </View>
      )}
    </Surface>
  ), [colors, fonts, handleCenterMap, handleRegionChange, handleMarkerDragEnd, selectedLocation, isMapExpanded])

  const renderSelectedLocation = useMemo(() => (
    selectedLocation && (
      <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
        <View style={styles.sectionHeader}>
          <IconButton
            icon="map-marker-check"
            size={20}
            iconColor={colors.primary}
          />
          <Text style={[fonts.titleMedium, { color: colors.primary, flex: 1 }]}>
            Selected Location
          </Text>
        </View>
        <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
        <View style={styles.locationDetails}>
          <Text style={[fonts.bodyMedium, { 
            color: colors.onSurface,
            lineHeight: 22
          }]}>
            {selectedLocation.location}
          </Text>
          <View style={styles.coordinatesContainer}>
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
              Lat: {selectedLocation.lat.toFixed(6)}
            </Text>
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
              Lng: {selectedLocation.lng.toFixed(6)}
            </Text>
          </View>
        </View>
      </Surface>
    )
  ), [selectedLocation, colors, fonts])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement', { 
          screen: 'create'
        })} />
        <Appbar.Content 
          title="Drop-Off Location" 
          titleStyle={[fonts.titleLarge, { color: colors.onSurface }]}
        />
      </Appbar.Header>
      
      {/* Fixed search section at the top */}
      <View style={styles.searchSectionContainer}>
        {renderSearchSection}
      </View>
      
      {/* Scrollable content below search */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderMapSection}
        {renderSelectedLocation}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleConfirm}
            disabled={!selectedLocation}
            style={[styles.confirmButton, { 
              backgroundColor: selectedLocation ? colors.primary : colors.surfaceVariant
            }]}
            labelStyle={[fonts.labelLarge, { 
              color: selectedLocation ? colors.onPrimary : colors.onSurfaceVariant 
            }]}
            contentStyle={styles.confirmButtonContent}
            icon={selectedLocation ? "check" : "map-marker-off"}
          >
            {selectedLocation ? 'Confirm Location' : 'Select a Location First'}
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchSectionContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  surface: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    opacity: 0.3,
  },
  searchContainer: {
    flex: 0,
  },
  searchWrapper: {
    padding: 16,
    paddingTop: 8,
  },
  searchInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchRow: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    padding: 20,
  },
  mapContainer: {
    padding: 16,
    paddingTop: 8,
  },
  mapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    width: '100%',
    height: Math.min(screenHeight * 0.4, 300),
    borderRadius: 12,
  },
  centerButton: {
    borderRadius: 8,
    borderWidth: 1.5,
  },
  centerButtonContent: {
    height: 44,
  },
  locationDetails: {
    padding: 16,
    paddingTop: 12,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  buttonContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  confirmButton: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  confirmButtonContent: {
    height: 56,
  },
})

export default LocationSelection