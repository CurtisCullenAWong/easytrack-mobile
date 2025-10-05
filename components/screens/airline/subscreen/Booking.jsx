// ================================
// IMPORTS
// ================================

// React & React Native
import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'

// React Native Paper
import { useTheme, TextInput, Button, Text, IconButton, Menu, Surface, List } from 'react-native-paper'

// Navigation
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'

// Local Components
import BottomModal from '../../../customComponents/BottomModal'
import LocationAutofill from '../../../customComponents/LocationAutofill'

// Hooks & Utils
import useSnackbar from '../../../hooks/useSnackbar'
import { supabase } from '../../../../lib/supabase'
import { sendNotificationAdmin } from '../../../../utils/registerForPushNotifications'

// ================================
// CONSTANTS & CONFIGURATION
// ================================

/** Initial contract template */
const INITIAL_CONTRACT = {
  firstName: "",
  middleInitial: "",
  lastName: "",
  contact: "",
  flightNumber: "",
  itemDescription: "",
  itemDescriptions: [],
  quantity: "1",
  deliveryAddress: "",
  addressLine1: "",
  addressLine2: "",
  province: "",
  cityMunicipality: "",
  barangay: "",
  postalCode: "",
  street: "",
  villageBuilding: "",
  roomUnitNo: "",
  landmarkEntrance: "",
  errors: {
    firstName: false,
    lastName: false,
    contact: false,
    flightNumber: false,
    itemDescription: false,
    quantity: false,
    addressLine1: false,
    province: false,
    cityMunicipality: false,
    barangay: false,
    postalCode: false,
    street: false,
    villageBuilding: false,
    landmarkEntrance: false
  }
}

/** Input limits and validation patterns */
const INPUT_LIMITS = {
  firstName: { maxLength: 50, minLength: 2 },
  middleInitial: { maxLength: 1 },
  lastName: { maxLength: 50, minLength: 2 },
  contact: { maxLength: 10, minLength: 10 },
  flightNumber: { maxLength: 8, minLength: 3 },
  itemDescription: { maxLength: 100, minLength: 6 },
  quantity: { maxLength: 2, minLength: 1 }, // Max 2 digits for up to 25
  province: { maxLength: 50, minLength: 2 },
  cityMunicipality: { maxLength: 50, minLength: 2 },
  barangay: { maxLength: 50, minLength: 2 },
  postalCode: { maxLength: 4, minLength: 4 },
  street: { maxLength: 50, minLength: 2 },
  villageBuilding: { maxLength: 50, minLength: 2 },
  roomUnitNo: { maxLength: 50 },
  landmarkEntrance: { maxLength: 100 }
}

