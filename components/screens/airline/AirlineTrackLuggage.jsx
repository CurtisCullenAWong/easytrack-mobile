import React, { useEffect } from 'react'
import {
    View,
    ScrollView,
    Dimensions,
    Image,
    StyleSheet,
} from 'react-native'
import { Text, TextInput, Button, Surface, useTheme, Card, Divider } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'

const { width, height } = Dimensions.get('window')

const AirlineTrackLuggage = ({ navigation, route }) => {
    const [trackingNumber, setTrackingNumber] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [contractData, setContractData] = React.useState(null)
    const { colors, fonts } = useTheme()
    const { showSnackbar, SnackbarElement } = useSnackbar()
    const { contractId, contractData: initialContractData } = route.params || {}

    useEffect(() => {
        if (contractId) {
            setTrackingNumber(contractId)
            if (initialContractData) {
                setContractData(initialContractData)
            }
        }
    }, [contractId, initialContractData])

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
        if (!trackingNumber.trim()) {
            showSnackbar('Please enter a tracking number')
            return
        }

        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('contract')
                .select(`
                    *,
                    contract_status:contract_status_id (status_name),
                    luggage_info:contract_luggage_information (
                        luggage_owner,
                        case_number,
                        item_description,
                        weight,
                        contact_number
                    )
                `)
                .eq('id', trackingNumber.trim())
                .single()

            if (error) throw error

            if (!data) {
                showSnackbar('No contract found with this tracking number')
                setContractData(null)
                return
            }

            setContractData(data)
        } catch (error) {
            console.error('Error tracking luggage:', error)
            showSnackbar('Error tracking luggage: ' + error.message)
            setContractData(null)
        } finally {
            setLoading(false)
        }
    }

    const renderContractInfo = () => {
        if (!contractData) return null

        const firstLuggage = contractData.luggage_info?.[0] || {}

        return (
            <Card style={[styles.contractCard, { backgroundColor: colors.surface }]}>
                <Card.Content>
                    <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 10 }]}>
                        Contract Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />
                    
                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Contract ID:</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{contractData.id}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Status:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.primary }]}>
                            {contractData.contract_status?.status_name || 'Unknown'}
                        </Text>
                    </View>

                    <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 20, marginBottom: 10 }]}>
                        Luggage Information
                    </Text>
                    <Divider style={{ marginBottom: 10 }} />

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Owner:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{firstLuggage.luggage_owner || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Case Number:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{firstLuggage.case_number || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[fonts.labelMedium, { color: colors.onSurfaceVariant }]}>Items:</Text>
                        <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{contractData.luggage_quantity || 0}</Text>
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
        <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
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
})

export default AirlineTrackLuggage