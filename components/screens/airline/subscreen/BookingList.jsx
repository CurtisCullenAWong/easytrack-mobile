import React, { useState, useEffect, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Text, Button, Card, Divider, IconButton, useTheme, Searchbar, Menu, Dialog, Portal, Surface, List } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'

const BookingList = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [currentTime, setCurrentTime] = useState('')
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('id')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortMenuVisible, setSortMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false)
  const [contractToCancel, setContractToCancel] = useState(null)

  const filterOptions = [
    { label: 'Contract ID', value: 'id' },
    { label: 'Luggage Owner', value: 'owner_first_name' },
    { label: 'Case Number', value: 'case_number' },
    { label: 'Status', value: 'status' },
    { label: 'Pickup Location', value: 'pickup_location' },
    { label: 'Current Location', value: 'current_location' },
    { label: 'Drop-off Location', value: 'drop_off_location' },
  ]

  const sortOptions = [
    { label: 'Contract ID', value: 'id' },
    { label: 'Luggage Owner', value: 'owner_first_name' },
    { label: 'Case Number', value: 'case_number' },
    { label: 'Status', value: 'contract_status.status_name' },
    { label: 'Created Date', value: 'created_at' },
    { label: 'Pickup Date', value: 'pickup_at' },
    { label: 'Delivery Date', value: 'delivered_at' },
    { label: 'Cancellation Date', value: 'cancelled_at' },
  ]

  useEffect(() => {
    const updateTime = () =>
      setCurrentTime(
        new Date().toLocaleString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Manila',
        })
      )
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch and subscribe only while screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchContracts()

      let activeChannel
      const setupRealtime = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        activeChannel = supabase
          .channel('contracts_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'contracts',
              filter: `airline_id=eq.${user.id}`
            },
            () => {
              fetchContracts()
            }
          )
          .subscribe()
      }
      setupRealtime()

      return () => {
        if (activeChannel) {
          supabase.removeChannel(activeChannel)
        }
      }
    }, [])
  )

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          contract_status:contract_status_id (status_name),
          airline_profile:airline_id (
            pfp_id,
            first_name,
            middle_initial,
            last_name,
            suffix
          )
        `)
        .eq('airline_id', user.id)
        .in('contract_status_id', [1, 3, 4])
        .order('created_at', { ascending: false })

      if (error) throw error

      setContracts(data || [])
    } catch (error) {
      showSnackbar('Error loading contracts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchContracts()
    } catch (error) {
      showSnackbar('Error refreshing contracts: ' + error.message)
    } finally {
      setRefreshing(false)
    }
  }, [])

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

  const filteredAndSortedContracts = contracts
    .filter(contract => {
      let fieldValue = ''
      if (searchColumn === 'status') {
        fieldValue = contract.contract_status?.status_name || ''
      } else {
        fieldValue = contract[searchColumn] || ''
      }
      const searchValue = String(fieldValue).toLowerCase()
      const query = searchQuery.toLowerCase()
      return searchValue.includes(query)
    })
    .sort((a, b) => {
      let valA, valB

      if (sortColumn === 'owner_first_name' || sortColumn === 'case_number') {
        valA = a[sortColumn] || ''
        valB = b[sortColumn] || ''
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
    navigation.navigate('ContractDetails', { id: contract.id})
  }

  const handleCancelContract = (contract) => {
    if (contract.contract_status_id !== 1) {
      showSnackbar('Only contracts with status "Pending" can be cancelled', false)
      return
    }
    
    setContractToCancel(contract)
    setCancelDialogVisible(true)
  }

  const confirmCancelContract = async () => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          contract_status_id: 2,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', contractToCancel.id)

      if (error) throw error

      showSnackbar('Contract cancelled successfully', true)
      fetchContracts()
    } catch (error) {
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

  const ContractCard = ({ contract }) => {    
    const [expanded, setExpanded] = useState({
      info: true,
      locations: false,
      timeline: false,
      price: false,
      actions: false,
    })

    const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

    const contractorName = [
      contract.airline_profile?.first_name,
      contract.airline_profile?.middle_initial,
      contract.airline_profile?.last_name,
      contract.airline_profile?.suffix
    ].filter(Boolean).join(' ') || 'N/A'

    const passengerName = [
      contract?.owner_first_name,
      contract?.owner_middle_initial,
      contract?.owner_last_name,
    ].filter(Boolean).join(' ') || 'N/A'

    const deliveryCharge = Number(contract.delivery_charge || 0)
    const deliverySurcharge = Number(contract.delivery_surcharge || 0)
    const deliveryDiscount = Number(contract.delivery_discount || 0)
    const totalPrice = deliveryCharge + deliverySurcharge - deliveryDiscount

    return (
      <Card style={[styles.contractCard, { backgroundColor: colors.surfaceVariant }]}>
        <Card.Content>
          <View style={styles.contractCardHeader}>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>CONTRACT ID</Text>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]} selectable>{contract.id || 'N/A'}</Text>
          </View>
          <View style={styles.contractCardHeader}>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>AIRLINE CONTRACTOR</Text>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>{contractorName}</Text>
          </View>
          <Divider />

          <List.Section>
            <List.Accordion
              title="Basic Info"
              expanded={expanded.info}
              onPress={() => toggle('info')}
              titleStyle={[fonts.labelMedium, { color: colors.onSurface }]}>
              <View style={styles.passengerInfoContainer}>
                <View>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    <Text style={[fonts.labelMedium, { fontWeight: 'bold', color: colors.primary }]}>Passenger Name:</Text>
                    <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>{passengerName}</Text>
                  </View>
                  <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Total Luggage Quantity: {contract.luggage_quantity || 0}</Text>
                  <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Case Number: {contract.case_number || 'N/A'}</Text>
                  <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Flight Number: {contract.flight_number || 'N/A'}</Text>
                  <View style={[styles.statusContainer, { paddingVertical: 6 }]}>
                    <Text style={[fonts.labelSmall, styles.statusLabel]}>STATUS:</Text>
                    <Text style={[fonts.bodySmall, styles.statusValue, { color: colors.primary }]}>
                      {contract.contract_status?.status_name || 'Unknown'}
                    </Text>
                  </View>
                </View>
              </View>
            </List.Accordion>

            <Divider />

            <List.Accordion
              title="Locations"
              expanded={expanded.locations}
              onPress={() => toggle('locations')}
              titleStyle={[fonts.labelMedium, { color: colors.onSurface }]}>
              <View style={styles.locationContainer}>
                {[
                  { location: contract.pickup_location, label: 'Pickup', color: colors.primary },
                  { location: contract.current_location, label: 'Current', color: colors.secondary },
                  { location: contract.drop_off_location, label: 'Drop-off', color: colors.error }
                ].map((loc, idx) => (
                  <View key={idx} style={styles.locationRow}>
                    <IconButton icon="map-marker" size={20} iconColor={loc.color} />
                    <View style={styles.locationTextContainer}>
                      <Text style={[fonts.labelSmall, { color: loc.color }]}>{loc.label}</Text>
                      <Text style={[fonts.bodySmall, styles.locationText]} numberOfLines={2} ellipsizeMode="tail">{loc.location || 'Not set'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </List.Accordion>

            <Divider />

            <List.Accordion
              title="Timeline"
              expanded={expanded.timeline}
              onPress={() => toggle('timeline')}
              titleStyle={[fonts.labelMedium, { color: colors.onSurface }]}
              style={styles.accordionSection}>
              <View style={styles.detailsContainer}>
                <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>Created: {formatDate(contract.created_at)}</Text>
                {contract.pickup_at && (
                  <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>Pickup: {formatDate(contract.pickup_at)}</Text>
                )}
                {contract.delivered_at && (
                  <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>Delivered: {formatDate(contract.delivered_at)}</Text>
                )}
                {contract.cancelled_at && (
                  <Text style={[fonts.labelSmall, { color: colors.error }]}>Cancelled: {formatDate(contract.cancelled_at)}</Text>
                )}
              </View>
            </List.Accordion>

            <Divider />

            <List.Accordion
              title={`Price: ₱${totalPrice.toFixed(2)}`}
              expanded={expanded.price}
              onPress={() => toggle('price')}
              titleStyle={[fonts.labelMedium, { color: colors.onSurface }]}
              style={styles.accordionSection}>
              <View style={{ paddingVertical: 8 }}>
                <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Delivery Charge: ₱{deliveryCharge.toFixed(2)}</Text>
                <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Surcharge: ₱{deliverySurcharge.toFixed(2)}</Text>
                <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Discount: ₱{deliveryDiscount.toFixed(2)}</Text>
                <Divider style={{ marginVertical: 6 }} />
                <Text style={[fonts.labelMedium, { color: colors.primary }]}>Total: ₱{totalPrice.toFixed(2)}</Text>
              </View>
            </List.Accordion>

            <Divider />

            <List.Accordion
              title="Actions"
              expanded={expanded.actions}
              onPress={() => toggle('actions')}
              titleStyle={[fonts.labelMedium, { color: colors.onSurface }]}
              style={styles.accordionSection}>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('TrackLuggage', { contractId: contract.id })} 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              >
                Track Delivery
              </Button>
              <Button 
                mode="contained" 
                onPress={() => handleShowDetails(contract)} 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              >
                Show Details
              </Button>
              {contract.contract_status_id === 1 && (
                <Button 
                  mode="contained" 
                  onPress={() => handleCancelContract(contract)} 
                  style={[styles.actionButton, { backgroundColor: colors.error }]}
                >
                  Cancel Contract
                </Button>
              )}
            </List.Accordion>
          </List.Section>
        </Card.Content>
      </Card>
    )
  }

  const renderHeader = () => (
    <>
      {/* Time Display Section */}
      {/* <Surface style={[styles.timeSurface, { backgroundColor: colors.surface }]} elevation={1}>
        <Text style={[styles.timeText, { color: colors.onSurface }, fonts.titleMedium]}>
          {currentTime}
        </Text>
      </Surface> */}

      {/* Filters Section */}
      <Surface style={[styles.filtersSurface, { backgroundColor: colors.surface }]} elevation={1}>
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
              Sort By
            </Text>
            <Menu
              visible={sortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  icon="sort"
                  onPress={() => setSortMenuVisible(true)}
                  style={[styles.filterButton, { borderColor: colors.outline }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                >
                  {getSortLabel()}
                </Button>
              }
              contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
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
        </View>
      </Surface>

      {/* Results Header */}
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
      </Surface>
    </>
  )

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <Text style={[styles.emptyText, { color: colors.onSurface }, fonts.bodyLarge]}>
          Loading bookings...
        </Text>
      ) : (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }, fonts.bodyLarge]}>
          No bookings found matching your criteria
        </Text>
      )}
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {SnackbarElement}
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
      <FlatList
        data={filteredAndSortedContracts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ContractCard contract={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      <Portal>
        <Dialog
          visible={cancelDialogVisible}
          onDismiss={dismissCancelDialog}
          style={{ backgroundColor: colors.surface }}>
          <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
            Confirm Cancellation
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurface, ...fonts.bodyMedium }}>
              Are you sure you want to cancel this contract?
            </Text>
            {contractToCancel && (
              <View style={styles.dialogContractInfo}>
                <Text style={{ color: colors.onSurfaceVariant, ...fonts.labelMedium, marginTop: 8 }}>
                  Contract ID: {contractToCancel.id}
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, ...fonts.labelMedium }}>
                  Passenger: {[
                    contractToCancel.owner_first_name,
                    contractToCancel.owner_middle_initial,
                    contractToCancel.owner_last_name,
                  ].filter(Boolean).join(' ') || 'N/A'}
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, ...fonts.labelMedium }}>
                  Case Number: {contractToCancel.case_number || 'N/A'}
                </Text>
              </View>
            )}
            <Text style={{ color: colors.error, ...fonts.bodySmall, marginTop: 8 }}>
              This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={dismissCancelDialog} textColor={colors.error}>
              Cancel
            </Button>
            <Button 
              onPress={confirmCancelContract}
              textColor={colors.onError}
              mode="contained"
              buttonColor={colors.error}
            >
              Confirm Cancellation
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  timeSurface: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeText: {
    fontWeight: '600',
  },
  searchSurface: {
    marginHorizontal: 16,
    marginBottom: 8,
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
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 16,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  filterButton: {
    borderRadius: 8,
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
    marginHorizontal: 16,
    marginBottom: 16,
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
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  contractCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)'
  },
  contractCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  passengerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarImage: {
    marginRight: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statusLabel: {
    fontWeight: 'bold',
  },
  statusValue: {
    fontWeight: 'bold',
  },
  locationContainer: {
    paddingVertical: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  locationText: {
    marginRight:'20%',
    flex: 1,
  },
  detailsContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  accordionSection: {
    borderRadius: 8,
    marginVertical: 4,
  },
  actionButton: {
    borderRadius: 8,
    marginVertical: 4,
  },
  dialogContractInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
})

export default BookingList
