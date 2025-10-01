import { useEffect, useRef, useState, useCallback } from 'react'
import {
    View,
    ScrollView,
    Dimensions,
    Image,
    StyleSheet,
    RefreshControl,
} from 'react-native'
import { Text, TextInput, Surface, useTheme, Card, Divider, IconButton, Avatar, ProgressBar } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'
import { useFocusEffect } from '@react-navigation/native'
import Constants from "expo-constants"
const { GOOGLE_MAPS_API_KEY } = Constants.expoConfig.extra
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import MapViewDirections from "react-native-maps-directions"

const { width, height } = Dimensions.get('window')

// Geometry parser
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
    } catch (error) {}
    return null
}

// --- Hook ---
let globalLastFetchTime = 0

const useDirections = ({ pickup, current, dropOff, showSnackbar, cooldownMs = 60000 }) => {
  const [routeData, setRouteData] = useState(null)
  const [cooldownActive, setCooldownActive] = useState(true)
  const [directionElements, setDirectionElements] = useState(null)

  const requestDirections = useCallback(() => {
    const now = Date.now()
    const timeSinceLast = now - globalLastFetchTime

    if (timeSinceLast < cooldownMs) {
        setCooldownActive(true)
        return
    }

    globalLastFetchTime = now
    setCooldownActive(true)

    setTimeout(() => {
        if (Date.now() - globalLastFetchTime >= cooldownMs) {
            setCooldownActive(false)
        }
    }, cooldownMs)

    if (!pickup || !dropOff) return
    if (!GOOGLE_MAPS_API_KEY) {
        showSnackbar("Directions are currently unavailable.")
        return
    }
    const pickupToDropoff = (
        <MapViewDirections
            key="pickupToDropoff"
            origin={pickup}
            destination={dropOff}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={0}
            strokeColor="transparent"
            onReady={(result) => {
                setRouteData((prev) => ({
                    ...prev,
                    totalDistance: result.distance,
                    duration: result.duration,
                }))
            }}
            onError={() => showSnackbar("Unable to fetch pickup → dropoff route")}
        />
    )

    const currentToDropoff = (
        <MapViewDirections
            key="currentToDropoff"
            origin={current || pickup}
            destination={dropOff}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#0a6f12ff"
            onReady={(result) => {
                setRouteData((prev) => ({
                    ...prev,
                    remainingDistance: result.distance,
                }))
            }}
            onError={() => showSnackbar("Unable to fetch current → dropoff route")}
        />
    )

    setDirectionElements([pickupToDropoff, currentToDropoff])
}, [pickup, current, dropOff, cooldownMs, showSnackbar])

  useEffect(() => {
    const interval = setInterval(() => {
      const isActive = Date.now() - globalLastFetchTime < cooldownMs
      setCooldownActive(isActive)
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownMs])

  return { routeData, requestDirections, cooldownActive, directionElements }
}



// --- ProgressMeter ---
const ProgressMeter = ({ colors, contractData, routeData }) => {
  if (contractData?.contract_status_id !== 4) return null
  if (!routeData?.totalDistance || !routeData?.remainingDistance) return null

  const { totalDistance, remainingDistance, duration } = routeData

  let progress = 1 - remainingDistance / totalDistance
  progress = Math.max(0.1, Math.min(progress, 1))

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressInfo}>
        <Text style={[styles.progressText, { color: colors.primary }]}>
          Distance Remaining: {remainingDistance.toFixed(1)} km
        </Text>
        <Text style={[styles.progressText, { color: colors.primary }]}>
          ETA: {Math.round(duration)} min
        </Text>
      </View>
      <ProgressBar
        progress={progress}
        style={styles.progressBar}
        color={colors.primary}
      />
    </View>
  )
}


