import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Dimensions } from 'react-native'
import { Text, Button, Card, Avatar, Divider, IconButton, useTheme, Searchbar, Menu, DataTable, Portal, Modal, SegmentedButtons } from 'react-native-paper'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'
import Header from '../../customComponents/Header'

const COLUMN_WIDTH = 180
const ID_COLUMN_WIDTH = 120
const LOCATION_COLUMN_WIDTH = 200
const TIMELINE_COLUMN_WIDTH = 300
const STATUS_COLUMN_WIDTH = 150
const PAYMENT_COLUMN_WIDTH = 150

// Contract Card Component
const ContractCard = ({ contract, colors, fonts, handleShowDetails, formatDate }) => {    
  return (
    <Card style={[styles.contractCard, { backgroundColor: colors.surface }]}>
      <Card.Content>
        <View style={styles.contractCardHeader}>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>CONTRACT ID</Text>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>{contract.id || 'N/A'}</Text>
        </View>
        <Divider />
        <View style={styles.passengerInfoContainer}>
          {contract.airline_profile?.pfp_id ? (
            <Avatar.Image 
              size={40} 
              source={{ uri: contract.airline_profile?.pfp_id }}
              style={[styles.avatarImage, { backgroundColor: colors.primary }]}
            />
          ) : (
            <Avatar.Text 
              size={40} 
              label={contract.airline_profile?.first_name ? contract.airline_profile?.first_name[0].toUpperCase() : 'U'}
              style={[styles.avatarImage, { backgroundColor: colors.primary }]}
              labelStyle={{ color: colors.onPrimary }}
            />
          )}
          <View>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              <Text style={[fonts.labelMedium, { fontWeight: 'bold', color: colors.primary }]}>
                Contractor Name:
              </Text>
              <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
                {[
                  contract.airline_profile?.first_name,
                  contract.airline_profile?.middle_initial,
                  contract.airline_profile?.last_name,
                  contract.airline_profile?.suffix
                ].filter(Boolean).join(' ') || 'N/A'}
              </Text>
            </View>
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
              Total Luggage Quantity: {contract.luggage_quantity || 0}
            </Text>
          </View>
        </View>
        <Divider />
        <View style={styles.statusContainer}>
          <Text style={[fonts.labelSmall, styles.statusLabel]}>STATUS:</Text>
          <Text style={[fonts.bodySmall, styles.statusValue, { color: colors.primary }]}>
            {contract.contract_status?.status_name || 'Unknown'}
          </Text>
        </View>
        <Divider />
        <View style={styles.locationContainer}>
          {[
            { location: contract.pickup_location, label: 'Pickup', color: colors.primary },
            { location: contract.drop_off_location, label: 'Drop-off', color: colors.error }
          ].map((loc, idx) => (
            <View key={idx} style={styles.locationRow}>
              <IconButton icon="map-marker" size={20} iconColor={loc.color} />
              <View style={styles.locationTextContainer}>
                <Text style={[fonts.labelSmall, { color: loc.color }]}>{loc.label}</Text>
                <Text style={[fonts.bodySmall, styles.locationText]}>{loc.location || 'Not set'}</Text>
              </View>
            </View>
          ))}
        </View>
        <Divider />
        <View style={styles.detailsContainer}>
          <Text style={[fonts.labelLarge, styles.statusLabel]}>
            Timeline:
          </Text>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
            Created: {formatDate(contract.created_at)}
          </Text>
          {contract.pickup_at && (
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
              Pickup: {formatDate(contract.pickup_at)}
            </Text>
          )}
          {contract.delivered_at && (
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
              Delivered: {formatDate(contract.delivered_at)}
            </Text>
          )}
          {contract.cancelled_at && (
            <Text style={[fonts.labelSmall, { color: colors.error }]}>
              Cancelled: {formatDate(contract.cancelled_at)}
            </Text>
          )}
        </View>
        <Divider />
        <Button 
          mode="contained" 
          onPress={() => handleShowDetails(contract)} 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
        >
          Show Details
        </Button>
      </Card.Content>
    </Card>
  )
}

