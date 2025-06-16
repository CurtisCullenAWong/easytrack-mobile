import { useState, useEffect, useMemo } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Card, Avatar, Divider, IconButton, useTheme, Searchbar, Menu, Portal, Dialog } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'

const PickupLuggage = ({ navigation }) => {
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
  const [pickupDialogVisible, setPickupDialogVisible] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [pickingup, setPickingup] = useState(false)

  const filterOptions = [
    { label: 'Tracking ID', value: 'id' },
    { label: 'Airline Name', value: 'airline_name' },
    { label: 'Delivery Name', value: 'delivery_name' },
    { label: 'Created At', value: 'created_at' },
  ]

  const sortOptions = [
    { label: 'Created At', value: 'created_at' },
    { label: 'Quantity', value: 'luggage_quantity' },
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
        .eq('contract_status_id',3)
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

  const filteredAndSortedContracts = useMemo(() => {
    return contracts
      .filter(contract => {
        if (!searchQuery) return true;
        
        const searchValue = searchQuery.toLowerCase();
        let fieldValue = '';

        switch (searchColumn) {
          case 'airline_name':
            fieldValue = contract.airline_profile?.first_name || '';
            break;
          case 'delivery_name':
            fieldValue = contract.luggage_info?.[0]?.luggage_owner || '';
            break;
          case 'created_at':
            fieldValue = contract[searchColumn] || '';
            break;
          default:
            fieldValue = contract[searchColumn] || '';
        }

        return String(fieldValue).toLowerCase().includes(searchValue);
      })
      .sort((a, b) => {
        let valA, valB;

        switch (sortColumn) {
          case 'luggage_quantity':
            valA = Number(a[sortColumn]) || 0;
            valB = Number(b[sortColumn]) || 0;
            break;
          case 'created_at':
            valA = a[sortColumn] ? new Date(a[sortColumn]) : null;
            valB = b[sortColumn] ? new Date(b[sortColumn]) : null;
            
            if (!valA && !valB) return 0;
            if (!valA) return sortDirection === 'ascending' ? -1 : 1;
            if (!valB) return sortDirection === 'ascending' ? 1 : -1;
            
            return sortDirection === 'ascending' 
              ? valA.getTime() - valB.getTime()
              : valB.getTime() - valA.getTime();
          default:
            valA = a[sortColumn] || '';
            valB = b[sortColumn] || '';
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'ascending'
            ? valA - valB
            : valB - valA;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'ascending'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortDirection === 'ascending'
          ? valA > valB ? 1 : -1
          : valA < valB ? 1 : -1;
      });
  }, [contracts, searchQuery, searchColumn, sortColumn, sortDirection]);

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

  // Pickup luggage logic
  const handlePickupLuggage = async (contract) => {
    setSelectedContract(contract)
    setPickupDialogVisible(true)
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

      // Start location tracking after successful pickup
      
      showSnackbar('Luggage picked up successfully', true)
      fetchContracts()
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
          {/* Accept Contract button for Pending contracts
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
          )} */}

          {/* Pickup Luggage button for Accepted contracts */}
          {contract.contract_status_id === 3 && (
            <Button 
              mode="contained" 
              onPress={() => handlePickupLuggage(contract)} 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              loading={pickingup && selectedContract?.id === contract.id}
              disabled={pickingup}
            >
             Pickup Luggage
            </Button>
          )}
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
    alignContent: 'space-evenly',
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
  },
  detailsContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  flatListContent: {
    paddingBottom: 20,
  },
})

export default PickupLuggage
