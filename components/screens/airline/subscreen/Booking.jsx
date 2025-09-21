import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme, TextInput, Button, Text, IconButton, Menu, Surface, List } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import BottomModal from '../../../customComponents/BottomModal'
import { sendNotificationAdmin } from '../../../../utils/registerForPushNotifications'

/* ----------------------------- Helpers / Constants ----------------------------- */

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
      return text.replace(/[^A-Za-z0-9ñÑ\s\-\.\,\#\/'’\(\)&]/g, '')
    case 'itemDescription':
      return text.replace(/[^A-Za-z0-9\s\-\.\,\#]/g, '')
    default:
      return text.replace(/[^A-Za-z0-9\s]/g, '')
  }
}

/** Initial contract template */
const INITIAL_CONTRACT = {
  firstName: "",
  middleInitial: "",
  lastName: "",
  contact: "",
  flightNumber: "",
  itemDescription: "",
  itemDescriptions: [],
  quantity: "",
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
  itemDescription: { maxLength: 200, minLength: 6 },
  quantity: { maxLength: 1, minLength: 1 },
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
  flightNumber: /^[A-Z0-9]{3,8}$/,
  postalCode: /^\d{4}$/,
  quantity: /^[1-3]$/,
  province: /^[A-Za-z\s\-\.]+$/,
  cityMunicipality: /^[A-Za-z\s\-\.]+$/,
  barangay: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  street: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  villageBuilding: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  roomUnitNo: /^[A-Za-z0-9\s\-\.\,\#]*$/,
  landmarkEntrance: /^[A-Za-z0-9\s\-\.\,\#]*$/
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

/* ----------------------------- Contract Form (memoized) ----------------------------- */

const ContractForm = React.memo(({
  contract,
  index,
  onInputChange,
  onClear,
  onDelete,
  onDuplicate,
  isLastContract,
  isDisabled
}) => {
  const { colors, fonts } = useTheme()
  const [expanded, setExpanded] = useState({
    personalInfo: false,
    luggageInfo: false,
    deliveryAddress: false,
    addressDetails: false
  })

  const toggle = (section) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }))

  const hasPersonalInfoErrors = contract.errors?.firstName || contract.errors?.lastName || contract.errors?.contact
  const hasLuggageInfoErrors = contract.errors?.itemDescription || contract.errors?.quantity || contract.errors?.flightNumber

  useEffect(() => {
    setExpanded(prev => ({
      ...prev,
      personalInfo: hasPersonalInfoErrors || prev.personalInfo,
      luggageInfo: hasLuggageInfoErrors || prev.luggageInfo
    }))
  }, [contract.errors, hasPersonalInfoErrors, hasLuggageInfoErrors])

  const qty = Math.max(0, Math.min(3, parseInt(contract.quantity || '0') || 0))
  const itemsIdx = Array.from({ length: qty }, (_, i) => i)

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
          <View style={styles.nameRow}>
            <TextInput
              label="First Name*"
              value={contract.firstName}
              onChangeText={(text) => onInputChange(index, "firstName", filterSpecialCharacters(text, 'name'))}
              mode="outlined"
              style={[styles.nameField, { marginRight: 8 }]}
              error={contract.errors?.firstName}
              placeholder="Enter first name (2-50 characters)"
              maxLength={INPUT_LIMITS.firstName.maxLength}
              disabled={isDisabled}
            />
            <TextInput
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
            label="Last Name*"
            value={contract.lastName}
            onChangeText={(text) => onInputChange(index, "lastName", filterSpecialCharacters(text, 'name'))}
            mode="outlined"
            style={{ marginBottom: 12 }}
            error={contract.errors?.lastName}
            placeholder="Enter last name (2-50 characters)"
            maxLength={INPUT_LIMITS.lastName.maxLength}
            disabled={isDisabled}
          />

          <TextInput
            label="Owner's Contact Number*"
            value={contract.contact}
            onChangeText={(text) => onInputChange(index, "contact", filterSpecialCharacters(text, 'contact'))}
            mode="outlined"
            style={{ marginBottom: 12 }}
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
          <TextInput
            label="Flight Number*"
            value={contract.flightNumber}
            onChangeText={(text) => onInputChange(index, "flightNumber", filterSpecialCharacters(text, 'flightNumber').toUpperCase())}
            mode="outlined"
            style={{ marginBottom: 12 }}
            error={contract.errors?.flightNumber}
            maxLength={INPUT_LIMITS.flightNumber.maxLength}
            placeholder="e.g., PR123, 5J1234"
            disabled={isDisabled}
          />

          <TextInput
            label="Luggage Quantity*"
            value={contract.quantity}
            onChangeText={(text) => {
              const filtered = filterSpecialCharacters(text, 'quantity')
              if (filtered === '' || (filtered >= '1' && filtered <= '3')) {
                onInputChange(index, "quantity", filtered)
              }
            }}
            inputMode="numeric"
            mode="outlined"
            style={{ marginBottom: 12 }}
            error={contract.errors?.quantity}
            maxLength={INPUT_LIMITS.quantity.maxLength}
            placeholder="1-3 pieces"
            disabled={isDisabled}
          />

          {itemsIdx.map((i) => (
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
              style={{ marginBottom: 12 }}
              placeholder="Describe the luggage"
              multiline
              numberOfLines={2}
              disabled={isDisabled}
              error={contract.errors?.itemDescription}
            />
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

      <Button
        mode="outlined"
        onPress={() => onDuplicate(index)}
        style={{ marginTop: 8 }}
        icon="content-copy"
        disabled={isDisabled}
      >
        Duplicate Form
      </Button>
    </View>
  )
})

/* ----------------------------- Booking Component ----------------------------- */

const Booking = () => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const navigation = useNavigation()
  const route = useRoute()

  // Location & address states
  const [dropOffLocation, setDropOffLocation] = useState({ location: '', lat: null, lng: null })
  const [lastAddressDetails, setLastAddressDetails] = useState(null)

  // Pickup
  const [pickupLocation, setPickupLocation] = useState('')
  const [showPickupMenu, setShowPickupMenu] = useState(false)
  const [pickupError, setPickupError] = useState(false)

  // Contracts & submission
  const [contracts, setContracts] = useState([JSON.parse(JSON.stringify(INITIAL_CONTRACT))])
  const [loading, setLoading] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  // Address fields (shared across contracts)
  const [province, setProvince] = useState('')
  const [cityMunicipality, setCityMunicipality] = useState('')
  const [barangay, setBarangay] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [street, setStreet] = useState('')
  const [villageBuilding, setVillageBuilding] = useState('')
  const [roomUnitNo, setRoomUnitNo] = useState('')
  const [landmarkEntrance, setLandmarkEntrance] = useState('')

  const [addressErrors, setAddressErrors] = useState({
    province: false,
    cityMunicipality: false,
    barangay: false,
    postalCode: false,
    street: false,
    villageBuilding: false,
  })

  // Derived values
  const totalDeliveryFee = useMemo(() => deliveryFee * contracts.length, [deliveryFee, contracts.length])
  const totalLuggageQuantity = useMemo(() => contracts.reduce((sum, c) => sum + Number(c.quantity || 0), 0), [contracts])

  const pickupBays = useMemo(() => Array.from({ length: 12 }, (_, i) => `Terminal 3, Bay ${i + 1}`), [])

  /* ----------------------------- Effects ----------------------------- */

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

  /* ----------------------------- Contract list operations ----------------------------- */

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

  const duplicateContract = useCallback((index) => {
    setContracts(prev => {
      if (prev.length >= 15) {
        showSnackbar('Maximum of 15 passenger forms reached')
        return prev
      }
      const original = prev[index] || {}
      const cloned = {
        ...original,
        itemDescription: "",
        itemDescriptions: [],
        quantity: "",
        errors: {
          ...(original.errors || {}),
          itemDescription: false,
          quantity: false,
        }
      }
      const updated = [...prev]
      updated.splice(index + 1, 0, cloned)
      return updated
    })
  }, [showSnackbar])
  
  const clearDeliveryAddress = () => {
    setProvince('')
    setCityMunicipality('')
    setBarangay('')
    setPostalCode('')
    setStreet('')
    setVillageBuilding('')
    setRoomUnitNo('')
    setLandmarkEntrance('')
    setAddressErrors({})
  }
  
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
      if (province) prefilled.province = province
      if (cityMunicipality) prefilled.cityMunicipality = cityMunicipality
      if (barangay) prefilled.barangay = barangay
      if (postalCode) prefilled.postalCode = postalCode
      if (street) prefilled.street = street
      if (villageBuilding) prefilled.villageBuilding = villageBuilding
      if (roomUnitNo) prefilled.roomUnitNo = roomUnitNo
      if (landmarkEntrance) prefilled.landmarkEntrance = landmarkEntrance

      // If shared fields empty and lastAddressDetails exists, use that
      if (!province && lastAddressDetails) prefilled.province = lastAddressDetails.region || ''
      if (!cityMunicipality && lastAddressDetails) prefilled.cityMunicipality = lastAddressDetails.city || ''
      if (!barangay && lastAddressDetails) prefilled.barangay = lastAddressDetails.district || ''
      if (!postalCode && lastAddressDetails) prefilled.postalCode = (lastAddressDetails.postalCode || '').replace(/[^0-9]/g, '').slice(0, INPUT_LIMITS.postalCode.maxLength)
      if (!street && lastAddressDetails) prefilled.street = lastAddressDetails.street || ''
      if (!villageBuilding && lastAddressDetails) prefilled.villageBuilding = lastAddressDetails.name || ''

      return [...prev, prefilled]
    })
  }, [lastAddressDetails, province, cityMunicipality, barangay, postalCode, street, villageBuilding, roomUnitNo, landmarkEntrance, showSnackbar])

  /* ----------------------------- Validation ----------------------------- */

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
        trim(contract.flightNumber).length < INPUT_LIMITS.flightNumber.minLength ||
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
      province: !String(province || "").trim(),
      cityMunicipality: !String(cityMunicipality || "").trim(),
      barangay: !String(barangay || "").trim(),
      postalCode: !String(postalCode || "").trim(),
      street: !String(street || "").trim(),
      villageBuilding: !String(villageBuilding || "").trim(),
    }

    setAddressErrors(errors)
    const firstErrorKey = Object.keys(errors).find((k) => errors[k])
    return { valid: !firstErrorKey, firstErrorKey }
  }, [province, cityMunicipality, barangay, postalCode, street, villageBuilding])

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

  /* ----------------------------- Notifications ----------------------------- */

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

  /* ----------------------------- Submission ----------------------------- */

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

        // Resolve address fields (shared above contract or the contract's own)
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

        const contractData = {
          id: trackingID,
          airline_id: user.id,
          owner_first_name: contract.firstName,
          owner_middle_initial: contract.middleInitial,
          owner_last_name: contract.lastName,
          owner_contact: formatContactNumber(contract.contact),
          luggage_description: contract.itemDescriptions && contract.itemDescriptions.length > 0 ? contract.itemDescriptions.join('\n') : contract.itemDescription,
          luggage_quantity: contract.quantity,
          flight_number: contract.flightNumber,
          delivery_address: combinedDeliveryAddress,
          address_line_1: combinedAddressLine1,
          address_line_2: combinedAddressLine2,
          pickup_location: pickupLocation,
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

  /* ----------------------------- Pricing ----------------------------- */

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

  /* ----------------------------- Render helpers ----------------------------- */

  const renderDropOffLocation = useMemo(() => (
    <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
      <View style={styles.locationHeader}>
        <Text style={[fonts.titleMedium, { color: colors.primary }]}>Drop-Off Location Pin</Text>
      </View>

      <Button
        mode="contained"
        onPress={() => navigation.navigate('SelectLocation')}
        icon="map-marker"
        style={{ backgroundColor: colors.primary, alignSelf: 'center', marginBottom: 10 }}
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
    <Menu
      visible={showPickupMenu}
      onDismiss={() => setShowPickupMenu(false)}
      anchor={
        <TouchableOpacity onPress={() => setShowPickupMenu(true)}>
          <TextInput
            label="Pickup Location"
            value={pickupLocation}
            mode="outlined"
            style={{ marginBottom: 16 }}
            right={<TextInput.Icon icon="menu-down" onPress={() => setShowPickupMenu(true)} />}
            error={pickupError}
            editable={false}
          />
        </TouchableOpacity>
      }
      contentStyle={{ backgroundColor: colors.surface }}
    >
      {pickupBays.map((bay) => (
        <Menu.Item
          key={bay}
          onPress={() => {
            setPickupLocation(bay)
            setShowPickupMenu(false)
            setPickupError(false)
          }}
          title={bay}
        />
      ))}
    </Menu>
  ), [showPickupMenu, pickupLocation, pickupError, pickupBays, colors])

  /* ----------------------------- JSX ----------------------------- */

  return (
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
                <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.onPrimaryContainer }]}>Total Delivery Fee ({contracts.length} passengers): ₱{totalDeliveryFee.toFixed(2)}</Text>
                <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.onPrimaryContainer }]}>Total Luggage Quantity: {totalLuggageQuantity}</Text>
              </View>
            </View>
          </Surface>
        )}
        <Surface style={[styles.surface, { padding: 16, marginBottom: 16, backgroundColor: colors.surface }]} elevation={1}>
          {renderPickupLocation}

          <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 8 }]}>Delivery Address</Text>

          <TextInput label="Province*" value={province} onChangeText={setProvince} mode="outlined" style={{ marginBottom: 12 }} error={addressErrors.province} />
          <TextInput label="City/Municipality*" value={cityMunicipality} onChangeText={setCityMunicipality} mode="outlined" style={{ marginBottom: 12 }} error={addressErrors.cityMunicipality} />
          <TextInput label="Barangay*" value={barangay} onChangeText={setBarangay} mode="outlined" style={{ marginBottom: 12 }} error={addressErrors.barangay} />
          <TextInput
            label="Postal Code*"
            value={postalCode}
            onChangeText={(v) => setPostalCode(filterSpecialCharacters(v, "postalCode").slice(0, INPUT_LIMITS.postalCode.maxLength))}
            mode="outlined"
            style={{ marginBottom: 12 }}
            keyboardType="numeric"
            error={addressErrors.postalCode}
          />

          <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 8 }]}>Address Line 1</Text>
          <TextInput label="Street*" value={street} onChangeText={setStreet} mode="outlined" style={{ marginBottom: 12 }} error={addressErrors.street} />
          <TextInput label="Village/Building*" value={villageBuilding} onChangeText={setVillageBuilding} mode="outlined" style={{ marginBottom: 12 }} error={addressErrors.villageBuilding} />

          <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 8 }]}>Address Line 2</Text>
          <TextInput label="Room/Unit No. (Optional)" value={roomUnitNo} onChangeText={setRoomUnitNo} mode="outlined" style={{ marginBottom: 12 }} />
          <TextInput label="Landmark / Entrance (Optional)" value={landmarkEntrance} onChangeText={setLandmarkEntrance} mode="outlined" multiline numberOfLines={2} style={{ marginBottom: 12 }} />
          <Button
            mode="outlined"
            onPress={clearDeliveryAddress}
            icon="broom"
          >
            Clear Address
          </Button>
        </Surface>
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

        {contracts.map((contract, index) => (
          <ContractForm
            key={index}
            contract={contract}
            index={index}
            onInputChange={handleInputChange}
            onClear={clearSingleContract}
            onDelete={deleteContract}
            onDuplicate={duplicateContract}
            isLastContract={contracts.length === 1}
            isDisabled={!dropOffLocation.location || deliveryFee <= 0}
          />
        ))}

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
    </ScrollView>
  )
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  luggageBlock: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: { flex: 1 },
  addressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nameRow: { flexDirection: 'row', marginBottom: 12 },
  nameField: { flex: 1 },
  middleInitialField: { width: 80 },
  addressRow: { flexDirection: 'row', marginBottom: 12 },
  addressField: { flex: 1 },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 24, marginBottom: 32 },
  surface: { padding: 16, borderRadius: 8, marginBottom: 16 },
  map: { width: '100%', height: 400, borderRadius: 8 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dropoffContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 16 },
  mapControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  locationContent: { padding: 12, borderRadius: 8 },
  warningSurface: { padding: 16, borderRadius: 8, marginBottom: 16 },
  warningContent: { flexDirection: 'row', alignItems: 'flex-start' },
  warningText: { flex: 1, marginLeft: 8 },
  confirmationContent: { padding: 16 },
  confirmationDetails: { padding: 16, borderRadius: 8, marginBottom: 16 },
  confirmationButtons: { flexDirection: 'row', justifyContent: 'space-between' },
})

export default React.memo(Booking)