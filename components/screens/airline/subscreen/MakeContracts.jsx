import React, { useState, useRef, useCallback, useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useTheme, TextInput, Button, Text, IconButton, Menu } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import MapView, { Marker } from 'react-native-maps'
import { useNavigation } from '@react-navigation/native'

// Constants
const INITIAL_CONTRACT = {
  name: "",
  caseNumber: "",
  itemDescription: "",
  contact: "",
  weight: "",
  quantity: "",
  errors: {
    name: false,
    caseNumber: false,
    itemDescription: false,
    contact: false,
    weight: false,
    quantity: false
  }
}

const INITIAL_REGION = {
  latitude: 14.5350,
  longitude: 120.9821,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
}

// Map Component
const LocationMap = ({ region, onRegionChange, mapRef }) => {
  const { colors } = useTheme()
  
  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={onRegionChange}
      >
        <Marker
          coordinate={{
            latitude: region.latitude,
            longitude: region.longitude
          }}
          pinColor={colors.primary}
        />
      </MapView>
    </View>
  )
}

// Contract Form Component
const ContractForm = ({ contract, index, onInputChange, onClear, onDelete, isLastContract }) => {
  const { colors, fonts } = useTheme()

  return (
    <View style={[styles.luggageBlock, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
      <View style={styles.headerContainer}>
        <Text style={[fonts.titleSmall, { color: colors.primary }]}>
          Delivery Information {index + 1}
        </Text>
        <IconButton
          icon="close"
          size={20}
          onPress={() => onDelete(index)}
          style={{ margin: 0 }}
          disabled={isLastContract}
          iconColor={isLastContract ? colors.disabled : colors.error}
        />
      </View>
      <TextInput
        label="Case Number"
        value={contract.caseNumber}
        onChangeText={(text) => onInputChange(index, "caseNumber", text)}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.caseNumber}
      />
      <TextInput
        label="Name"
        value={contract.name}
        onChangeText={(text) => onInputChange(index, "name", text)}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.name}
      />
      <TextInput
        label="Item Description"
        value={contract.itemDescription}
        onChangeText={(text) => onInputChange(index, "itemDescription", text)}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.itemDescription}
      />
      <TextInput
        label="Contact Number"
        value={contract.contact}
        onChangeText={(text) => onInputChange(index, "contact", text)}
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.contact}
      />
      <TextInput
        label="Weight (kg)"
        value={contract.weight}
        onChangeText={(text) => onInputChange(index, "weight", text)}
        keyboardType="numeric"
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.weight}
      />
      <TextInput
        label="Quantity"
        value={contract.quantity}
        onChangeText={(text) => onInputChange(index, "quantity", text)}
        keyboardType="numeric"
        mode="outlined"
        style={{ marginBottom: 12 }}
        error={contract.errors?.quantity}
      />
      <Button
        mode="outlined"
        onPress={() => onClear(index)}
        style={{ marginTop: 12 }}
      >
        Clear Contract
      </Button>
    </View>
  )
}