const VALIDATION_PATTERNS = {
  contact: /^9\d{9}$/,
  flightNumber: /^[A-Za-z0-9]{3,8}$/,
  postalCode: /^\d{4}$/,
  quantity: /^(?:[1-9]|1[0-5])$/,
  province: /^[A-Za-z\s\-\.]+$/,
  cityMunicipality: /^[A-Za-z\s\-\.]+$/,
  barangay: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  street: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  villageBuilding: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  roomUnitNo: /^[A-Za-z0-9\s\-\.\,\#]*$/,
  landmarkEntrance: /^[A-Za-z0-9\s\-\.\,\#]*$/
}

// ================================
// UTILITY FUNCTIONS
// ================================

/** Filter special characters depending on field type */
const filterSpecialCharacters = (text, fieldType) => {
  if (typeof text !== 'string') return ''
  switch (fieldType) {
    case 'name':
      return text.replace(/[^A-Za-z\s\-']/g, '')
    case 'contact':
      return text.replace(/[^0-9]/g, '')
    case 'flightNumber':
      return text.replace(/[^A-Za-z0-9]/g, '')
    case 'postalCode':
      return text.replace(/[^0-9]/g, '')
    case 'quantity':
      return text.replace(/[^0-9]/g, '')
    case 'address':
      return text.replace(/[^A-Za-z0-9ñÑ\s\-\.\,\#\/''(\)&]/g, '')
    case 'itemDescription':
      return text.replace(/[^A-Za-z0-9\s\-\.\,\#]/g, '')
    default:
      return text.replace(/[^A-Za-z0-9\s]/g, '')
  }
}

/** Format a camelCase / camel-style field into a human readable label */
const formatFieldName = (key) =>
  key
    .replace(/([A-Z])/g, " $1") // insert spaces before capitals
    .replace(/^./, (str) => str.toUpperCase()) // capitalize first letter

/** Generate a reasonably unique tracking ID (retries occur in submission logic) */
const generateTrackingID = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const randomPart = [...Array(4)].map(() => Math.random().toString(36).slice(2, 3).toUpperCase()).join('')
  return `${year}${month}${day}MKTP${randomPart}`
}

/** Format phone/contact into the storage/display format used in the app */
const formatContactNumber = (contact) => {
  const c = String(contact || '').replace(/[^0-9]/g, '')
  if (c.length === 10 && c.startsWith('9')) {
    return `+63 ${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`
  }
  if (c.length === 11 && c.startsWith('63')) {
    return `+${c}`
  }
  return c ? `+63 ${c}` : ''
}

// ================================
// COMPONENTS
// ================================

/**
 * ContractForm - Memoized form component for individual passenger contracts
 * Handles personal info, luggage details, and form validation
 */
const ContractForm = React.memo(({
  contract,
  index,
  onInputChange,
  onClear,
  onDelete,
  isLastContract,
  isDisabled,
  flightPrefixes,
  isFixedCorporation = false,
  fixedPrefix = null,
  hasDuplicateName = false
}) => {
  const { colors, fonts } = useTheme()
  const [showFlightPrefixMenu, setShowFlightPrefixMenu] = useState(false)
  const [expanded, setExpanded] = useState({
    personalInfo: false,
    luggageInfo: false,
    deliveryAddress: false,
    addressDetails: false
  })

  const toggle = (section) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }))

  const hasPersonalInfoErrors = contract.errors?.firstName || contract.errors?.lastName || contract.errors?.contact || hasDuplicateName
  const hasLuggageInfoErrors = contract.errors?.itemDescription || contract.errors?.quantity || contract.errors?.flightNumber

  useEffect(() => {
    setExpanded(prev => ({
      ...prev,
      personalInfo: hasPersonalInfoErrors || prev.personalInfo,
      luggageInfo: hasLuggageInfoErrors || prev.luggageInfo
    }))
  }, [contract.errors, hasPersonalInfoErrors, hasLuggageInfoErrors])

  const qty = parseInt(contract.quantity || '0') || 0
  const itemsIdx = Array.from({ length: qty }, (_, i) => i)
  
  // Calculate the number of sets of 3 for the quantity text
  const setsOfThree = Math.ceil(qty / 3)

  return (
    <View style={[styles.luggageBlock, { backgroundColor: colors.surface, borderColor: colors.primary, opacity: isDisabled ? 0.6 : 1 }]}>
      <View style={styles.headerContainer}>
        <Text style={[fonts.titleMedium, { color: colors.primary }]}>Passenger {index + 1}</Text>
        <IconButton
          icon="close"
          size={20}
          onPress={() => onDelete(index)}
          style={{ margin: 0 }}
          disabled={isLastContract || isDisabled}
          iconColor={isLastContract ? colors.disabled : colors.error}
        />
      </View>

      <List.Accordion
        title={`Personal Information${hasPersonalInfoErrors ? ' ⚠️' : ''}`}
        expanded={expanded.personalInfo}
        onPress={() => toggle('personalInfo')}
        titleStyle={[fonts.titleSmall, { color: hasPersonalInfoErrors ? colors.error : colors.primary }]}
        style={{ padding: 0, marginBottom: 8 }}
      >
        <View style={styles.sectionContent}>
          {hasDuplicateName && (
            <View style={[styles.duplicateWarning, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
              <Text style={[fonts.bodySmall, { color: colors.error }]}>
                ⚠️ This passenger name already exists. Please use a unique name.
              </Text>
            </View>
          )}
          
          <View style={styles.nameRow}>
            <TextInput
              dense
              label="First Name*"
              value={contract.firstName}
              onChangeText={(text) => onInputChange(index, "firstName", filterSpecialCharacters(text, 'name'))}
              mode="outlined"
              style={[styles.nameField, { marginRight: 6 }]}
              error={contract.errors?.firstName || hasDuplicateName}
              placeholder="Enter first name (2-50 characters)"
              maxLength={INPUT_LIMITS.firstName.maxLength}
              disabled={isDisabled}
            />
            <TextInput
              dense
              label="M.I."
              value={contract.middleInitial}
              onChangeText={(text) => onInputChange(index, "middleInitial", filterSpecialCharacters(text, 'name'))}
              mode="outlined"
              style={[styles.middleInitialField]}
              maxLength={INPUT_LIMITS.middleInitial.maxLength}
              placeholder="M"
              disabled={isDisabled}
            />
          </View>

          <TextInput
            dense
            label="Last Name*"
            value={contract.lastName}
            onChangeText={(text) => onInputChange(index, "lastName", filterSpecialCharacters(text, 'name'))}
            mode="outlined"
            style={{ marginBottom: 8 }}
            error={contract.errors?.lastName || hasDuplicateName}
            placeholder="Enter last name (2-50 characters)"
            maxLength={INPUT_LIMITS.lastName.maxLength}
            disabled={isDisabled}
          />

          <TextInput
            dense
            label="Owner's Contact Number*"
            value={contract.contact}
            onChangeText={(text) => onInputChange(index, "contact", filterSpecialCharacters(text, 'contact'))}
            mode="outlined"
            style={{ marginBottom: 8 }}
            keyboardType="phone-pad"
            left={<TextInput.Affix text="+63" />}
            error={contract.errors?.contact}
            maxLength={INPUT_LIMITS.contact.maxLength}
            inputMode="numeric"
            placeholder="9xx xxx xxxx (10 digits)"
            disabled={isDisabled}
          />
        </View>
      </List.Accordion>
      <List.Accordion
        title={`Luggage Information${hasLuggageInfoErrors ? ' ⚠️' : ''}`}
        expanded={expanded.luggageInfo}
        onPress={() => toggle('luggageInfo')}
        titleStyle={[fonts.titleSmall, { color: hasLuggageInfoErrors ? colors.error : colors.primary }]}
        style={{ padding: 0, marginBottom: 8 }}
      >
        <View style={styles.sectionContent}>
          <View style={{ marginBottom: 12 }}>
            {/* Flight prefix selector or fixed prefix display */}
            {isFixedCorporation && fixedPrefix ? (
              <View>
                <TextInput
                  dense
                  label="Flight Number*"
                  value={contract.flightNumber}
                  onChangeText={(text) => {
                    // when fixed prefix is present, allow editing after the prefix
                    const cleaned = filterSpecialCharacters(text, 'flightNumber').toUpperCase()
                    onInputChange(index, "flightNumber", cleaned)
                  }}
                  mode="outlined"
                  error={contract.errors?.flightNumber}
                  maxLength={INPUT_LIMITS.flightNumber.maxLength}
                  placeholder={'Enter flight number (alphanumerical)'}
                  disabled={isDisabled}
                  left={<TextInput.Affix text={fixedPrefix} />}
                />
              </View>
            ) : (
              <Menu
                visible={showFlightPrefixMenu}
                onDismiss={() => setShowFlightPrefixMenu(false)}
                anchor={
                  <TouchableOpacity onPress={() => !isDisabled && setShowFlightPrefixMenu(((prev) => !prev))}>
                    <TextInput
                      dense
                      label="Flight Number*"
                      value={contract.flightNumber}
                      onChangeText={(text) => {
                        // Allow alphanumerical characters
                        const cleaned = filterSpecialCharacters(text, 'flightNumber').toUpperCase()
                        onInputChange(index, "flightNumber", cleaned)
                      }}
                      mode="outlined"
                      error={contract.errors?.flightNumber}
                      maxLength={INPUT_LIMITS.flightNumber.maxLength}
                      placeholder="Enter flight number (alphanumerical)"
                      disabled={isDisabled}
                      left={
                        <TextInput.Icon
                          icon="menu-down"
                          onPress={() => !isDisabled && setShowFlightPrefixMenu(((prev) => !prev))}
                          disabled={isDisabled}
                        />
                      }
                    />
                  </TouchableOpacity>
                }
                contentStyle={{ backgroundColor: colors.surface }}
              >
                {flightPrefixes.map((prefix) => (
                  <Menu.Item
                    key={prefix.id}
                    onPress={() => {
                      // clear any existing flight number and set only the prefix
                      onInputChange(index, "flightNumber", `${prefix.flight_prefix}`)
                      setShowFlightPrefixMenu(false)
                    }}
                    title={`${prefix.corporation_name} - ${prefix.flight_prefix}`}
                  />
                ))}
              </Menu>
            )}
          </View>

          <TextInput
            dense
            label="Luggage Quantity*"
            value={contract.quantity}
            onChangeText={(text) => {
              const filtered = filterSpecialCharacters(text, 'quantity')
            if (filtered === '' || (parseInt(filtered) >= 1 && parseInt(filtered) <= 15)) {
                onInputChange(index, "quantity", filtered)
              }
            }}
            inputMode="numeric"
            mode="outlined"
            style={{ marginBottom: 8 }}
            error={contract.errors?.quantity}
            maxLength={INPUT_LIMITS.quantity.maxLength}
            placeholder="Enter quantity (1-15)"
            disabled={isDisabled}
          />

          {itemsIdx.map((i) => (
            <React.Fragment key={`desc-frag-${index}-${i}`}>
              <TextInput
                key={`desc-${index}-${i}`}
                label={`Luggage Description ${i + 1}*`}
                value={contract.itemDescriptions?.[i] ?? ''}
                onChangeText={(text) => {
                  const sanitized = filterSpecialCharacters(text, 'itemDescription')
                  const next = [...(contract.itemDescriptions || [])]
                  next[i] = sanitized
                  onInputChange(index, 'itemDescriptions', next)
                }}
                mode="outlined"
                style={{ marginBottom: 8 }}
                placeholder="Describe the luggage"
                maxLength={INPUT_LIMITS.itemDescription.maxLength}
                disabled={isDisabled}
                error={contract.errors?.itemDescription}
              />

              {/* Divider after every 3 descriptions, unless it's the last item */}
              {((i + 1) % 3 === 0) && (i !== itemsIdx.length - 1) && (
                <View key={`divider-${index}-${i}`} style={styles.luggageDivider} />
              )}
            </React.Fragment>
          ))}
        </View>
      </List.Accordion>

      <Button
        mode="outlined"
        onPress={() => onClear(index)}
        style={{ marginTop: 12 }}
        icon="refresh"
        disabled={isDisabled}
      >
        Clear Form
      </Button>
    </View>
  )
})

// ================================
// MAIN BOOKING COMPONENT
// ================================

/**
 * Booking - Main component for airline booking management
 * Handles contract creation, validation, and submission
 */
const Booking = () => {
  // ================================
  // HOOKS & NAVIGATION
  // ================================
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const navigation = useNavigation()
  const route = useRoute()

  // ================================
  // STATE MANAGEMENT
  // ================================

  // Location & Address States
  const [dropOffLocation, setDropOffLocation] = useState({ location: '', lat: null, lng: null })
  const [lastAddressDetails, setLastAddressDetails] = useState(null)
  const [locationSelections, setLocationSelections] = useState({
    region: null,
    province: null,
    city: null,
    barangay: null
  })

  // Pickup Location States
  const [pickupLocation, setPickupLocation] = useState('')
  const [selectedTerminal, setSelectedTerminal] = useState(null)
  const [selectedBay, setSelectedBay] = useState(null)
  const [showTerminalMenu, setShowTerminalMenu] = useState(false)
  const [showBayMenu, setShowBayMenu] = useState(false)
  const [pickupError, setPickupError] = useState(false)

  // Flight & Prefix States
  const [flightPrefixes, setFlightPrefixes] = useState([])
  const [userRoleId, setUserRoleId] = useState(null)
  const [selectedCorporationId, setSelectedCorporationId] = useState(null)
  const [fixedPrefix, setFixedPrefix] = useState(null)

  // Contract & Submission States
  const [contracts, setContracts] = useState([JSON.parse(JSON.stringify(INITIAL_CONTRACT))])
  const [loading, setLoading] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  // Shared Address Fields (across all contracts)
  const [province, setProvince] = useState('')
  const [cityMunicipality, setCityMunicipality] = useState('')
  const [barangay, setBarangay] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [street, setStreet] = useState('')
  const [villageBuilding, setVillageBuilding] = useState('')
  const [roomUnitNo, setRoomUnitNo] = useState('')
  const [landmarkEntrance, setLandmarkEntrance] = useState('')

  // Error States
  const [addressErrors, setAddressErrors] = useState({
    province: false,
    cityMunicipality: false,
    barangay: false,
    postalCode: false,
    street: false,
    villageBuilding: false,
  })

  // Helper to check if any selection exists
  const hasSelections = Boolean(
    dropOffLocation.location ||
    pickupLocation ||
    selectedCorporationId ||
    province || cityMunicipality || barangay || postalCode || street || villageBuilding
  )

  // ================================
  // DERIVED VALUES & COMPUTED STATE
  // ================================
  const totalDeliveryFee = useMemo(() => {
    return contracts.reduce((total, contract) => {
      const qty = parseInt(contract.quantity || '0') || 0
      const setsOfThree = Math.ceil(qty / 3)
      return total + (deliveryFee * setsOfThree)
    }, 0)
  }, [deliveryFee, contracts])
  
  const totalLuggageQuantity = useMemo(() => 
    contracts.reduce((sum, c) => sum + Number(c.quantity || 0), 0), 
    [contracts]
  )

  const terminalOptions = useMemo(() => ([
    { label: 'Terminal 1', lat: 14.508963226090515, lng: 121.00417400814496 },
    { label: 'Terminal 2', lat: 14.511166725278645, lng: 121.01288969053523 },
    { label: 'Terminal 3', lat: 14.5201168528943, lng: 121.01377520505147 },
    { label: 'Terminal 4', lat: 14.525440177319647, lng: 121.00111980000001 }
  ]), [])

  const pickupBays = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => `Bay ${i + 1}`), 
    []
  )

  useEffect(() => {
    if (selectedTerminal && selectedBay) {
      setPickupLocation(`${selectedTerminal}, ${selectedBay}`)
      setPickupError(false)
    }
  }, [selectedTerminal, selectedBay])

  // ================================
  // EFFECTS & SIDE EFFECTS
  // ================================

  // Fetch user profile and load flight prefixes based on role
  useEffect(() => {
    const initPrefixes = async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr) {
          console.error('Error fetching user from auth:', userErr)
          return
        }
        if (!user) return

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role_id, corporation_id')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
        }

        const roleId = profile?.role_id ?? null
        const corpId = profile?.corporation_id ?? null
        setUserRoleId(roleId)

        // Role 3: fixed corporation - load only that corporation's prefix
        if (roleId === 3 && corpId) {
          const { data, error } = await supabase
            .from('profiles_corporation')
            .select('id, flight_prefix, corporation_name')
            .eq('id', corpId)

          if (error) {
            console.error('Error fetching corporation prefix for role 3:', error)
            showSnackbar('Error loading flight prefixes', 'error')
          } else {
            const items = Array.isArray(data) ? data : []
            const filtered = items.filter(item => item.flight_prefix)
            setFlightPrefixes(filtered)
            setSelectedCorporationId(corpId)
            // If there's exactly one prefix for this corp, set it as fixed prefix
            if (filtered.length === 1) {
              setFixedPrefix(filtered[0].flight_prefix)
            } else {
              setFixedPrefix(null)
            }
          }
          return
        }

        // Role 1: admin - load list of corporations and allow selection via menu
        if (roleId === 1) {
          const { data, error } = await supabase
            .from('profiles_corporation')
            .select('id, flight_prefix, corporation_name')
            .order('corporation_name', { ascending: true })

          if (error) {
            console.error('Error fetching corporations for admin:', error)
            showSnackbar('Error loading flight prefixes', 'error')
          } else {
            const list = Array.isArray(data) ? data : []
            // Show all available prefixes for admin selection
            setFlightPrefixes(list.filter(item => item.flight_prefix))
            setSelectedCorporationId(null)
          }
          return
        }

        // Default behavior: fallback to fetching known corp ids (legacy)
        const { data, error } = await supabase
          .from('profiles_corporation')
          .select('id, flight_prefix, corporation_name')
          .in('id', [2, 3])
          .order('id')

        if (error) {
          console.error('Error fetching flight prefixes:', error)
          showSnackbar('Error loading flight prefixes', 'error')
          return
        }

        if (data) {
          setFlightPrefixes(data.filter(item => item.flight_prefix))
        }
      } catch (error) {
        console.error('Error initializing flight prefixes:', error)
        showSnackbar('Error loading flight prefixes', 'error')
      }
    }

    initPrefixes()
  }, [showSnackbar])

  // When route params contain locationData, populate address and attempt to fetch pricing
  useFocusEffect(
    useCallback(() => {
      if (!route.params?.locationData) return

      const { drop_off_location, drop_off_location_geo, address_details } = route.params.locationData
      const match = typeof drop_off_location_geo === 'string' ? drop_off_location_geo.match(/POINT\(([\d.-]+) ([\d.-]+)\)/) : null

      if (match) {
        const [, lng, lat] = match
        setDropOffLocation({
          location: drop_off_location || '',
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        })

        setLastAddressDetails(address_details || null)

        if (address_details) {
          const newProvince = address_details.region || ''
          const newCity = address_details.city || ''
          const newBarangay = address_details.district || ''
          const newPostal = (address_details.postalCode || '').replace(/[^0-9]/g, '').slice(0, INPUT_LIMITS.postalCode.maxLength)
          const newStreet = address_details.street || ''
          const newVillage = address_details.name || ''

          setProvince(newProvince)
          setCityMunicipality(newCity)
          setBarangay(newBarangay)
          setPostalCode(newPostal)
          setStreet(newStreet)
          setVillageBuilding(newVillage)

          setContracts(prev => prev.map(c => ({
            ...c,
            province: newProvince,
            cityMunicipality: newCity,
            barangay: newBarangay,
            postalCode: newPostal,
            street: newStreet,
            villageBuilding: newVillage,
          })))
        }

        if (drop_off_location) {
          fetchDeliveryPrice(drop_off_location)
        } else {
          setDeliveryFee(0)
        }
      }
    }, [route.params])
  )

  // Sync shared address fields into each contract whenever they change
  useEffect(() => {
    setContracts(prev => prev.map(c => ({
      ...c,
      province,
      cityMunicipality,
      barangay,
      postalCode,
      street,
      villageBuilding,
      roomUnitNo,
      landmarkEntrance
    })))
  }, [province, cityMunicipality, barangay, postalCode, street, villageBuilding, roomUnitNo, landmarkEntrance])

  // ================================
  // CONTRACT MANAGEMENT FUNCTIONS
  // ================================

  const handleInputChange = useCallback((index, field, value) => {
    setContracts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      // Keep itemDescriptions in sync with quantity
      const syncDescriptions = () => {
        const qty = Math.max(0, Math.min(3, parseInt(String(updated[index].quantity || '0')) || 0))
        let arr = Array.isArray(updated[index].itemDescriptions) ? [...updated[index].itemDescriptions] : []
        if (arr.length > qty) arr = arr.slice(0, qty)
        if (arr.length < qty) arr = [...arr, ...Array.from({ length: qty - arr.length }, () => '')]
        updated[index].itemDescriptions = arr
        updated[index].itemDescription = arr.map((d, i) => `${i + 1}. ${String(d || '').trim()}\n`).join('')
      }

      if (field === 'quantity' || field === 'itemDescriptions') {
        syncDescriptions()
      }

      if (updated[index].errors) {
        updated[index].errors = { ...updated[index].errors, [field]: false }
      }

      return updated
    })
  }, [])

  
  const handleLocationChange = useCallback((selections) => {
    // Update the address fields directly from the autofill component
    setProvince(selections.province || '')
    setCityMunicipality(selections.city || '')
    setBarangay(selections.barangay || '')
    setPostalCode(String(selections.postalCode || '').replace(/[^0-9]/g, '').slice(0, INPUT_LIMITS.postalCode.maxLength))
    
    // Update location selections for reference
    setLocationSelections({
      region: selections.region ? { name: selections.region } : null,
      province: selections.province ? { name: selections.province } : null,
      city: selections.city ? { name: selections.city } : null,
      barangay: selections.barangay ? { name: selections.barangay } : null,
      postalCode: selections.postalCode ? { name: selections.postalCode } : null
    })
    
    // Clear errors when location is selected
    setAddressErrors(prev => ({
      ...prev,
      region: false,
      province: false,
      cityMunicipality: false,
      barangay: false,
      postalCode: false
    }))
  }, [])

  const clearDeliveryAddress = () => {
    setProvince('')
    setCityMunicipality('')
    setBarangay('')
    setPostalCode('')
    setStreet('')
    setVillageBuilding('')
    setRoomUnitNo('')
    setLandmarkEntrance('')
    setLocationSelections({
      region: null,
      province: null,
      city: null,
      barangay: null
    })
    setAddressErrors({
      region: false,
      province: false,
      cityMunicipality: false,
      barangay: false,
      postalCode: false,
      street: false,
      villageBuilding: false
    })
  }

  // Clear all UI selections: address, drop-off, pickup, corporation/prefix selection
  const clearAllSelections = useCallback(() => {
    // Clear address fields
    clearDeliveryAddress()

    // Clear drop-off location and pricing
    setDropOffLocation({ location: '', lat: null, lng: null })
    setDeliveryFee(0)

    // Clear pickup and pickup menus
    setPickupLocation('')
    setSelectedTerminal(null)
    setSelectedBay(null)

    // Clear corporation/prefix selection (admin)
    setSelectedCorporationId(null)
    setFlightPrefixes([])
    setFixedPrefix(null)
  }, [clearDeliveryAddress])
  
  const clearSingleContract = useCallback((index) => {
    setContracts(prev => {
      const updated = [...prev]
      updated[index] = JSON.parse(JSON.stringify(INITIAL_CONTRACT))
      return updated
    })
  }, [])

  const deleteContract = useCallback((index) => {
    setContracts(prev => {
      if (prev.length === 1) {
        showSnackbar('At least one delivery information form is required')
        return prev
      }
      return prev.filter((_, i) => i !== index)
    })
  }, [showSnackbar])

  const addContract = useCallback(() => {
    setContracts(prev => {
      if (prev.length >= 15) {
        showSnackbar('Maximum of 15 passenger forms reached')
        return prev
      }

      const base = JSON.parse(JSON.stringify(INITIAL_CONTRACT))
      const prefilled = { ...base }

      // Prefill from shared address fields if available
      const prov = province
      const city = cityMunicipality
      const brgy = barangay
      
      if (prov) prefilled.province = prov
      if (city) prefilled.cityMunicipality = city
      if (brgy) prefilled.barangay = brgy
      if (postalCode) prefilled.postalCode = postalCode
      if (street) prefilled.street = street
      if (villageBuilding) prefilled.villageBuilding = villageBuilding
      if (roomUnitNo) prefilled.roomUnitNo = roomUnitNo
      if (landmarkEntrance) prefilled.landmarkEntrance = landmarkEntrance

      // If shared fields empty and lastAddressDetails exists, use that
      if (!prov && lastAddressDetails) prefilled.province = lastAddressDetails.region || ''
      if (!city && lastAddressDetails) prefilled.cityMunicipality = lastAddressDetails.city || ''
      if (!brgy && lastAddressDetails) prefilled.barangay = lastAddressDetails.district || ''
      if (!postalCode && lastAddressDetails) prefilled.postalCode = (lastAddressDetails.postalCode || '').replace(/[^0-9]/g, '').slice(0, INPUT_LIMITS.postalCode.maxLength)
      if (!street && lastAddressDetails) prefilled.street = lastAddressDetails.street || ''
      if (!villageBuilding && lastAddressDetails) prefilled.villageBuilding = lastAddressDetails.name || ''

      return [...prev, prefilled]
    })
  }, [lastAddressDetails, province, cityMunicipality, barangay, postalCode, street, villageBuilding, roomUnitNo, landmarkEntrance, showSnackbar])

  // ================================
  // VALIDATION FUNCTIONS
  // ================================

  // Check for duplicate names across all contracts
  const validateContract = useCallback((contract) => {
    const trim = (s) => String(s || "").trim()
    return {
      firstName:
        !trim(contract.firstName) ||
        trim(contract.firstName).length < INPUT_LIMITS.firstName.minLength ||
        trim(contract.firstName).length > INPUT_LIMITS.firstName.maxLength,
      lastName:
        !trim(contract.lastName) ||
        trim(contract.lastName).length < INPUT_LIMITS.lastName.minLength ||
        trim(contract.lastName).length > INPUT_LIMITS.lastName.maxLength,
      contact:
        !trim(contract.contact) ||
        !VALIDATION_PATTERNS.contact.test(trim(contract.contact)),
      flightNumber:
        !trim(contract.flightNumber) ||
        !VALIDATION_PATTERNS.flightNumber.test(trim(contract.flightNumber).toUpperCase()),
      itemDescription: (() => {
        const qty = parseInt(contract.quantity || "0") || 0
        const descs = Array.isArray(contract.itemDescriptions) ? contract.itemDescriptions.slice(0, qty) : []
        const hasEmpty = qty > 0 && descs.some((d) => !String(d || "").trim())
        const joined = descs.map((d, i) => `${i + 1}. ${String(d || "").trim()}\n`).join("")
        return qty <= 0 || hasEmpty || joined.length < INPUT_LIMITS.itemDescription.minLength || joined.length > INPUT_LIMITS.itemDescription.maxLength
      })(),
      quantity:
        !String(contract.quantity || "").trim() ||
        !VALIDATION_PATTERNS.quantity.test(String(contract.quantity || ""))
    }
  }, [])

  const validateDeliveryAddress = useCallback(() => {
    const errors = {
      region: !String(locationSelections.region || "").trim(),
      province: !String(locationSelections.province || "").trim(),
      cityMunicipality: !String(locationSelections.city || "").trim(),
      barangay: !String(locationSelections.barangay || "").trim(),
      postalCode: !String(postalCode || "").trim(),
      street: !String(street || "").trim(),
      villageBuilding: !String(villageBuilding || "").trim(),
    }

    setAddressErrors(errors)
    const firstErrorKey = Object.keys(errors).find((k) => errors[k])
    return { valid: !firstErrorKey, firstErrorKey }
  }, [locationSelections, postalCode, street, villageBuilding])

  const validateForm = useCallback(() => {
    if (!deliveryFee || deliveryFee <= 0) {
      showSnackbar("Cannot proceed with booking. No delivery fee available for the selected location.")
      return false
    }

    if (!pickupLocation || !String(pickupLocation || "").trim()) {
      setPickupError(true)
      showSnackbar("Please select a pickup location")
      return false
    }
    setPickupError(false)

    if (!dropOffLocation.location || deliveryFee <= 0) {
      showSnackbar("Please select a drop-off location")
      return false
    }

    const { valid: addressValid, firstErrorKey: addressErrorKey } = validateDeliveryAddress()
    if (!addressValid) {
      showSnackbar(`${formatFieldName(addressErrorKey)} is required`)
      return false
    }

    // Check for duplicate passenger names
    const nameMap = new Map()
    const duplicateNames = []
    
    contracts.forEach((contract, index) => {
      const fullName = `${contract.firstName?.trim()} ${contract.lastName?.trim()}`.toLowerCase()
      if (fullName.trim() && fullName !== ' ') {
        if (nameMap.has(fullName)) {
          duplicateNames.push(fullName)
        } else {
          nameMap.set(fullName, index)
        }
      }
    })

    if (duplicateNames.length > 0) {
      showSnackbar("Passengers cannot have the same name. Please ensure each passenger has a unique name.")
      return false
    }

    const updatedContracts = [...contracts]
    let firstContractError = null

    updatedContracts.forEach((contract, index) => {
      const errors = validateContract(contract)
      updatedContracts[index] = { ...contract, errors }
      if (!firstContractError) {
        const errKey = Object.keys(errors).find((k) => errors[k])
        if (errKey) firstContractError = errKey
      }
    })

    if (firstContractError) {
      setContracts(updatedContracts)
      showSnackbar(`${formatFieldName(firstContractError)} is required`)
      return false
    }

    return true
  }, [contracts, deliveryFee, dropOffLocation, pickupLocation, validateContract, validateDeliveryAddress, showSnackbar])

  // ================================
  // NOTIFICATION FUNCTIONS
  // ================================

  const notifyAdministrators = useCallback(async (createdContracts, user) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, corporation_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
      }

      let corporationName = 'Unknown Corporation'
      if (profile?.corporation_id) {
        const { data: corporationData, error: corporationError } = await supabase
          .from('profiles_corporation')
          .select('corporation_name')
          .eq('id', profile.corporation_id)
          .single()

        if (!corporationError && corporationData) {
          corporationName = corporationData.corporation_name
        }
      }

      for (const contract of createdContracts) {
        const notificationTitle = `New Booking Created - ${contract.id}`
        const notificationBody = `Booking created by ${profile?.first_name || 'Unknown'} ${profile?.last_name || 'User'} from ${corporationName}. Delivery to: ${contract.delivery_address}`

        const notificationData = {
          contractId: contract.id,
          userId: user.id,
          userName: `${profile?.first_name || 'Unknown'} ${profile?.last_name || 'User'}`,
          corporationName,
          deliveryAddress: contract.delivery_address,
          addressLine1: contract.address_line_1,
          addressLine2: contract.address_line_2,
          ownerName: `${contract.owner_first_name} ${contract.owner_middle_initial || ''} ${contract.owner_last_name}`.trim(),
          ownerContact: contract.owner_contact,
          flightNumber: contract.flight_number,
          luggageQuantity: contract.luggage_quantity,
          deliveryCharge: contract.delivery_charge
        }

        await sendNotificationAdmin(notificationTitle, notificationBody, notificationData)
      }
    } catch (error) {
      console.error('Failed to send notifications to administrators:', error)
    }
  }, [])

  // ================================
  // SUBMISSION FUNCTIONS
  // ================================

  const handleConfirmSubmit = useCallback(async () => {
    try {
      setLoading(true)
      setShowConfirmationModal(false)

      if (!validateForm()) {
        setLoading(false)
        return
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      const contractPromises = contracts.map(async (contract) => {
        // Generate unique tracking ID (with collision checks)
        let trackingID
        let collisionCheck = false
        let attempts = 0
        do {
          trackingID = generateTrackingID()
          attempts += 1

          const { data: existing, error: checkError } = await supabase
            .from('contracts')
            .select('id')
            .eq('id', trackingID)

          if (checkError) throw checkError
          collisionCheck = Array.isArray(existing) && existing.length > 0

          if (attempts > 10) {
            throw new Error('Failed to generate unique tracking ID after multiple attempts')
          }
        } while (collisionCheck)

        // Resolve address fields (use current address fields)
        const prov = province || contract.province || ''
        const city = cityMunicipality || contract.cityMunicipality || ''
        const brgy = barangay || contract.barangay || ''
        const pcode = postalCode || contract.postalCode || ''
        const st = street || contract.street || ''
        const vb = villageBuilding || contract.villageBuilding || ''
        const rno = roomUnitNo || contract.roomUnitNo || ''
        const lmk = landmarkEntrance || contract.landmarkEntrance || ''

        const combinedDeliveryAddress = `${prov}, ${city}, ${brgy}, ${pcode}`.replace(/\s*,\s*,/g, ',').trim()
        const combinedAddressLine1 = [st, vb].filter(Boolean).join(', ').trim()
        const combinedAddressLine2 = [rno, lmk].filter(Boolean).join(', ').trim()

        // Resolve pickup geo based on selected terminal
        const selectedTerminalLabel = selectedTerminal || (pickupLocation?.split(',')?.[0]?.trim() || null)
        const terminalMeta = terminalOptions.find(t => t.label === selectedTerminalLabel) || null
        const pickupGeoPoint = terminalMeta ? `POINT(${terminalMeta.lng} ${terminalMeta.lat})` : null

        const contractData = {
          id: trackingID,
          airline_id: user.id,
          owner_first_name: contract.firstName,
          owner_middle_initial: contract.middleInitial,
          owner_last_name: contract.lastName,
          owner_contact: formatContactNumber(contract.contact),
          luggage_description: Array.isArray(contract.itemDescriptions)
          ? contract.itemDescriptions.filter(d => d && d.trim() !== '').join('\n')
          : String(contract.itemDescription || '').trim(),
          luggage_quantity: contract.quantity,
          flight_number: contract.flightNumber,
          delivery_address: combinedDeliveryAddress,
          address_line_1: combinedAddressLine1,
          address_line_2: combinedAddressLine2,
          pickup_location: pickupLocation,
          pickup_location_geo: pickupGeoPoint,
          drop_off_location: dropOffLocation.location,
          drop_off_location_geo: (dropOffLocation.lng !== null && dropOffLocation.lat !== null) ? `POINT(${dropOffLocation.lng} ${dropOffLocation.lat})` : null,
          delivery_charge: deliveryFee
        }

        const { data: insertedContract, error: contractError } = await supabase
          .from('contracts')
          .insert(contractData)
          .select()
          .single()

        if (contractError) throw contractError
        return insertedContract
      })

      const createdContracts = await Promise.all(contractPromises)
      await notifyAdministrators(createdContracts, user)
      showSnackbar('Contracts created successfully', true)

      // Reset state to defaults
      setDropOffLocation({ location: '', lat: null, lng: null })
      setPickupLocation('')
      setSelectedTerminal(null)
      setSelectedBay(null)
      setContracts([JSON.parse(JSON.stringify(INITIAL_CONTRACT))])

      navigation.navigate('BookingManagement', { screen: 'made' })
    } catch (error) {
      showSnackbar('Error creating contracts: ' + (error?.message || String(error)))
      console.error('handleConfirmSubmit error:', error)
    } finally {
      setLoading(false)
    }
  }, [
    contracts,
    deliveryFee,
    pickupLocation,
    dropOffLocation,
    province,
    cityMunicipality,
    barangay,
    postalCode,
    street,
    villageBuilding,
    roomUnitNo,
    landmarkEntrance,
    notifyAdministrators,
    navigation,
    validateForm,
    showSnackbar
  ])

  // ================================
  // PRICING FUNCTIONS
  // ================================

  const fetchDeliveryPrice = async (address) => {
    try {
      const { data: pricingList, error } = await supabase
        .from('pricing')
        .select('city, price')

      if (error) throw error

      if (!Array.isArray(pricingList) || pricingList.length === 0) {
        setDeliveryFee(0)
        showSnackbar('No pricing data available')
        return
      }

      const normalizedAddress = String(address || '').toLowerCase()

      const matched = pricingList.find(entry =>
        normalizedAddress.includes(String(entry.city || '').toLowerCase())
      )

      if (matched) {
        setDeliveryFee(Number(matched.price) || 0)
      } else {
        setDeliveryFee(0)
        showSnackbar('The selected address is either invalid or out of bounds')
      }
    } catch (error) {
      console.error('Error fetching delivery price:', error)
      setDeliveryFee(0)
      showSnackbar('The selected address is either invalid or out of bounds')
    }
  }

  // ================================
  // RENDER HELPER FUNCTIONS
  // ================================

  const renderDropOffLocation = useMemo(() => (
    <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
      <View style={styles.locationHeader}>
        <Text style={[fonts.titleMedium, { color: colors.primary }]}>Drop-Off Location Pin</Text>
      </View>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('SelectLocation')}
            icon="map-marker"
            style={{ backgroundColor: colors.primary, alignSelf: 'center', marginBottom: 8, paddingVertical: 6 }}
            contentStyle={{ height: 36 }}
          >
            Select Location
          </Button>

      {dropOffLocation.location ? (
        <View style={[styles.locationContent, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>{dropOffLocation.location}</Text>
          <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
            Coordinates: {dropOffLocation.lat?.toFixed(6)}, {dropOffLocation.lng?.toFixed(6)}
          </Text>
        </View>
      ) : (
        <View style={[styles.locationContent, { backgroundColor: colors.errorContainer }]}>
          <Text style={[fonts.bodyMedium, { color: colors.error, textAlign: 'center', fontStyle: 'italic' }]}>
            Drop-off location is required to proceed with booking
          </Text>
        </View>
      )}
    </Surface>
  ), [dropOffLocation, colors, fonts, navigation])

  const renderPickupLocation = useMemo(() => (
    <View>
      <TextInput
        label="Pickup Location"
        value={pickupLocation}
        mode="outlined"
        style={{ marginBottom: 16 }}
        error={pickupError}
        editable={false}
      />

      <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'center', minWidth: '100%'}}>
        <Menu
          visible={showTerminalMenu}
          onDismiss={() => setShowTerminalMenu(false)}
          anchor={
            <TouchableOpacity onPress={() => setShowTerminalMenu(((prev) => !prev))} style={{ flex: 1 }}>
              <TextInput
                label="Terminal"
                value={selectedTerminal || ''}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" onPress={() => setShowTerminalMenu(((prev) => !prev))} />}
                editable={false}
                style={{ marginBottom: 16 }}
              />
            </TouchableOpacity>
          }
          contentStyle={{ backgroundColor: colors.surface }}
        >
          {terminalOptions.map((t) => (
            <Menu.Item
              key={t.label}
              onPress={() => {
                setSelectedTerminal(t.label)
                setShowTerminalMenu(false)
              }}
              title={t.label}
            />
          ))}
        </Menu>

        <Menu
          visible={showBayMenu}
          onDismiss={() => setShowBayMenu(false)}
          anchor={
            <TouchableOpacity onPress={() => selectedTerminal && setShowBayMenu(((prev) => !prev))} style={{ flex: 1 }}>
              <TextInput
                label="Bay"
                value={selectedBay || ''}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" onPress={() => selectedTerminal && setShowBayMenu(((prev) => !prev))} />}
                editable={false}
                style={{ marginBottom: 16 }}
                disabled={!selectedTerminal}
              />
            </TouchableOpacity>
          }
          contentStyle={{ backgroundColor: colors.surface }}
        >
          {pickupBays.map((bay) => (
            <Menu.Item
              key={bay}
              onPress={() => {
                setSelectedBay(bay)
                setShowBayMenu(false)
              }}
              title={bay}
            />
          ))}
        </Menu>
      </View>
    </View>
  ), [pickupLocation, pickupError, showTerminalMenu, showBayMenu, selectedTerminal, selectedBay, terminalOptions, pickupBays, colors])

  // ================================
  // MAIN RENDER
  // ================================

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {SnackbarElement}
        <View style={styles.content}>
          {renderDropOffLocation}
        {deliveryFee > 0 && dropOffLocation.location && (
          <Surface style={[styles.warningSurface, { backgroundColor: colors.primaryContainer }]} elevation={1}>
            <View style={styles.warningContent}>
              <IconButton icon="check-circle" size={24} iconColor={colors.primary} />
              <View style={styles.warningText}>
                <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 4 }]}>Delivery Fee Applied</Text>
                <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.onPrimaryContainer }]}>Base Delivery Fee: ₱{deliveryFee.toFixed(2)}</Text>
                <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.onPrimaryContainer }]}>
                  Total Delivery Fee: ₱{totalDeliveryFee.toFixed(2)}
                </Text>
                <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.onPrimaryContainer }]}>
                  Total Luggage Quantity: {totalLuggageQuantity} ({Math.ceil(totalLuggageQuantity / 3)} sets of 3)
                </Text>
                <Text style={[fonts.bodySmall, { color: colors.onPrimaryContainer, fontStyle: 'italic' }]}>
                  Note: Delivery is charged per set of 3 luggages per head.
                </Text>
              </View>
            </View>
          </Surface>
        )}
        {deliveryFee <= 0 && dropOffLocation.location && (
          <Surface style={[styles.warningSurface, { backgroundColor: colors.errorContainer }]} elevation={1}>
            <View style={styles.warningContent}>
              <IconButton icon="alert-circle" size={24} iconColor={colors.error} />
              <View style={styles.warningText}>
                <Text style={[fonts.titleSmall, { color: colors.error, marginBottom: 4 }]}>Delivery Fee Unavailable</Text>
                <Text style={[fonts.bodyMedium, { color: colors.onErrorContainer }]}>
                  The selected drop-off location is either invalid or out of bounds. Please select a valid one to proceed.
                </Text>
              </View>
            </View>
          </Surface>
        )}
        <Surface style={[styles.surface, { padding: 16, marginBottom: 16, backgroundColor: colors.surface }]} elevation={1}>
          {renderPickupLocation}

          <LocationAutofill
            onLocationChange={handleLocationChange}
            initialValues={{
              region: locationSelections.region?.name || '',
              province: locationSelections.province?.name || '',
              city: locationSelections.city?.name || '',
              barangay: locationSelections.barangay?.name || '',
              postalCode: postalCode || '',
            }}
            disabled={!dropOffLocation.location || deliveryFee <= 0}
            errors={addressErrors}
          />

          <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 8 }]}>Address Line 1</Text>
          <TextInput 
            label="Street*" 
            value={street} 
            onChangeText={setStreet} 
            mode="outlined" 
            style={{ marginBottom: 12 }} 
            error={addressErrors.street}
            disabled={!dropOffLocation.location || deliveryFee <= 0}
          />
          <TextInput 
            label="Village/Building*" 
            value={villageBuilding} 
            onChangeText={setVillageBuilding} 
            mode="outlined" 
            style={{ marginBottom: 12 }} 
            error={addressErrors.villageBuilding}
            disabled={!dropOffLocation.location || deliveryFee <= 0}
          />

          <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 8 }]}>Address Line 2</Text>
          <TextInput 
            label="Room/Unit No. (Optional)" 
            value={roomUnitNo} 
            onChangeText={setRoomUnitNo} 
            mode="outlined" 
            style={{ marginBottom: 12 }}
            disabled={!dropOffLocation.location || deliveryFee <= 0}
          />
          <TextInput 
            label="Landmark / Entrance (Optional)" 
            value={landmarkEntrance} 
            onChangeText={setLandmarkEntrance} 
            mode="outlined" 
            multiline 
            numberOfLines={2} 
            style={{ marginBottom: 12 }}
            disabled={!dropOffLocation.location || deliveryFee <= 0}
          />
          <Button
            mode="outlined"
            onPress={clearAllSelections}
            icon="broom"
            disabled={!hasSelections}
          >
            Clear All Addresses
          </Button>
        </Surface>

        {contracts.map((contract, index) => {
          // Check if this contract has a duplicate name
          const currentName = `${contract.firstName?.trim()} ${contract.lastName?.trim()}`.toLowerCase()
          const hasDuplicateName = currentName.trim() && currentName !== ' ' && 
            contracts.some((otherContract, otherIndex) => 
              otherIndex !== index && 
              `${otherContract.firstName?.trim()} ${otherContract.lastName?.trim()}`.toLowerCase() === currentName
            )

          return (
            <ContractForm
              key={index}
              contract={contract}
              index={index}
              onInputChange={handleInputChange}
              onClear={clearSingleContract}
              onDelete={deleteContract}
              isLastContract={contracts.length === 1}
              isDisabled={!dropOffLocation.location || deliveryFee <= 0}
              flightPrefixes={flightPrefixes}
              isFixedCorporation={userRoleId === 3}
              fixedPrefix={fixedPrefix}
              hasDuplicateName={hasDuplicateName}
            />
          )
        })}

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={addContract}
            icon="plus"
            disabled={!dropOffLocation.location || deliveryFee <= 0 || contracts.length >= 15}
          >
            Add Passenger
          </Button>

          <Button
            mode="contained"
            onPress={() => setShowConfirmationModal(true)}
            loading={loading}
            disabled={loading || !dropOffLocation.location || deliveryFee <= 0}
            icon="send"
          >
            Create Contracts
          </Button>
        </View>
        </View>
      </ScrollView>

      {/* Sticky compact delivery fee bar */}
      {dropOffLocation.location && (
        deliveryFee > 0 ? (
          <View style={[styles.stickyFeeBar, { backgroundColor: colors.primaryContainer }]}>
            <View style={styles.stickyCol}>
              <Text style={[fonts.titleSmall, { color: colors.primary }]}>Base</Text>
              <Text style={[fonts.bodySmall, { color: colors.onPrimaryContainer }]}>₱{deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.stickyCol}>
              <Text style={[fonts.titleSmall, { color: colors.primary }]}>Total</Text>
              <Text style={[fonts.bodySmall, { color: colors.onPrimaryContainer }]}>₱{totalDeliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.stickyCol}>
              <Text style={[fonts.titleSmall, { color: colors.primary }]}>Luggages</Text>
              <Text style={[fonts.bodySmall, { color: colors.onPrimaryContainer }]}>{totalLuggageQuantity} ({Math.ceil(totalLuggageQuantity / 3)})</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.stickyFeeBar, { backgroundColor: colors.errorContainer }]}>
            <Text style={[fonts.bodySmall, { color: colors.onErrorContainer }]}>Delivery fee unavailable for selected location</Text>
          </View>
        )
      )}

      <BottomModal visible={showConfirmationModal} onDismiss={() => setShowConfirmationModal(false)}>
        <View style={styles.confirmationContent}>
          <Text style={[fonts.titleLarge, { color: colors.primary, marginBottom: 16, textAlign: "center" }]}>Confirm Contract Creation</Text>

          <View style={[styles.confirmationDetails, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: "bold" }}>Number of Contracts:</Text> {contracts.length}
            </Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: "bold" }}>Pickup Location:</Text> {pickupLocation}
            </Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: "bold" }}>Drop-off Location:</Text> {dropOffLocation.location}
            </Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: "bold" }}>Total Delivery Fee:</Text> ₱{totalDeliveryFee.toFixed(2)}
            </Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: "bold" }}>Total Luggage Quantity:</Text> {totalLuggageQuantity}
            </Text>
          </View>

          <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: 24, textAlign: "center", fontStyle: "italic" }]}>
            Are you sure you want to proceed with creating these contracts?
          </Text>

          <View style={styles.confirmationButtons}>
            <Button mode="outlined" onPress={() => setShowConfirmationModal(false)} style={{ flex: 1, marginRight: 8 }} disabled={loading}>Cancel</Button>
            <Button mode="contained" onPress={handleConfirmSubmit} loading={loading} style={{ flex: 1, marginLeft: 8 }} icon="check">Create</Button>
          </View>
        </View>
      </BottomModal>
    </View>
  )
}

