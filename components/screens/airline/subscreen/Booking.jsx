import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme, TextInput, Button, Text, IconButton, Menu, Surface } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'

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
            onChangeText={(text) => onInputChange(index, "firstName", text)}
            mode="outlined"
            style={[styles.nameField, { marginRight: 8 }]}
            error={contract.errors?.firstName}
            placeholder="Enter first name"
            disabled={isDisabled}
          />
          <TextInput
            label="M.I."
            value={contract.middleInitial}
            onChangeText={(text) => onInputChange(index, "middleInitial", text)}
            mode="outlined"
            style={[styles.middleInitialField]}
            maxLength={1}
            placeholder="M"
            disabled={isDisabled}
          />
        </View>
        <TextInput
          label="Last Name*"
          value={contract.lastName}
          onChangeText={(text) => onInputChange(index, "lastName", text)}
          mode="outlined"
          style={{ marginBottom: 12 }}
          error={contract.errors?.lastName}
          placeholder="Enter last name"
          disabled={isDisabled}
        />
      <TextInput
        label="Owner's Contact Number*"
        value={contract.contact}
        onChangeText={(text) => onInputChange(index, "contact", text)}
        mode="outlined"
        style={{ marginBottom: 12 }}
        keyboardType="phone-pad"
        left={<TextInput.Affix text="+63" />}
        error={contract.errors?.contact}
        maxLength={10}
        inputMode="numeric"
        placeholder="9xxxxxxxxx"
        disabled={isDisabled}
      />
      <TextInput
        label="Luggage Description*"
        value={contract.itemDescription}
        onChangeText={(text) => onInputChange(index, "itemDescription", text)}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.itemDescription}
        placeholder="Describe the luggage contents"
        multiline
        numberOfLines={2}
        disabled={isDisabled}
      />
      <TextInput
        label="Weight (kg)*"
        value={contract.weight}
        onChangeText={(text) => onInputChange(index, "weight", text)}
        inputMode="numeric"
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.weight}
        maxLength={2}
        placeholder="Max 20kg"
        disabled={isDisabled}
      />
      <TextInput
        label="Quantity*"
        value={contract.quantity}
        onChangeText={(text) => onInputChange(index, "quantity", text)}
        inputMode="numeric"
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.quantity}
        maxLength={1}
        placeholder="Max 8"
        disabled={isDisabled}
      />
      <TextInput
        label="Flight Number*"
        value={contract.flightNumber}
        onChangeText={(text) => onInputChange(index, "flightNumber", text)}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.flightNumber}
        maxLength={5}
        placeholder="e.g., 1234"
        disabled={isDisabled}
      />
      <TextInput
        label="Case Number*"
        value={contract.caseNumber}
        onChangeText={(text) => onInputChange(index, "caseNumber", text)}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.caseNumber}
        maxLength={10}
        inputMode="numeric"
        left={<TextInput.Affix text="AHLMNLZ" />}
        placeholder='xxxxxxxxxx'
        disabled={isDisabled}
      />
              <View style={styles.addressSection}>
        <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 8 }]}>
          Delivery Address
        </Text>
        
        <View style={styles.addressRow}>
          <TextInput
            label="Province*"
            value={contract.province}
            onChangeText={(text) => onInputChange(index, "province", text)}
            mode="outlined"
            style={[styles.addressField, { marginRight: 8 }]}
            error={contract.errors?.province}
            placeholder="e.g., Metro Manila"
            disabled={isDisabled}
          />
          <TextInput
            label="City/Municipality*"
            value={contract.cityMunicipality}
            onChangeText={(text) => onInputChange(index, "cityMunicipality", text)}
            mode="outlined"
            style={styles.addressField}
            error={contract.errors?.cityMunicipality}
            placeholder="e.g., Manila"
            disabled={isDisabled}
          />
        </View>
        
        <View style={styles.addressRow}>
          <TextInput
            label="Barangay*"
            value={contract.barangay}
            onChangeText={(text) => onInputChange(index, "barangay", text)}
            mode="outlined"
            style={[styles.addressField, { marginRight: 8 }]}
            error={contract.errors?.barangay}
            placeholder="e.g., Tondo"
            disabled={isDisabled}
          />
          <TextInput
            label="Postal Code*"
            value={contract.postalCode}
            onChangeText={(text) => onInputChange(index, "postalCode", text)}
            mode="outlined"
            style={styles.addressField}
            error={contract.errors?.postalCode}
            placeholder="e.g., 1012"
            keyboardType="numeric"
            maxLength={4}
            disabled={isDisabled}
          />
        </View>
        
        <TextInput
          label="Village/Building*"
          value={contract.addressLine1}
          onChangeText={(text) => onInputChange(index, "addressLine1", text)}
          mode="outlined"
          style={{ marginBottom: 12 }}
          error={contract.errors?.addressLine1}
          placeholder="e.g., SM Mall of Asia, Greenbelt Tower"
          disabled={isDisabled}
        />
        <TextInput
          label="Room/Unit No. (Optional)"
          value={contract.addressLine2}
          onChangeText={(text) => onInputChange(index, "addressLine2", text)}
          mode="outlined"
          style={{ marginBottom: 12 }}
          placeholder="e.g., Unit 1234, Room 567"
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
      caseNumber: !contract.caseNumber.trim(),
      firstName: !contract.firstName.trim(),
      lastName: !contract.lastName.trim(),
      contact: !contract.contact.trim(),
      flightNumber: !contract.flightNumber.trim(),
      itemDescription: !contract.itemDescription.trim(),
      weight: !contract.weight.trim() || isNaN(contract.weight) || Number(contract.weight) <= 0 || Number(contract.weight) > 20,
      quantity: !contract.quantity.trim() || isNaN(contract.quantity) || Number(contract.quantity) <= 0 || Number(contract.quantity) > 8,
      addressLine1: !contract.addressLine1.trim(),
      // Validation for separate address components
      province: !contract.province.trim(),
      cityMunicipality: !contract.cityMunicipality.trim(),
      barangay: !contract.barangay.trim(),
      postalCode: !contract.postalCode.trim()
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true)

      // Validate delivery fee
      if (!deliveryFee || deliveryFee <= 0) {
        showSnackbar('Cannot proceed with booking. No delivery fee available for the selected location.')
        return
      }

      // Validate locations
      if (!pickupLocation.trim()) {
        setPickupError(true)
        showSnackbar('Please select a pickup location')
        return
      }
      setPickupError(false)
      
      if (!dropOffLocation.location) {
        setDropOffError(true)
        showSnackbar('Please select a drop-off location')
        return
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
        
        // Insert contract with all luggage information directly into contracts table
        const contractData = {
          id: trackingID,
          airline_id: user.id,
          owner_first_name: contract.firstName,
          owner_middle_initial: contract.middleInitial,
          owner_last_name: contract.lastName,
          owner_contact: '+63' + contract.contact,
          luggage_description: contract.itemDescription,
          luggage_weight: contract.weight,
          luggage_quantity: contract.quantity,
          flight_number: contract.flightNumber,
          case_number: 'AHLMNLZ' + contract.caseNumber,
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

        {/* Warning message when drop-off location is not selected */}
        {!dropOffLocation.location && (
          <Surface style={[styles.warningSurface, { backgroundColor: colors.errorContainer }]} elevation={1}>
            <View style={styles.warningContent}>
              <IconButton icon="alert-circle" size={24} iconColor={colors.error} />
              <View style={styles.warningText}>
                <Text style={[fonts.titleSmall, { color: colors.error, marginBottom: 4 }]}>
                  Drop-off Location Required
                </Text>
                <Text style={[fonts.bodyMedium, { color: colors.onErrorContainer }]}>
                  Please select a drop-off location first before filling up passenger information.
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Success message when drop-off location is selected */}
        {dropOffLocation.location && (
          <Surface style={[styles.warningSurface, { backgroundColor: colors.primaryContainer }]} elevation={1}>
            <View style={styles.warningContent}>
              <IconButton icon="check-circle" size={24} iconColor={colors.primary} />
              <View style={styles.warningText}>
                <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 4 }]}>
                  Drop-off Location Selected
                </Text>
                <Text style={[fonts.bodyMedium, { color: colors.onPrimaryContainer }]}>
                  You can now fill up passenger information below.
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
            isDisabled={!dropOffLocation.location}
          />
        ))}

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={addContract}
            icon="plus"
            disabled={!dropOffLocation.location}
          >
            Add Passenger
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !dropOffLocation.location}
            icon="send"
          >
            Create Contracts
          </Button>
        </View>
      </View>
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
})

export default React.memo(MakeContracts)