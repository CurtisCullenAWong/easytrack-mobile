import { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Card, Avatar, Divider, IconButton, useTheme, Searchbar, Menu, Portal, Dialog, TextInput } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import { useLocation } from '../../../hooks/useLocation'

const ContractsInTransit = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const { startTracking, stopTracking } = useLocation()
  const [currentTime, setCurrentTime] = useState('')
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('id')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortMenuVisible, setSortMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogType, setDialogType] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)
  const [remarks, setRemarks] = useState('')

  const filterOptions = [
    { label: 'Contract ID', value: 'id' },
    { label: 'Luggage Owner', value: 'luggage_owner' },
    { label: 'Case Number', value: 'case_number' },
    { label: 'Status', value: 'status' },
    { label: 'Pickup Location', value: 'pickup_location' },
    { label: 'Current Location', value: 'current_location' },
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

  useEffect(() => {
    fetchContracts()
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

    checkContractsAndManageTracking()
  }, [contracts.length])

  const checkContractsAndManageTracking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count, error: countError } = await supabase
        .from('contract')
        .select('*', { count: 'exact', head: true })
        .eq('delivery_id', user.id)
        .eq('contract_status_id', 4)

      if (countError) throw countError

      if (count > 0) {
        await startTracking()
      } else {
        await stopTracking()
        showSnackbar('No contracts in transit. Location tracking inactive.', true)
      }
    } catch (error) {
      showSnackbar('Error managing location tracking: ' + error.message)
    }
  }

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
        .eq('delivery_id', user.id)
        .eq('contract_status_id', 4)
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

  const handleDialogAction = async () => {
    if (!selectedContract) return
    try {
      if (dialogType === 'deliver') {
        setDialogVisible(false)
        setSelectedContract(null)
        setRemarks('')
        navigation.navigate('DeliveryConfirmation', { contract: selectedContract })
      }
      else if (dialogType === 'cancel') {
        setLoading(true)
        const updateObj = {
          cancelled_at: new Date().toISOString(),
          contract_status_id: 6, // Failed
          remarks: remarks
        }
        const { error } = await supabase
          .from('contract')
          .update(updateObj)
          .eq('id', selectedContract.id)
        if (error) throw error

        checkContractsAndManageTracking()

        showSnackbar('Contract marked as failed.', true)
        setDialogVisible(false)
        setSelectedContract(null)
        setRemarks('')
        fetchContracts()
        navigation.navigate('BookingHistory')
      }
    } catch (error) {
      showSnackbar('Error updating contract: ' + error.message)
    } finally {
      setLoading(false)
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
          {contract.drop_off_location && (
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('CheckLocation', { 
                dropOffLocation: contract.drop_off_location,
                dropOffLocationGeo: contract.drop_off_location_geo
              })} 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
            >
              Check Location
            </Button>
          )}
          <Button
            mode="contained"
            onPress={() => {
              setSelectedContract(contract)
              setDialogType('deliver')
              setDialogVisible(true)
            }}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            disabled={contract.contract_status_id === 5 || contract.contract_status_id === 6}
          >
            Mark as Delivered
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              setSelectedContract(contract)
              setDialogType('cancel')
              setDialogVisible(true)
            }}
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            disabled={contract.contract_status_id === 6 || contract.contract_status_id === 5}
          >
            Mark as Failed
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
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>
            {dialogType === 'deliver' ? 'Mark as Delivered' : 'Mark as Failed'}
          </Dialog.Title>
          <Dialog.Content>
            <Text>
              {dialogType === 'deliver'
                ? 'Are you sure you want to mark this contract as delivered?'
                : 'Are you sure you want to mark this contract as failed?'}
            </Text>
            <TextInput
              mode="outlined"
              label="Remarks"
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={3}
              style={{ marginTop: 16 }}
              placeholder="Enter remarks here..."
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setDialogVisible(false)
              setRemarks('')
            }}>No</Button>
            <Button onPress={handleDialogAction}>Yes</Button>
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
    alignContent: 'space-evenly',
    alignSelf:'center',
    flexDirection: 'row',
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
    marginRight:'30%',
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
})

export default ContractsInTransit
