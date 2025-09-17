import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { Text, Button, Card, Divider, IconButton, useTheme, Searchbar, Menu, Surface, List } from 'react-native-paper'
import BottomModal from '../../../customComponents/BottomModal'
import ContractActionModalContent from './ContractActionModalContent'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import { parseGeometry, calculateDistanceKm, compareGeometriesVicinity } from '../../../../utils/vicinityUtils'
import * as Location from 'expo-location'
const VICINITY_FEATURE_ENABLED = true

const PickupLuggage = ({ navigation }) => {
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
  const [sortColumn, setSortColumn] = useState('distance')
  const [sortDirection, setSortDirection] = useState('ascending')
  const [pickupDialogVisible, setPickupDialogVisible] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [pickingup, setPickingup] = useState(false)
  const [expandedById, setExpandedById] = useState({})
  
  const [deviceGeoPoint, setDeviceGeoPoint] = useState(null)
  // Get device location once per focus, used for pickup vicinity check before in-transit
  useFocusEffect(
    useCallback(() => {
      let isActive = true
      const getDeviceLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync()
          if (status !== 'granted') {
            if (isActive) setDeviceGeoPoint(null)
            return
          }
          const { coords } = await Location.getCurrentPositionAsync({})
          if (!coords) {
            if (isActive) setDeviceGeoPoint(null)
            return
          }
          const point = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`
          if (isActive) setDeviceGeoPoint(point)
        } catch (e) {
          if (isActive) setDeviceGeoPoint(null)
        }
      }
      getDeviceLocation()
      return () => { isActive = false }
    }, [])
  )

  const getDefaultExpanded = useCallback(() => ({
    info: true,
    locations: false,
    timeline: false,
    price: false,
    actions: false,
  }), [])

  const getExpandedState = useCallback((id) => {
    return expandedById[id] ?? getDefaultExpanded()
  }, [expandedById, getDefaultExpanded])

  const handleToggleSection = useCallback((id, sectionKey) => {
    setExpandedById(prev => {
      const current = prev[id] ?? getDefaultExpanded()
      return {
        ...prev,
        [id]: { ...current, [sectionKey]: !current[sectionKey] }
      }
    })
  }, [getDefaultExpanded])

  useEffect(() => {
    if (!contracts || contracts.length === 0) return
    setExpandedById(prev => {
      const validIds = new Set(contracts.map(c => c.id))
      let changed = false
      const next = {}
      for (const key in prev) {
        if (validIds.has(Number(key)) || validIds.has(key)) {
          next[key] = prev[key]
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [contracts])

  const filterOptions = [
    { label: 'Contract ID', value: 'id' },
    { label: 'Airline Name', value: 'airline_name' },
    { label: 'Owner Name', value: 'owner_name' },
    { label: 'Pickup Location', value: 'pickup_location' },
    { label: 'Drop-off Location', value: 'drop_off_location' },
  ]

  const sortOptions = [
    { label: 'Distance', value: 'distance' },
    { label: 'Contract ID', value: 'id' },
    { label: 'Airline Name', value: 'airline_name' },
    { label: 'Owner Name', value: 'owner_name' },
    { label: 'Created Date', value: 'created_at' },
    { label: 'Luggage Quantity', value: 'luggage_quantity' },
  ]

  // Calculate route distance (pickup->dropoff) and pickup vicinity (device->pickup)
  const contractsWithDistance = useMemo(() => {
    return contracts.map(contract => {
      const pickupCoords = parseGeometry(contract.pickup_location_geo)
      const dropOffCoords = parseGeometry(contract.drop_off_location_geo)
      const { distanceKm: pickupVicinityKm, withinMeters: withinPickupVicinity } = compareGeometriesVicinity(
        deviceGeoPoint,
        contract.pickup_location_geo,
        50
      )

      let distance = null // route distance in km
      if (pickupCoords && dropOffCoords) {
        distance = calculateDistanceKm(
          pickupCoords.latitude,
          pickupCoords.longitude,
          dropOffCoords.latitude,
          dropOffCoords.longitude
        )
      }
      return {
        ...contract,
        distance,
        pickupVicinityKm,
        withinPickupVicinity,
      }
    })
  }, [contracts, deviceGeoPoint])

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

  // Fetch on focus
  useFocusEffect(
    useCallback(() => {
      fetchContracts()
    }, [])
  )

  // Subscribe only while focused
  useFocusEffect(
    useCallback(() => {
      let activeChannel
      const setupSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        activeChannel = supabase
          .channel('pickup_contracts_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'contracts',
            },
            async () => {
              await fetchContracts()
            }
          )
          .subscribe()
      }
      setupSubscription()

      return () => {
        if (activeChannel) activeChannel.unsubscribe?.()
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
        .eq('delivery_id', user.id)
        .eq('contract_status_id', 3)
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

  const filteredAndSortedContracts = useMemo(() => {
    return contractsWithDistance
      .filter(contract => {
        if (!searchQuery) return true;
        
        const searchValue = searchQuery.toLowerCase();
        let fieldValue = '';

        switch (searchColumn) {
          case 'airline_name':
            fieldValue = [
              contract.airline_profile?.first_name,
              contract.airline_profile?.middle_initial,
              contract.airline_profile?.last_name,
              contract.airline_profile?.suffix
            ].filter(Boolean).join(' ') || '';
            break;
          case 'owner_name':
            fieldValue = [
              contract.owner_first_name,
              contract.owner_middle_initial,
              contract.owner_last_name
            ].filter(Boolean).join(' ') || '';
            break;
          case 'pickup_location':
          case 'drop_off_location':
          default:
            fieldValue = contract[searchColumn] || '';
        }

        return String(fieldValue).toLowerCase().includes(searchValue);
      })
      .sort((a, b) => {
        let valA, valB;

        switch (sortColumn) {
          case 'distance':
            valA = a.distance || 0;
            valB = b.distance || 0;
            break;
          case 'airline_name':
            valA = [
              a.airline_profile?.first_name,
              a.airline_profile?.middle_initial,
              a.airline_profile?.last_name,
              a.airline_profile?.suffix
            ].filter(Boolean).join(' ') || '';
            valB = [
              b.airline_profile?.first_name,
              b.airline_profile?.middle_initial,
              b.airline_profile?.last_name,
              b.airline_profile?.suffix
            ].filter(Boolean).join(' ') || '';
            break;
          case 'owner_name':
            valA = [
              a.owner_first_name,
              a.owner_middle_initial,
              a.owner_last_name
            ].filter(Boolean).join(' ') || '';
            valB = [
              b.owner_first_name,
              b.owner_middle_initial,
              b.owner_last_name
            ].filter(Boolean).join(' ') || '';
            break;
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
  }, [contractsWithDistance, searchQuery, searchColumn, sortColumn, sortDirection]);

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

  const confirmPickupLuggage = async (remarks, imageUrl) => {
    if (!selectedContract) return
    setPickingup(true)
    try {
      // Navigate to DeliveryConfirmation with pickup action
      navigation.navigate('DeliveryConfirmation', { 
        contract: selectedContract, 
        action: 'pickup',
        remarks: remarks,
        imageUrl: imageUrl
      })
      setPickupDialogVisible(false)
      setSelectedContract(null)
    } catch (error) {
      showSnackbar('Error processing pickup: ' + error.message)
    } finally {
      setPickingup(false)
    }
  }

  const ContractCard = memo(({ contract, expanded, onToggle }) => {    
    const toggle = (k) => onToggle(contract.id, k)

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
              <View style={styles.passengerInfoContainer}>
                <View>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    <Text style={[fonts.labelMedium, { fontWeight: 'bold', color: colors.primary }]}>Passenger Name:</Text>
                    <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>{passengerName}</Text>
                  </View>
                  <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Total Luggage Quantity: {contract.luggage_quantity || 0}</Text>
                  <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Flight Number: {contract.flight_number || 'N/A'}</Text>
                  <View style={[styles.statusContainer, { paddingVertical: 6 }]}>
                    <Text style={[fonts.labelSmall, styles.statusLabel]}>STATUS:</Text>
                    <Text style={[fonts.bodySmall, styles.statusValue, { color: colors.primary }]}>{contract.contract_status?.status_name || 'Unknown'}</Text>
                  </View>
                </View>
              </View>
            <Divider />

            <List.Accordion title="Locations" expanded={expanded.locations} onPress={() => toggle('locations')} titleStyle={[fonts.labelMedium, { color: colors.onSurface }]}>
              <View style={styles.locationContainer}>
                {[
                  { location: contract.pickup_location, label: 'Pickup', color: colors.primary },
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
                <View style={styles.locationRow}>
                  <IconButton 
                    icon={contract.distance !== null ? "map-marker-distance" : "map-marker-question"} 
                    size={20} 
                    iconColor={contract.distance !== null ? colors.tertiary : colors.outline} 
                  />
                  <View style={styles.locationTextContainer}>
                    <Text style={[fonts.labelSmall, { color: contract.distance !== null ? colors.tertiary : colors.outline }]}>Distance</Text>
                    <Text style={[fonts.bodySmall, styles.locationText]}>
                      {contract.distance !== null
                        ? contract.distance < 1 
                          ? `${(contract.distance * 1000).toFixed(0)} m` 
                          : `${contract.distance.toFixed(2)} km`
                        : 'Location coordinates unavailable'
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </List.Accordion>

            <Divider />

            <List.Accordion title="Timeline" expanded={expanded.timeline} onPress={() => toggle('timeline')} titleStyle={[fonts.labelMedium, { color: colors.onSurface }]}>
              <View style={styles.detailsContainer}>
                <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>Created: {formatDate(contract.created_at)}</Text>
                {contract.pickup_at && (<Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>Pickup: {formatDate(contract.pickup_at)}</Text>)}
                {contract.delivered_at && (<Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>Delivered: {formatDate(contract.delivered_at)}</Text>)}
                {contract.cancelled_at && (<Text style={[fonts.labelSmall, { color: colors.error }]}>Cancelled: {formatDate(contract.cancelled_at)}</Text>)}
              </View>
            </List.Accordion>

            <Divider />

            <List.Accordion title="Actions" expanded={expanded.actions} onPress={() => toggle('actions')} titleStyle={[fonts.labelMedium, { color: colors.onSurface }]}>
              <Button 
                mode="contained" 
                onPress={() => handleShowDetails(contract)} 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              >
                Show Details
              </Button>
              {contract.contract_status_id === 3 && (
                <Button 
                  mode="contained" 
                  onPress={() => handlePickupLuggage(contract)} 
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  loading={pickingup && selectedContract?.id === contract.id}
                  disabled={
                    VICINITY_FEATURE_ENABLED && (
                      contract.pickupVicinityKm === null || contract.pickupVicinityKm > 0.05
                    )
                  }
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
            </List.Accordion>
          </List.Section>
        </Card.Content>
      </Card>
    )
  })

  const renderHeader = () => (
    <>
      {/* Time Display Section */}
      <Surface style={[styles.timeSurface, { backgroundColor: colors.surface }]} elevation={1}>
        <Text style={[styles.timeText, { color: colors.onSurface }, fonts.titleMedium]}>
          {currentTime}
        </Text>
      </Surface>

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

    </>
  )

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <Text style={[styles.emptyText, { color: colors.onSurface }, fonts.bodyLarge]}>
          Loading contracts...
        </Text>
      ) : (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }, fonts.bodyLarge]}>
          No contracts found matching your criteria
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
        renderItem={({ item }) => (
          <ContractCard 
            contract={item}
            expanded={getExpandedState(item.id)}
            onToggle={handleToggleSection}
          />
        )}
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
      
      <BottomModal visible={pickupDialogVisible} onDismiss={() => setPickupDialogVisible(false)}>
        <ContractActionModalContent
          dialogType="pickup"
          onClose={() => setPickupDialogVisible(false)}
          onConfirm={confirmPickupLuggage}
          loading={pickingup}
          contract={selectedContract}
        />
      </BottomModal>
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

export default PickupLuggage
