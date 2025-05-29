import { useEffect, useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Text, Card, Divider, useTheme, Appbar, Button } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../../lib/supabase'

const ContractDetails = ({ navigation, route }) => {
    const { colors, fonts } = useTheme()
    const { id } = route.params || {}
    const [contractData, setContractData] = useState(null)
    const [contractor, setContractor] = useState(null)
    const [subcontractor, setSubcontractor] = useState(null)
    const [refreshing, setRefreshing] = useState(false)

    // Fetch contract data by id
    const fetchContract = async () => {
        if (!id) {
            console.log('No contract id provided');
            return;
        }
        // Fetch contract data
        const { data: contract, error: contractError } = await supabase
            .from('contract')
            .select(`
                *,
                contract_status:contract_status_id(*),
                pickup_location,
                current_location,
                drop_off_location
            `)
            .eq('id', id)
            .single()
        if (contractError) {
            console.log('Error fetching contract:', contractError.message)
            setContractData(null)
            return
        }

        // Fetch luggage info from contract_luggage table
        const { data: luggageInfo, error: luggageError } = await supabase
            .from('contract_luggage_information')
            .select('*')
            .eq('contract_id', id)

        if (luggageError) {
            console.log('Error fetching luggage info:', luggageError.message)
        }

        // Attach luggage info to contract data
        setContractData({
            ...contract,
            luggage_info: luggageInfo || [],
        })
    }

    // Fetch profiles for contractor and subcontractor
    const fetchProfiles = async (contract) => {
        if (contract?.airline_id) {
            const { data } = await supabase
                .from('profiles')
                .select('first_name, middle_initial, last_name, suffix, email, contact_number')
                .eq('id', contract.airline_id)
                .single()
            setContractor(data)
        } else {
            setContractor(null)
        }
        if (contract?.delivery_id) {
            const { data } = await supabase
                .from('profiles')
                .select('first_name, middle_initial, last_name, suffix, email, contact_number')
                .eq('id', contract.delivery_id)
                .single()
            setSubcontractor(data)
        } else {
            setSubcontractor(null)
        }
    }

    useFocusEffect(
        useCallback(() => {
            fetchContract()
        }, [id])
    )

    useEffect(() => {
        if (contractData) {
            fetchProfiles(contractData)
        }
    }, [contractData])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await fetchContract()
        setRefreshing(false)
    }, [id])

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

    // const updateLocationInSupabase = async (coords) => {
    //     if (!coords || !contractData?.id) return

    //     const { latitude, longitude } = coords
    //     const geoPoint = `SRID=4326;POINT(${longitude} ${latitude})`
    //     const locationText = `${latitude},${longitude}`

    //     const { error } = await supabase
    //         .from('contract')
    //         .update({
    //             current_location: locationText,
    //             current_location_geo: geoPoint,
    //         })
    //         .eq('id', contractData.id)

    //     if (error) {
    //         console.log('Failed to update location:', error.message)
    //     } else {
    //         console.log('Location forwarded to Supabase!')
    //     }
    // }

    if (!contractData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Appbar.Header>
                    <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement')} />
                    <Appbar.Content title="Contract Details" />
                </Appbar.Header>
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
                showsUserLocation={true}                    
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
                try {
                    if (!location) {
                        console.log('No location available')
                        return
                    }

                    const { latitude, longitude } = location

                    const geoPoint = `SRID=4326;POINT(${longitude} ${latitude})`

                    console.log('Setting current location:', geoPoint)

                    const { data, error } = await supabase
                        .from('contract') // change this
                        .update({
                        current_location_geo: geoPoint
                        })
                        .eq('id', contractData.id) // or another identifier
                        .select('current_location_geo')
                    if (error) {
                        console.log('Failed to update location:', error.message)
                    } else {
                        console.log('Current location set!', data)
                        setLocation(location)
                    }
                    } catch (err) {
                    console.error('Unexpected error:', err)
                    }
                }}
            >
                Set as Current Location
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
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Total Luggage Quantity:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
                            {contractData?.luggage_quantity || 'N/A'}
                        </Text>
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
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]} selectable>
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
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]} selectable numberOfLines={2} ellipsizeMode="tail">{contractData.pickup_location || 'Not set'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Current:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]} selectable numberOfLines={2} ellipsizeMode="tail">{contractData.current_location || 'Not set'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Drop-off:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]} selectable numberOfLines={2} ellipsizeMode="tail">{contractData.drop_off_location || 'Not set'}</Text>
                    </View>

                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Luggage Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    {contractData.luggage_info?.map((luggage, index) => (
                        <View key={index} style={styles.luggageSection}>
                            <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 8 }]}>
                                Passenger {index + 1}
                            </Text>
                            <View style={styles.infoRow}>
                                <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Owner:</Text>
                                <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.luggage_owner || 'N/A'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Quantity:</Text>
                                <Text style={[fonts.bodyMedium, { color: colors.onSurface }]} selectable>{luggage.quantity || 'N/A'}</Text>
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
                                <Text style={[fonts.bodyMedium, { color: colors.onSurface }]} selectable>{luggage.contact_number || 'N/A'}</Text>
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
    map: {
        height: 250,
        borderRadius: 12,
        margin: 16,
    },
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