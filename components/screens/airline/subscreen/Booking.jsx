import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme, TextInput, Button, Text, IconButton, Menu, Surface } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import BottomModal from '../../../customComponents/BottomModal'

// Utility function to filter special characters based on field type
const filterSpecialCharacters = (text, fieldType) => {
  switch (fieldType) {
    case 'name':
      // Allow only letters, spaces, hyphens, and apostrophes for names
      return text.replace(/[^A-Za-z\s\-']/g, '')
    case 'contact':
      // Allow only digits for contact numbers
      return text.replace(/[^0-9]/g, '')
    case 'flightNumber':
      // Allow only letters and numbers for flight numbers
      return text.replace(/[^A-Za-z0-9]/g, '')
    case 'caseNumber':
      // Allow only letters and numbers for case numbers
      return text.replace(/[^A-Za-z0-9]/g, '')
    case 'postalCode':
      // Allow only digits for postal codes
      return text.replace(/[^0-9]/g, '')
    case 'weight':
    case 'quantity':
      // Allow only digits for weight and quantity
      return text.replace(/[^0-9]/g, '')
    case 'address':
      // Allow letters, numbers, spaces, hyphens, dots, commas, hash for addresses
      return text.replace(/[^A-Za-z0-9\s\-\.\,\#]/g, '')
    case 'itemDescription':
      // Allow letters, numbers, spaces, hyphens, dots, commas for item descriptions
      return text.replace(/[^A-Za-z0-9\s\-\.\,\#]/g, '')
    default:
      // Default: allow only letters and numbers
      return text.replace(/[^A-Za-z0-9\s]/g, '')
  }
}

// Constants
const INITIAL_CONTRACT = {
  caseNumber: "",
  firstName: "",
  middleInitial: "",
  lastName: "",
  contact: "",
  flightNumber: "",
  itemDescription: "",
  weight: "",
  quantity: "",
  deliveryAddress: "",
  addressLine1: "",
  addressLine2: "",
  // Separate address fields
  province: "",
  cityMunicipality: "",
  barangay: "",
  postalCode: "",
  errors: {
    caseNumber: false,
    firstName: false,
    lastName: false,
    contact: false,
    flightNumber: false,
    itemDescription: false,
    weight: false,
    quantity: false,
    addressLine1: false,
    // Error fields for separate address components
    province: false,
    cityMunicipality: false,
    barangay: false,
    postalCode: false
  }
}

// Input validation constants
const INPUT_LIMITS = {
  firstName: { maxLength: 50, minLength: 2 },
  middleInitial: { maxLength: 1 },
  lastName: { maxLength: 50, minLength: 2 },
  contact: { maxLength: 10, minLength: 10 },
  flightNumber: { maxLength: 6, minLength: 3 },
  itemDescription: { maxLength: 200, minLength: 6 },
  weight: { maxLength: 2, minLength: 1 },
  quantity: { maxLength: 1, minLength: 1 },
  caseNumber: { maxLength: 10, minLength: 6 },
  province: { maxLength: 50, minLength: 2 },
  cityMunicipality: { maxLength: 50, minLength: 2 },
  barangay: { maxLength: 50, minLength: 2 },
  postalCode: { maxLength: 4, minLength: 4 },
  addressLine1: { maxLength: 100, minLength: 5 },
  addressLine2: { maxLength: 50 }
}

// Validation patterns
const VALIDATION_PATTERNS = {
  contact: /^9\d{9}$/, // Must start with 9 and be exactly 10 digits
  flightNumber: /^[A-Z0-9]{3,6}$/, // Alphanumeric, 3-6 characters
  caseNumber: /^[A-Z0-9]{6,10}$/, // Alphanumeric, 6-10 characters (updated range)
  postalCode: /^\d{4}$/, // Exactly 4 digits
  weight: /^([1-9]|1[0-9]|20)$/, // 1-20
  quantity: /^[1-8]$/, // 1-8
  // Address validation patterns
  province: /^[A-Za-z\s\-\.]+$/, // Letters, spaces, hyphens, dots
  cityMunicipality: /^[A-Za-z\s\-\.]+$/, // Letters, spaces, hyphens, dots
  barangay: /^[A-Za-z\s\-\.]+$/, // Letters, spaces, hyphens, dots
  addressLine1: /^[A-Za-z0-9\s\-\.\,\#]+$/, // Letters, numbers, spaces, hyphens, dots, commas, hash
  addressLine2: /^[A-Za-z0-9\s\-\.\,\#]*$/ // Optional: Letters, numbers, spaces, hyphens, dots, commas, hash
}

  // Memoized Contract Form Component
const ContractForm = React.memo(({ contract, index, onInputChange, onClear, onDelete, isLastContract, isDisabled }) => {
  const { colors, fonts } = useTheme()

  return (
    <View style={[styles.luggageBlock, { backgroundColor: colors.surface, borderColor: colors.primary, opacity: isDisabled ? 0.6 : 1 }]}>
      <View style={styles.headerContainer}>
        <Text style={[fonts.titleMedium, { color: colors.primary }]}>
          Passenger {index + 1}
        </Text>
        <IconButton
          icon="close"
          size={20}
          onPress={() => onDelete(index)}
          style={{ margin: 0 }}
          disabled={isLastContract || isDisabled}
          iconColor={isLastContract ? colors.disabled : colors.error}
        />
      </View>
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
        placeholder="9xxxxxxxxx (10 digits)"
        disabled={isDisabled}
      />
      <TextInput
        label="Luggage Description*"
        value={contract.itemDescription}
        onChangeText={(text) => onInputChange(index, "itemDescription", filterSpecialCharacters(text, 'itemDescription'))}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.itemDescription}
        placeholder="Describe the luggage contents (6-200 characters)"
        multiline
        numberOfLines={2}
        maxLength={INPUT_LIMITS.itemDescription.maxLength}
        disabled={isDisabled}
      />
      <TextInput
        label="Weight (kg)*"
        value={contract.weight}
        onChangeText={(text) => onInputChange(index, "weight", filterSpecialCharacters(text, 'weight'))}
        inputMode="numeric"
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.weight}
        maxLength={INPUT_LIMITS.weight.maxLength}
        placeholder="1-20 kg"
        disabled={isDisabled}
      />
      <TextInput
        label="Quantity*"
        value={contract.quantity}
        onChangeText={(text) => onInputChange(index, "quantity", filterSpecialCharacters(text, 'quantity'))}
        inputMode="numeric"
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.quantity}
        maxLength={INPUT_LIMITS.quantity.maxLength}
        placeholder="1-8 pieces"
        disabled={isDisabled}
      />
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
        label="Case Number*"
        value={contract.caseNumber}
        onChangeText={(text) => onInputChange(index, "caseNumber", filterSpecialCharacters(text, 'caseNumber').toUpperCase())}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.caseNumber}
        maxLength={INPUT_LIMITS.caseNumber.maxLength}
        inputMode="text"
        placeholder='XXXXXXXX (6-10 characters)'
        disabled={isDisabled}
      />
              <View style={styles.addressSection}>
        <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 8 }]}>
          Delivery Address
        </Text>
        <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant, marginBottom: 12, fontStyle: 'italic' }]}>
          Please provide complete and accurate delivery information
        </Text>
        
        <View style={styles.addressRow}>
          <TextInput
            label="Province*"
            value={contract.province}
            onChangeText={(text) => onInputChange(index, "province", filterSpecialCharacters(text, 'address'))}
            mode="outlined"
            style={[styles.addressField, { marginRight: 8 }]}
            error={contract.errors?.province}
            placeholder="e.g., Metro Manila (2-50 characters)"
            maxLength={INPUT_LIMITS.province.maxLength}
            autoCapitalize="words"
            disabled={isDisabled}
          />
          <TextInput
            label="City/Municipality*"
            value={contract.cityMunicipality}
            onChangeText={(text) => onInputChange(index, "cityMunicipality", filterSpecialCharacters(text, 'address'))}
            mode="outlined"
            style={styles.addressField}
            error={contract.errors?.cityMunicipality}
            placeholder="e.g., Manila (2-50 characters)"
            maxLength={INPUT_LIMITS.cityMunicipality.maxLength}
            autoCapitalize="words"
            disabled={isDisabled}
          />
        </View>
        
        <View style={styles.addressRow}>
          <TextInput
            label="Barangay*"
            value={contract.barangay}
            onChangeText={(text) => onInputChange(index, "barangay", filterSpecialCharacters(text, 'address'))}
            mode="outlined"
            style={[styles.addressField, { marginRight: 8 }]}
            error={contract.errors?.barangay}
            placeholder="e.g., Tondo (2-50 characters)"
            maxLength={INPUT_LIMITS.barangay.maxLength}
            autoCapitalize="words"
            disabled={isDisabled}
          />
          <TextInput
            label="Postal Code*"
            value={contract.postalCode}
            onChangeText={(text) => onInputChange(index, "postalCode", filterSpecialCharacters(text, 'postalCode'))}
            mode="outlined"
            style={styles.addressField}
            error={contract.errors?.postalCode}
            placeholder="e.g., 1012 (4 digits)"
            keyboardType="numeric"
            maxLength={INPUT_LIMITS.postalCode.maxLength}
            inputMode="numeric"
            disabled={isDisabled}
          />
        </View>
        
        <TextInput
          label="Village/Building*"
          value={contract.addressLine1}
          onChangeText={(text) => onInputChange(index, "addressLine1", filterSpecialCharacters(text, 'address'))}
          mode="outlined"
          style={{ marginBottom: 12 }}
          error={contract.errors?.addressLine1}
          placeholder="e.g., SM Mall of Asia, Greenbelt Tower (5-100 characters)"
          maxLength={INPUT_LIMITS.addressLine1.maxLength}
          autoCapitalize="words"
          multiline
          numberOfLines={2}
          disabled={isDisabled}
        />
        <TextInput
          label="Room/Unit No. (Optional)"
          value={contract.addressLine2}
          onChangeText={(text) => onInputChange(index, "addressLine2", filterSpecialCharacters(text, 'address'))}
          mode="outlined"
          style={{ marginBottom: 12 }}
          placeholder="e.g., Unit 1234, Room 567 (max 50 characters)"
          maxLength={INPUT_LIMITS.addressLine2.maxLength}
          autoCapitalize="words"
          error={contract.addressLine2 && !VALIDATION_PATTERNS.addressLine2.test(contract.addressLine2)}
          disabled={isDisabled}
        />
      </View>
      
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

const MakeContracts = () => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const navigation = useNavigation()
  const route = useRoute()
  
  // State
  const [dropOffLocation, setDropOffLocation] = useState({
    location: '',
    lat: null,
    lng: null
  })
  const [pickupLocation, setPickupLocation] = useState('')
  const [showPickupMenu, setShowPickupMenu] = useState(false)
  const [contracts, setContracts] = useState([INITIAL_CONTRACT])
  const [loading, setLoading] = useState(false)
  const [pickupError, setPickupError] = useState(false)
  const [dropOffError, setDropOffError] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  // Reset form when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setContracts([{ ...INITIAL_CONTRACT }])
    }, [])
  )

  // Calculate total delivery fee based on number of contracts
  const totalDeliveryFee = useMemo(() => {
    return deliveryFee * contracts.length;
  }, [deliveryFee, contracts.length]);

  // Update drop-off location when returning from SelectLocation
  useFocusEffect(
    useCallback(() => {
      if (route.params?.locationData) {
        const { drop_off_location, drop_off_location_geo, city } = route.params.locationData
        // Extract coordinates from POINT format
        const match = drop_off_location_geo.match(/POINT\(([\d.-]+) ([\d.-]+)\)/)
        if (match) {
          const [_, lng, lat] = match
          setDropOffLocation({
            location: drop_off_location,
            lat: parseFloat(lat),
            lng: parseFloat(lng)
          })
          // Extract city from drop-off location and fetch price
          fetchDeliveryPrice(route.params?.locationData.drop_off_location)
        }
      }
    }, [route.params])
  )

  // Memoized values
  const pickupBays = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => `Terminal 3, Bay ${i + 1}`),
    []
  )

  const totalLuggageQuantity = useMemo(() => 
    contracts.reduce((sum, contract) => sum + Number(contract.quantity || 0), 0),
    [contracts]
  )

  // Event Handlers
  const handleInputChange = useCallback((index, field, value) => {
    setContracts(prev => {
      const updated = [...prev]
      
      updated[index][field] = value
      if (updated[index].errors) {
        updated[index].errors[field] = false
      }
      return updated
    })
  }, [])

  const clearSingleContract = useCallback((index) => {
    setContracts(prev => {
      const updated = [...prev]
      updated[index] = {
        caseNumber: "",
        firstName: "",
        middleInitial: "",
        lastName: "",
        contact: "",
        flightNumber: "",
        itemDescription: "",
        weight: "",
        quantity: "",
        deliveryAddress: "",
        addressLine1: "",
        addressLine2: "",
        // Separate address fields
        province: "",
        cityMunicipality: "",
        barangay: "",
        postalCode: "",
        errors: {
          caseNumber: false,
          firstName: false,
          lastName: false,
          contact: false,
          flightNumber: false,
          itemDescription: false,
          weight: false,
          quantity: false,
          addressLine1: false,
          // Error fields for separate address components
          province: false,
          cityMunicipality: false,
          barangay: false,
          postalCode: false
        }
      }
      return updated
    })
  }, [])

  const deleteContract = useCallback((index) => {
    if (contracts.length === 1) {
      showSnackbar('At least one delivery information form is required')
      return
    }
    setContracts(prev => prev.filter((_, i) => i !== index))
  }, [contracts.length, showSnackbar])

  const addContract = useCallback(() => {
    setContracts(prev => [...prev, {
      caseNumber: "",
      firstName: "",
      middleInitial: "",
      lastName: "",
      contact: "",
      flightNumber: "",
      itemDescription: "",
      weight: "",
      quantity: "",
      deliveryAddress: "",
      addressLine1: "",
      addressLine2: "",
      // Separate address fields
      province: "",
      cityMunicipality: "",
      barangay: "",
      postalCode: "",
      errors: {
        caseNumber: false,
        firstName: false,
        lastName: false,
        contact: false,
        flightNumber: false,
        itemDescription: false,
        weight: false,
        quantity: false,
        addressLine1: false,
        // Error fields for separate address components
        province: false,
        cityMunicipality: false,
        barangay: false,
        postalCode: false
      }
    }])
  }, [])

  const validateContract = useCallback((contract) => {
    return {
      caseNumber: !contract.caseNumber.trim() || 
                  contract.caseNumber.length < INPUT_LIMITS.caseNumber.minLength ||
                  !VALIDATION_PATTERNS.caseNumber.test(contract.caseNumber),
      firstName: !contract.firstName.trim() || 
                 contract.firstName.length < INPUT_LIMITS.firstName.minLength ||
                 contract.firstName.length > INPUT_LIMITS.firstName.maxLength,
      lastName: !contract.lastName.trim() || 
                contract.lastName.length < INPUT_LIMITS.lastName.minLength ||
                contract.lastName.length > INPUT_LIMITS.lastName.maxLength,
      contact: !contract.contact.trim() || 
               !VALIDATION_PATTERNS.contact.test(contract.contact),
      flightNumber: !contract.flightNumber.trim() || 
                    contract.flightNumber.length < INPUT_LIMITS.flightNumber.minLength ||
                    !VALIDATION_PATTERNS.flightNumber.test(contract.flightNumber),
      itemDescription: !contract.itemDescription.trim() || 
                       contract.itemDescription.length < INPUT_LIMITS.itemDescription.minLength ||
                       contract.itemDescription.length > INPUT_LIMITS.itemDescription.maxLength,
      weight: !contract.weight.trim() || 
              !VALIDATION_PATTERNS.weight.test(contract.weight),
      quantity: !contract.quantity.trim() || 
                !VALIDATION_PATTERNS.quantity.test(contract.quantity),
      addressLine1: !contract.addressLine1.trim() || 
                    contract.addressLine1.length < INPUT_LIMITS.addressLine1.minLength ||
                    contract.addressLine1.length > INPUT_LIMITS.addressLine1.maxLength ||
                    !VALIDATION_PATTERNS.addressLine1.test(contract.addressLine1),
      // Validation for separate address components
      province: !contract.province.trim() || 
                contract.province.length < INPUT_LIMITS.province.minLength ||
                contract.province.length > INPUT_LIMITS.province.maxLength ||
                !VALIDATION_PATTERNS.province.test(contract.province),
      cityMunicipality: !contract.cityMunicipality.trim() || 
                        contract.cityMunicipality.length < INPUT_LIMITS.cityMunicipality.minLength ||
                        contract.cityMunicipality.length > INPUT_LIMITS.cityMunicipality.maxLength ||
                        !VALIDATION_PATTERNS.cityMunicipality.test(contract.cityMunicipality),
      barangay: !contract.barangay.trim() || 
                contract.barangay.length < INPUT_LIMITS.barangay.minLength ||
                contract.barangay.length > INPUT_LIMITS.barangay.maxLength ||
                !VALIDATION_PATTERNS.barangay.test(contract.barangay),
      postalCode: !contract.postalCode.trim() || 
                  !VALIDATION_PATTERNS.postalCode.test(contract.postalCode)
    }
  }, [])

  const validateForm = useCallback(() => {
    // Validate delivery fee
    if (!deliveryFee || deliveryFee <= 0) {
      showSnackbar('Cannot proceed with booking. No delivery fee available for the selected location.')
      return false
    }

    // Validate locations
    if (!pickupLocation.trim()) {
      setPickupError(true)
      showSnackbar('Please select a pickup location')
      return false
    }
    setPickupError(false)
    
    if (!dropOffLocation.location || deliveryFee <= 0) {
      setDropOffError(true)
      showSnackbar('Please select a drop-off location')
      return false
    }
    setDropOffError(false)

    // Validate contracts
    const updatedContracts = [...contracts]
    let hasErrors = false

    updatedContracts.forEach((contract, index) => {
      const errors = validateContract(contract)
      updatedContracts[index].errors = errors
      if (Object.values(errors).some(error => error)) {
        hasErrors = true
      }
    })

    if (hasErrors) {
      setContracts(updatedContracts)
      showSnackbar('Please fill in all required fields correctly')
      return false
    }

    return true
  }, [contracts, dropOffLocation, pickupLocation, deliveryFee, showSnackbar, validateContract])

  const handleSubmit = useCallback(() => {
    // Show confirmation modal first
    if (validateForm()) {
      setShowConfirmationModal(true)
    }
  }, [validateForm])

  const handleConfirmSubmit = useCallback(async () => {
    try {
      setLoading(true)
      setShowConfirmationModal(false)

      // Validate form first
      if (!validateForm()) {
        setLoading(false)
        return
      }

      // Generate tracking ID with format 'YYYYMMDDMKTPxxxx'
      function generateTrackingID() {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const randomPart = [...Array(4)].map(() => Math.random().toString(36)[2].toUpperCase()).join('')
        return `${year}${month}${day}MKTP${randomPart}`
      }



      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      // Create one contract per passenger
      const contractPromises = contracts.map(async (contract) => {
        // Generate unique tracking ID for each contract
        let trackingID
        let collisionCheck

        do {
          trackingID = generateTrackingID()

          const { data: existing, error: checkError } = await supabase
            .from('contracts')
            .select('id')
            .eq('id', trackingID)

          if (checkError) throw checkError
          collisionCheck = existing.length > 0
        } while (collisionCheck)

        // Combine separate address fields into delivery_address
        const combinedDeliveryAddress = `${contract.province}, ${contract.cityMunicipality}, ${contract.barangay}, ${contract.postalCode}`.trim()
        
        // Format contact number to +63 9xx xxx xxxx
        const formatContactNumber = (contact) => {
          if (contact.length === 10 && contact.startsWith('9')) {
            return `+63 ${contact.slice(0, 2)} ${contact.slice(2, 5)} ${contact.slice(5, 8)} ${contact.slice(8)}`
          }
          return `+63 ${contact}`
        }

        // Insert contract with all luggage information directly into contracts table
        const contractData = {
          id: trackingID,
          airline_id: user.id,
          owner_first_name: contract.firstName,
          owner_middle_initial: contract.middleInitial,
          owner_last_name: contract.lastName,
          owner_contact: formatContactNumber(contract.contact),
          luggage_description: contract.itemDescription,
          luggage_weight: contract.weight,
          luggage_quantity: contract.quantity,
          flight_number: contract.flightNumber,
          case_number: contract.caseNumber,
          delivery_address: combinedDeliveryAddress,
          address_line_1: contract.addressLine1,
          address_line_2: contract.addressLine2,
          pickup_location: pickupLocation,
          drop_off_location: dropOffLocation.location,
          drop_off_location_geo: `POINT(${dropOffLocation.lng} ${dropOffLocation.lat})`,
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

      // Wait for all contracts to be created
      await Promise.all(contractPromises)

      showSnackbar('Contracts created successfully', true)

      // Reset form
      setDropOffLocation({ location: '', lat: null, lng: null })
      setPickupLocation('')
      setContracts([{ ...INITIAL_CONTRACT }])

      // Navigate to contracts made screen
      navigation.navigate('BookingManagement', { screen: 'made' })
    } catch (error) {
      showSnackbar('Error creating contracts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [contracts, dropOffLocation, pickupLocation, deliveryFee, showSnackbar, totalLuggageQuantity, validateContract, navigation])

  // Function to fetch delivery price based on city
  const fetchDeliveryPrice = async (address) => {
    try {
      // Fetch all cities and prices from the pricing table
      const { data: pricingList, error } = await supabase
        .from('pricing')
        .select('city, price');
  
      if (error) throw error;
  
      // Convert the address to lowercase for comparison
      const normalizedAddress = address.toLowerCase();
  
      // Find the first city that appears in the address
      const matched = pricingList.find(entry =>
        normalizedAddress.includes(entry.city.toLowerCase())
      );
  
      if (matched) {
        setDeliveryFee(matched.price);
      } else {
        setDeliveryFee(0);
        showSnackbar('The selected address is either invalid or out of bounds');
      }
    } catch (error) {
      console.error('Error fetching delivery price:', error);
      setDeliveryFee(0);
      showSnackbar('The selected address is either invalid or out of bounds');
    }
  }

  // Memoized render functions
  const renderDropOffLocation = useMemo(() => (
    <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
      <View style={styles.locationHeader}>
        <Text style={[fonts.titleMedium, { color: colors.primary }]}>
          Drop-Off Location
        </Text>

      </View>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('SelectLocation', {
          params: {
            screen: 'SelectLocation'
          }
        })}
        icon="map-marker"
        style={{ backgroundColor: colors.primary, alignSelf:'center', marginBottom:10}}
      >
        Select Location
      </Button>

      
      {dropOffLocation.location ? (
        <View style={[styles.locationContent, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
            {dropOffLocation.location}
          </Text>
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
            right={<TextInput.Icon icon="menu-down" onPress={() => setShowPickupMenu(true)}/>}
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {SnackbarElement}
      <View style={styles.content}>
        {renderDropOffLocation}
        {renderPickupLocation}
        <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.primary }]}>
          Base Delivery Fee: ₱{deliveryFee.toFixed(2)}
        </Text>
        <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.primary }]}>
          Total Delivery Fee ({contracts.length} passengers): ₱{totalDeliveryFee.toFixed(2)}
        </Text>
        <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.primary }]}>
          Total Luggage Quantity: {totalLuggageQuantity}
        </Text>

        {/* Warning message when delivery fee is not available */}
        {deliveryFee <= 0 && dropOffLocation.location && (
          <Surface style={[styles.warningSurface, { backgroundColor: colors.errorContainer }]} elevation={1}>
            <View style={styles.warningContent}>
              <IconButton icon="alert-circle" size={24} iconColor={colors.error} />
              <View style={styles.warningText}>
                <Text style={[fonts.titleSmall, { color: colors.error, marginBottom: 4 }]}>
                  Delivery Fee Unavailable
                </Text>
                <Text style={[fonts.bodyMedium, { color: colors.onErrorContainer }]}>
                  The selected drop-off location is either invalid or out of bounds. Please select a valid one to proceed.
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Success message when delivery fee is available */}
        {deliveryFee > 0 && dropOffLocation.location && (
          <Surface style={[styles.warningSurface, { backgroundColor: colors.primaryContainer }]} elevation={1}>
            <View style={styles.warningContent}>
              <IconButton icon="check-circle" size={24} iconColor={colors.primary} />
              <View style={styles.warningText}>
                <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 4 }]}>
                  Delivery Fee Applied
                </Text>
                <Text style={[fonts.bodyMedium, { color: colors.onPrimaryContainer }]}>
                  A base delivery fee of ₱{deliveryFee.toFixed(2)} has been applied. You may now fill in passenger information.
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
            isLastContract={contracts.length === 1}
            isDisabled={!dropOffLocation.location || deliveryFee <= 0}
          />
        ))}

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={addContract}
            icon="plus"
            disabled={!dropOffLocation.location || deliveryFee <= 0}
          >
            Add Passenger
          </Button>
          <Button
            mode="contained"
            onPress={() => setShowConfirmationModal(true)}
            loading={loading}
            disabled={loading || !dropOffLocation.location|| deliveryFee <= 0}
            icon="send"
          >
            Create Contracts
          </Button>
        </View>
      </View>
      {/* Confirmation Modal */}
      <BottomModal
        visible={showConfirmationModal}
        onDismiss={() => setShowConfirmationModal(false)}
      >
        <View style={styles.confirmationContent}>
          <Text style={[fonts.titleLarge, { color: colors.primary, marginBottom: 16, textAlign: 'center' }]}>
            Confirm Contract Creation
          </Text>
          
          <View style={[styles.confirmationDetails, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: 'bold' }}>Number of Contracts:</Text> {contracts.length}
            </Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: 'bold' }}>Pickup Location:</Text> {pickupLocation}
            </Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: 'bold' }}>Drop-off Location:</Text> {dropOffLocation.location}
            </Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: 'bold' }}>Total Delivery Fee:</Text> ₱{totalDeliveryFee.toFixed(2)}
            </Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface, marginBottom: 8 }]}>
              <Text style={{ fontWeight: 'bold' }}>Total Luggage Quantity:</Text> {totalLuggageQuantity}
            </Text>
          </View>

          <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: 24, textAlign: 'center', fontStyle: 'italic' }]}>
            Are you sure you want to proceed with creating these contracts?
          </Text>

          <View style={styles.confirmationButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowConfirmationModal(false)}
              style={{ flex: 1, marginRight: 8 }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmSubmit}
              loading={loading}
              style={{ flex: 1, marginLeft: 8 }}
              icon="check"
            >
              Create
            </Button>
          </View>
        </View>
      </BottomModal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
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
  headerLeft: {
    flex: 1,
  },
  addressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  nameField: {
    flex: 1,
  },
  middleInitialField: {
    width: 80,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  addressField: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap:5,
    marginTop: 24,
    marginBottom: 32,
  },
  surface: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: 400,
    borderRadius: 8,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropoffContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  mapControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationContent: {
    padding: 12,
    borderRadius: 8,
  },
  warningSurface: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
  },
  confirmationContent: {
    padding: 16,
  },
  confirmationDetails: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})

export default React.memo(MakeContracts)