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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'

const { width, height } = Dimensions.get('window')

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

const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2) return null
    
    const R = 6371
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    
    return distance
}

const estimateETA = (distance) => {
    if (!distance) return null
    const averageSpeed = 30 // km/h
    const timeInHours = distance / averageSpeed
    const hours = Math.floor(timeInHours)
    const minutes = Math.round((timeInHours - hours) * 60)
    
    if (hours === 0) {
        return `${minutes} min`
    } else if (minutes === 0) {
        return `${hours} hr`
    } else {
        return `${hours} hr ${minutes} min`
    }
}

// Map Component
const TrackingMap = ({ currentLocation, dropOffLocation, deliveryProfile, colors }) => {
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

    const currentLocationCoords = parseGeometry(currentLocation)
    const dropOffCoords = parseGeometry(dropOffLocation)

    // Use current location as default, fallback to drop-off location, then default region
    const initialRegion = currentLocationCoords || dropOffCoords

    return (
        <View style={styles.mapContainer}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    ...initialRegion,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                showsCompass={true}
                showsScale={true}
                showsTraffic={true}
                loadingEnabled={true}
                maxZoomLevel={18}
                minZoomLevel={5}
                restrictToBounds={true}
                bounds={PHILIPPINES_BOUNDS}
            >
                {currentLocationCoords && (
                    <Marker
                        title={[
                            deliveryProfile?.first_name,
                            deliveryProfile?.middle_initial+'.',
                            deliveryProfile?.last_name,
                            deliveryProfile?.suffix,
                            ' - Delivery Personnel'
                        ].filter(Boolean).join(' ') || 'Delivery Personnel'}
                        coordinate={currentLocationCoords}
                        pinColor={colors.primary}
                    >
                        {deliveryProfile?.pfp_id ? (
                            <Avatar.Image
                                size={32}
                                source={{ uri: deliveryProfile.pfp_id }}
                                style={{ borderColor: colors.primary }}
                            />
                        ) : (
                            <Avatar.Text
                                size={32}
                                label={deliveryProfile?.first_name?.[0]?.toUpperCase() || 'N/A'}
                                style={{ backgroundColor: colors.primary }}
                                labelStyle={{ color: colors.onPrimary }}
                            />
                        )}
                    </Marker>
                )}
                {dropOffCoords && (
                    <Marker
                        title='Destination'
                        coordinate={dropOffCoords}
                        pinColor={colors.error}
                    />
                )}
                {currentLocationCoords && dropOffCoords && (
                    <Polyline
                        coordinates={[currentLocationCoords, dropOffCoords]}
                        strokeColor={colors.primary}
                        strokeWidth={3}
                        lineDashPattern={[1]}
                    />
                )}
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

// ProgressMeter component
const ProgressMeter = ({ colors, contractData }) => {
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

    const pickupCoords = parseGeometry(contractData?.pickup_location_geo)
    const currentCoords = parseGeometry(contractData?.current_location_geo)
    const dropOffCoords = parseGeometry(contractData?.drop_off_location_geo)
    
    const distance = calculateDistance(currentCoords, dropOffCoords)
    const eta = estimateETA(distance)
    
    // Calculate progress based on total journey distance
    const totalDistance = calculateDistance(pickupCoords, dropOffCoords)
    
    // Calculate progress as a ratio of remaining distance to total distance
    const progress = totalDistance ? Math.max(0, Math.min(1, 1 - (distance / totalDistance))) : 0

    return (
        <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
                <Text style={[styles.progressText, { color: colors.primary }]}>
                    Distance Remaining: {distance ? `${distance.toFixed(1)} km` : 'Calculating...'}
                </Text>
                <Text style={[styles.progressText, { color: colors.primary }]}>
                    ETA: {eta || 'Calculating...'}
                </Text>
            </View>
            <ProgressBar
                progress={progress}
                color={colors.primary}
                style={styles.progressBar}
            />
        </View>
    )
}

// Contract Info Component
const ContractInfo = ({ contractData, colors, fonts }) => {
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

    if (!contractData) return null

    return (
        <Card style={[styles.contractCard, { backgroundColor: colors.surface }]}>
            {contractData.contract_status_id === 4 && (
                <>
                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10, marginHorizontal:'2%' }]}>
                        Location Tracking
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />
                    <ProgressMeter
                        colors={colors}
                        contractData={contractData}
                    />
                    <InfoRow 
                        label="Pickup Location:" 
                        value={contractData.pickup_location} 
                        colors={colors} 
                        fonts={fonts.bodySmall}
                        style={{ marginHorizontal: '2%' }}
                    />
                    <InfoRow 
                        label="Recent Location:" 
                        value={contractData.current_location} 
                        colors={colors} 
                        fonts={fonts.bodySmall}
                        style={{ marginHorizontal: '2%' }}
                    />
                    <InfoRow 
                        label="Drop-Off Location:" 
                        value={contractData.drop_off_location} 
                        colors={colors} 
                        fonts={fonts.bodySmall}
                        style={{ marginHorizontal: '2%' }}
                    />
                    <TrackingMap
                        currentLocation={contractData.current_location_geo}
                        dropOffLocation={contractData.drop_off_location_geo}
                        deliveryProfile={contractData.delivery_profile}
                        colors={colors}
                    />
                </>
            )}
            <Card.Content>
                <Text style={[fonts.titleMedium, { color: colors.primary, marginVertical: 10 }]}>
                    Contract Information
                </Text>
                <Divider style={{ marginBottom: 10 }} />
                
                <InfoRow label="Contract ID:" value={contractData.id} colors={colors} fonts={fonts}/>
                <InfoRow 
                    label="Status:" 
                    value={contractData.contract_status?.status_name} 
                    colors={colors} 
                    fonts={fonts}
                    style={{ color: colors.primary }}
                />
                <InfoRow label="Remarks:" value={contractData.remarks} colors={colors} fonts={fonts} />

                <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                    Passenger Information
                </Text>
                <Divider style={{ marginBottom: 10 }} />

                <InfoRow label="Owner Name:" value={`${contractData.owner_first_name || ''} ${contractData.owner_middle_initial || ''} ${contractData.owner_last_name || ''}`.trim()} colors={colors} fonts={fonts}/>
                <InfoRow label="Owner Contact:" value={contractData.owner_contact} colors={colors} fonts={fonts}/>
                <InfoRow label="Flight Number:" value={contractData.flight_number} colors={colors} fonts={fonts}/>
                <InfoRow label="Case Number:" value={contractData.case_number} colors={colors} fonts={fonts}/>
                <InfoRow label="Luggage Description:" value={contractData.luggage_description} colors={colors} fonts={fonts}/>
                <InfoRow label="Luggage Weight:" value={contractData.luggage_weight ? `${contractData.luggage_weight} kg` : 'N/A'} colors={colors} fonts={fonts}/>
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
                    <InfoRow 
                        label="Cancelled:" 
                        value={formatDate(contractData.cancelled_at)} 
                        colors={colors} 
                        fonts={fonts}
                        style={{ color: colors.error }}
                    />
                )}
            </Card.Content>
        </Card>
    )
}

