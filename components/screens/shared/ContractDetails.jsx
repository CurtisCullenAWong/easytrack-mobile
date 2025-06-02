import { useEffect, useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Image, Dimensions } from 'react-native'
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
                drop_off_location,
                payment:payment_id(*)
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
                                <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Flight Number:</Text>
                                <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{luggage.flight_number || 'N/A'}</Text>
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

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Remarks:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]} numberOfLines={3} ellipsizeMode="tail">
                            {contractData.remarks || 'No remarks'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Payment ID:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]} selectable>
                            {contractData.payment_id || 'Not set'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Passenger ID:</Text>
                        {contractData.passenger_id ? (
                            <Image
                                source={{ uri: contractData.passenger_id }}
                                style={styles.landscapeImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>Not set</Text>
                        )}
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Passenger Form:</Text>
                        {contractData.passenger_form ? (
                            <Image
                                source={{ uri: contractData.passenger_form }}
                                style={styles.portraitImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>Not set</Text>
                        )}
                    </View>
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
        alignItems: 'center',
    },
    luggageSection: {
        marginVertical: 8,
    },
    errorText: {
        textAlign: 'center',
        marginTop: 20,
    },
    landscapeImage: {
        width: Dimensions.get('window').width * 0.4,
        height: 150,
        borderRadius: 8,
    },
    portraitImage: {
        width: Dimensions.get('window').width * 0.4,
        height: 300,
        borderRadius: 8,
    },
})

export default ContractDetails