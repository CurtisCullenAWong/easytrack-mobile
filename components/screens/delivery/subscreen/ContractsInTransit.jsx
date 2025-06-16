import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Card, Avatar, Divider, IconButton, useTheme, Searchbar, Menu } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import { useLocation } from '../../../hooks/useLocation'
import BottomModal from '../../../customComponents/BottomModal'
import ContractActionModalContent from '../../../customComponents/ContractActionModalContent'
import useSnackbar from '../../../hooks/useSnackbar'

// Constants
const FILTER_OPTIONS = [
  { label: 'Contract ID', value: 'id' },
  { label: 'Luggage Owner', value: 'luggage_owner' },
  { label: 'Pickup Location', value: 'pickup_location' },
  { label: 'Current Location', value: 'current_location' },
  { label: 'Drop-off Location', value: 'drop_off_location' },
]

const SORT_OPTIONS = [
  { label: 'Contract ID', value: 'id' },
  { label: 'Luggage Owner', value: 'luggage_owner' },
  { label: 'Created Date', value: 'created_at' },
  { label: 'Pickup Date', value: 'pickup_at' },
]

// Utility functions
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

const getSortIcon = (column, sortColumn, sortDirection) => 
  sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : ''

const getSortLabel = (sortColumn, sortOptions, getSortIcon) => {
  const option = sortOptions.find(opt => opt.value === sortColumn)
  return `${option?.label || 'Sort By'} ${getSortIcon(sortColumn)}`
}