// ================================
// STYLES
// ================================

const styles = StyleSheet.create({
  // Layout & Container Styles
  container: { 
    flex: 1 
  },
  content: { 
    padding: 10 
  },
  surface: { 
    padding: 10, 
    borderRadius: 6, 
    marginBottom: 10 
  },

  // Contract Form Styles
  luggageBlock: {
    marginBottom: 12,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionContent: { 
    paddingHorizontal: 8, 
    paddingBottom: 8 
  },

  // Form Field Styles
  nameRow: { 
    flexDirection: 'row', 
    marginBottom: 12 
  },
  nameField: { 
    flex: 1 
  },
  middleInitialField: { 
    width: 80 
  },
  addressRow: { 
    flexDirection: 'row', 
    marginBottom: 12 
  },
  addressField: { 
    flex: 1 
  },
  duplicateWarning: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
  },

  luggageDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 6,
    borderRadius: 1,
  },

  // Location & Map Styles
  locationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  locationContent: { 
    padding: 12, 
    borderRadius: 8 
  },
  map: { 
    width: '100%', 
    height: 400, 
    borderRadius: 8 
  },
  mapHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  mapControls: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  dropoffContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderRadius: 4, 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    marginBottom: 16 
  },

  // Warning & Status Styles
  warningSurface: { 
    padding: 10, 
    borderRadius: 6, 
    marginBottom: 10 
  },
  warningContent: { 
    flexDirection: 'row', 
    alignItems: 'flex-start' 
  },
  warningText: { 
    flex: 1, 
    marginLeft: 8 
  },

  // Button & Action Styles
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 6, 
    marginTop: 12, 
    marginBottom: 16 
  },

  // Modal & Confirmation Styles
  confirmationContent: { 
    padding: 12 
  },
  confirmationDetails: { 
    padding: 12, 
    borderRadius: 6, 
    marginBottom: 12 
  },
  confirmationButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },

  // Address Section Styles
  addressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  headerLeft: { 
    flex: 1 
  },
  stickyFeeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: '#e0e0e0'
  },
  stickyCol: {
    alignItems: 'center',
    padding: 10,
  }
})

export default React.memo(Booking)