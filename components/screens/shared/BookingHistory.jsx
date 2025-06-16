import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Text, Button, useTheme, Searchbar, Menu, DataTable } from 'react-native-paper'
import { supabase } from '../../../lib/supabase'
import Header from '../../customComponents/Header'

const COLUMN_WIDTH = 180
const ID_COLUMN_WIDTH = 120
const LOCATION_COLUMN_WIDTH = 200
const TIMELINE_COLUMN_WIDTH = 300
const STATUS_COLUMN_WIDTH = 150

const BookingHistory = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showDateMenu, setShowDateMenu] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusOptions, setStatusOptions] = useState([])

  useEffect(() => {
    fetchStatusOptions()
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [statusFilter, searchQuery])


  const fetchStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_status')
        .select('id, status_name')
        .order('id')

      if (error) throw error

      const options = [
        { label: 'All', value: 'all' },
        ...data.map(status => ({
          label: status.status_name,
          value: status.id.toString()
        }))
      ]

      setStatusOptions(options)
    } catch (error) {
      console.error('Error fetching status options:', error.message)
    }
  }

  const getStatusOptions = () => {
    return statusOptions
  }

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      let query = supabase
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
          ),
          airline_profile:airline_id (
            pfp_id,
            first_name,
            middle_initial,
            last_name,
            suffix
          )
        `)
        .or(`airline_id.eq.${user.id},delivery_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('contract_status_id', statusFilter)
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

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchContracts()
    setRefreshing(false)
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
      case 'payment':
        return contract.payment_id || ''
      default:
        return contract[column] || ''
    }
  }

  const getDateFilterOptions = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

    return [
      { label: 'All Time', value: 'all' },
      { label: 'Today', value: 'today' },
      { label: 'Yesterday', value: 'yesterday' },
      { label: 'This Month', value: 'this_month' },
      { label: 'Last Month', value: 'last_month' }
    ]
  }

  const getDateFilterLabel = (value) => {
    return getDateFilterOptions().find(opt => opt.value === value)?.label || 'All Time'
  }

  const filterByDate = (contract) => {
    if (dateFilter === 'all') return true

    const createdDate = new Date(contract.created_at)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0) // Start of yesterday
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    thisMonth.setHours(0, 0, 0, 0) // Start of this month
    
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    lastMonth.setHours(0, 0, 0, 0) // Start of last month

    switch (dateFilter) {
      case 'today':
        return createdDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0) && 
               createdDate <= today
      case 'yesterday':
        return createdDate >= yesterday && 
               createdDate <= new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
      case 'this_month':
        return createdDate >= thisMonth && createdDate <= today
      case 'last_month':
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
        return createdDate >= lastMonth && createdDate <= lastMonthEnd
      default:
        return true
    }
  }

  const filteredAndSortedContracts = contracts
    .filter(contract => {
      if (!searchQuery) return filterByDate(contract);
      
      const searchValue = searchQuery.toLowerCase();
      const contractId = String(contract.id || '').toLowerCase();
      const dropOffLocation = String(contract.drop_off_location || '').toLowerCase();
      
      return (contractId.includes(searchValue) || dropOffLocation.includes(searchValue)) && filterByDate(contract);
    })
    .sort((a, b) => {
      const valA = getSortValue(a, sortColumn)
      const valB = getSortValue(b, sortColumn)

      // Handle date columns
      if (['created_at', 'pickup_at', 'delivered_at', 'cancelled_at', 'timeline'].includes(sortColumn)) {
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
    { key: 'drop_off_location', label: 'Drop-off Location', width: LOCATION_COLUMN_WIDTH },
    { key: 'status', label: 'Status', width: STATUS_COLUMN_WIDTH },
    { key: 'timeline', label: 'Timeline', width: TIMELINE_COLUMN_WIDTH },
  ]

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
          placeholder="Search by ID or Drop-off Location"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: colors.surface }]}
        />
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Filter by Status:</Text>
          <View style={styles.menuAnchor}>
            <Menu
              visible={showStatusMenu}
              onDismiss={() => setShowStatusMenu(false)}
              anchor={
                <Button
                  mode="contained"
                  icon="filter-variant"
                  onPress={() => setShowStatusMenu(true)}
                  style={[styles.button, { borderColor: colors.primary, flex: 1 }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
                >
                  {getStatusOptions().find(opt => opt.value === statusFilter)?.label || 'All'}
                </Button>
              }
              contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
            >
              {getStatusOptions().map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setStatusFilter(option.value)
                    setShowStatusMenu(false)
                  }}
                  title={option.label}
                  titleStyle={[
                    {
                      color: statusFilter === option.value
                        ? colors.primary
                        : colors.onSurface,
                    },
                    fonts.bodyLarge,
                  ]}
                  leadingIcon={statusFilter === option.value ? 'check' : undefined}
                />
              ))}
            </Menu>
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Filter by Date:</Text>
          <View style={styles.menuAnchor}>
            <Menu
              visible={showDateMenu}
              onDismiss={() => setShowDateMenu(false)}
              anchor={
                <Button
                  mode="contained"
                  icon="calendar"
                  onPress={() => setShowDateMenu(true)}
                  style={[styles.button, { borderColor: colors.primary, flex: 1 }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
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
                        onPress={() => navigation.navigate('ContractDetails', { id: contract.id })}
                        style={[styles.actionButton, { borderColor: colors.primary }]}
                        contentStyle={styles.buttonContent}
                        labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                      >
                        Show Details
                      </Button>
                    </DataTable.Cell>
                    {columns.map(({ key, width }) => (
                      <DataTable.Cell
                        key={key}
                        style={{ width: width || COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}
                      >
                        {key === 'payment' ? (
                          <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]} selectable>
                            {contract.payment_id || 'N/A'}
                          </Text>
                        ) : key === 'status' ? (
                          <Text style={[styles.statusText, { color: getStatusColor(contract.contract_status_id) }]}>
                            {contract.contract_status?.status_name}
                          </Text>
                        ) : key === 'timeline' ? (
                          <View style={styles.timelineContainer}>
                            <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                              Created: {formatDate(contract.created_at)}
                            </Text>
                            {contract.pickup_at && (
                              <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                                Pickup: {formatDate(contract.pickup_at)}
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
  filterContainer: {
    marginHorizontal: 16,
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterLabel: {
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 10,
  },
  button: {
    marginVertical: 10,
    height: 48,
    borderRadius: 8,
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
  tableContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    minHeight: '60%',
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
  statusText: {
    fontWeight: 'bold',
  },
  actionButton: {
    borderRadius: 8,
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
  timelineContainer: {
    alignItems: 'flex-start',
    gap: 4,
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
})

export default BookingHistory