// Main Component
const ContractsInTransit = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { startTracking, stopTracking } = useLocation()
  const { showSnackbar } = useSnackbar()
  
  // State management
  const [currentTime, setCurrentTime] = useState('')
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('id')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortMenuVisible, setSortMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')
  const [modalVisible, setModalVisible] = useState(false)
  const [dialogType, setDialogType] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Memoized date formatter
  const getFormattedDates = useCallback((contract) => {
    return {
      created: formatDate(contract.created_at),
      pickup: contract.pickup_at ? formatDate(contract.pickup_at) : null,
      delivered: contract.delivered_at ? formatDate(contract.delivered_at) : null,
      cancelled: contract.cancelled_at ? formatDate(contract.cancelled_at) : null,
    }
  }, [])

  // Time update effect
  useEffect(() => {
    const updateTime = () => setCurrentTime(formatDate(new Date()))
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Initial data fetch effect
  useEffect(() => {
    fetchContracts()
    checkContractsAndManageTracking()
  }, [])

  // Real-time subscription effect
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const subscription = supabase
        .channel('contracts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contract',
            filter: `delivery_id=eq.${user.id}`
          },
          async () => {
            await fetchContracts()
            await checkContractsAndManageTracking()
          }
        )
        .subscribe()

      return () => subscription.unsubscribe()
    }

    setupSubscription()
  }, [])

  // Data fetching functions
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
      count > 0 ? await startTracking() : await stopTracking()
    } catch (error) {
      console.error('Error managing location tracking:', error)
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
      console.error('Error loading contracts:', error)
      showSnackbar('Error loading contracts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Sorting and filtering functions
  const handleSort = useCallback((column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'ascending' ? 'descending' : 'ascending')
    } else {
      setSortColumn(column)
      setSortDirection('ascending')
    }
  }, [sortColumn])

  const filteredAndSortedContracts = useMemo(() => {
    return contracts
      .filter(contract => {
        if (!searchQuery) return true;
        
        const searchValue = searchQuery.toLowerCase();
        let fieldValue = '';

        switch (searchColumn) {
          case 'luggage_owner':
            fieldValue = contract.luggage_info?.[0]?.[searchColumn] || '';
            break;
          case 'pickup_location':
          case 'current_location':
          case 'drop_off_location':
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
          case 'luggage_owner':
            valA = a.luggage_info?.[0]?.[sortColumn] || '';
            valB = b.luggage_info?.[0]?.[sortColumn] || '';
            break;
          case 'created_at':
          case 'pickup_at':
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

  // Dialog action handlers
  const handleDialogAction = async (remarks, proofOfDeliveryImageUrl) => {
    if (!selectedContract) return

    try {
      setActionLoading(true)
      if (dialogType === 'deliver') {
        navigation.navigate('DeliveryConfirmation', { 
          contract: selectedContract,
          proofOfDeliveryImageUrl 
        })
        setModalVisible(false)
        setSelectedContract(null)
      }
      else if (dialogType === 'failed') {
        const { error } = await supabase
          .from('contract')
          .update({
            cancelled_at: new Date().toISOString(),
            contract_status_id: 6,
            remarks: remarks,
            proof_of_delivery: proofOfDeliveryImageUrl
          })
          .eq('id', selectedContract.id)
        if (error) throw error

        await checkContractsAndManageTracking()
        setModalVisible(false)
        setSelectedContract(null)
        await fetchContracts()
        showSnackbar('Contract marked as failed successfully', true)
      }
      else if (dialogType === 'cancel') {
        if (!showCancelConfirmation) {
          setShowCancelConfirmation(true)
          setActionLoading(false)
          return
        }
        
        const { error } = await supabase
          .from('contract')
          .update({
            cancelled_at: new Date().toISOString(),
            contract_status_id: 6,
            remarks: remarks,
            proof_of_delivery: proofOfDeliveryImageUrl
          })
          .eq('id', selectedContract.id)
        if (error) throw error

        await checkContractsAndManageTracking()
        setModalVisible(false)
        setSelectedContract(null)
        setShowCancelConfirmation(false)
        await fetchContracts()
        showSnackbar('Contract cancelled successfully', true)
      }
    } catch (error) {
      console.error('Error updating contract:', error)
      showSnackbar('Error updating contract: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const ContractCard = ({ contract }) => {
    // Memoize formatted dates for this contract
    const formattedDates = useMemo(() => getFormattedDates(contract), [contract, getFormattedDates])
    
    return (
      <Card style={[styles.contractCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <View style={styles.contractCardHeader}>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>CONTRACT ID</Text>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]} selectable>{contract.id || 'N/A'}</Text>
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
            <Text style={[fonts.labelLarge, styles.statusLabel]}>Timeline:</Text>
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
              Created: {formattedDates.created}
            </Text>
            {formattedDates.pickup && (
              <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
                Pickup: {formattedDates.pickup}
              </Text>
            )}
            {formattedDates.delivered && (
              <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
                Delivered: {formattedDates.delivered}
              </Text>
            )}
            {formattedDates.cancelled && (
              <Text style={[fonts.labelSmall, { color: colors.error }]}>
                Cancelled: {formattedDates.cancelled}
              </Text>
            )}
          </View>
          <Divider />
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('ContractDetails', { id: contract.id})} 
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
              setModalVisible(true)
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
              setDialogType('failed')
              setShowCancelConfirmation(false)
              setModalVisible(true)
            }}
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            disabled={contract.contract_status_id === 6 || contract.contract_status_id === 5}
          >
            Mark as Failed
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              setSelectedContract(contract)
              setDialogType('cancel')
              setShowCancelConfirmation(false)
              setModalVisible(true)
            }}
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            disabled={contract.contract_status_id === 6 || contract.contract_status_id === 5}
          >
            Cancel Contract
          </Button>
        </Card.Content>
      </Card>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ backgroundColor: colors.background }}>
        <Card style={[styles.timeCard, { backgroundColor: colors.surface, elevation: colors.elevation.level3 }]}>
          <Card.Content style={styles.timeCardContent}>
            <Text style={fonts.titleSmall}>{currentTime}</Text>
          </Card.Content>
        </Card>
      </View>
      <View style={styles.searchActionsRow}>
        <Searchbar
          placeholder={`Search by ${FILTER_OPTIONS.find(opt => opt.value === searchColumn)?.label}`}
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
              {FILTER_OPTIONS.find(opt => opt.value === searchColumn)?.label}
            </Button>
          }
          contentStyle={{ backgroundColor: colors.surface }}
        >
          {FILTER_OPTIONS.map(option => (
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
              {getSortLabel(sortColumn, SORT_OPTIONS, getSortIcon)}
            </Button>
          }
          contentStyle={{ backgroundColor: colors.surface }}
        >
          {SORT_OPTIONS.map(option => (
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
      <BottomModal visible={modalVisible} onDismiss={() => {
        setModalVisible(false)
        setShowCancelConfirmation(false)
        setActionLoading(false)
      }}>
        <ContractActionModalContent
          dialogType={dialogType}
          onClose={() => {
            setModalVisible(false)
            setShowCancelConfirmation(false)
            setActionLoading(false)
          }}
          onConfirm={handleDialogAction}
          loading={actionLoading}
          contract={selectedContract}
          showCancelConfirmation={showCancelConfirmation}
        />
      </BottomModal>
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
