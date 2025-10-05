import { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import {
  Searchbar,
  Button,
  DataTable,
  Text,
  useTheme,
  Menu,
  Dialog,
  Portal,
  List,
  Surface,
} from 'react-native-paper'
import { supabase } from '../../../../../lib/supabaseAdmin'
import useSnackbar from '../../../../hooks/useSnackbar'
import { sendNotificationToUsers } from '../../../../../utils/registerForPushNotifications'

const COLUMN_WIDTH = 180
const FULL_NAME_WIDTH = 200

const AdminBookingList = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  // Helper function to format contract data
  const formatContract = (contract) => {
    return {
      id: contract.id,
      status: contract.contract_status?.status_name || 'N/A',
      contract_status_id: contract.contract_status_id,
      luggage_quantity: contract.luggage_quantity || 'N/A',
      luggage_weight: contract.luggage_weight || 'N/A',
      flight_number: contract.flight_number || 'N/A',
      pickup_location: contract.pickup_location || 'N/A',
      pickup_location_geo: contract.pickup_location_geo || 'N/A',
      drop_off_location: contract.drop_off_location || 'N/A',
      drop_off_location_geo: contract.drop_off_location_geo || 'N/A',
      airline_name: `${contract.airline?.first_name || ''} ${contract.airline?.middle_initial || ''} ${contract.airline?.last_name || ''} ${contract.airline?.suffix || ''}`.trim() || 'N/A',
      delivery_name: contract.delivery ? `${contract.delivery?.first_name || ''} ${contract.delivery?.middle_initial || ''} ${contract.delivery?.last_name || ''} ${contract.delivery?.suffix || ''}`.trim() : 'Not Assigned',
      corporation: contract.airline?.corporation?.corporation_name || 'N/A',
      created_at: contract.created_at
        ? new Date(contract.created_at).toLocaleString()
        : 'N/A',
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('status')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('status')
  const [sortDirection, setSortDirection] = useState('descending')
  const [contracts, setContracts] = useState([])
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState(null)
  const [actionMenuVisible, setActionMenuVisible] = useState(null)
  const [showDateMenu, setShowDateMenu] = useState(false)
  const [dateFilter, setDateFilter] = useState('all')
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false)
  const [contractToCancel, setContractToCancel] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [statusOptions, setStatusOptions] = useState([])
  const [corporationFilter, setCorporationFilter] = useState('all')
  const [showCorporationMenu, setShowCorporationMenu] = useState(false)
  const [corporations, setCorporations] = useState([])

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

  const getStatusFilterOptions = () => {
    return [
      { label: 'All Statuses', value: 'all' },
      ...statusOptions
        .filter(status => [1, 3, 4].includes(status.id))
        .map(status => ({
          label: status.status_name,
          value: status.id.toString()
        }))
    ]
  }

  const getStatusFilterLabel = (value) => {
    return getStatusFilterOptions().find(opt => opt.value === value)?.label || 'All Statuses'
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
    setLoading(true)
    
    let query = supabase
      .from('contracts')
      .select(`
        *,
        contract_status:contract_status_id (status_name),
        airline:airline_id (
          first_name,
          middle_initial,
          last_name,
          suffix,
          corporation:corporation_id (corporation_name)
        ),
        delivery:delivery_id (
          first_name,
          middle_initial,
          last_name,
          suffix
        )
      `)
      .in('contract_status_id', [1, 3, 4])
      .order('created_at', { ascending: false })

    // Apply status filter if selected
    if (statusFilter !== 'all') {
      query = query.eq('contract_status_id', statusFilter)
    }

    // Apply date filter if selected
    const dateRange = getDateRange()
    if (dateRange) {
      query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
    }

    const { data: contractsData, error: contractsError } = await query

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError)
      showSnackbar('Failed to fetch contracts')
      setLoading(false)
      return
    }

    const { data: personnelData, error: personnelError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role_id',2)
      .eq('verify_status_id', 1)
    if (personnelError) {
      console.error('Error fetching delivery personnel:', personnelError)
      showSnackbar('Failed to fetch delivery personnel')
      setLoading(false)
      return
    }

    const formatted = contractsData.map(formatContract)

    setContracts(formatted)
    setDeliveryPersonnel(personnelData)
    setLoading(false)
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

  const fetchStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_status')
        .select('id, status_name')
        .order('id')

      if (error) {
        console.error('Error fetching status options:', error)
        return
      }

      setStatusOptions(data || [])
    } catch (error) {
      console.error('Error fetching status options:', error)
    }
  }

  // Set up realtime subscription only while screen is focused
  useFocusEffect(
  useCallback(() => {
    const channel = supabase
      .channel('contracts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contracts',
          filter: 'contract_status_id=eq.1,3,4'
        },
        async (payload) => {
          console.log('Contract inserted:', payload.new)
          await fetchContracts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contracts',
          filter: 'contract_status_id=eq.1,3,4'
        },
        async (payload) => {
          console.log('Contract updated:', payload.new)
          await fetchContracts()
        }
      )
      .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }, [])
  )
  

  useFocusEffect(
    useCallback(() => {
      fetchContracts()
    }, [dateFilter, statusFilter])
  )

  useFocusEffect(
    useCallback(() => {
      fetchCorporations()
      fetchStatusOptions()
    }, [])
  )

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
      // Search filter
      if (searchQuery) {
        const searchValue = String(contract[searchColumn] || '').toLowerCase()
        const query = searchQuery.toLowerCase()
        if (!searchValue.includes(query)) return false
      }

      // Corporation filter
      if (corporationFilter !== 'all' && contract.corporation !== corporationFilter) {
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      if (['created_at'].includes(sortColumn)) {
        if (valA === 'N/A') return sortDirection === 'ascending' ? -1 : 1
        if (valB === 'N/A') return sortDirection === 'ascending' ? 1 : -1
        if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
        if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
        return 0
      }

      if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
      if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
      return 0
    })

  const from = page * itemsPerPage
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedContracts.length)
  const paginatedContracts = filteredAndSortedContracts.slice(from, to)

  const filterOptions = [
    { label: 'Status', value: 'status' },
    { label: 'Airline Personnel', value: 'airline_name' },
    { label: 'Flight Number', value: 'flight_number' },
    { label: 'Contract ID', value: 'id' },
    { label: 'Corporation', value: 'corporation' },
  ]

  const columns = [
    { key: 'id', label: 'Contract ID', width: COLUMN_WIDTH },
    { key: 'status', label: 'Status', width: COLUMN_WIDTH },
    { key: 'luggage_quantity', label: 'Luggage Qty', width: 120 },
    { key: 'flight_number', label: 'Flight #', width: 120 },
    { key: 'airline_name', label: 'Airline Personnel', width: FULL_NAME_WIDTH },
    { key: 'corporation', label: 'Corporation', width: COLUMN_WIDTH },
    { key: 'delivery_name', label: 'Delivery Personnel', width: FULL_NAME_WIDTH },
    { key: 'created_at', label: 'Created At', width: COLUMN_WIDTH },
  ]

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchContracts().finally(() => setRefreshing(false))
  }, [])

  const handleAssignDelivery = async () => {
    if (!selectedDeliveryPerson) {
      showSnackbar('Please select a delivery personnel')
      return
    }
  
    try {
      // Update the contract
      const { error, data: updatedContract } = await supabase
        .from('contracts')
        .update({ 
          delivery_id: selectedDeliveryPerson.id,
          contract_status_id: 3,
          accepted_at: new Date().toISOString()
        })
        .eq('id', selectedContract.id)
        .select() // get the updated contract back
        .single()
  
      if (error) throw error
  
      // Send notifications to airline and delivery person
      if (updatedContract.airline_id) {
        await sendNotificationToUsers(
          updatedContract.airline_id,
          'Delivery Assigned',
          `Your delivery has been assigned to ${selectedDeliveryPerson?.first_name + " " + selectedDeliveryPerson?.last_name }.`
        )
      }
  
      if (selectedDeliveryPerson.id) {
        await sendNotificationToUsers(
          selectedDeliveryPerson.id,
          'New Delivery Assigned',
          `You have been assigned a delivery for contract #${updatedContract.id}.`
        )
      }
  
      showSnackbar('Successfully assigned delivery personnel', true)
      setShowAssignDialog(false)
      setSelectedDeliveryPerson(null)
      fetchContracts()
    } catch (error) {
      console.error('Error assigning delivery personnel:', error)
      showSnackbar('Failed to assign delivery personnel')
    }
  }
  

  const handleCancelContract = (contract) => {
    if (contract.contract_status_id !== 1) {
      showSnackbar('Only contracts with status "Pending" can be cancelled')
      return
    }
    setContractToCancel(contract)
    setCancelDialogVisible(true)
  }

  const confirmCancelContract = async () => {
    if (!contractToCancel) return
    try {
      const { error, data: contract } = await supabase
        .from('contracts')
        .update({
          contract_status_id: 2,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', contractToCancel.id)
        .select()
        .single()

      if (error) throw error
      if (contract.airline_id) {
        await sendNotificationToUsers(
          contract.airline_id,
          `Delivery Cancelled: #${contract.id}`,
          `Your delivery has been cancelled.`
        )
      }
      showSnackbar('Contract cancelled successfully', true)
      fetchContracts()
    } catch (error) {
      console.error('Error cancelling contract:', error)
      showSnackbar('Error cancelling contract: ' + error.message)
    } finally {
      setCancelDialogVisible(false)
      setContractToCancel(null)
    }
  }

  const dismissCancelDialog = () => {
    setCancelDialogVisible(false)
    setContractToCancel(null)
  }

  return (
    <ScrollView 
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {SnackbarElement}

      <View style={styles.container}>
        {/* Search Section */}
        <Surface style={[styles.searchSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
            Search & Filter
          </Text>
          <Searchbar
            placeholder={`Search by ${filterOptions.find(opt => opt.value === searchColumn)?.label}`}
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
                  Search Column
                </Text>
                <Menu
                  visible={filterMenuVisible}
                  onDismiss={() => setFilterMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      icon="filter-variant"
                      onPress={() => setFilterMenuVisible(true)}
                      style={[styles.filterButton, { borderColor: colors.outline }]}
                      contentStyle={styles.buttonContent}
                      labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                    >
                      {filterOptions.find(opt => opt.value === searchColumn)?.label || 'Select Column'}
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
                      onPress={() => setShowStatusMenu((prev) => !prev)}
                      style={[styles.filterButton, { borderColor: colors.outline }]}
                      contentStyle={styles.buttonContent}
                      labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                    >
                      {getStatusFilterLabel(statusFilter)}
                    </Button>
                  }
                  contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
                >
                  {getStatusFilterOptions().map((option) => (
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

            <View style={styles.filtersRow}>
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
                      onPress={() => setShowCorporationMenu((prev) => !prev)}
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
                      onPress={() => setShowDateMenu((prev) => !prev)}
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
            </View>
          </View>
        </Surface>

        {/* Results Section */}
        <Surface style={[styles.resultsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
              Booking Overview
            </Text>
            {!loading && (
              <Text style={[styles.resultsCount, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                {filteredAndSortedContracts.length} contract{filteredAndSortedContracts.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyLarge]}>
                Loading contracts...
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
                          No contracts found matching your criteria
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
                          <Menu
                            visible={actionMenuVisible === contract.id}
                            onDismiss={() => setActionMenuVisible(null)}
                            anchor={
                              <Button
                                mode="outlined"
                                icon="dots-vertical"
                                onPress={() => setActionMenuVisible(contract.id)}
                                style={[styles.actionButton, { borderColor: colors.primary }]}
                                contentStyle={styles.buttonContent}
                                labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                              >
                                Actions
                              </Button>
                            }
                            contentStyle={{ backgroundColor: colors.surface }}
                          >
                            <Menu.Item
                              onPress={() => {
                                setActionMenuVisible(null)
                                navigation.navigate('ContractDetailsAdmin', { id: contract.id })
                              }}
                              title="Contract Details"
                              leadingIcon="file-document"
                              titleStyle={[
                                { color: colors.onSurface },
                                fonts.bodyLarge,
                              ]}
                            />
                            {contract.contract_status_id === 1 && (
                              <Menu.Item
                                onPress={() => {
                                  setActionMenuVisible(null)
                                  setSelectedContract(contract)
                                  setShowAssignDialog(true)
                                }}
                                title="Assign Luggage"
                                leadingIcon="account-plus"
                                titleStyle={[
                                  { color: colors.onSurface },
                                  fonts.bodyLarge,
                                ]}
                              />
                            )}
                            {contract.contract_status_id === 1 && (
                              <Menu.Item
                                onPress={() => {
                                  setActionMenuVisible(null)
                                  navigation.navigate('CheckLocation', { dropOffLocation: contract.drop_off_location, dropOffLocationGeo: contract.drop_off_location_geo, pickupLocation: contract.pickup_location, pickupLocationGeo: contract.pickup_location_geo })
                                }}
                                title="Check Location"
                                leadingIcon="map-marker"
                                titleStyle={[
                                  { color: colors.primary },
                                  fonts.bodyLarge,
                                ]}
                              />
                            )}
                            {contract.contract_status_id === 1 && (
                              <Menu.Item
                                onPress={() => {
                                  setActionMenuVisible(null)
                                  handleCancelContract(contract)
                                }}
                                title="Cancel Contract"
                                leadingIcon="cancel"
                                titleStyle={[
                                  { color: colors.error },
                                  fonts.bodyLarge,
                                ]}
                              />
                            )}
                            {(contract.contract_status_id === 3 || contract.contract_status_id === 4) && (
                              <Menu.Item
                                onPress={() => {
                                  setActionMenuVisible(null)
                                  navigation.navigate('TrackLuggage', { contractId: contract.id })
                                }}
                                title="Track Luggage"
                                leadingIcon="map-marker"
                                titleStyle={[
                                  { color: colors.onSurface },
                                  fonts.bodyLarge,
                                ]}
                              />
                            )}
                          </Menu>
                        </DataTable.Cell>
                        {columns.map(({ key, width }, idx) => (
                          <DataTable.Cell
                            key={idx}
                            style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                          >
                            <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]} selectable>
                              {contract[key]}
                            </Text>
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

      <Portal>
        <Dialog
          visible={showAssignDialog}
          onDismiss={() => {
            setShowAssignDialog(false)
            setSelectedDeliveryPerson(null)
          }}
          style={[styles.dialog, { backgroundColor: colors.surface }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>
            Assign Delivery Personnel
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <ScrollView style={styles.deliveryList}>
              {deliveryPersonnel.map(person => (
                <List.Item
                  key={person.id}
                  title={`${person.first_name} ${person.middle_initial || ''} ${person.last_name} ${person.suffix || ''}`}
                  description={`Phone: ${person.contact_number}`}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon={selectedDeliveryPerson?.id === person.id ? 'check-circle' : 'account'}
                      color={selectedDeliveryPerson?.id === person.id ? colors.primary : colors.onSurface}
                    />
                  )}
                  onPress={() => setSelectedDeliveryPerson(person)}
                  style={[
                    styles.deliveryItem,
                    selectedDeliveryPerson?.id === person.id && {
                      backgroundColor: colors.primaryContainer,
                    },
                  ]}
                />
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => {
              setShowAssignDialog(false)
              setSelectedDeliveryPerson(null)
            }}>
              Cancel
            </Button>
            <Button onPress={handleAssignDelivery}>
              Assign
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={cancelDialogVisible}
          onDismiss={dismissCancelDialog}
          style={[styles.dialog, { backgroundColor: colors.surface }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>Confirm Cancellation</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>Are you sure you want to cancel this contract?</Text>
            {contractToCancel && (
              <View style={{ marginTop: 8 }}>
                <Text style={[{ color: colors.onSurface }, fonts.labelMedium]}>Contract ID: {contractToCancel.id}</Text>
                <Text style={[{ color: colors.error }, fonts.bodySmall]}>This action cannot be undone.</Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={dismissCancelDialog} textColor={colors.error}>Cancel</Button>
            <Button onPress={confirmCancelContract} mode="contained" buttonColor={colors.error} textColor={colors.onError}>
              Confirm Cancellation
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  buttonContent: {
    height: 40,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
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
  actionButton: {
    borderRadius: 8,
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
  dialog: {
    borderRadius: 8,
    maxWidth: 500,
    width: '90%',
    alignSelf: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  dialogActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  deliveryList: {
    maxHeight: 300,
  },
  deliveryItem: {
    borderRadius: 8,
    marginVertical: 4,
  },
})

export default AdminBookingList