// Contract List Component
const ContractList = ({ navigation, statusIds, emptyMessage, contracts, loading, onRefresh }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('id')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortMenuVisible, setSortMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')

  const filterOptions = [
    { label: 'Contract ID', value: 'id' },
    { label: 'Luggage Owner', value: 'luggage_owner' },
    { label: 'Case Number', value: 'case_number' },
    { label: 'Status', value: 'status' },
    { label: 'Pickup Location', value: 'pickup_location' },
    { label: 'Drop-off Location', value: 'drop_off_location' },
  ]

  const sortOptions = [
    { label: 'Contract ID', value: 'id' },
    { label: 'Luggage Owner', value: 'luggage_owner' },
    { label: 'Case Number', value: 'case_number' },
    { label: 'Status', value: 'contract_status.status_name' },
    { label: 'Created Date', value: 'created_at' },
    { label: 'Pickup Date', value: 'pickup_at' },
    { label: 'Delivery Date', value: 'delivered_at' },
    { label: 'Cancellation Date', value: 'cancelled_at' },
  ]

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'ascending' ? 'descending' : 'ascending')
    } else {
      setSortColumn(column)
      setSortDirection('ascending')
    }
  }

  const getSortIcon = (column) => {
    if (sortColumn !== column) return ''
    return sortDirection === 'ascending' ? '▲' : '▼'
  }

  const getSortLabel = () => {
    const option = sortOptions.find(opt => opt.value === sortColumn)
    return `${option?.label || 'Sort By'} ${getSortIcon(sortColumn)}`
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

  const handleShowDetails = (contract) => {
    navigation.navigate('ContractDetails', { id: contract.id })
  }

  const filteredAndSortedContracts = contracts
    .filter(contract => {
      const searchValue = String(
        searchColumn === 'luggage_owner' || searchColumn === 'case_number'
          ? contract.luggage_info?.[0]?.[searchColumn] || ''
          : contract[searchColumn] || ''
      ).toLowerCase()
      const query = searchQuery.toLowerCase()
      return searchValue.includes(query)
    })
    .sort((a, b) => {
      let valA, valB

      if (sortColumn === 'luggage_owner' || sortColumn === 'case_number') {
        valA = a.luggage_info?.[0]?.[sortColumn] || ''
        valB = b.luggage_info?.[0]?.[sortColumn] || ''
      } else if (sortColumn === 'contract_status.status_name') {
        valA = a.contract_status?.status_name || ''
        valB = b.contract_status?.status_name || ''
      } else {
        valA = a[sortColumn] || ''
        valB = b[sortColumn] || ''
      }

      // Special handling for date columns
      if (['created_at', 'pickup_at', 'delivered_at', 'cancelled_at'].includes(sortColumn)) {
        if (!valA) return sortDirection === 'ascending' ? -1 : 1
        if (!valB) return sortDirection === 'ascending' ? 1 : -1
        return sortDirection === 'ascending'
          ? new Date(valA) - new Date(valB)
          : new Date(valB) - new Date(valA)
      }

      // Default sorting for non-date columns
      if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
      if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
      return 0
    })

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.searchActionsRow}>
        <Searchbar
          placeholder={`Search by ${filterOptions.find(opt => opt.value === searchColumn)?.label}`}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: colors.surface }]}
        />
      </View>
      <View style={styles.buttonGroup}>
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Button
              mode="contained"
              icon="filter-variant"
              onPress={() => setFilterMenuVisible(true)}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              contentStyle={styles.buttonContent}
              labelStyle={fonts.labelMedium}
            >
              {filterOptions.find(opt => opt.value === searchColumn)?.label}
            </Button>
          }
          contentStyle={{ backgroundColor: colors.surface }}
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
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <Button
              mode="contained"
              icon="sort"
              onPress={() => setSortMenuVisible(true)}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              contentStyle={styles.buttonContent}
              labelStyle={fonts.labelMedium}
            >
              {getSortLabel()}
            </Button>
          }
          contentStyle={{ backgroundColor: colors.surface }}
        >
          {sortOptions.map(option => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                handleSort(option.value)
                setSortMenuVisible(false)
              }}
              title={option.label}
              titleStyle={[
                {
                  color: sortColumn === option.value
                    ? colors.primary
                    : colors.onSurface,
                },
                fonts.bodyLarge,
              ]}
              leadingIcon={sortColumn === option.value ? 'check' : undefined}
            />
          ))}
        </Menu>    
      </View>
      {/* Indication for contracts availability */}
      {loading ? null : filteredAndSortedContracts.length === 0 && (
        <Text style={[fonts.bodyMedium, { textAlign: 'center', color: colors.onSurfaceVariant, marginTop: 30, marginBottom: 10 }]}>
          {emptyMessage}
        </Text>
      )}
      <FlatList
        data={filteredAndSortedContracts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ContractCard 
            contract={item} 
            colors={colors} 
            fonts={fonts} 
            handleShowDetails={handleShowDetails}
            formatDate={formatDate}
          />
        )}
        contentContainerStyle={styles.flatListContent}
        refreshing={loading}
        onRefresh={onRefresh}
      />
      {SnackbarElement}
    </View>
  )
}

// Main BookingHistory Component
const BookingHistory = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userRole, setUserRole] = useState(null)
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchUserRole()
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [statusFilter, searchQuery])

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setUserRole(profile.role_id)
    } catch (error) {
      console.error('Error fetching user role:', error.message)
    }
  }

  const getStatusOptions = () => {
    const baseOptions = [
      { label: 'All', value: 'all' },
      { label: 'Delivered', value: '5' },
      { label: 'Failed', value: '6' },
    ]
    
    if (userRole !== 2) {
      baseOptions.splice(2, 0, { label: 'Cancelled', value: '2' })
    }
    
    return baseOptions
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

      // Apply search filter
      if (searchQuery) {
        query = query.or(`id.ilike.%${searchQuery}%`)
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
    { key: 'payment', label: 'Invoice Number', width: PAYMENT_COLUMN_WIDTH },
    { key: 'pickup_location', label: 'Pickup Location', width: LOCATION_COLUMN_WIDTH },
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
          placeholder="Search by Contract ID"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: colors.surface }]}
        />
      </View>

      <View style={styles.buttonContainer}>
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

      {loading ? (
        <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyMedium]}>
          Loading bookings...
        </Text>
      ) : (
        <View style={styles.tableContainer}>
          <ScrollView horizontal>
            <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
              <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
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
                <DataTable.Title style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                  <Text style={[styles.headerText, { color: colors.onSurface }]}>Actions</Text>
                </DataTable.Title>
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
                    <DataTable.Cell style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                      <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('ContractDetails', { id: contract.id })}
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
