import { useEffect, useRef, useState, useCallback } from 'react'
import {
    View,
    ScrollView,
    Dimensions,
    Image,
    StyleSheet,
    RefreshControl,
} from 'react-native'
import { Text, TextInput, Button, Surface, useTheme, Card, Divider, IconButton, Avatar } from 'react-native-paper'
import MapView, { Marker } from 'react-native-maps'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'

const { width, height } = Dimensions.get('window')

const DEFAULT_MAP_REGION = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
}

const MAP_ZOOM_LEVEL = {
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
}

const LuggageInfo = ({ luggage, index, colors, fonts, isLast }) => (
    <View style={{ marginBottom: 10 }}>
        <Text style={[fonts.labelMedium, { color: colors.primary }]}>
            Passenger #{index + 1}
        </Text>
        <View style={styles.infoRow}>
            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Owner:</Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.luggage_owner || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Quantity:</Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.quantity || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Case Number:</Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.case_number || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Description:</Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.item_description || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Weight:</Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.weight || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Contact:</Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.contact_number || 'N/A'}</Text>
        </View>
        {!isLast && <Divider style={{ marginVertical: 5 }} />}
    </View>
)

const AirlineTrackLuggage = ({ navigation, route }) => {
    const [trackingNumber, setTrackingNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [contractData, setContractData] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const [mapRegion, setMapRegion] = useState(null)
    const mapRef = useRef(null)
    const { colors, fonts } = useTheme()
    const { showSnackbar, SnackbarElement } = useSnackbar()
    const { contractId, contractData: initialContractData } = route.params || {}

    useEffect(() => {
        if (contractId) {
            setTrackingNumber(contractId.toString())
            if (initialContractData) {
                setContractData(initialContractData)
            }
        }
    }, [contractId, initialContractData])

    // Auto refresh every 30 seconds if we have a tracking number
    useEffect(() => {
        if (trackingNumber) {
            const interval = setInterval(() => {
                handleTrackLuggage()
            }, 15000) // 15 seconds

            return () => clearInterval(interval)
        }
    }, [trackingNumber])

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

    const handleTrackLuggage = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('contract')
                .select(`
                    *,
                    contract_status:contract_status_id (status_name),
                    luggage_info:contract_luggage_information (
                        luggage_owner,
                        quantity,
                        case_number,
                        item_description,
                        weight,
                        contact_number
                    ),
                    delivery_profile:delivery_id (
                        pfp_id,
                        first_name,
                        middle_initial,
                        last_name,
                        suffix
                    )
                `)
                .eq('id', trackingNumber)
                .single()

            if (error) throw error

            if (!data) {
                showSnackbar('No contract found with this tracking number')
                setContractData(null)
                return
            }

            setContractData(data)
            
            // Update map region when new data arrives
            const currentLocationCoords = parseGeometry(data.current_location_geo)            
            if (currentLocationCoords) {
                const newRegion = {
                    latitude: currentLocationCoords.latitude,
                    longitude: currentLocationCoords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }
                setMapRegion(newRegion)
                // Center map on delivery personnel location
                if (mapRef.current) {
                    mapRef.current.animateToRegion(newRegion, 1000)
                }
            }
        } catch (error) {
            showSnackbar('Error tracking luggage: ' + error.message)
            console.log(error.message)
            setContractData(null)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true)
        handleTrackLuggage()
    }, [trackingNumber])

    const centerOnLocation = (coords) => {
        if (coords && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000)
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

    const getMapRegion = (coords) => {
        if (!coords) return DEFAULT_MAP_REGION
        return {
            latitude: coords.latitude,
            longitude: coords.longitude,
            ...MAP_ZOOM_LEVEL
        }
    }

    const renderMap = (currentLocationCoords, dropOffCoords) => {
        const initialMapRegion = currentLocationCoords 
            ? getMapRegion(currentLocationCoords)
            : dropOffCoords
                ? getMapRegion(dropOffCoords)
                : DEFAULT_MAP_REGION

        return (
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialMapRegion}
                    showsCompass={true}
                    showsScale={true}
                    showsTraffic={true}
                    loadingEnabled={true}
                >
                    {currentLocationCoords && (
                        <Marker
                            title={[
                                contractData.delivery_profile?.first_name,
                                contractData.delivery_profile?.middle_initial+'.',
                                contractData.delivery_profile?.last_name,
                                contractData.delivery_profile?.suffix,
                                ' - Delivery Personnel'
                            ].filter(Boolean).join(' ') || 'Delivery Personnel'}
                            coordinate={currentLocationCoords}
                            description={contractData.current_location}
                            pinColor={colors.primary}
                        >
                            {contractData.delivery_profile?.pfp_id ? (
                                <Avatar.Image
                                    size={32}
                                    source={{ uri: contractData.delivery_profile.pfp_id }}
                                    style={{ borderColor: colors.primary }}
                                />
                            ) : (
                                <Avatar.Text
                                    size={32}
                                    label={contractData.delivery_profile?.first_name ? contractData.delivery_profile.first_name[0].toUpperCase() : 'N/A'}
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
                            description={contractData.drop_off_location}
                            pinColor={colors.error}
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

    const renderLuggageInfo = () => {
        if (!Array.isArray(contractData.luggage_info) || contractData.luggage_info.length === 0) {
            return (
                <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
                    No luggage information available.
                </Text>
            )
        }

        return contractData.luggage_info.map((luggage, idx) => (
            <LuggageInfo
                key={idx}
                luggage={luggage}
                index={idx}
                colors={colors}
                fonts={fonts}
                isLast={idx === contractData.luggage_info.length - 1}
            />
        ))
    }

    const renderContractInfo = () => {
        if (!contractData) return null

        const currentLocationCoords = parseGeometry(contractData.current_location_geo)
        const dropOffCoords = parseGeometry(contractData.drop_off_location_geo)

        return (
            <Card style={[styles.contractCard, { backgroundColor: colors.surface }]}>
                {contractData.contract_status_id === 4 && (
                    <>
                        <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10, marginLeft:'5%' }]}>
                            Location Tracking
                        </Text>
                        <Divider style={{ marginBottom: 10 }} />

                        <View style={styles.infoRow}>
                            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant, marginLeft:'5%' }]}>Current Location:</Text>
                            <Text style={[fonts.bodySmall, { color: colors.onSurface, marginRight:'40%' }]} numberOfLines={2} ellipsizeMode="tail">{contractData.current_location || 'Not set'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant, marginLeft:'5%' }]}>Drop-Off Location:</Text>
                            <Text style={[fonts.bodySmall, { color: colors.onSurface, marginRight:'40%' }]} numberOfLines={2} ellipsizeMode="tail">{contractData.drop_off_location || 'Not set'}</Text>
                        </View>
                        {renderMap(currentLocationCoords, dropOffCoords)}
                    </>
                )}
                <Card.Content>
                    <Text style={[fonts.titleMedium, { color: colors.primary, marginVertical: 10 }]}>
                        Contract Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />
                    
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Contract ID:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{contractData.id}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Status:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.primary }]}>
                            {contractData.contract_status?.status_name || 'Unknown'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Luggage Quantity:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{contractData?.luggage_quantity || 0}</Text>
                    </View>

                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Passenger Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    {renderLuggageInfo()}

                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Timeline
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Created:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{formatDate(contractData.created_at)}</Text>
                    </View>

                    {contractData.pickup_at && (
                        <View style={styles.infoRow}>
                            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Pickup:</Text>
                            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{formatDate(contractData.pickup_at)}</Text>
                        </View>
                    )}

                    {contractData.delivered_at && (
                        <View style={styles.infoRow}>
                            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Delivered:</Text>
                            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{formatDate(contractData.delivered_at)}</Text>
                        </View>
                    )}

                    {contractData.cancelled_at && (
                        <View style={styles.infoRow}>
                            <Text style={[fonts.labelMedium, { color: colors.error }]}>Cancelled:</Text>
                            <Text style={[fonts.bodyMedium, { color: colors.error }]}>{formatDate(contractData.cancelled_at)}</Text>
                        </View>
                    )}
                </Card.Content>
            </Card>
        )
    }

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
                <Text
                    style={[
                        styles.title,
                        { ...fonts.headlineMedium, color: colors.primary },
                    ]}
                >
                    Track your shipment
                </Text>
                <Text
                    style={[
                        styles.subtitle,
                        { ...fonts.default, color: colors.onBackground },
                    ]}
                >
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

                    <Button
                        mode="contained"
                        onPress={handleTrackLuggage}
                        style={styles.button}
                        buttonColor={colors.primary}
                        icon="magnify"
                        loading={loading}
                        disabled={loading}
                        labelStyle={{ ...fonts.labelLarge }}
                    >
                        Track
                    </Button>
                </View>

                {renderContractInfo()}

                <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
                    <Text
                        style={[
                            styles.surfaceText,
                            { ...fonts.default, color: colors.onSurface },
                        ]}
                    >
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
    button: {
        width: '90%',
        borderRadius: 10,
        justifyContent: 'center',
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
})

export default AirlineTrackLuggage