import React, { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Card, Avatar, Divider, IconButton, useTheme, Searchbar, Menu, Dialog, Portal } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'

const ContractsMade = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [currentTime, setCurrentTime] = useState('')
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    fetchContracts()
    
    // Set up realtime subscription
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel('contracts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contracts',
            filter: `airline_id=eq.${user.id}`
          },
          (payload) => {
            // Refresh the contracts list when changes occur
            fetchContracts()
          }
        )
        .subscribe()

      // Store channel reference for cleanup
      return channel
    }

    let channel
    setupRealtime().then(ch => {
      channel = ch
    })

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

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
        .order('created_at', { ascending: false })

      if (error) throw error

      setContracts(data || [])
    } catch (error) {
      showSnackbar('Error loading contracts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

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
      const searchValue = String(
        searchColumn === 'owner_first_name' || searchColumn === 'case_number'
          ? contract[searchColumn] || ''
          : contract[searchColumn] || ''
      ).toLowerCase()
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
    return (
      <Card style={[styles.contractCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <View style={styles.contractCardHeader}>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>CONTRACT ID</Text>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]} selectable>{contract.id || 'N/A'}</Text>
          </View>
          <View style={styles.contractCardHeader}>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>CONTRACTOR NAME</Text>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
              {[
                    contract.airline_profile?.first_name,
                    contract.airline_profile?.middle_initial,
                    contract.airline_profile?.last_name,
                    contract.airline_profile?.suffix
              ].filter(Boolean).join(' ') || 'N/A'}
            </Text>
          </View>
          <Divider />
          <View style={styles.passengerInfoContainer}>
          {/*             
          {contract.airline_profile?.pfp_id ? (
              <Avatar.Image 
                  size={40} 
                  source={{ uri: contract.airline_profile?.pfp_id }}
                  style={[styles.avatarImage,{ backgroundColor: colors.primary }]}
              />
          ) : (
              <Avatar.Text 
                  size={40} 
                  label={contract.airline_profile?.first_name ? contract.airline_profile?.first_name[0].toUpperCase() : 'U'}
                  style={[styles.avatarImage,{ backgroundColor: colors.primary }]}
                  labelStyle={{ color: colors.onPrimary }}
              />
          )} */}
            <View>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                <Text style={[fonts.labelMedium, { fontWeight: 'bold', color: colors.primary }]}>
                Passenger Name:
                </Text>
                <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
                  {[
                    contract?.owner_first_name,
                    contract?.owner_middle_initial,
                    contract?.owner_last_name,
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
              { location: contract.current_location, label: 'Current', color: colors.secondary },
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
              Date Information:
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
            onPress={() => navigation.navigate('AirlineTrackLuggage', { 
              contractId: contract.id,
            })} 
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
        </Card.Content>
      </Card>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {SnackbarElement}
      <View style={{ backgroundColor: colors.background }}>
        <Card style={[styles.timeCard, { backgroundColor: colors.surface, elevation: colors.elevation.level3 }]}>
          <Card.Content style={styles.timeCardContent}>
            <Text style={fonts.titleSmall}>{currentTime}</Text>
          </Card.Content>
        </Card>
      </View>
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
        <Text style={[fonts.bodyMedium,{ textAlign: 'center', color: colors.onSurfaceVariant, marginTop: 30, marginBottom: 10 }]}>
          No contracts available.
        </Text>
      )}
      <FlatList
        data={filteredAndSortedContracts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ContractCard contract={item} />}
        contentContainerStyle={styles.flatListContent}
        refreshing={loading}
        onRefresh={fetchContracts}
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
  timeCard: {
    borderRadius: 10,
    marginVertical: 10,
    marginHorizontal: 16,
  },
  timeCardContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  searchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 10,
  },
  searchbar: {
    flex: 1,
  },
  buttonGroup: {
    alignSelf:'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
    minWidth: 120,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 10,
  },
  buttonContent: {
    height: 40,
  },
  contractCard: {
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    elevation: 2,
  },
  contractCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  detailsContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  dialogContractInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
})

export default ContractsMade
