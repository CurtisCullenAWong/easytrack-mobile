import { useEffect, useState, useCallback, useRef } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Image, Dimensions } from 'react-native'
import { Text, Card, Divider, useTheme, Appbar, Button, ProgressBar } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import { supabase } from '../../../../lib/supabaseAdmin'
import useSnackbar from '../../../hooks/useSnackbar'
import AdjustAmountModal from '../../../customComponents/AdjustAmountModal'

const { width } = Dimensions.get('window')
const GOOGLE_MAPS_API_KEY = Constants.expoConfig.extra.googleMapsPlacesApiKey

const calculateRouteDetails = async (origin, destination) => {
    if (!origin || !destination) return { distance: null, duration: null }
    
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        )
        const data = await response.json()
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0].legs[0]
            return {
                distance: route.distance.value / 1000, // Convert meters to kilometers
                duration: route.duration.value // Duration in seconds
            }
        }
        return { distance: null, duration: null }
    } catch (error) {
        console.error('Error calculating route:', error)
        return { distance: null, duration: null }
    }
}

const formatDuration = (seconds) => {
    if (!seconds) return 'Calculating...'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours === 0) {
        return `${minutes} min`
    } else if (minutes === 0) {
        return `${hours} hr`
    } else {
        return `${hours} hr ${minutes} min`
    }
}