// Map Component
const TrackingMap = ({ currentLocation, dropOffLocation, deliveryProfile, colors, contractStatusId, requestDirections, cooldownActive, directionElement }) => {
  const mapRef = useRef(null)
  const centerOnLocation = (coords) => {
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        ...coords,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000, 'easeInOut')
    }
  }

  const currentLocationCoords = parseGeometry(currentLocation)
  const dropOffCoords = parseGeometry(dropOffLocation)
  const initialRegion = currentLocationCoords || dropOffCoords

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion ? {
          ...initialRegion,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : undefined}
        showsScale
        loadingEnabled
        maxZoomLevel={18}
        minZoomLevel={5}
      >
        {currentLocationCoords && (
          <Marker
            title={[deliveryProfile?.first_name, deliveryProfile?.middle_initial + '.', deliveryProfile?.last_name, deliveryProfile?.suffix, ' - Delivery Personnel'].filter(Boolean).join(' ') || 'Delivery Personnel'}
            coordinate={currentLocationCoords}
            pinColor={colors.primary}
          >
            {deliveryProfile?.pfp_id ? (
              <Avatar.Image size={32} source={{ uri: deliveryProfile.pfp_id }} style={{ borderColor: colors.primary }} />
            ) : (
              <Avatar.Text size={32} label={deliveryProfile?.first_name?.[0]?.toUpperCase() || 'N/A'} style={{ backgroundColor: colors.primary }} labelStyle={{ color: colors.onPrimary }} />
            )}
          </Marker>
        )}

        {dropOffCoords && (
          <Marker title='Destination' coordinate={dropOffCoords} pinColor={colors.error} />
        )}

        {contractStatusId === 4 && directionElement}
      </MapView>

      <View style={styles.mapButtons}>
        {currentLocationCoords && (
          <IconButton
            mode="contained"
            onPress={() => centerOnLocation(currentLocationCoords)}
            style={[styles.mapButton, { backgroundColor: colors.primary }]}
            icon="crosshairs-gps"
            iconColor={colors.onPrimary}
            size={24}
          />
        )}
        {dropOffCoords && (
          <IconButton
            mode="contained"
            onPress={() => centerOnLocation(dropOffCoords)}
            style={[styles.mapButton, { backgroundColor: colors.error }]}
            icon="map-marker"
            iconColor={colors.onError}
            size={24}
          />
        )}
        {contractStatusId === 4 && (
          <IconButton
            mode="contained"
            onPress={requestDirections}
            disabled={cooldownActive}
            style={[styles.mapButton, { backgroundColor: colors.primary }]}
            icon="routes"
            iconColor={colors.onPrimary}
            size={24}
          />
        )}
      </View>
    </View>
  )
}

// Info Row Component
const InfoRow = ({ label, value, colors, fonts, style }) => (
    <View style={[styles.infoRow, style]}>
        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[fonts.bodyMedium, { color: colors.onSurface, flex: 1, textAlign: 'right' }]} selectable numberOfLines={3}>{value || 'N/A'}</Text>
    </View>
)

