import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Text, Button, useTheme, Searchbar, Menu, DataTable, Surface } from 'react-native-paper'
import { supabase } from '../../../lib/supabaseAdmin'
import Header from '../../customComponents/Header'

const COLUMN_WIDTH = 180
const ID_COLUMN_WIDTH = 200
const LOCATION_COLUMN_WIDTH = 200
const TIMELINE_COLUMN_WIDTH = 300
const STATUS_COLUMN_WIDTH = 150

const AdminBookingHistory = ({ navigation }) => {
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
  const [showCorporationMenu, setShowCorporationMenu] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [corporationFilter, setCorporationFilter] = useState('all')
  const [statusOptions, setStatusOptions] = useState([])
  const [corporations, setCorporations] = useState([])

  useEffect(() => {
    fetchStatusOptions()
    fetchCorporations()
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [statusFilter, dateFilter, searchQuery])


  // Listen to realtime changes for all contracts (admin scope)
  useEffect(() => {
    const channel = supabase
      .channel('admin_contracts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contracts' },
        () => {
          fetchContracts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])


  const fetchStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_status')
        .select('id, status_name')
        .order('id')

      if (error) throw error

      setStatusOptions(data || [])
    } catch (error) {
      console.error('Error fetching status options:', error.message)
    }
  }

  const getStatusOptions = () => {
    return [
      { label: 'All Statuses', value: 'all' },
      ...statusOptions.map(status => ({
        label: status.status_name,
        value: status.id.toString()
      }))
    ]
  }

  const fetchCorporations = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles_corporation')
        .select('corporation_name')
        .order('corporation_name', { ascending: true })

      if (error) {
        console.error('Error fetching corporations:', error)
        return
      }

      setCorporations(data || [])
    } catch (error) {
      console.error('Error fetching corporations:', error)
    }
  }

  const getCorporationFilterOptions = () => {
    return [
      { label: 'All Corporations', value: 'all' },
      ...corporations.map(corp => ({
        label: corp.corporation_name,
        value: corp.corporation_name
      }))
    ]
  }

  const getCorporationFilterLabel = (value) => {
    return getCorporationFilterOptions().find(opt => opt.value === value)?.label || 'All Corporations'
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
          contract_status:contract_status_id (status_name),
          airline_profile:airline_id (
            id,
            first_name,
            middle_initial,
            last_name,
            suffix,
            corporation:corporation_id (corporation_name)
          )
        `)
        .order('created_at', { ascending: false })
  
      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('contract_status_id', statusFilter)
      }

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

  const filteredAndSortedContracts = contracts
    .filter(contract => {
      // Search filter
      if (searchQuery) {
        const searchValue = searchQuery.toLowerCase();
        const contractId = String(contract.id || '').toLowerCase();
        const dropOffLocation = String(contract.drop_off_location || '').toLowerCase();
        
        if (!contractId.includes(searchValue) && !dropOffLocation.includes(searchValue)) {
          return false;
        }
      }

      // Corporation filter
      if (corporationFilter !== 'all') {
        const contractCorporation = contract.airline_profile?.corporation?.corporation_name || 'N/A';
        if (contractCorporation !== corporationFilter) {
          return false;
        }
      }
      
      return true;
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
    { key: 'corporation', label: 'Corporation', width: COLUMN_WIDTH },
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
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <Header navigation={navigation} title="Booking History" />
      
      <View style={styles.container}>
        {/* Search Section */}
        <Surface style={[styles.searchSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
            Search & Filter
          </Text>
          <Searchbar
            placeholder="Search by ID or Drop-off Location"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchbar, { backgroundColor: colors.surfaceVariant }]}
            iconColor={colors.onSurfaceVariant}
            inputStyle={[styles.searchInput, { color: colors.onSurfaceVariant }]}
          />
        </Surface>

        {/* Filters Section */}
        <Surface style={[styles.filtersSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.filtersContainer}>
            <View style={styles.filtersRow}>
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
                  Status Filter
                </Text>
                <Menu
                  visible={showStatusMenu}
                  onDismiss={() => setShowStatusMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      icon="flag"
                      onPress={() => setShowStatusMenu(true)}
                      style={[styles.filterButton, { borderColor: colors.outline }]}
                      contentStyle={styles.buttonContent}
                      labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                    >
                      {getStatusOptions().find(opt => opt.value === statusFilter)?.label || 'All Status'}
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

              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
                  Corporation Filter
                </Text>
                <Menu
                  visible={showCorporationMenu}
                  onDismiss={() => setShowCorporationMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      icon="office-building"
                      onPress={() => setShowCorporationMenu(true)}
                      style={[styles.filterButton, { borderColor: colors.outline }]}
                      contentStyle={styles.buttonContent}
                      labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                    >
                      {getCorporationFilterLabel(corporationFilter)}
                    </Button>
                  }
                  contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
                >
                  {getCorporationFilterOptions().map((option) => (
                    <Menu.Item
                      key={option.value}
                      onPress={() => {
                        setCorporationFilter(option.value)
                        setShowCorporationMenu(false)
                      }}
                      title={option.label}
                      titleStyle={[
                        {
                          color: corporationFilter === option.value
                            ? colors.primary
                            : colors.onSurface,
                        },
                        fonts.bodyLarge,
                      ]}
                      leadingIcon={corporationFilter === option.value ? 'check' : undefined}
                    />
                  ))}
                </Menu>
              </View>
            </View>

            <View style={styles.filtersRow}>
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
                  Date Filter
                </Text>
                <Menu
                  visible={showDateMenu}
                  onDismiss={() => setShowDateMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      icon="calendar"
                      onPress={() => setShowDateMenu(true)}
                      style={[styles.filterButton, { borderColor: colors.outline }]}
                      contentStyle={styles.buttonContent}
                      labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
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

              <View style={styles.filterGroup}>
                {/* Empty space for balance */}
              </View>
            </View>
          </View>
        </Surface>

        {/* Results Section */}
        <Surface style={[styles.resultsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
              Booking Results
            </Text>
            {!loading && (
              <Text style={[styles.resultsCount, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                {filteredAndSortedContracts.length} booking{filteredAndSortedContracts.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyLarge]}>
                Loading bookings...
              </Text>
            </View>
          ) : (
            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
                  <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
                    <DataTable.Title style={[styles.actionColumn, { justifyContent: 'center' }]}>
                      <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>Actions</Text>
                    </DataTable.Title>
                    {columns.map(({ key, label, width }) => (
                      <DataTable.Title
                        key={key}
                        style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                        onPress={() => handleSort(key)}
                      >
                        <View style={styles.sortableHeader}>
                          <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>{label}</Text>
                          <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                        </View>
                      </DataTable.Title>
                    ))}
                  </DataTable.Header>
                  
                  {filteredAndSortedContracts.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={styles.noDataCell}>
                        <Text style={[styles.noDataText, { color: colors.onSurfaceVariant }, fonts.bodyLarge]}>
                          No bookings found matching your criteria
                        </Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    paginatedContracts.map((contract, index) => (
                      <DataTable.Row 
                        key={contract.id}
                        style={[
                          styles.tableRow,
                          index % 2 === 0 && { backgroundColor: colors.surfaceVariant + '20' }
                        ]}
                      >
                        <DataTable.Cell style={[styles.actionColumn, { justifyContent: 'center' }]}>
                          <Button
                            mode="contained"
                            onPress={() => navigation.navigate('ContractDetailsAdmin', { id: contract.id })}
                            style={[styles.actionButton, { backgroundColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
                          >
                            View Details
                          </Button>
                        </DataTable.Cell>
                        {columns.map(({ key, width }) => (
                          <DataTable.Cell
                            key={key}
                            style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                          >
                            {key === 'payment' ? (
                              <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]} selectable>
                                {contract.payment_id || 'N/A'}
                              </Text>
                            ) : key === 'status' ? (
                              <View style={[styles.statusContainer, { backgroundColor: getStatusColor(contract.contract_status_id) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(contract.contract_status_id) }, fonts.labelMedium]}>
                                  {contract.contract_status?.status_name}
                                </Text>
                              </View>
                            ) : key === 'timeline' ? (
                              <View style={styles.timelineContainer}>
                                <Text style={[styles.timelineText, { color: colors.onSurface }, fonts.bodySmall]}>
                                  Created: {formatDate(contract.created_at)}
                                </Text>
                                {contract.pickup_at && (
                                  <Text style={[styles.timelineText, { color: colors.onSurface }, fonts.bodySmall]}>
                                    Pickup: {formatDate(contract.pickup_at)}
                                  </Text>
                                )}
                                {contract.delivered_at && (
                                  <Text style={[styles.timelineText, { color: colors.primary }, fonts.bodySmall]}>
                                    Delivered: {formatDate(contract.delivered_at)}
                                  </Text>
                                )}
                                {contract.cancelled_at && (
                                  <Text style={[styles.timelineText, { color: colors.error }, fonts.bodySmall]}>
                                    Cancelled: {formatDate(contract.cancelled_at)}
                                  </Text>
                                )}
                              </View>
                            ) : key === 'corporation' ? (
                              <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]} selectable>
                                {contract.airline_profile?.corporation?.corporation_name || 'N/A'}
                              </Text>
                            ) : (
                              <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]} selectable>
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

              {/* Pagination */}
              {filteredAndSortedContracts.length > 0 && (
                <View style={[styles.paginationContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <DataTable.Pagination
                    page={page}
                    numberOfPages={Math.ceil(filteredAndSortedContracts.length / itemsPerPage)}
                    onPageChange={page => setPage(page)}
                    label={`${from + 1}-${to} of ${filteredAndSortedContracts.length}`}
                    labelStyle={[styles.paginationLabel, { color: colors.onSurface }, fonts.bodyMedium]}
                    showFirstPageButton
                    showLastPageButton
                    showFastPaginationControls
                    numberOfItemsPerPageList={[5, 10, 20, 50]}
                    numberOfItemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    selectPageDropdownLabel={'Rows per page'}
                    style={styles.pagination}
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
              )}
            </View>
          )}
        </Surface>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  searchSurface: {
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  searchbar: {
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  filtersSurface: {
    padding: 16,
    borderRadius: 12,
  },
  filtersContainer: {
    gap: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 16,
  },
  filterGroup: {
    flex: 1,
    minWidth: 0,
  },
  filterLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  filterButton: {
    borderRadius: 8,
    minHeight: 40,
  },
  menuContent: {
    width: '100%',
    left: 0,
    right: 0,
  },
  resultsSurface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  resultsCount: {
    marginTop: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
  },
  tableContainer: {
    flex: 1,
  },
  table: {
    flex: 1,
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  actionColumn: {
    width: 140,
    paddingVertical: 12,
  },
  tableColumn: {
    paddingVertical: 12,
  },
  sortableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortIcon: {
    fontSize: 12,
  },
  headerText: {
    fontWeight: '600',
  },
  cellText: {
    textAlign: 'center',
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 8,
  },
  buttonContent: {
    height: 40,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  noDataCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    flex: 1,
  },
  noDataText: {
    textAlign: 'center',
  },
  timelineContainer: {
    alignItems: 'flex-start',
    gap: 2,
  },
  timelineText: {
    lineHeight: 16,
  },
  paginationContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
  pagination: {
    justifyContent: 'space-evenly',
  },
  paginationLabel: {
    fontWeight: '500',
  },
})

export default AdminBookingHistory