// ProgressMeter component
const ProgressMeter = ({ colors, contractData }) => {
    const [routeDetails, setRouteDetails] = useState({ distance: null, duration: null })
    const [totalRouteDetails, setTotalRouteDetails] = useState({ distance: null, duration: null })

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

    useEffect(() => {
        const fetchRouteDetails = async () => {
            if (currentCoords && dropOffCoords) {
                const details = await calculateRouteDetails(currentCoords, dropOffCoords)
                setRouteDetails(details)
            }
            if (pickupCoords && dropOffCoords) {
                const totalDetails = await calculateRouteDetails(pickupCoords, dropOffCoords)
                setTotalRouteDetails(totalDetails)
            }
        }
        fetchRouteDetails()
    }, [currentCoords, dropOffCoords, pickupCoords])

    const progress = totalRouteDetails.distance ? 
        Math.max(0, Math.min(1, 1 - (routeDetails.distance / totalRouteDetails.distance))) : 0

    return (
        <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
                <Text style={[styles.progressText, { color: colors.primary }]}>
                    Distance Remaining: {routeDetails.distance ? `${routeDetails.distance.toFixed(1)} km, ` : 'Calculating...'}
                </Text>
                <Text style={[styles.progressText, { color: colors.primary }]}>
                    ETA: {formatDuration(routeDetails.duration)}
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

// Info Row Component
const InfoRow = ({ label, value, colors, fonts, style }) => (
    <View style={[styles.infoRow, style]}>
        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[fonts.bodyMedium, { color: colors.onSurface, flex: 1, textAlign: 'right' }]} selectable numberOfLines={3}>{value || 'N/A'}</Text>
    </View>
)

const ContractDetailsAdmin = ({ navigation, route }) => {
    const { colors, fonts } = useTheme()
    const { id } = route.params || {}
    const [contractData, setContractData] = useState(null)
    const [contractor, setContractor] = useState(null)
    const [subcontractor, setSubcontractor] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const [showAdjustDialog, setShowAdjustDialog] = useState(false)
    const [surchargeAmount, setSurchargeAmount] = useState('')
    const [discountAmount, setDiscountAmount] = useState('')
    const [loadingAdjust, setLoadingAdjust] = useState(false)
    const subscriptionRef = useRef(null)
    const { showSnackbar, SnackbarElement } = useSnackbar()

    // Add state for error messages
    const [surchargeAmountError, setSurchargeAmountError] = useState("");
    const [discountAmountError, setDiscountAmountError] = useState("");

    

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
                contract_status:contract_status_id(*)
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

    const formatCurrency = (amount) => {
        return `₱${parseFloat(amount || 0).toFixed(2)}`
    }

    const handleAdjustAmounts = async (surchargeInput, discountInput) => {
        const sanitize = (val) => {
            let v = (val ?? '').toString().trim()
            if (v === '') return { ok: false, num: null }
            v = v.replace(/[^0-9.]/g, '')
            const parts = v.split('.')
            if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
            if (v.length > 1 && v.startsWith('0') && v[1] !== '.') {
                v = v.replace(/^0+/, '')
            }
            if (v.includes('.')) {
                const [intPart, decPart] = v.split('.')
                v = intPart + '.' + decPart.slice(0, 2)
            }
            const num = parseFloat(v)
            return { ok: !(isNaN(num) || num < 0), num }
        }

        const surcharge = sanitize(surchargeInput ?? surchargeAmount)
        const discount = sanitize(discountInput ?? discountAmount)

        let hasError = false
        if (!surcharge.ok) {
            setSurchargeAmountError('Enter a valid, non-negative amount')
            hasError = true
        } else {
            setSurchargeAmountError('')
        }
        if (!discount.ok) {
            setDiscountAmountError('Enter a valid, non-negative amount')
            hasError = true
        } else {
            setDiscountAmountError('')
        }
        if (hasError) return

        setLoadingAdjust(true)
        try {
            const { error } = await supabase
                .from('contracts')
                .update({ 
                    delivery_surcharge: surcharge.num, 
                    delivery_discount: discount.num 
                })
                .eq('id', id)
            if (error) throw error
            setShowAdjustDialog(false)
            setSurchargeAmount('')
            setDiscountAmount('')
            await fetchContract()
            showSnackbar('Surcharge and discount updated successfully!', true)
        } catch (error) {
            showSnackbar('Error updating amounts.', false)
            console.error('Error updating amounts:', error)
        } finally {
            setLoadingAdjust(false)
        }
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
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 50 }}
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
                    
                    {contractData.contract_status_id === 4 && (
                        <>
                            <Text style={[fonts.titleMedium, { color: colors.primary, margin: 10 }]}>
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
                        Payment Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <InfoRow label="Delivery Charge:" value={formatCurrency(contractData.delivery_charge)} colors={colors} fonts={fonts}/>
                    <InfoRow label="Delivery Surcharge:" value={formatCurrency(contractData.delivery_surcharge)} colors={colors} fonts={fonts}/>
                    <InfoRow label="Delivery Discount:" value={formatCurrency(contractData.delivery_discount)} colors={colors} fonts={fonts}/>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Total Amount:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.primary, fontWeight: 'bold' }]}> 
                            {formatCurrency(((contractData.delivery_charge || 0) + (contractData.delivery_surcharge || 0)) - (contractData.delivery_discount || 0))}
                        </Text>
                    </View>
                    
                    <View style={styles.adminActions}>
                        <Button
                            mode="outlined"
                            icon="pencil"
                            onPress={() => {
                                setSurchargeAmount(String(contractData.delivery_surcharge ?? 0))
                                setDiscountAmount(String(contractData.delivery_discount ?? 0))
                                setSurchargeAmountError('')
                                setDiscountAmountError('')
                                setShowAdjustDialog(true)
                            }}
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                        >
                            Adjust Surcharge & Discount
                        </Button>
                    </View>
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

            <AdjustAmountModal
                visible={showAdjustDialog}
                onDismiss={() => setShowAdjustDialog(false)}
                title="Adjust Charges"
                description="Update both surcharge and discount. Values must be 0 or above."
                surchargeAmount={surchargeAmount}
                setSurchargeAmount={setSurchargeAmount}
                surchargeError={surchargeAmountError}
                setSurchargeError={setSurchargeAmountError}
                discountAmount={discountAmount}
                setDiscountAmount={setDiscountAmount}
                discountError={discountAmountError}
                setDiscountError={setDiscountAmountError}
                loading={loadingAdjust}
                onConfirm={handleAdjustAmounts}
                currencySymbol="₱"
            />


            {SnackbarElement}
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

export default ContractDetailsAdmin 