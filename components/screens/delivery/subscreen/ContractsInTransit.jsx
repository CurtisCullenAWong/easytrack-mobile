import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { Text, Button, Card, Divider, IconButton, useTheme, Searchbar, Menu, Surface } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import { useLocation } from '../../../hooks/useLocation'
import BottomModal from '../../../customComponents/BottomModal'
import ContractActionModalContent from '../../../customComponents/ContractActionModalContent'
import useSnackbar from '../../../hooks/useSnackbar'
import * as Location from 'expo-location'

// Constants
const FILTER_OPTIONS = [
  { label: 'Contract ID', value: 'id' },
  { label: 'Owner Name', value: 'owner_name' },
  { label: 'Case Number', value: 'case_number' },
  { label: 'Pickup Location', value: 'pickup_location' },
  { label: 'Current Location', value: 'current_location' },
  { label: 'Drop-off Location', value: 'drop_off_location' },
]

const SORT_OPTIONS = [
  { label: 'Distance', value: 'distance' },
  { label: 'Contract ID', value: 'id' },
  { label: 'Owner Name', value: 'owner_name' },
  { label: 'Case Number', value: 'case_number' },
  { label: 'Created Date', value: 'created_at' },
  { label: 'Pickup Date', value: 'pickup_at' },
  { label: 'Luggage Quantity', value: 'luggage_quantity' },
]

// Utility functions
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in km
}

const deg2rad = (deg) => deg * (Math.PI / 180)

