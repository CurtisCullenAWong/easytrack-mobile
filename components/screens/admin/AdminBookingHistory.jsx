import { useState, useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Image, Dimensions } from 'react-native'
import { Text, Button, useTheme, Chip, Searchbar, Menu, DataTable, Portal, Modal } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../../lib/supabaseAdmin'
import Header from '../../customComponents/Header'

const COLUMN_WIDTH = 180
const ID_COLUMN_WIDTH = 120
const LOCATION_COLUMN_WIDTH = 200
const TIMELINE_COLUMN_WIDTH = 300
const STATUS_COLUMN_WIDTH = 300
const PAYMENT_COLUMN_WIDTH = 150

const BookingHistoryAdmin = ({ navigation }) => {
    const { colors, fonts } = useTheme()
    const [contracts, setContracts] = useState([])
    const [refreshing, setRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchColumn, setSearchColumn] = useState('id')
    const [filterMenuVisible, setFilterMenuVisible] = useState(false)
    const [statusFilter, setStatusFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [selectedImage, setSelectedImage] = useState(null)
    const [showImageModal, setShowImageModal] = useState(false)
    const [page, setPage] = useState(0)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [sortColumn, setSortColumn] = useState('created_at')
    const [sortDirection, setSortDirection] = useState('descending')
    const [showDateMenu, setShowDateMenu] = useState(false)
    const [dateFilter, setDateFilter] = useState('all')

    const getDateFilterOptions = () => {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const thisYear = new Date(today.getFullYear(), 0, 1)
        const lastYear = new Date(today.getFullYear() - 1, 0, 1)

        return [
            { label: 'All Time', value: 'all' },
            { label: 'Today', value: 'today' },
            { label: 'Yesterday', value: 'yesterday' },
            { label: 'This Month', value: 'this_month' },
            { label: 'Last Month', value: 'last_month' },
            { label: 'This Year', value: 'this_year' },
            { label: 'Last Year', value: 'last_year' }
        ]
    }

    const getDateFilterLabel = (value) => {
        return getDateFilterOptions().find(opt => opt.value === value)?.label || 'All Time'
    }

    const getDateRange = () => {
        const today = new Date()
        today.setHours(23, 59, 59, 999) // End of today
        
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0) // Start of yesterday
        
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        thisMonth.setHours(0, 0, 0, 0) // Start of this month
        
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        lastMonth.setHours(0, 0, 0, 0) // Start of last month
        
        const thisYear = new Date(today.getFullYear(), 0, 1)
        thisYear.setHours(0, 0, 0, 0) // Start of this year
        
        const lastYear = new Date(today.getFullYear() - 1, 0, 1)
        lastYear.setHours(0, 0, 0, 0) // Start of last year

        switch (dateFilter) {
            case 'today':
                return {
                    start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString(),
                    end: today.toISOString()
                }
            case 'yesterday':
                return {
                    start: yesterday.toISOString(),
                    end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString()
                }
            case 'this_month':
                return {
                    start: thisMonth.toISOString(),
                    end: today.toISOString()
                }
            case 'last_month':
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
                return {
                    start: lastMonth.toISOString(),
                    end: lastMonthEnd.toISOString()
                }
            case 'this_year':
                return {
                    start: thisYear.toISOString(),
                    end: today.toISOString()
                }
            case 'last_year':
                const lastYearEnd = new Date(today.getFullYear(), 0, 0, 23, 59, 59, 999)
                return {
                    start: lastYear.toISOString(),
                    end: lastYearEnd.toISOString()
                }
            default:
                return null
        }
    }

    const fetchContracts = async () => {
        try {
            setLoading(true)
            let query = supabase
                .from('contracts')
                .select(`
                    *,
                    contract_status:contract_status_id(*),
                    airline:airline_id(first_name, middle_initial, last_name, suffix),
                    delivery:delivery_id(first_name, middle_initial, last_name, suffix)
                `)
                .order('created_at', { ascending: false })


            // Apply date filter if selected
            const dateRange = getDateRange()
            if (dateRange) {
                query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
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
        }, [])
    )

    // Effect to refetch data when date filter changes
    useEffect(() => {
        fetchContracts()
    }, [dateFilter])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await fetchContracts()
        setRefreshing(false)
    }, [])

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
            1: colors.primary,    // Pending
            2: colors.error,      // Cancelled
            3: colors.primary,    // Accepted
            4: colors.primary,    // In Transit
            5: colors.primary,    // Delivered
        }
        return statusColors[statusId] || colors.primary
    }

    const getStatusOptions = () => [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: '1' },
        { label: 'Cancelled', value: '2' },
        { label: 'Accepted', value: '3' },
        { label: 'In Transit', value: '4' },
        { label: 'Delivered', value: '5' },
    ]

    const filterOptions = [
        { label: 'Contract ID', value: 'id' },
        { label: 'Status', value: 'status' },
        { label: 'Drop-off Location', value: 'drop_off_location' },
        { label: 'Flight Number', value: 'flight_number' },
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

    const getSortValue = (contract, column) => {
        switch (column) {
            case 'status':
                return contract.contract_status?.status_name || ''
            case 'timeline':
                return contract.created_at || ''
            case 'delivery_charge':
                return contract.delivery_charge || 0
            default:
                return contract[column] || ''
        }
    }

    const filteredAndSortedContracts = contracts
        .filter(contract => {
            const searchValue = String(contract[searchColumn] || '').toLowerCase()
            const query = searchQuery.toLowerCase()
            return searchValue.includes(query)
        })
        .sort((a, b) => {
            const valA = getSortValue(a, sortColumn)
            const valB = getSortValue(b, sortColumn)

            // Handle date columns
            if (['created_at', 'pickup_at', 'delivered_at', 'cancelled_at', 'accepted_at', 'timeline'].includes(sortColumn)) {
                if (!valA) return sortDirection === 'ascending' ? -1 : 1
                if (!valB) return sortDirection === 'ascending' ? 1 : -1
                return sortDirection === 'ascending' 
                    ? new Date(valA) - new Date(valB)
                    : new Date(valB) - new Date(valA)
            }

            // Handle numeric columns
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'ascending' ? valA - valB : valB - valA
            }

            // Handle string columns
            const strA = String(valA).toLowerCase()
            const strB = String(valB).toLowerCase()
            if (strA < strB) return sortDirection === 'ascending' ? -1 : 1
            if (strA > strB) return sortDirection === 'ascending' ? 1 : -1
            return 0
        })

    const from = page * itemsPerPage
    const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedContracts.length)
    const paginatedContracts = filteredAndSortedContracts.slice(from, to)

    const columns = [
        { key: 'id', label: 'Contract ID', width: ID_COLUMN_WIDTH },
        { key: 'status', label: 'Status', width: STATUS_COLUMN_WIDTH },
        { key: 'delivery_charge', label: 'Delivery Charge', width: PAYMENT_COLUMN_WIDTH },
        { key: 'drop_off_location', label: 'Drop-off Location', width: LOCATION_COLUMN_WIDTH },
        { key: 'timeline', label: 'Timeline', width: TIMELINE_COLUMN_WIDTH },
    ]

    return (
        <ScrollView 
            style={{ flex: 1, backgroundColor: colors.background }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
        >
            <Header navigation={navigation} title="Booking History" />

            <View style={styles.searchActionsRow}>
                <Searchbar
                    placeholder={`Search by ${filterOptions.find(opt => opt.value === searchColumn)?.label}`}
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchbar, { backgroundColor: colors.surface }]}
                />
            </View>

            <View style={styles.buttonContainer}>
                <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Filter by:</Text>
                <View style={styles.menuAnchor}>
                    <Menu
                        visible={filterMenuVisible}
                        onDismiss={() => setFilterMenuVisible(false)}
                        anchor={
                            <Button
                                mode="contained"
                                icon="filter-variant"
                                onPress={() => setFilterMenuVisible(true)}
                                style={[styles.button, { borderColor: colors.primary, flex: 1 }]}
                                contentStyle={styles.buttonContent}
                                labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
                            >
                                {filterOptions.find(opt => opt.value === searchColumn)?.label}
                            </Button>
                        }
                        contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
                    >
                        {filterOptions.map(option => (
                            <Menu.Item
                                key={option.value}
                                onPress={() => {
                                    setSearchColumn(option.value)
                                    setFilterMenuVisible(false)
                                }}
                                title={option.label}
                                titleStyle={[
                                    {
                                        color: searchColumn === option.value
                                            ? colors.primary
                                            : colors.onSurface,
                                    },
                                    fonts.bodyLarge,
                                ]}
                                leadingIcon={searchColumn === option.value ? 'check' : undefined}
                            />
                        ))}
                    </Menu>
                </View>
            </View>

            <View style={styles.buttonContainer}>
                <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Date Range:</Text>
                <View style={styles.menuAnchor}>
                    <Menu
                        visible={showDateMenu}
                        onDismiss={() => setShowDateMenu(false)}
                        anchor={
                            <Button
                                mode="outlined"
                                icon="calendar"
                                onPress={() => setShowDateMenu(true)}
                                style={[styles.button, { borderColor: colors.primary, flex: 1 }]}
                                contentStyle={styles.buttonContent}
                                labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                            >
                                {getDateFilterLabel(dateFilter)}
                            </Button>
                        }
                        contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
                    >
                        {getDateFilterOptions().map((option) => (
                            <Menu.Item
                                key={option.value}
                                onPress={() => {
                                    setDateFilter(option.value)
                                    setShowDateMenu(false)
                                }}
                                title={option.label}
                                titleStyle={[
                                    {
                                        color: dateFilter === option.value
                                            ? colors.primary
                                            : colors.onSurface,
                                    },
                                    fonts.bodyLarge,
                                ]}
                                leadingIcon={dateFilter === option.value ? 'check' : undefined}
                            />
                        ))}
                    </Menu>
                </View>
            </View>

            {loading ? (
                <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyMedium]}>
                    Loading bookings...
                </Text>
            ) : (
                <View style={styles.tableContainer}>
                    <ScrollView horizontal>
                        <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>

                            <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
                                <DataTable.Title style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                                    <Text style={[styles.headerText, { color: colors.onSurface }]}>Actions</Text>
                                </DataTable.Title>
                                {columns.map(({ key, label, width }) => (
                                    <DataTable.Title
                                        key={key}
                                        style={{ width: width || COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}
                                        onPress={() => handleSort(key)}
                                    >
                                        <View style={styles.sortableHeader}>
                                            <Text style={[styles.headerText, { color: colors.onSurface }]}>{label}</Text>
                                            <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                                        </View>
                                    </DataTable.Title>
                                ))}
                            </DataTable.Header>

                            {filteredAndSortedContracts.length === 0 ? (
                                <DataTable.Row>
                                    <DataTable.Cell style={styles.noDataCell}>
                                        <Text style={[{ color: colors.onSurface, textAlign: 'center' }, fonts.bodyMedium]}>
                                            No bookings found
                                        </Text>
                                    </DataTable.Cell>
                                </DataTable.Row>
                            ) : (
                                paginatedContracts.map((contract) => (
                                    <DataTable.Row key={contract.id}>
                                        <DataTable.Cell style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
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
                                        {columns.map(({ key, width }) => (
                                            <DataTable.Cell
                                                key={key}
                                                style={{ width: width || COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}
                                            >
                                                {key === 'delivery_charge' ? (
                                                    <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]} selectable>
                                                        {contract.delivery_charge ? `₱${contract.delivery_charge.toLocaleString()}` : 'N/A'}
                                                    </Text>
                                                ) : key === 'status' ? (
                                                    <Chip
                                                        style={[styles.statusChip, { backgroundColor: getStatusColor(contract.contract_status_id) }]}
                                                        textStyle={{ color: colors.surface }}
                                                    >
                                                        {contract.contract_status?.status_name}
                                                    </Chip>
                                                ) : key === 'timeline' ? (
                                                    <View style={styles.timelineContainer}>
                                                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                                            Created: {formatDate(contract.created_at)}
                                                        </Text>
                                                        {contract.accepted_at && (
                                                            <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                                                Accepted: {formatDate(contract.accepted_at)}
                                                            </Text>
                                                        )}
                                                        {contract.pickup_at && (
                                                            <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                                                Picked up: {formatDate(contract.pickup_at)}
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
                                                ) : (
                                                    <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]} selectable>
                                                        {contract[key] || 'N/A'}
                                                    </Text>
                                                )}
                                            </DataTable.Cell>
                                        ))}
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
        </ScrollView>
    )
}

const styles = StyleSheet.create({
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
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        gap: 10,
    },
    filterLabel: {
        marginRight: 8,
    },
    button: {
        marginVertical: 10,
        height: 40,
        borderRadius: 8,
    },
    buttonContent: {
        height: 40,
    },
    buttonLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    tableContainer: {
        flex: 1,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        minHeight: '70%',
        overflow: 'hidden',
    },
    table: {
        flex: 1,
    },
    sortableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    sortIcon: {
        fontSize: 12,
    },
    statusChip: {
        height: 32,
        justifyContent: 'center',
    },
    actionButton: {
        borderRadius: 8,
        minWidth: 100,
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
    menuAnchor: {
        flex: 1,
        position: 'relative',
    },
    menuContent: {
        width: '100%',
        left: 0,
        right: 0,
    },
    tableHeader: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    },
    headerText: {
        fontSize: 14,
        fontWeight: '600',
    },
})

export default BookingHistoryAdmin 