// Main Component
const AirlineTrackLuggage = ({ navigation, route }) => {
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

    // Debounce the tracking number input
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current)
        }

        debounceTimer.current = setTimeout(() => {
            setDebouncedTrackingNumber(trackingNumber)
        }, 500) // 500ms delay

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current)
            }
        }
    }, [trackingNumber])

    useEffect(() => {
        if (!debouncedTrackingNumber) return
        // Initial fetch
        fetchData()
        // Set up real-time subscription
        const subscription = supabase
            .channel(`contract-${debouncedTrackingNumber}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contracts',
                    filter: `id=eq.${debouncedTrackingNumber}`
                },
                fetchData
            )
            .subscribe()

        return () => subscription.unsubscribe()
    }, [debouncedTrackingNumber])

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
            console.log(error.message)
            setContractData(null)
        } finally {
            setRefreshing(false)
        }
    }

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
                        onChangeText={setTrackingNumber}
                        style={styles.textInput}
                        theme={{ colors: { primary: colors.primary } }}
                    />
                </View>

                <ContractInfo 
                    contractData={contractData} 
                    colors={colors} 
                    fonts={fonts} 
                />

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
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 16,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        marginVertical: 10,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    textInput: {
        width: '90%',
        marginBottom: 10,
    },
    surface: {
        padding: 16,
        marginTop: 20,
        marginHorizontal: 10,
        borderRadius: 8,
    },
    surfaceText: {
        textAlign: 'center',
    },
    image: {
        width: width,
        height: height * 0.35,
        resizeMode: 'contain',
        marginTop: 10,
    },
    contractCard: {
        width: '100%',
        marginVertical: 10,
        borderRadius: 12,
    },
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
        flexDirection: 'row',
        justifyContent: 'space-between',
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

export default AirlineTrackLuggage