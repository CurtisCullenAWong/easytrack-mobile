import { useEffect, useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Image } from 'react-native'
import { Text, Card, Divider, useTheme, Appbar, Button, Portal, Dialog, TextInput } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../../../lib/supabaseAdmin'

const ContractDetailsAdmin = ({ navigation, route }) => {
    const { colors, fonts } = useTheme()
    const { id } = route.params || {}
    const [contractData, setContractData] = useState(null)
    const [contractor, setContractor] = useState(null)
    const [subcontractor, setSubcontractor] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const [showSurchargeDialog, setShowSurchargeDialog] = useState(false)
    const [showDiscountDialog, setShowDiscountDialog] = useState(false)
    const [surchargeAmount, setSurchargeAmount] = useState('')
    const [discountAmount, setDiscountAmount] = useState('')

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

    const formatCurrency = (amount) => {
        return `₱${parseFloat(amount).toFixed(2)}`
    }

    const formatPercentage = (amount) => {
        return `${parseFloat(amount).toFixed(2)}%`
    }

    const handleAddSurcharge = async () => {
        try {
            const { error } = await supabase
                .from('contract')
                .update({ surcharge: parseFloat(surchargeAmount) })
                .eq('id', id)

            if (error) throw error

            setShowSurchargeDialog(false)
            setSurchargeAmount('')
            fetchContract()
        } catch (error) {
            console.error('Error adding surcharge:', error)
        }
    }

    const handleAddDiscount = async () => {
        try {
            const { error } = await supabase
                .from('contract')
                .update({ discount: parseFloat(discountAmount) })
                .eq('id', id)

            if (error) throw error

            setShowDiscountDialog(false)
            setDiscountAmount('')
            fetchContract()
        } catch (error) {
            console.error('Error adding discount:', error)
        }
    }

    if (!contractData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Appbar.Header>
                    <Appbar.BackAction onPress={() => navigation.goBack()} />
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
                        Financial Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Delivery Charge:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
                            {formatCurrency(contractData.delivery_charge || 0)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Surcharge:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
                            {formatCurrency(contractData.surcharge || 0)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Discount:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
                            {formatPercentage(contractData.discount || 0)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Total Amount:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.primary, fontWeight: 'bold' }]}>
                            {formatCurrency(((contractData.delivery_charge || 0) + (contractData.surcharge || 0)) * 
                                (1 - (contractData.discount || 0) / 100))}
                        </Text>
                    </View>
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
                    <View style={styles.adminActions}>
                        <Button
                            mode="outlined"
                            icon="plus"
                            onPress={() => setShowSurchargeDialog(true)}
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                        >
                            Adjust Surcharge
                        </Button>
                    </View>
                    <View style={styles.adminActions}>
                        <Button
                            mode="outlined"
                            icon="minus"
                            onPress={() => setShowDiscountDialog(true)}
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                        >
                            Adjust Discount
                        </Button>
                    </View>
                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Passenger Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <View style={styles.imageSection}>
                        <View style={[styles.imageContainer, { backgroundColor: colors.surfaceVariant }]}>
                            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>Passenger ID</Text>
                            {contractData.passenger_id ? (
                                <Image
                                    source={{ uri: contractData.passenger_id }}
                                    style={styles.landscapeImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>No ID image available</Text>
                            )}
                        </View>

                        <View style={[styles.imageContainer, { backgroundColor: colors.surfaceVariant }]}>
                            <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>Passenger Form</Text>
                            {contractData.passenger_form ? (
                                <Image
                                    source={{ uri: contractData.passenger_form }}
                                    style={styles.portraitImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>No form image available</Text>
                            )}
                        </View>
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
                </Card.Content>
            </Card>

            <Portal>
                <Dialog
                    visible={showSurchargeDialog}
                    onDismiss={() => setShowSurchargeDialog(false)}
                    style={{ backgroundColor: colors.surface }}
                >
                    <Dialog.Title>Adjust Surcharge</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Surcharge Amount"
                            value={surchargeAmount}
                            onChangeText={setSurchargeAmount}
                            keyboardType="numeric"
                            mode="outlined"
                            style={{ marginBottom: 16 }}
                            right={<TextInput.Affix text="₱" />}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowSurchargeDialog(false)}>Cancel</Button>
                        <Button onPress={handleAddSurcharge}>Adjust</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Portal>
                <Dialog
                    visible={showDiscountDialog}
                    onDismiss={() => setShowDiscountDialog(false)}
                    style={{ backgroundColor: colors.surface }}
                >
                    <Dialog.Title>Adjust Discount</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Discount Percentage"
                            value={discountAmount}
                            onChangeText={(text) => {
                                // Only allow numbers and decimal point
                                const filtered = text.replace(/[^0-9.]/g, '')
                                // Ensure only one decimal point
                                const parts = filtered.split('.')
                                if (parts.length > 2) {
                                    setDiscountAmount(parts[0] + '.' + parts.slice(1).join(''))
                                } else {
                                    setDiscountAmount(filtered)
                                }
                            }}
                            keyboardType="numeric"
                            mode="outlined"
                            style={{ marginBottom: 16 }}
                            right={<TextInput.Affix text="%" />}
                        />
                        <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
                            Enter a percentage between 0 and 100
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowDiscountDialog(false)}>Cancel</Button>
                        <Button 
                            onPress={() => {
                                const percentage = parseFloat(discountAmount)
                                if (percentage >= 0 && percentage <= 100) {
                                    handleAddDiscount()
                                }
                            }}
                            disabled={!discountAmount || parseFloat(discountAmount) < 0 || parseFloat(discountAmount) > 100}
                        >
                            Adjust
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
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
    },
    luggageSection: {
        marginVertical: 8,
    },
    errorText: {
        textAlign: 'center',
        marginTop: 20,
    },
    adminActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        marginBottom: 8,
    },
    actionButton: {
        borderRadius: 8,
        minWidth: 150,
    },
    buttonContent: {
        height: 48,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    imageSection: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    imageContainer: {
        flex: 1,
        minWidth: 300,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    landscapeImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
    },
    portraitImage: {
        width: 200,
        height: 300,
        borderRadius: 8,
    },
})

export default ContractDetailsAdmin 