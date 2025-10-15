import 'react-native-get-random-values'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Text, Button, Appbar, Surface, useTheme, IconButton, Divider, Menu, TextInput } from 'react-native-paper'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import useRequestPermissions from '../../../hooks/usePermissions'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
import useSnackbar from '../../../hooks/useSnackbar'
import { fetchBaseDeliveryFeeForAddress } from '../../../../utils/pricingUtils'
import { supabase } from '../../../../lib/supabase'
import BottomModal from '../../../customComponents/BottomModal'

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
  const [isMapModalVisible, setIsMapModalVisible] = useState(false)
  const [isGeocodingInProgress, setIsGeocodingInProgress] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [isFetchingPrice, setIsFetchingPrice] = useState(false)
  const [pricingStatus, setPricingStatus] = useState(null) // 'ok', 'no_pricing', 'no_match'
  const mapRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [addressDetails, setAddressDetails] = useState(null)

  // Track if user is dragging the map or marker to prevent modal swipe conflict
  const [isMapInteracting, setIsMapInteracting] = useState(false)

  // Pricing dropdown states
  const [pricingData, setPricingData] = useState([])
  const [pricingRegions, setPricingRegions] = useState([])
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedCity, setSelectedCity] = useState('')
  const [showRegionMenu, setShowRegionMenu] = useState(false)
  const [showCityMenu, setShowCityMenu] = useState(false)
  const [regionQuery, setRegionQuery] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [loadingPricingData, setLoadingPricingData] = useState(false)

  const isAnyGeocodingInProgress = isGeocodingInProgress

  useRequestPermissions({ 
    locationForeground: true,
    onPermissionDenied: (type, canAskAgain) => {
      if (type === 'location') {
        showSnackbar('Location access is required to use map features')
        // Only navigate to Home if user actively denied (not if already denied)
        if (canAskAgain === false) {
          navigation.navigate('Home')
        }
      }
    }
  })

  // Fetch pricing regions on mount
  useEffect(() => {
    const fetchPricingRegions = async () => {
      try {
        setLoadingPricingData(true)
        const { data, error } = await supabase
          .from('pricing_region')
          .select('*')
          .order('region', { ascending: true })

        if (error) throw error
        setPricingRegions(data || [])
      } catch (error) {
        console.error('Error fetching pricing regions:', error)
        showSnackbar('Failed to load pricing regions')
      } finally {
        setLoadingPricingData(false)
      }
    }

    fetchPricingRegions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch cities when region is selected
  useEffect(() => {
    const fetchCitiesByRegion = async () => {
      if (!selectedRegion) {
        setPricingData([])
        return
      }

      try {
        setLoadingPricingData(true)
        const { data, error } = await supabase
          .from('pricing')
          .select('*')
          .eq('region_id', selectedRegion.id)
          .order('city', { ascending: true })

        if (error) throw error
        setPricingData(data || [])
      } catch (error) {
        console.error('Error fetching pricing data:', error)
        showSnackbar('Failed to load cities')
        setPricingData([])
      } finally {
        setLoadingPricingData(false)
      }
    }

    fetchCitiesByRegion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion])

  // Filter regions based on search query
  const filteredRegions = useMemo(() => {
    const query = regionQuery.toLowerCase().trim()
    if (!query) return pricingRegions

    return pricingRegions.filter(region =>
      region.region.toLowerCase().includes(query)
    )
  }, [pricingRegions, regionQuery])

  // Filter cities based on search query and sort: cities with prices first, then those without
  const filteredCities = useMemo(() => {
    const query = cityQuery.toLowerCase().trim()
    let filtered = query 
      ? pricingData.filter(item => item.city.toLowerCase().includes(query))
      : pricingData

    // Sort: cities with prices first (alphabetically), then those without prices (alphabetically)
    return filtered.sort((a, b) => {
      const hasA = a.price != null && a.price > 0
      const hasB = b.price != null && b.price > 0
      
      if (hasA && !hasB) return -1
      if (!hasA && hasB) return 1
      
      // Both have prices or both don't have prices - sort alphabetically
      return a.city.localeCompare(b.city)
    })
  }, [pricingData, cityQuery])

  useEffect(() => {
    mapRef.current?.animateToRegion(
      { ...INITIAL_CENTER, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500
    )
    return () => {
      geocodeTimeoutRef.current && clearTimeout(geocodeTimeoutRef.current)
    }
  }, [])

  const handleMarkerDragStart = useCallback(() => {
    setIsMapInteracting(true)
  }, [])

  const handleMarkerDragEnd = useCallback(async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate
    setIsGeocodingInProgress(true)
    
    // Clear dropdown selections when location changes
    setSelectedRegion(null)
    setSelectedCity('')
    setRegionQuery('')
    setCityQuery('')
    
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
      const formatted = address
        ? [address.name, address.street, address.district, address.city, address.region, address.postalCode, address.country]
            .filter(Boolean)
            .join(', ')
        : null
      setSelectedLocation({ location: formatted, lat: latitude, lng: longitude })
      setAddressDetails(address || null)
      
      // Fetch pricing for the new location
      if (formatted && address) {
        setIsFetchingPrice(true)
        const { fee, status } = await fetchBaseDeliveryFeeForAddress(address.city, address.region)
        setDeliveryFee(fee)
        setPricingStatus(status)
        setIsFetchingPrice(false)
        
        if (status === 'no_pricing') {
          showSnackbar('No pricing data available for this location')
        } else if (status === 'no_match') {
          showSnackbar('This location is either invalid or out of delivery bounds')
        }
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error)
      setSelectedLocation({ location: null, lat: latitude, lng: longitude })
      setAddressDetails(null)
      setDeliveryFee(0)
      setPricingStatus(null)
    } finally {
      setIsGeocodingInProgress(false)
      // Reset interaction state after a short delay to ensure smooth gesture handling
      setTimeout(() => setIsMapInteracting(false), 100)
    }
  }, [showSnackbar])

  const handleRegionChange = useCallback((region) => {
    const { latitude, longitude } = region
    setSelectedLocation((prev) => ({ ...prev, lat: latitude, lng: longitude }))
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current)
    geocodeTimeoutRef.current = setTimeout(async () => {
      setIsGeocodingInProgress(true)
      
      // Clear dropdown selections when location changes
      setSelectedRegion(null)
      setSelectedCity('')
      setRegionQuery('')
      setCityQuery('')
      
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
        const formatted = address
          ? [address.name, address.street, address.district, address.city, address.region, address.subregion, address.postalCode, address.country]
              .filter(Boolean)
              .join(', ')
          : null
        setSelectedLocation((prev) => ({ ...prev, location: formatted }))
        setAddressDetails(address || null)
        console.log(address.city, address.region)
        
        // Fetch pricing for the new location
        if (formatted) {
          setIsFetchingPrice(true)
          const { fee, status } = await fetchBaseDeliveryFeeForAddress(address.city, address.region)
          setDeliveryFee(fee)
          setPricingStatus(status)
          setIsFetchingPrice(false)
          
          if (status === 'no_pricing') {
            showSnackbar('No pricing data available for this location')
          } else if (status === 'no_match') {
            showSnackbar('This location is either invalid or out of delivery bounds')
          }
        }
      } catch (error) {
        console.error('Error in reverse geocoding:', error)
        setSelectedLocation((prev) => ({ ...prev, location: null }))
        setAddressDetails(null)
        setDeliveryFee(0)
        setPricingStatus(null)
      } finally {
        setIsGeocodingInProgress(false)
      }
    }, 500)
  }, [showSnackbar])

  const handleCenterMap = useCallback(() => {
    mapRef.current?.animateToRegion(
      { ...INITIAL_CENTER, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500
    )
  }, [])

  const handleCitySelection = useCallback(async (item) => {
    setSelectedCity(item.city)
    setCityQuery('')
    setShowCityMenu(false)
    // Update delivery fee based on selected city
    setDeliveryFee(item.price || 0)
    setPricingStatus('ok')

    // Geocode the city and move map to that location
    try {
      setIsGeocodingInProgress(true)
      // Construct a full address for better geocoding results
      const regionName = selectedRegion?.region || ''
      const searchAddress = `${item.city}, ${regionName}, Philippines`
      
      const geocodeResult = await Location.geocodeAsync(searchAddress)
      
      if (geocodeResult && geocodeResult.length > 0) {
        const { latitude, longitude } = geocodeResult[0]
        
        // Update selected location and marker position first
        setSelectedLocation({
          location: searchAddress,
          lat: latitude,
          lng: longitude,
        })
        
        // Then animate map to center on the marker
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          1000
        )
        
        // Try to get more detailed address information
        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude })
        if (reverseGeocode && reverseGeocode.length > 0) {
          const address = reverseGeocode[0]
          const formatted = [address.name, address.street, address.district, address.city, address.region, address.postalCode, address.country]
            .filter(Boolean)
            .join(', ')
          
          setSelectedLocation({
            location: formatted || searchAddress,
            lat: latitude,
            lng: longitude,
          })
          setAddressDetails(address)
        }
        
        showSnackbar(`Map centered on ${item.city}`, true)
      } else {
        showSnackbar('Could not locate city on map. Please use search or drag the marker.')
      }
    } catch (error) {
      console.error('Error geocoding city:', error)
      showSnackbar('Could not locate city on map')
    } finally {
      setIsGeocodingInProgress(false)
    }
  }, [selectedRegion, showSnackbar])

  const handleConfirm = useCallback(() => {
    if (!selectedLocation || isAnyGeocodingInProgress) return
    navigation.navigate('BookingManagement', {
      screen: 'create',
      locationData: {
        drop_off_location: selectedLocation.location,
        drop_off_location_geo: `POINT(${selectedLocation.lng} ${selectedLocation.lat})`,
        address_details: addressDetails,
        delivery_fee: deliveryFee,
        pricing_status: pricingStatus,
      },
    })
  }, [selectedLocation, navigation, isAnyGeocodingInProgress, addressDetails, deliveryFee, pricingStatus])
  const placesRef = useRef(null)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement', { screen: 'create' })} />
        <Appbar.Content title="Drop-Off Location" titleStyle={[fonts.titleLarge, { color: colors.onSurface }]} />
      </Appbar.Header>
      {SnackbarElement}
        {/* Pricing Information */}
        {selectedLocation && selectedLocation.location && (
          <View>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
            <View style={styles.locationDetails}>
              {isFetchingPrice ? (
                <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', fontStyle: 'italic' }]}>
                  Calculating delivery fee...
                </Text> 
              ) : pricingStatus === 'ok' && deliveryFee > 0 ? (
                <View>
                  <Text style={[fonts.headlineSmall, { color: colors.primary, textAlign: 'center', fontWeight: 'bold' }]}>
                    ₱{deliveryFee.toFixed(2)}
                  </Text>
                  <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }]}>
                    Base delivery fee per set of 3 luggage
                  </Text>
                </View>
              ) : pricingStatus === 'no_pricing' ? (
                <View style={[styles.warningContainer, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
                  <IconButton icon="alert-circle" size={20} iconColor={colors.error} style={{ margin: 0 }} />
                  <Text style={[fonts.bodyMedium, { color: colors.error, flex: 1, marginLeft: 8 }]}>
                    No pricing data available for this location
                  </Text>
                </View>
              ) : pricingStatus === 'no_match' ? (
                <View style={[styles.warningContainer, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
                  <IconButton icon="alert-circle" size={20} iconColor={colors.error} style={{ margin: 0 }} />
                  <Text style={[fonts.bodyMedium, { color: colors.error, flex: 1, marginLeft: 8 }]}>
                    This location is either invalid or out of delivery bounds
                  </Text>
                </View>
              ) : (
                <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', fontStyle: 'italic' }]}>
                  Move the map to see delivery pricing
                </Text>
              )}
            </View>
          </View>
        )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        
      {/* Pricing Region and City Selection */}
      <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
        <View style={styles.sectionFooter}>
          <IconButton icon="database-search" size={20} iconColor={colors.primary} />
          <Text style={[fonts.titleMedium, { color: colors.primary, flex: 1 }]}>Browse Pricing Database</Text>
          {loadingPricingData && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
        <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
        
        <View style={{ padding: 12 }}>
          {/* Region Dropdown */}
          <Menu
            visible={showRegionMenu}
            onDismiss={() => setShowRegionMenu(false)}
            anchor={
              <TouchableOpacity onPress={() => setShowRegionMenu(prev => !prev)}>
                <TextInput
                  label="Select Region"
                  value={selectedRegion ? selectedRegion.region : regionQuery}
                  onChangeText={(text) => {
                    setRegionQuery(text)
                    setSelectedRegion(null)
                  }}
                  editable={false}
                  mode="outlined"
                  style={{ marginBottom: 8 }}
                  left={
                    <TextInput.Icon 
                      icon="magnify" 
                      onPress={() => setShowRegionMenu(prev => !prev)}
                    />
                  }
                  right={
                    selectedRegion && (
                      <TextInput.Icon
                        icon="close"
                        onPress={() => {
                          setSelectedRegion(null)
                          setRegionQuery('')
                          setSelectedCity('')
                          setCityQuery('')
                        }}
                      />
                    )
                  }
                  placeholder="Search region..."
                />
              </TouchableOpacity>
            }
            contentStyle={{ 
              backgroundColor: colors.surface,
              maxHeight: 300,
              width: '100%',
            }}
            style={{
              marginTop: 8,
            }}
          >
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled={true}>
              {filteredRegions.length === 0 ? (
                <Menu.Item
                  title="No regions found"
                  disabled
                  titleStyle={{ color: colors.onSurfaceVariant, fontSize: 14 }}
                  style={{ minHeight: 40, height: 40 }}
                />
              ) : (
                filteredRegions.map((region) => (
                  <Menu.Item
                    key={region.id}
                    onPress={() => {
                      setSelectedRegion(region)
                      setRegionQuery('')
                      setShowRegionMenu(false)
                      setSelectedCity('')
                      setCityQuery('')
                    }}
                    title={region.region}
                    titleStyle={{ color: colors.onSurface, fontSize: 14 }}
                    style={{ minHeight: 40, height: 40 }}
                  />
                ))
              )}
            </ScrollView>
          </Menu>

          {/* City Dropdown */}
          <Menu
            visible={showCityMenu}
            onDismiss={() => setShowCityMenu(false)}
            anchor={
              <TouchableOpacity onPress={() => selectedRegion && setShowCityMenu(prev => !prev)}>
                <TextInput
                  label="Select City"
                  value={selectedCity || cityQuery}
                  onChangeText={(text) => {
                    setCityQuery(text)
                    setSelectedCity('')
                  }}
                  mode="outlined"
                  style={{ marginBottom: 8 }}
                  disabled={!selectedRegion}
                  editable={false}
                  left={
                    <TextInput.Icon 
                      icon="magnify" 
                      onPress={() => selectedRegion && setShowCityMenu(prev => !prev)}
                      disabled={!selectedRegion}
                    />
                  }
                  right={
                    selectedCity && (
                      <TextInput.Icon
                        icon="close"
                        onPress={() => {
                          setSelectedCity('')
                          setCityQuery('')
                        }}
                      />
                    )
                  }
                  placeholder={selectedRegion ? "Search city..." : "Select a region first"}
                />
              </TouchableOpacity>
            }
            contentStyle={{ 
              backgroundColor: colors.surface,
              maxHeight: 300,
              width: '100%',
            }}
            style={{
              marginTop: 8,
            }}
          >
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled={true}>
              {filteredCities.length === 0 ? (
                <Menu.Item
                  title={selectedRegion ? "No cities found" : "Select a region first"}
                  disabled
                  titleStyle={{ color: colors.onSurfaceVariant, fontSize: 14 }}
                  style={{ minHeight: 40, height: 40 }}
                />
              ) : (
                filteredCities.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleCitySelection(item)}
                    style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-evenly', 
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      minHeight: 40,
                      width: '100%',
                      backgroundColor: colors.surface,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.outlineVariant,
                    }}
                  >
                    <Text style={{ color: colors.onSurface, fontSize: 14, flex: 1 }}>
                      {item.city}
                    </Text>
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13, marginLeft: 12 }}>
                      ₱{item.price?.toFixed(2) || '0.00'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Menu>
        </View>
      </Surface>

        {selectedLocation && (
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
            <View style={styles.sectionFooter}>
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
      
      {/* Map Modal */}
      <BottomModal visible={isMapModalVisible} onDismiss={() => setIsMapModalVisible(false)}>
        <View style={{ paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton icon="map" size={24} iconColor={colors.primary} style={{ margin: 0 }} />
              <Text style={[fonts.titleLarge, { color: colors.primary, marginLeft: 8 }]}>Map View</Text>
            </View>
            <IconButton
              icon="close"
              size={24}
              iconColor={colors.onSurface}
              onPress={() => setIsMapModalVisible(false)}
              style={{ margin: 0 }}
            />
          </View>
          
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
                // Clear dropdown selections when searching for a location
                setSelectedRegion(null)
                setSelectedCity('')
                setRegionQuery('')
                setCityQuery('')
                
                if (details) {
                  const { lat, lng } = details.geometry.location
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
            
            <View 
              style={styles.mapWrapper}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={() => setIsMapInteracting(true)}
              onResponderRelease={() => setTimeout(() => setIsMapInteracting(false), 100)}
              onResponderTerminate={() => setIsMapInteracting(false)}
            >
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{ 
                  latitude: selectedLocation.lat, 
                  longitude: selectedLocation.lng, 
                  latitudeDelta: 0.01, 
                  longitudeDelta: 0.01 
                }}
                onRegionChangeComplete={handleRegionChange}
                maxZoomLevel={18}
                minZoomLevel={5}
                showsCompass
                showsUserLocation={true}
                onTouchStart={() => setIsMapInteracting(true)}
                onPanDrag={() => setIsMapInteracting(true)}
                onTouchEnd={() => setIsMapInteracting(false)}
                onTouchCancel={() => setIsMapInteracting(false)}
              >
                <Marker
                  coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
                  draggable
                  onDragStart={handleMarkerDragStart}
                  onDragEnd={handleMarkerDragEnd}
                  title={selectedLocation.location || 'No Location Data'}
                  description="Drag to adjust"
                  pinColor={colors.primary}
                />
              </MapView>
              {/* Center to Marker Button */}
              <TouchableOpacity
                style={styles.centerToMarkerBtn}
                onPress={() => {
                  mapRef.current?.animateToRegion({
                    latitude: selectedLocation.lat,
                    longitude: selectedLocation.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }, 500)
                }}
                activeOpacity={0.8}
              >
                <IconButton icon="crosshairs-gps" size={28} iconColor={colors.primary} style={{ backgroundColor: colors.surface, borderRadius: 24, elevation: 2 }} />
              </TouchableOpacity>
            </View>
            
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 12, fontStyle: 'italic' }]}>
              Drag the marker or move the map to select a location
            </Text>
            
            <Button
              mode="outlined"
              onPress={handleCenterMap}
              icon="crosshairs-gps"
              labelStyle={[fonts.labelMedium, { color: colors.primary }]}
              contentStyle={styles.centerButtonContent}
              style={{ marginTop: 12 }}
            >
              Center to Terminal 3
            </Button>
        </View>
      </BottomModal>
      
      {/* Floating Action Button to Open Map */}
      <Surface style={styles.fab} elevation={4}>
        <Button
          mode="contained"
          onPress={() => {
            setIsMapModalVisible(true)
            }
          }
          icon="map"
          labelStyle={[fonts.labelLarge, { color: colors.onPrimary }]}
          contentStyle={{ height: 56 }}
          style={{ borderRadius: 28, backgroundColor: colors.primary }}
        >
          Open Map
        </Button>
      </Surface>
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
  autocompleteContainer: { 
    flex: 0,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  textInputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
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
  },
  sectionFooter: { 
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
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
  selectedCityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  centerToMarkerBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    elevation: 4,
  },
})

export default SelectLocation