const parseGeometry = (geoString) => {
  if (!geoString) return null
  
  try {
    if (typeof geoString === 'string') {
      const coords = geoString.replace(/[POINT()]/g, '').split(' ')
      return {
        longitude: parseFloat(coords[0]),
        latitude: parseFloat(coords[1]),
      }
    } 
    
    if (geoString?.coordinates?.length >= 2) {
      return {
        longitude: parseFloat(geoString.coordinates[0]),
        latitude: parseFloat(geoString.coordinates[1]),
      }
    }
  } catch (error) {
    console.error('Error parsing geometry:', error)
  }
  return null
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
  const { showSnackbar, SnackbarElement } = useSnackbar()
  
  // State management
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
  const [modalVisible, setModalVisible] = useState(false)
  const [dialogType, setDialogType] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [isLocationTrackingActive, setIsLocationTrackingActive] = useState(false)

  // Get current user location
  const getUserLocation = useCallback(async () => {
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync()
      if (!isEnabled) {
        console.warn('Location services are disabled')
        return null
      }

      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        showSnackbar('Permission to access location was denied')
        return null
      }

      const { coords } = await Location.getCurrentPositionAsync({})
      return {
        latitude: coords.latitude,
        longitude: coords.longitude
      }
    } catch (error) {
      console.warn('Error getting location:', error.message)
      return null
    }
  }, [])

  // Calculate distances for contracts
  const contractsWithDistance = useMemo(() => {
    if (!userLocation) return contracts

    return contracts.map(contract => {
      const dropOffCoords = parseGeometry(contract.drop_off_location_geo)
      let distance = null

      if (dropOffCoords) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          dropOffCoords.latitude,
          dropOffCoords.longitude
        )
      }

      return {
        ...contract,
        distance
      }
    })
  }, [contracts, userLocation?.latitude, userLocation?.longitude]) // More specific dependencies

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

  // Periodic refresh effect for contracts (every 10 seconds for better real-time updates)
  useEffect(() => {
    // Only set up refresh interval if there are contracts and location tracking is active
    if (contracts.length === 0 || !isLocationTrackingActive) {
      return
    }

    const refreshInterval = setInterval(async () => {
      if (!loading) {
        await fetchContracts()
        await checkContractsAndManageTracking()
        
        // Only get location update if location services are enabled
        try {
          const isLocationEnabled = await Location.hasServicesEnabledAsync()
          if (isLocationEnabled) {
            const newLocation = await getUserLocation()
            setUserLocation(newLocation)
          }
        } catch (error) {
          console.warn('Location services not available during refresh:', error.message)
        }
      }
    }, 10000) // 10 seconds for more frequent updates

    return () => clearInterval(refreshInterval)
  }, [loading, contracts.length, isLocationTrackingActive, fetchContracts, checkContractsAndManageTracking, getUserLocation])

  // Get user location on component mount
  useEffect(() => {
    getUserLocation().then(setUserLocation)
  }, [getUserLocation])

  // Fetch on focus to avoid stale data on revisit
  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      Promise.all([
        fetchContracts(),
        checkContractsAndManageTracking(),
        getUserLocation().then(setUserLocation)
      ]).finally(() => {
        setLoading(false)
      })
    }, [fetchContracts, checkContractsAndManageTracking, getUserLocation])
  )

  // Real-time subscription for contracts
  useFocusEffect(
    useCallback(() => {
      let activeChannel
      const setupSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        activeChannel = supabase
          .channel('contracts_in_transit_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'contracts',
              filter: `delivery_id=eq.${user.id} AND contract_status_id=eq.4`
            },
            async (payload) => {
              console.log('In-transit contract change detected:', payload.eventType, payload.new?.id)
              
              // Refresh contracts and check tracking
              await fetchContracts()
              await checkContractsAndManageTracking()
              
              // Update user location if it's a location update
              if (payload.eventType === 'UPDATE' && 
                  (payload.new?.current_location !== payload.old?.current_location ||
                   payload.new?.current_location_geo !== payload.old?.current_location_geo)) {
                try {
                  const isLocationEnabled = await Location.hasServicesEnabledAsync()
                  if (isLocationEnabled) {
                    const { status } = await Location.requestForegroundPermissionsAsync()
                    if (status !== 'granted') {
                      showSnackbar('Permission to access location was denied')
                      return
                    }
                    const { coords } = await Location.getCurrentPositionAsync({})
                      setUserLocation({
                        latitude: coords.latitude,
                        longitude: coords.longitude
                    })
                  }
                } catch (locationError) {
                  console.warn('Error getting location in realtime callback:', locationError.message)
                }
              }
            }
          )
          .subscribe()
      }
      setupSubscription()

      return () => {
        if (activeChannel) {
          supabase.removeChannel(activeChannel)
        }
      }
    }, [fetchContracts, checkContractsAndManageTracking])
  )

  // Data fetching functions
  const checkContractsAndManageTracking = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count, error: countError } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('delivery_id', user.id)
        .eq('contract_status_id', 4)

      if (countError) throw countError
      
      // Check if location services are available before starting tracking
      const isLocationEnabled = await Location.hasServicesEnabledAsync()
      
      if (count > 0 && isLocationEnabled) {
        await startTracking()
        setIsLocationTrackingActive(true)
      } else {
        await stopTracking()
        setIsLocationTrackingActive(false)
      }
    } catch (error) {
      console.warn('Error managing location tracking:', error.message)
      // Don't show snackbar for location service errors to avoid spam
      if (!error.message.includes('location') && !error.message.includes('Location')) {
        showSnackbar('Error managing location tracking: ' + error.message)
      }
    }
  }, [startTracking, stopTracking, showSnackbar])

  const fetchContracts = useCallback(async () => {
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
        .eq('contract_status_id', 4)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContracts(data || [])
    } catch (error) {
      showSnackbar('Error loading contracts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [showSnackbar])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchContracts()
      await checkContractsAndManageTracking()
      const newLocation = await getUserLocation()
      setUserLocation(newLocation)
    } catch (error) {
      showSnackbar('Error refreshing contracts: ' + error.message)
    } finally {
      setRefreshing(false)
    }
  }, [fetchContracts, checkContractsAndManageTracking, getUserLocation, showSnackbar])

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
    return contractsWithDistance
      .filter(contract => {
        if (!searchQuery) return true;
        
        const searchValue = searchQuery.toLowerCase();
        let fieldValue = '';

        switch (searchColumn) {
          case 'owner_name':
            fieldValue = [
              contract.owner_first_name,
              contract.owner_middle_initial,
              contract.owner_last_name
            ].filter(Boolean).join(' ') || '';
            break;
          case 'pickup_location':
          case 'current_location':
          case 'drop_off_location':
          case 'case_number':
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
          case 'pickup_at':
            valA = a[sortColumn] ? new Date(a[sortColumn]) : null;
            valB = b[sortColumn] ? new Date(b[sortColumn]) : null;
            
            if (!valA && !valB) return 0;
            if (!valA) return sortDirection === 'ascending' ? -1 : 1;
            if (!valB) return sortDirection === 'ascending' ? 1 : -1;
            
            return sortDirection === 'ascending' 
              ? valA.getTime() - valB.getTime()
              : valB.getTime() - valA.getTime();
          case 'distance':
            valA = a[sortColumn] || 0;
            valB = b[sortColumn] || 0;
            return sortDirection === 'ascending'
              ? valA - valB
              : valB - valA;
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
          .from('contracts')
          .update({
            cancelled_at: new Date().toISOString(),
            contract_status_id: 6,
            remarks: remarks,
            proof_of_delivery: proofOfDeliveryImageUrl
          })
          .eq('id', selectedContract.id)
        if (error) throw error

        // Don't call fetchContracts here as the subscription will handle the update
        setModalVisible(false)
        setSelectedContract(null)
        showSnackbar('Contract marked as failed successfully', true)
      }
      else if (dialogType === 'cancel') {
        if (!showCancelConfirmation) {
          setShowCancelConfirmation(true)
          setActionLoading(false)
          return
        }
        
        const { error } = await supabase
          .from('contracts')
          .update({
            cancelled_at: new Date().toISOString(),
            contract_status_id: 2,
            remarks: remarks,
          })
          .eq('id', selectedContract.id)
        if (error) throw error

        // Don't call fetchContracts here as the subscription will handle the update
        setModalVisible(false)
        setSelectedContract(null)
        setShowCancelConfirmation(false)
        showSnackbar('Contract cancelled successfully', true)
      }
    } catch (error) {
      showSnackbar('Error updating contract: ' + error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const ContractCard = ({ contract }) => {
    // Memoize formatted dates for this contract
    const formattedDates = useMemo(() => getFormattedDates(contract), [contract]) // Removed getFormattedDates dependency
    
    return (
      <Card style={[styles.contractCard, { backgroundColor: colors.surfaceVariant }]}>
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
            <View>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                <Text style={[fonts.labelMedium, { fontWeight: 'bold', color: colors.primary }]}>
                  Passenger Name:
                </Text>
                <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
                  {[
                    contract.owner_first_name,
                    contract.owner_middle_initial,
                    contract.owner_last_name
                  ].filter(Boolean).join(' ') || 'N/A'}
                </Text>
              </View>
              <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
                Total Luggage Quantity: {contract.luggage_quantity || 0}
              </Text>
              <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
                Case Number: {contract.case_number || 'N/A'}
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
            <View style={styles.locationRow}>
              <IconButton 
                icon={userLocation === null ? "map-marker-question" : "map-marker-distance"} 
                size={20} 
                iconColor={userLocation === null ? colors.outline : colors.tertiary} 
              />
              <View style={styles.locationTextContainer}>
                <Text style={[fonts.labelSmall, { color: userLocation === null ? colors.outline : colors.tertiary }]}>Distance</Text>
                <Text style={[fonts.bodySmall, styles.locationText]}>
                  {userLocation === null 
                    ? 'Getting location...'
                    : contract.distance !== null
                    ? contract.distance < 1 
                      ? `${(contract.distance * 1000).toFixed(0)} m` 
                      : `${contract.distance.toFixed(2)} km`
                    : 'Location unavailable'
                  }
                </Text>
              </View>
            </View>
          </View>
          <Divider />
          <View style={styles.detailsContainer}>
            <Text style={[fonts.labelLarge, styles.statusLabel]}>Date Information:</Text>
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
            disabled={contract.contract_status_id === 6 || contract.contract_status_id === 5 || contract.contract_status_id === 2}
          >
            Cancel Contract
          </Button>
        </Card.Content>
      </Card>
    )
  }

  const renderHeader = () => (
    <View>
      {/* Time Display Section with Location Tracking Indicator */}
      <Surface style={[styles.timeSurface, { backgroundColor: colors.surface }]} elevation={1}>
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: colors.onSurface }, fonts.titleMedium]}>
            {currentTime}
          </Text>
          <View style={styles.trackingIndicatorContainer}>
            <View style={[
              styles.trackingIndicator, 
              { 
                backgroundColor: isLocationTrackingActive ? colors.primary : colors.outline,
                borderColor: isLocationTrackingActive ? colors.primary : colors.outline
              }
            ]}>
              <IconButton 
                icon={isLocationTrackingActive ? "crosshairs-gps" : "crosshairs-off"} 
                size={16} 
                iconColor={isLocationTrackingActive ? colors.onPrimary : colors.onSurfaceVariant} 
              />
            </View>
            <Text style={[
              styles.trackingText, 
              { color: isLocationTrackingActive ? colors.primary : colors.onSurfaceVariant }, 
              fonts.labelSmall
            ]}>
              {isLocationTrackingActive ? 'LIVE' : 'OFF'}
            </Text>
          </View>
        </View>
        <View style={styles.timeContainer}>
        
        </View>
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
                  {FILTER_OPTIONS.find(opt => opt.value === searchColumn)?.label || 'Select Column'}
                </Button>
              }
              contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
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
                  {getSortLabel(sortColumn, SORT_OPTIONS, getSortIcon)}
                </Button>
              }
              contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
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
        </View>
      </Surface>
    </View>
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
          placeholder={`Search by ${FILTER_OPTIONS.find(opt => opt.value === searchColumn)?.label}`}
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
      
      <BottomModal visible={modalVisible} onDismiss={() => {
        setModalVisible(false)
        setShowCancelConfirmation(false)
        setActionLoading(false)
        setSelectedContract(null)
        setDialogType(null)
      }}>
        <ContractActionModalContent
          dialogType={dialogType}
          onClose={() => {
            setModalVisible(false)
            setShowCancelConfirmation(false)
            setActionLoading(false)
            setSelectedContract(null)
            setDialogType(null)
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
  flatListContent: {
    paddingBottom: 20,
  },
  timeSurface: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontWeight: '600',
  },
  trackingIndicatorContainer: {
    alignItems: 'center',
  },
  trackingIndicator: {
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 4,
  },
  trackingText: {
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
  actionButton: {
    borderRadius: 8,
    marginVertical: 4,
  },
})

export default ContractsInTransit