import { useEffect, useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Text, Card, Divider, useTheme, Appbar, Button } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
// import MapView, { Marker } from 'react-native-maps'
// import * as Location from 'expo-location'

const ContractDetails = ({ navigation, route }) => {
    const { colors, fonts } = useTheme()
    const { contractData } = route.params || {}
    const [contractor, setContractor] = useState(null)
    const [subcontractor, setSubcontractor] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    // const [location, setLocation] = useState(null)

    useFocusEffect(
        useCallback(() => {
        fetchProfiles()
        return () => {
        fetchProfiles()
        }
        }, [contractData])
    )
    // useEffect(() => {
    // (async () => {
    //     try {
    //     let { status } = await Location.requestForegroundPermissionsAsync()
    //     if (status !== 'granted') {
    //         alert('Permission to access location was denied')
    //         return
    //     }
    //     let location = await Location.getCurrentPositionAsync({})
    //     setLocation(location.coords)
    //     } catch (e) {
    //     alert('Error getting location')
    //     }
    //     console.log(location)
    // })()
    // }, [])

    const fetchProfiles = async () => {
        if (contractData?.airline_id) {
            const { data, error } = await supabase
                .from('profiles')
                .select('first_name, middle_initial, last_name, suffix, email, contact_number')
                .eq('id', contractData.airline_id)
                .single()
            setContractor(data)
        }
        if (contractData?.delivery_id) {
            const { data, error } = await supabase
                .from('profiles')
                .select('first_name, middle_initial, last_name, suffix, email, contact_number')
                .eq('id', contractData.delivery_id)
                .single()
            setSubcontractor(data)
        }
    }
    
    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await fetchProfiles()
        setRefreshing(false)
    }, [contractData])

    const formatProfileName = (profile) => {
        if (!profile) return 'N/A'
        const { first_name, middle_initial, last_name, suffix } = profile
        return [
            first_name,
            middle_initial ? `${middle_initial}.` : '',
            last_name,
            suffix || ''
        ].filter(Boolean).join(' ')
    }

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

    if (!contractData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header navigation={navigation} title="Contract Details" />
                <Text style={[styles.errorText, { color: colors.error }]}>No contract data available</Text>
            </View>
        )
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
        >
            <Appbar.Header>
                <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement')} />
                <Appbar.Content title="Contract Details" />
            </Appbar.Header>
            {/* {location && (
            <>
                <MapView
                    style={styles.map}
                    initialRegion={{
                    latitude: 14.4776,
                    longitude: 121.0103,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                    }}
                >
                    <Marker
                    coordinate={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                    }}
                    title="You are here"
                    />
                </MapView>
                <View style={{ margin: 16 }}>
                <Button
                    mode="contained"
                    onPress={async () => {
                        // Format as PostGIS geography point
                        const point = `POINT(${location.longitude} ${location.latitude})`
                        const { error } = await supabase
                            .from('contracts')
                            .update({ current_location: point })
                            .eq('id', contractData.id)
                        if (error) {
                            alert('Failed to update location')
                        } else {
                            alert('Current location set!')
                            // Optionally refresh contractData here
                        }
                        setLocation(location)
                    }}
                >
                    Set as Current Location
                </Button>
                <Button
                    mode="contained"
                    onPress={async () => {
                        try {
                            let { status } = await Location.requestForegroundPermissionsAsync()
                            if (status !== 'granted') {
                                alert('Permission to access location was denied')
                                return
                            }
                            let newLocation = await Location.getCurrentPositionAsync({})
                            setLocation(newLocation.coords)
                            alert('Map updated to your current location!')
                        } catch (e) {
                            alert('Error getting location')
                        }
                    }}
                >
                    Update Map to Current Location
                </Button>
                </View>
            </>
            )} */}
            
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Card.Content>
                    <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 10 }]}>
                        Contract Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />
                    
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Contract ID:</Text>
                        <Text style={[fonts.bodySmall, { color: colors.onSurface }]} selectable>{contractData.id}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Contractor Name:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.primary }]}>
                            {formatProfileName(contractor)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Contractor Email:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
                            {contractor?.email || 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Contractor Contact:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
                            {contractor?.contact_number || 'N/A'}
                        </Text>
                    </View>
                    {contractData.delivery_id && (
                    <>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Subcontractor Name:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.primary }]}>
                            {formatProfileName(subcontractor)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Subcontractor Email:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
                            {subcontractor?.email || 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Subcontractor Contact:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
                            {subcontractor?.contact_number || 'N/A'}
                        </Text>
                    </View>
                    </>
                    )}
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Status:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.primary }]}>
                            {contractData.contract_status?.status_name || 'Unknown'}
                        </Text>
                    </View>

                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Location Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Pickup:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{contractData.pickup_location || 'Not set'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Current:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{contractData.current_location || 'Not set'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Drop-off:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{contractData.drop_off_location || 'Not set'}</Text>
                    </View>

                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Luggage Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    {contractData.luggage_info?.map((luggage, index) => (
                        <View key={index} style={styles.luggageSection}>
                            <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 8 }]}>
                                Luggage {index + 1}
                            </Text>
                            <View style={styles.infoRow}>
                                <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Owner:</Text>
                                <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.luggage_owner || 'N/A'}</Text>
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
                                <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.weight ? `${luggage.weight} kg` : 'N/A'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Contact:</Text>
                                <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.contact_number || 'N/A'}</Text>
                            </View>
                            {index < contractData.luggage_info.length - 1 && <Divider style={{ marginVertical: 10 }} />}
                        </View>
                    ))}

                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Timeline
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Created:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{formatDate(contractData.created_at)}</Text>
                    </View>
                    {contractData.accepted_at && (
                        <View style={styles.infoRow}>
                            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Accepted:</Text>
                            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{formatDate(contractData.accepted_at)}</Text>
                        </View>
                    )}
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
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // map: {
    //     height: 250, // Add this line
    //     borderRadius: 12,
    //     margin: 16,
    // },
    card: {
        margin: 16,
        borderRadius: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 5,
    },
    luggageSection: {
        marginVertical: 8,
    },
    errorText: {
        textAlign: 'center',
        marginTop: 20,
    },
})

export default ContractDetails