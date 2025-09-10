import { useEffect, useState, useCallback, useRef } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Image, Dimensions } from 'react-native'
import { Text, Card, Divider, useTheme, Appbar } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../../lib/supabase'

const { width } = Dimensions.get('window')

// Info Row Component
const InfoRow = ({ label, value, colors, fonts, style }) => (
    <View style={[styles.infoRow, style]}>
        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[fonts.bodyMedium, { color: colors.onSurface, flex: 1, textAlign: 'right' }]} selectable numberOfLines={3}>{value || 'N/A'}</Text>
    </View>
)

const ContractDetails = ({ navigation, route }) => {
    const { colors, fonts } = useTheme()
    const { id } = route.params || {}
    const [contractData, setContractData] = useState(null)
    const [contractor, setContractor] = useState(null)
    const [subcontractor, setSubcontractor] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const subscriptionRef = useRef(null)

    const getStatusColor = (statusId) => {
        const statusColors = {
            1: colors.primary,    // Pickup
            2: colors.error,      // Cancelled
            3: colors.primary,    // Accepted
            4: colors.primary,    // In Transit
            5: colors.primary,    // Delivered
            6: colors.error,      // Failed
        }
        return statusColors[statusId] || colors.primary
    }

    // Fetch contract data by id
    const fetchContract = async () => {
        if (!id) {
            console.log('No contract id provided');
            return;
        }
        // Fetch contract data from the new contracts table
        const { data: contract, error: contractError } = await supabase
            .from('contracts')
            .select(`
                *,
                contract_status:contract_status_id(*),
                summary:summary_id(
                    id,
                    invoice_id
                )
            `)
            .eq('id', id)
            .single()
        if (contractError) {
            console.log('Error fetching contract:', contractError.message)
            setContractData(null)
            return
        }

        setContractData(contract)
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

    // Set up real-time subscription only while screen is focused
    useFocusEffect(
        useCallback(() => {
            if (!id) return

            subscriptionRef.current = supabase
                .channel(`contract-${id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'contracts',
                        filter: `id=eq.${id}`
                    },
                    async () => {
                        await fetchContract()
                    }
                )
                .subscribe()

            return () => {
                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe()
                }
            }
        }, [id])
    )

    if (!contractData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Appbar.Header>
                    <Appbar.BackAction onPress={() => navigation.navigate('BookingHistory')} />
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
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title="Contract Details" />
            </Appbar.Header>
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Card.Content>
                    <Text style={[fonts.titleMedium, { color: colors.primary, marginVertical: 10 }]}>
                        Contract Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />
                    <InfoRow label="Contract ID:" value={contractData.id} colors={colors} fonts={fonts}/>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Status:</Text>
                        <Text style={[fonts.bodyMedium, { color: getStatusColor(contractData.contract_status_id), fontWeight: 'bold' }]}>
                            {contractData.contract_status?.status_name || 'N/A'}
                        </Text>
                    </View>
                    <InfoRow label="Total Luggage:" value={contractData?.luggage_quantity} colors={colors} fonts={fonts}/>
                    <InfoRow label="Remarks:" value={contractData.remarks} colors={colors} fonts={fonts} />
                    <InfoRow label="Summary ID:" value={contractData.summary_id || 'N/A'} colors={colors} fonts={fonts}/>
                    <InfoRow label="Invoice ID:" value={contractData.summary?.invoice_id || 'N/A'} colors={colors} fonts={fonts}/>
                    {contractData.contract_status_id === 4 && (
                        <>
                            <Text style={[fonts.titleMedium, { color: colors.primary, margin: 10 }]}>
                                Location Tracking
                            </Text>
                            <Divider style={{ marginBottom: 10 }} />
                            <InfoRow 
                                label="Pickup Location:" 
                                value={contractData.pickup_location} 
                                colors={colors} 
                                fonts={fonts}
                                style={{ marginHorizontal: '2%' }}
                            />
                            <InfoRow 
                                label="Recent Location:" 
                                value={contractData.current_location} 
                                colors={colors} 
                                fonts={fonts}
                                style={{ marginHorizontal: '2%' }}
                            />
                            <InfoRow 
                                label="Drop-Off Location:" 
                                value={contractData.drop_off_location} 
                                colors={colors} 
                                fonts={fonts}
                                style={{ marginHorizontal: '2%' }}
                            />
                        </>
                    )}
                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Contractor Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />
                    
                    <InfoRow label="Name:" value={formatProfileName(contractor)} colors={colors} fonts={fonts}/>
                    <InfoRow label="Email:" value={contractor?.email} colors={colors} fonts={fonts}/>
                    <InfoRow label="Contact:" value={contractor?.contact_number} colors={colors} fonts={fonts}/>

                    {contractData.delivery_id && (
                        <>
                            <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                                Subcontractor Information
                            </Text>
                            <Divider style={{ marginBottom: 10 }} />
                            
                            <InfoRow label="Name:" value={formatProfileName(subcontractor)} colors={colors} fonts={fonts}/>
                            <InfoRow label="Email:" value={subcontractor?.email} colors={colors} fonts={fonts}/>
                            <InfoRow label="Contact:" value={subcontractor?.contact_number} colors={colors} fonts={fonts}/>
                        </>
                    )}

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
                    {contractData.accepted_at && (
                        <InfoRow label="Accepted:" value={formatDate(contractData.accepted_at)} colors={colors} fonts={fonts} />
                    )}
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

                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Documents
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

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
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Proof of Delivery:</Text>
                        {contractData.proof_of_delivery ? (
                            <Image
                                source={{ uri: contractData.proof_of_delivery }}
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
        width: width * 0.4,
        height: 150,
        borderRadius: 8,
    },
    portraitImage: {
        width: width * 0.4,
        height: 300,
        borderRadius: 8,
    },
    map: {
        width: '100%',
        height: '100%',
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

export default ContractDetails