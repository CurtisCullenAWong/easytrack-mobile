import React, { useState, useCallback, useEffect } from 'react'
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
} from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabaseAdmin'
import useSnackbar from '../../hooks/useSnackbar'

const COLUMN_WIDTH = 180
const FULL_NAME_WIDTH = 200

const AdminBookingManagement = ({ navigation }) => {
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
      drop_off_location: contract.drop_off_location || 'N/A',
      airline_name: `${contract.airline?.first_name || ''} ${contract.airline?.middle_initial || ''} ${contract.airline?.last_name || ''} ${contract.airline?.suffix || ''}`.trim() || 'N/A',
      delivery_name: contract.delivery ? `${contract.delivery?.first_name || ''} ${contract.delivery?.middle_initial || ''} ${contract.delivery?.last_name || ''} ${contract.delivery?.suffix || ''}`.trim() : 'Not Assigned',
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
          suffix
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

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('contracts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contracts' },
        async (payload) => {
          const newStatus = payload.new?.contract_status_id
          const oldStatus = payload.old?.contract_status_id
  
          // Only react to contract_status_id in [1, 3, 4]
          if ([1, 3, 4].includes(newStatus) || [1, 3, 4].includes(oldStatus)) {
            console.log('Realtime change detected:', payload)
  
            if (payload.eventType === 'INSERT') {
              console.log('New contract inserted:', payload.new)
              // Handle insert logic here
            } 
            else if (payload.eventType === 'UPDATE') {
              console.log('Contract updated:', payload.new)
              // Handle update logic here
            } 
            else if (payload.eventType === 'DELETE') {
              console.log('Contract deleted:', payload.old)
              // Handle delete logic here
            }
  
            // Optionally refresh data
            await fetchContracts()
          }
        }
      )
      .subscribe()
  
    // Clean up on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  

  useFocusEffect(
    useCallback(() => {
      fetchContracts()
    }, [dateFilter])
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
      const searchValue = String(contract[searchColumn] || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      return searchValue.includes(query)
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
    { label: 'Contractor Name', value: 'airline_name' },
    { label: 'Flight Number', value: 'flight_number' },
    { label: 'Contract ID', value: 'id' },
  ]

  const columns = [
    { key: 'id', label: 'Contract ID', width: COLUMN_WIDTH },
    { key: 'status', label: 'Status', width: COLUMN_WIDTH },
    { key: 'luggage_quantity', label: 'Luggage Qty', width: 120 },
    { key: 'luggage_weight', label: 'Weight', width: 100 },
    { key: 'flight_number', label: 'Flight #', width: 120 },
    { key: 'airline_name', label: 'Contractor Name', width: FULL_NAME_WIDTH },
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
      const { error } = await supabase
        .from('contracts')
        .update({ 
          delivery_id: selectedDeliveryPerson.id,
          contract_status_id: 3, // Update status to assigned
          accepted_at: new Date().toISOString()
        })
        .eq('id', selectedContract.id)

      if (error) throw error

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
      const { error } = await supabase
        .from('contracts')
        .update({
          contract_status_id: 2,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', contractToCancel.id)

      if (error) throw error

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
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Header navigation={navigation} title="Booking Management" />
      {SnackbarElement}

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
          Loading contracts...
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
                    style={{ width, justifyContent: 'center', paddingVertical: 12 }}
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
                      No contracts available
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ) : (
                paginatedContracts.map(contract => (
                  <DataTable.Row key={contract.id}>
                                        <DataTable.Cell numeric style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
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
                              {
                                color: colors.onSurface,
                              },
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
                              {
                                color: colors.onSurface,
                              },
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
                              {
                                color: colors.error,
                              },
                              fonts.bodyLarge,
                            ]}
                          />
                        )}
                        {(contract.contract_status_id === 3 || contract.contract_status_id === 4) && (
                          <Menu.Item
                            onPress={() => {
                              setActionMenuVisible(null)
                              navigation.navigate('AdminTrackLuggage', { contractId: contract.id })
                            }}
                            title="Track Luggage"
                            leadingIcon="map-marker"
                            titleStyle={[
                              {
                                color: colors.onSurface,
                              },
                              fonts.bodyLarge,
                            ]}
                          />
                        )}
                      </Menu>
                    </DataTable.Cell>
                    {columns.map(({ key, width }, idx) => (
                      <DataTable.Cell
                        key={idx}
                        style={{ width, justifyContent: 'center', paddingVertical: 12 }}
                      >
                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                          {contract[key]}
                        </Text>
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
  menuAnchor: {
    flex: 1,
    position: 'relative',
  },
  menuContent: {
    width: '100%',
    left: 0,
    right: 0,
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
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
})

export default AdminBookingManagement