const MakeContracts = () => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const navigation = useNavigation()
  
  // State
  const [dropOffLocation, setDropOffLocation] = useState({ location: '', lat: null, lng: null })
  const [pickupLocation, setPickupLocation] = useState('')
  const [showPickupMenu, setShowPickupMenu] = useState(false)
  const [contracts, setContracts] = useState([INITIAL_CONTRACT])
  const [loading, setLoading] = useState(false)
  const [dropOffError, setDropOffError] = useState(false)
  const [pickupError, setPickupError] = useState(false)
  const [region, setRegion] = useState(INITIAL_REGION)

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
  const handleRegionChange = useCallback(async (newRegion) => {
    setRegion(newRegion)
    if (address) {
      setDropOffLocation(prev => ({
        ...prev,
        location: address,
        lat: newRegion.latitude,
        lng: newRegion.longitude
      }))
    }
  }, [])

  const handleDropoffInputChange = useCallback((text) => {
    setDropOffLocation(prev => ({ ...prev, location: text }))
    setDropOffError(false)
  }, [])

  const validateContract = useCallback((contract) => {
    return {
      name: !contract.name.trim(),
      caseNumber: !contract.caseNumber.trim(),
      itemDescription: !contract.itemDescription.trim(),
      contact: !contract.contact.trim(),
      weight: !contract.weight.trim() || isNaN(contract.weight) || Number(contract.weight) <= 0,
      quantity: !contract.quantity.trim() || isNaN(contract.quantity) || Number(contract.quantity) <= 0
    }
  }, [])

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
      updated[index] = { ...INITIAL_CONTRACT }
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
    setContracts(prev => [...prev, { ...INITIAL_CONTRACT }])
  }, [])

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true)

      // Validate locations
      if (!pickupLocation.trim()) {
        setPickupError(true)
        showSnackbar('Please select a pickup location')
        return
      }
      setPickupError(false)
      
      if (!dropOffLocation.location.trim()) {
        setDropOffError(true)
        showSnackbar('Please enter a drop-off location')
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

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      // Insert contract
      const contractData = {
        luggage_quantity: totalLuggageQuantity,
        airline_id: user.id,
        pickup_location: pickupLocation,
        drop_off_location: dropOffLocation.location,
        drop_off_location_geo: {
          type: 'Point',
          coordinates: [dropOffLocation.lng, dropOffLocation.lat]
        }
      }

      const { data: insertedContract, error: contractError } = await supabase
        .from('contract')
        .insert(contractData)
        .select()
        .single()

      if (contractError) throw contractError

      // Insert luggage information
      const formattedData = contracts.map(contract => ({
        case_number: contract.caseNumber,
        luggage_owner: contract.name,
        contact_number: contract.contact,
        item_description: contract.itemDescription,
        weight: contract.weight,
        quantity: contract.quantity,
        contract_id: insertedContract.id
      }))

      const { error: luggageError } = await supabase
        .from('contract_luggage_information')
        .insert(formattedData)

      if (luggageError) throw luggageError

      showSnackbar('Contract created successfully', true)
      
      // Reset form
      setDropOffLocation({ location: '', lat: null, lng: null })
      setPickupLocation('')
      setContracts([{ ...INITIAL_CONTRACT }])

      // Navigate to contracts made screen
      navigation.navigate('BookingManagement', { screen: 'made' })
    } catch (error) {
      showSnackbar('Error creating contract: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [contracts, dropOffLocation, pickupLocation, showSnackbar, totalLuggageQuantity, validateContract, navigation])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {SnackbarElement}
      <View style={{ paddingHorizontal: 16 }}>
        <Menu
          visible={showPickupMenu}
          onDismiss={() => setShowPickupMenu(false)}
          anchor={
            <TextInput
              label="Pickup Location"
              value={pickupLocation}
              mode="outlined"
              style={{ marginBottom: 16 }}
              right={<TextInput.Icon icon="menu-down" />}
              onPress={() => setShowPickupMenu(true)}
              error={pickupError}
            />
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

        <TextInput
          label="Drop-off Location"
          value={dropOffLocation.location}
          onChangeText={handleDropoffInputChange}
          mode="outlined"
          style={{ marginBottom: 16 }}
          error={dropOffError}
          right={<TextInput.Icon icon="map-marker" />}
        />

        <LocationMap
          region={region}
          onRegionChange={handleRegionChange}
          mapRef={mapRef}
          markerRef={markerRef}
        />

        <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.primary }]}>
          Total Luggage Quantity: {totalLuggageQuantity}
        </Text>

        {contracts.map((contract, index) => (
          <ContractForm
            key={index}
            contract={contract}
            index={index}
            onInputChange={handleInputChange}
            onClear={clearSingleContract}
            onDelete={deleteContract}
            isLastContract={contracts.length === 1}
          />
        ))}

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={addContract}
            style={{ marginRight: 8 }}
          >
            Add Another Form
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
          >
            Send Contract
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  mapContainer: {
    height: 300,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
})

export default MakeContracts