import { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Card, Avatar, Divider, IconButton, useTheme, Searchbar, Menu, Portal, Dialog } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import useLocationForwarder from '../../../hooks/useLocationForwarder'

const AcceptContracts = ({ navigation }) => {
  const forwardLocationFn = async (coords) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Update all in-transit contracts for this delivery person
      const { error: updateError } = await supabase
        .from('contract')
        .update({
          current_location: `${coords.latitude}, ${coords.longitude}`,
          current_location_geo: `POINT(${coords.longitude} ${coords.latitude})`
        })
        .eq('delivery_id', user.id)
        .eq('contract_status_id', 4) // Only update in-transit contracts
      if (updateError) throw updateError
      
      console.log('📍 Location Update:', {
        timestamp: new Date().toLocaleTimeString(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        status: 'Updated in database'
      })
    } catch (error) {
      console.error('Error updating location:', error)
      showSnackbar('Error updating location: ' + error.message)
    }
  }

  const { startForwarding } = useLocationForwarder(forwardLocationFn)
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
  const [acceptDialogVisible, setAcceptDialogVisible] = useState(false)
  const [pickupDialogVisible, setPickupDialogVisible] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [pickingup, setPickingup] = useState(false)

  const filterOptions = [
    { label: 'Contract ID', value: 'id' },
    { label: 'Luggage Owner', value: 'luggage_owner' },
    { label: 'Luggage Quantity', value: 'luggage_quantity' },
    { label: 'Case Number', value: 'case_number' },
    { label: 'Status', value: 'status' },
    { label: 'Pickup Location', value: 'pickup_location' },
    { label: 'Current Location', value: 'current_location' },
    { label: 'Drop-off Location', value: 'drop_off_location' },
  ]

  const sortOptions = [
    { label: 'Contract ID', value: 'id' },
    { label: 'Luggage Owner', value: 'luggage_owner' },
    { label: 'Luggage Quantity', value: 'luggage_quantity' },
    { label: 'Case Number', value: 'case_number' },
    { label: 'Status', value: 'contract_status.status_name' },
    { label: 'Created Date', value: 'created_at' },
    { label: 'Accept Date', value: 'accepted_at' },
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
  }, [])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

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
          ),
          airline_profile:airline_id (
            pfp_id,
            first_name,
            middle_initial,
            last_name,
            suffix
          )
        `)
        .or('contract_status_id.eq.1,contract_status_id.eq.3')
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
      if (['created_at', 'accepted_at', 'pickup_at', 'delivered_at', 'cancelled_at'].includes(sortColumn)) {
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
    navigation.navigate('ContractDetails', { id: contract.id })
  }

  // Accept contract logic
  const handleAcceptContract = (contract) => {
    setSelectedContract(contract)
    setAcceptDialogVisible(true)
  }
  // Pickup luggage logic
  const handlePickupLuggage = async (contract) => {
    setSelectedContract(contract)
    setPickupDialogVisible(true)
  }

  const confirmAcceptContract = async () => {
    if (!selectedContract) return
    setAccepting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('contract')
        .update({
          contract_status_id: 3, // Accepted - Awaiting Pickup
          accepted_at: new Date().toISOString(),
          delivery_id: user.id,
        })
        .eq('id', selectedContract.id)

      if (error) throw error

      showSnackbar('Contract accepted successfully', true)
      fetchContracts()
    } catch (error) {
      showSnackbar('Error accepting contract: ' + error.message)
    } finally {
      setAccepting(false)
      setAcceptDialogVisible(false)
      setSelectedContract(null)
    }
  }
  
  const confirmPickupLuggage = async () => {
    if (!selectedContract) return
    setPickingup(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('contract')
        .update({
          contract_status_id: 4, // In Transit
          pickup_at: new Date().toISOString(),
        })
        .eq('id', selectedContract.id)
      if (error) throw error
      showSnackbar('Luggage picked up successfully', true)
      navigation.navigate('ContractDetails', { id: selectedContract.id })
      fetchContracts()
      // Start location forwarding when contract is picked up
      startForwarding()
    } catch (error) {
      showSnackbar('Error accepting contract: ' + error.message)
    } finally {
      setPickingup(false)
      setPickupDialogVisible(false)
      setSelectedContract(null)
    }
  }

  const ContractCard = ({ contract }) => {    
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
                    style={[styles.avatarImage,{ backgroundColor: colors.primary }]}
                />
            ) : (
                <Avatar.Text 
                    size={40} 
                    label={contract.airline_profile?.first_name ? contract.airline_profile?.first_name[0].toUpperCase() : 'U'}
                    style={[styles.avatarImage,{ backgroundColor: colors.primary }]}
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
              Timeline:
            </Text>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
              Created: {formatDate(contract.created_at)}
            </Text>
            {contract.accepted_at && (
              <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
                Accepted: {formatDate(contract.accepted_at)}
              </Text>
            )}
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
          {/* Accept Contract button for Pending contracts */}
          {contract.contract_status_id === 1 && (
            <Button 
              mode="contained" 
              onPress={() => handleAcceptContract(contract)} 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              loading={accepting && selectedContract?.id === contract.id}
              disabled={accepting}
            >
              Accept Contract
            </Button>
          )}

          {/* Pickup Luggage button for Accepted contracts */}
          {contract.contract_status_id === 3 && (
            <Button 
              mode="contained" 
              onPress={() => handlePickupLuggage(contract)} 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              loading={pickingup && selectedContract?.id === contract.id} // was accepting
              disabled={pickingup} // was accepting
            >
             Pickup Luggage
            </Button>
          )}
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
      {/* Accept Contract Dialog */}
      <Portal>
        <Dialog
          visible={acceptDialogVisible}
          onDismiss={() => setAcceptDialogVisible(false)}
          style={{backgroundColor: colors.surface}}
        >
          <Dialog.Title>Accept Contract</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to accept this contract? This will assign it to you and set the pickup time.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAcceptDialogVisible(false)} disabled={accepting}>Cancel</Button>
            <Button onPress={confirmAcceptContract} loading={accepting} disabled={accepting}>
              Accept
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {/* Pickup Luggage Dialog */}
      <Portal>
        <Dialog
          visible={pickupDialogVisible}
          onDismiss={() => setPickupDialogVisible(false)}
          style={{backgroundColor: colors.surface}}
        >
          <Dialog.Title>Pickup Luggage</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to mark this luggage as picked up? This will update the contract status.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickupDialogVisible(false)} disabled={pickingup}>Cancel</Button>
            <Button onPress={confirmPickupLuggage} loading={pickingup} disabled={pickingup}>
              Pickup
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
    marginBottom: 8,
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
    flex: 1,
  },
  detailsContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  flatListContent: {
    paddingBottom: 20,
  },
})

export default AcceptContracts
