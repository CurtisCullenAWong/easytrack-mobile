import { useEffect, useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Image, Dimensions } from 'react-native'
import { Text, Button, Divider, useTheme, Appbar, Chip, Searchbar, Menu, DataTable, Portal, Modal } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../../../lib/supabaseAdmin'

const COLUMN_WIDTH = 180
const ID_COLUMN_WIDTH = 120
const LOCATION_COLUMN_WIDTH = 200
const TIMELINE_COLUMN_WIDTH = 300
const STATUS_COLUMN_WIDTH = 150

const BookingHistoryAdmin = ({ navigation }) => {
    const { colors, fonts } = useTheme()
    const [contracts, setContracts] = useState([])
    const [refreshing, setRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [showStatusMenu, setShowStatusMenu] = useState(false)
    const [loading, setLoading] = useState(true)
    const [selectedImage, setSelectedImage] = useState(null)
    const [showImageModal, setShowImageModal] = useState(false)
    const [page, setPage] = useState(0)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [sortColumn, setSortColumn] = useState('created_at')
    const [sortDirection, setSortDirection] = useState('descending')

    const fetchContracts = async () => {
        try {
            setLoading(true)
            let query = supabase
                .from('contract')
                .select(`
                    *,
                    contract_status:contract_status_id(*),
                    profiles:airline_id(first_name, middle_initial, last_name, suffix),
                    delivery:delivery_id(first_name, middle_initial, last_name, suffix)
                `)
                .order('created_at', { ascending: false })

            // Apply status filter
            if (statusFilter !== 'all') {
                query = query.eq('contract_status_id', statusFilter)
            }

            // Apply search filter
            if (searchQuery) {
                query = query.or(`id.ilike.%${searchQuery}%,passenger_id.ilike.%${searchQuery}%`)
            }

            const { data, error } = await query

            if (error) throw error

            setContracts(data || [])
        } catch (error) {
            console.error('Error fetching contracts:', error.message)
        } finally {
            setLoading(false)
        }
    }

    useFocusEffect(
        useCallback(() => {
            fetchContracts()
        }, [statusFilter, searchQuery])
    )

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await fetchContracts()
        setRefreshing(false)
    }, [statusFilter, searchQuery])

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

    const getStatusColor = (statusId) => {
        const statusColors = {
            1: colors.primary,    // Pickup
            2: colors.error,      // Cancelled
            3: colors.primary,    // Accepted
            4: colors.primary,    // In Transit
            5: colors.primary,    // Delivered
            6: colors.error,      // Failed (Cancelled)
        }
        return statusColors[statusId] || colors.primary
    }

    const getStatusOptions = () => [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: '1' },
        { label: 'Accepted', value: '2' },
        { label: 'In Transit', value: '3' },
        { label: 'Delivered', value: '4' },
        { label: 'Cancelled', value: '5' },
    ]

    const handleImagePress = (imageUrl) => {
        setSelectedImage(imageUrl)
        setShowImageModal(true)
    }

    const ImagePreview = ({ url, style }) => {
        if (!url) return null
        return (
            <Image
                source={{ uri: url }}
                style={style}
                resizeMode="cover"
            />
        )
    }

    const handleSort = (column) => {
        setSortDirection(prev =>
            sortColumn === column && prev === 'ascending' ? 'descending' : 'ascending'
        )
        setSortColumn(column)
    }

    const getSortIcon = (column) =>
        sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : ''

    const filteredAndSortedContracts = contracts
        .filter(contract => {
            const searchValue = String(contract.id || '').toLowerCase()
            const query = searchQuery.toLowerCase()
            return searchValue.includes(query)
        })
        .sort((a, b) => {
            const valA = a[sortColumn]
            const valB = b[sortColumn]

            if (['created_at', 'delivered_at', 'cancelled_at'].includes(sortColumn)) {
                if (!valA) return sortDirection === 'ascending' ? -1 : 1
                if (!valB) return sortDirection === 'ascending' ? 1 : -1
                return sortDirection === 'ascending' 
                    ? new Date(valA) - new Date(valB)
                    : new Date(valB) - new Date(valA)
            }

            if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
            if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
            return 0
        })

    const from = page * itemsPerPage
    const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedContracts.length)
    const paginatedContracts = filteredAndSortedContracts.slice(from, to)

    const columns = [
        { key: 'id', label: 'Contract ID', width: ID_COLUMN_WIDTH },
        { key: 'pickup_location', label: 'Pickup Location', width: LOCATION_COLUMN_WIDTH },
        { key: 'drop_off_location', label: 'Drop-off Location', width: LOCATION_COLUMN_WIDTH },
        { key: 'status', label: 'Status', width: STATUS_COLUMN_WIDTH },
        { key: 'timeline', label: 'Timeline', width: TIMELINE_COLUMN_WIDTH },
    ]

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title="Booking History" />
            </Appbar.Header>

            <View style={styles.searchActionsRow}>
                <Searchbar
                    placeholder="Search by Contract ID"
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchbar, { backgroundColor: colors.surface }]}
                />
                <Menu
                    visible={showStatusMenu}
                    onDismiss={() => setShowStatusMenu(false)}
                    anchor={
                        <Chip
                            onPress={() => setShowStatusMenu(true)}
                            style={[styles.filterChip, { backgroundColor: colors.surface }]}
                        >
                            {getStatusOptions().find(opt => opt.value === statusFilter)?.label || 'All'}
                        </Chip>
                    }
                >
                    {getStatusOptions().map((option) => (
                        <Menu.Item
                            key={option.value}
                            onPress={() => {
                                setStatusFilter(option.value)
                                setShowStatusMenu(false)
                            }}
                            title={option.label}
                        />
                    ))}
                </Menu>
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
            >
                {loading ? (
                    <Text style={[styles.loadingText, { color: colors.onSurface }]}>Loading...</Text>
                ) : (
                    <View style={styles.tableContainer}>
                        <ScrollView horizontal>
                            <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
                                <DataTable.Header style={[styles.table, { backgroundColor: colors.surfaceVariant }]}>
                                    {columns.map(({ key, label, width }) => (
                                        <DataTable.Title
                                            key={key}
                                            style={{ width, justifyContent: 'center' }}
                                            onPress={() => handleSort(key)}
                                        >
                                            <View style={styles.sortableHeader}>
                                                <Text style={[{ color: colors.onSurface }, fonts.labelLarge]}>{label}</Text>
                                                <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                                            </View>
                                        </DataTable.Title>
                                    ))}
                                    <DataTable.Title style={{ width: COLUMN_WIDTH, justifyContent: 'center' }}>
                                        <Text style={[{ color: colors.onSurface }, fonts.labelLarge]}>Actions</Text>
                                    </DataTable.Title>
                                </DataTable.Header>

                                {filteredAndSortedContracts.length === 0 ? (
                                    <DataTable.Row style={styles.tableRow}>
                                        <DataTable.Cell style={styles.noDataCell}>
                                            <Text style={[{ color: colors.onSurface, textAlign: 'center' }, fonts.bodyMedium]}>
                                                No bookings found
                                            </Text>
                                        </DataTable.Cell>
                                    </DataTable.Row>
                                ) : (
                                    paginatedContracts.map((contract) => (
                                        <DataTable.Row key={contract.id} style={styles.tableRow}>
                                            <DataTable.Cell style={{ width: ID_COLUMN_WIDTH, justifyContent: 'center' }}>
                                                <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]} selectable>
                                                    {contract.id}
                                                </Text>
                                            </DataTable.Cell>
                                            <DataTable.Cell style={{ width: LOCATION_COLUMN_WIDTH, justifyContent: 'center' }}>
                                                <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                                    {contract.pickup_location || 'N/A'}
                                                </Text>
                                            </DataTable.Cell>
                                            <DataTable.Cell style={{ width: LOCATION_COLUMN_WIDTH, justifyContent: 'center' }}>
                                                <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                                    {contract.drop_off_location || 'N/A'}
                                                </Text>
                                            </DataTable.Cell>
                                            <DataTable.Cell style={{ width: STATUS_COLUMN_WIDTH, justifyContent: 'center' }}>
                                                <Chip
                                                    style={[styles.statusChip, { backgroundColor: getStatusColor(contract.contract_status_id) }]}
                                                    textStyle={{ color: colors.surface }}
                                                >
                                                    {contract.contract_status?.status_name}
                                                </Chip>
                                            </DataTable.Cell>
                                            <DataTable.Cell style={{ width: TIMELINE_COLUMN_WIDTH, justifyContent: 'center' }}>
                                                <View style={styles.timelineContainer}>
                                                    <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                                        Created: {formatDate(contract.created_at)}
                                                    </Text>
                                                    {contract.accepted_at && (
                                                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                                            Accepted: {formatDate(contract.accepted_at)}
                                                        </Text>
                                                    )}
                                                    {contract.delivered_at && (
                                                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                                            Delivered: {formatDate(contract.delivered_at)}
                                                        </Text>
                                                    )}
                                                    {contract.cancelled_at && (
                                                        <Text style={[{ color: colors.error }, fonts.bodyMedium]}>
                                                            Cancelled: {formatDate(contract.cancelled_at)}
                                                        </Text>
                                                    )}
                                                </View>
                                            </DataTable.Cell>
                                            <DataTable.Cell style={{ width: COLUMN_WIDTH, justifyContent: 'center' }}>
                                                <Button
                                                    mode="outlined"
                                                    onPress={() => navigation.navigate('ContractDetailsAdmin', { id: contract.id })}
                                                    style={[styles.actionButton, { borderColor: colors.primary }]}
                                                    contentStyle={styles.buttonContent}
                                                    labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                                                >
                                                    View Details
                                                </Button>
                                            </DataTable.Cell>
                                        </DataTable.Row>
                                    ))
                                )}
                            </DataTable>
                        </ScrollView>

                        <View style={[styles.paginationContainer, { backgroundColor: colors.surface }]}>
                            <DataTable.Pagination
                                page={page}
                                numberOfPages={Math.ceil(filteredAndSortedContracts.length / itemsPerPage)}
                                onPageChange={page => setPage(page)}
                                label={`${from + 1}-${to} of ${filteredAndSortedContracts.length}`}
                                labelStyle={[{ color: colors.onSurface }, fonts.bodyMedium]}
                                showFirstPageButton
                                showLastPageButton
                                showFastPaginationControls
                                numberOfItemsPerPageList={[5, 10, 20, 50]}
                                numberOfItemsPerPage={itemsPerPage}
                                onItemsPerPageChange={setItemsPerPage}
                                selectPageDropdownLabel={'Rows per page'}
                                style={[styles.pagination, { backgroundColor: colors.surfaceVariant }]}
                                theme={{
                                    colors: {
                                        onSurface: colors.onSurface,
                                        text: colors.onSurface,
                                        elevation: {
                                            level2: colors.surface,
                                        },
                                    },
                                    fonts: {
                                        bodyMedium: fonts.bodyMedium,
                                        labelMedium: fonts.labelMedium,
                                    },
                                }}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>

            <Portal>
                <Modal
                    visible={showImageModal}
                    onDismiss={() => setShowImageModal(false)}
                    contentContainerStyle={styles.modalContainer}
                >
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    )}
                </Modal>
            </Portal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        gap: 10,
    },
    searchbar: {
        flex: 1,
    },
    filterChip: {
        height: 40,
    },
    tableContainer: {
        flex: 1,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    table: {
        flex: 1,
    },
    sortableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sortIcon: {
        marginLeft: 4,
    },
    statusChip: {
        height: 32,
        justifyContent: 'center',
    },
    thumbnailImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    actionButton: {
        borderRadius: 8,
        minWidth: 100,
    },
    buttonContent: {
        height: 48,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    noDataCell: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        flex: 1,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 20,
    },
    paginationContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.12)',
    },
    pagination: {
        justifyContent: 'space-evenly',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.12)',
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 12,
        maxHeight: '80%',
    },
    modalImage: {
        width: Dimensions.get('window').width - 80,
        height: Dimensions.get('window').height - 200,
    },
    timelineContainer: {
        alignItems: 'flex-start',
        gap: 4,
    },
    tableRow: {
        minHeight: 80,
    },
})

export default BookingHistoryAdmin 