// Contract Info Component
const ContractInfo = ({ contractData, colors, fonts, showSnackbar }) => {
    const pickupCoords = parseGeometry(contractData?.pickup_location_geo)
    const dropOffCoords = parseGeometry(contractData?.drop_off_location_geo)
    const currentCoords = parseGeometry(contractData?.current_location_geo)

    const { routeData, requestDirections, cooldownActive, directionElements } =
      useDirections({
        pickup: pickupCoords,
        current: currentCoords,
        dropOff: dropOffCoords,
        showSnackbar,
      })

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set'
        return new Date(dateString).toLocaleString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Manila',
        })
    }

    // Now safe to return early after all hooks are called
    if (!contractData) return null

    return (
        <Card style={[styles.contractCard, { backgroundColor: colors.surface }]}>
            {contractData.contract_status_id === 4 && (
                <View>
                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10, marginHorizontal:'5%' }]}>
                        Location Tracking
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />
                    <ProgressMeter colors={colors} contractData={contractData} routeData={routeData} />
                    <TrackingMap
                      currentLocation={contractData.current_location_geo}
                      dropOffLocation={contractData.drop_off_location_geo}
                      deliveryProfile={contractData.delivery_profile}
                      colors={colors}
                      contractStatusId={contractData.contract_status_id}
                      showSnackbar={showSnackbar}
                      requestDirections={requestDirections}
                      cooldownActive={cooldownActive}
                      directionElement={directionElements}
                    />
                </View>
            )}
            <Card.Content>
                <Text style={[fonts.titleMedium, { color: colors.primary, marginVertical: 10 }]}>
                    Contract Information
                </Text>
                <Divider style={{ marginBottom: 10 }} />
                
                <InfoRow label="Contract ID:" value={contractData.id} colors={colors} fonts={fonts}/>
                <InfoRow label="Status:" value={contractData.contract_status?.status_name} colors={colors} fonts={fonts} style={{ color: colors.primary }} />
                <InfoRow label="Remarks:" value={contractData.remarks} colors={colors} fonts={fonts} />

                <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                    Passenger Information
                </Text>
                <Divider style={{ marginBottom: 10 }} />

                <InfoRow label="Owner Name:" value={`${contractData.owner_first_name || ''} ${contractData.owner_middle_initial || ''} ${contractData.owner_last_name || ''}`.trim()} colors={colors} fonts={fonts}/>
                <InfoRow label="Owner Contact:" value={contractData.owner_contact} colors={colors} fonts={fonts}/>
                <InfoRow label="Flight Number:" value={contractData.flight_number} colors={colors} fonts={fonts}/>
                <InfoRow label="Luggage Description:" value={contractData.luggage_description} colors={colors} fonts={fonts}/>
                <InfoRow label="Luggage Quantity:" value={contractData.luggage_quantity} colors={colors} fonts={fonts}/>

                <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                    Delivery Information
                </Text>
                <Divider style={{ marginBottom: 10 }} />

                <InfoRow label="Delivery Address:" value={contractData.delivery_address} colors={colors} fonts={fonts}/>
                <InfoRow label="Address Line 1:" value={contractData.address_line_1} colors={colors} fonts={fonts}/>
                <InfoRow label="Address Line 2:" value={contractData.address_line_2} colors={colors} fonts={fonts}/>
                <InfoRow label="Pickup Location:" value={contractData.pickup_location} colors={colors} fonts={fonts}/>
                <InfoRow label="Current Location:" value={contractData.current_location} colors={colors} fonts={fonts}/>
                <InfoRow label="Drop-off Location:" value={contractData.drop_off_location} colors={colors} fonts={fonts}/>

                <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                    Payment Information
                </Text>
                <Divider style={{ marginBottom: 10 }} />

                <InfoRow label="Delivery Charge:" value={contractData.delivery_charge ? `₱${contractData.delivery_charge}` : 'N/A'} colors={colors} fonts={fonts}/>
                <InfoRow label="Delivery Surcharge:" value={contractData.delivery_surcharge ? `₱${contractData.delivery_surcharge}` : 'N/A'} colors={colors} fonts={fonts}/>
                <InfoRow label="Delivery Discount:" value={contractData.delivery_discount ? `₱${contractData.delivery_discount}` : 'N/A'} colors={colors} fonts={fonts}/>

                <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                    Timeline
                </Text>
                <Divider style={{ marginBottom: 10 }} />

                <InfoRow label="Created:" value={formatDate(contractData.created_at)} colors={colors} fonts={fonts} />
                {contractData.pickup_at && (
                    <InfoRow label="Pickup:" value={formatDate(contractData.pickup_at)} colors={colors} fonts={fonts} />
                )}
                {contractData.delivered_at && (
                    <InfoRow label="Delivered:" value={formatDate(contractData.delivered_at)} colors={colors} fonts={fonts} />
                )}
                {contractData.cancelled_at && (
                    <InfoRow label="Cancelled:" value={formatDate(contractData.cancelled_at)} colors={colors} fonts={fonts} style={{ color: colors.error }} />
                )}
            </Card.Content>
        </Card>
    )
}
// Main Component
const TrackLuggage = ({ navigation, route }) => {
    const [trackingNumber, setTrackingNumber] = useState('')
    const [debouncedTrackingNumber, setDebouncedTrackingNumber] = useState('')
    const [contractData, setContractData] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const { colors, fonts } = useTheme()
    const { showSnackbar, SnackbarElement } = useSnackbar()
    const { contractId } = route.params || {}
    const debounceTimer = useRef(null)

    useEffect(() => {
        if (contractId) {
            setTrackingNumber(contractId.toString())
            setDebouncedTrackingNumber(contractId.toString())
        }
    }, [contractId])

    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current)
        }
        debounceTimer.current = setTimeout(() => {
            setDebouncedTrackingNumber(trackingNumber)
        }, 500)
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current)
        }
    }, [trackingNumber])

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    contract_status:contract_status_id (status_name),
                    delivery_profile:delivery_id (*)
                `)
                .eq('id', debouncedTrackingNumber)
                .single()

            if (error) throw error
            if (!data) {
                showSnackbar('No contract found with this tracking number')
                setContractData(null)
                return
            }
            setContractData(data)
        } catch (error) {
            showSnackbar('Invalid tracking ID')
            setContractData(null)
        } finally {
            setRefreshing(false)
        }
    }

    useFocusEffect(
        useCallback(() => {
            if (!debouncedTrackingNumber) return
            fetchData()
            const subscription = supabase
                .channel(`contract-${debouncedTrackingNumber}`)
                .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'contracts',
                        filter: `id=eq.${debouncedTrackingNumber}`,
                    },
                    fetchData
                )
                .subscribe()
            return () => subscription.unsubscribe()
        }, [debouncedTrackingNumber])

    )

    const onRefresh = useCallback(() => {
        setRefreshing(true)
        fetchData()
    }, [debouncedTrackingNumber])

    return (
        <ScrollView 
            style={[styles.scrollView, { backgroundColor: colors.background }]}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
        >
            <Header navigation={navigation} title={'Track Luggage'}/>
            {SnackbarElement}

            <View style={styles.container}>
                <Text style={[styles.title, { ...fonts.headlineMedium, color: colors.primary }]}>
                    Track your shipment
                </Text>
                <Text style={[styles.subtitle, { ...fonts.default, color: colors.onBackground }]}>
                    Please enter your tracking number
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                      mode="outlined"
                      placeholder="Enter track number"
                      value={trackingNumber}
                      onChangeText={(text) => setTrackingNumber(text.toUpperCase())}
                      style={styles.textInput}
                      theme={{ colors: { primary: colors.primary } }}
                      maxLength={16}
                      autoCapitalize="characters"
                    />
                </View>

                <ContractInfo contractData={contractData} colors={colors} fonts={fonts} showSnackbar={showSnackbar} />

                <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
                    <Text style={[styles.surfaceText, { ...fonts.default, color: colors.onSurface }]}>
                        "Quickly check the status and location of your luggage in real-time. Your journey, our priority."
                    </Text>
                </Surface>
            </View>

            <Image
                source={require('../../../assets/delivery-bg.png')}
                style={styles.image}
            />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    container: { padding: 16, alignItems: 'center' },
    title: { fontSize: 24, textAlign: 'center', marginVertical: 10 },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
    inputContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
    textInput: { width: '90%', marginBottom: 10 },
    surface: { padding: 16, marginTop: 20, marginHorizontal: 10, borderRadius: 8 },
    surfaceText: { textAlign: 'center' },
    image: { width, height: height * 0.35, resizeMode: 'contain', marginTop: 10 },
    contractCard: { width: '100%', marginVertical: 10, borderRadius: 12 },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 5,
    },
    mapContainer: {
        height: 500,
        marginHorizontal: 10,
        marginVertical: 10,
        borderRadius: 8,
        overflow: 'hidden',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapButtons: {
        position: 'absolute',
        top: 10,
        left: 10,
        gap: 8,
    },
    mapButton: {
        margin: 0,
        borderRadius: 8,
    },
    progressContainer: {
        padding: 16,
        marginHorizontal: '5%',
        marginBottom: 10,
    },
    progressInfo: {
        flexDirection: 'column',
        alignItems:'center',
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '500',
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    },
})

export default TrackLuggage