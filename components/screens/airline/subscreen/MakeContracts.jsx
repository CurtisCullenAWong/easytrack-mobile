import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useTheme, TextInput, Button, Text, IconButton, Menu } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps'
import * as Location from 'expo-location'

const MakeContracts = () => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [dropOffLocation, setDropOffLocation] = useState({ location: '', lat: null, lng: null })
  const [pickupLocation, setPickupLocation] = useState('')
  const [showPickupMenu, setShowPickupMenu] = useState(false)
  const [contracts, setContracts] = useState([{ 
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
  }])
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [dropOffError, setDropOffError] = useState(false)
  const [pickupError, setPickupError] = useState(false)

  const pickupBays = Array.from({ length: 12 }, (_, i) => `Terminal 3, Bay ${i + 1}`)

  const validateContract = (contract) => {
    const errors = {
      name: !contract.name.trim(),
      caseNumber: !contract.caseNumber.trim(),
      itemDescription: !contract.itemDescription.trim(),
      contact: !contract.contact.trim(),
      weight: !contract.weight.trim() || isNaN(contract.weight) || Number(contract.weight) <= 0,
      quantity: !contract.quantity.trim() || isNaN(contract.quantity) || Number(contract.quantity) <= 0
    }
    return errors
  }

  const handleInputChange = (index, field, value) => {
    const updatedContracts = [...contracts]
    updatedContracts[index][field] = value
    // Clear error when user starts typing
    if (updatedContracts[index].errors) {
      updatedContracts[index].errors[field] = false
    }
    setContracts(updatedContracts)
  }

  const clearSingleContract = (index) => {
    const updatedContracts = [...contracts]
    updatedContracts[index] = { name: "", caseNumber: "", itemDescription: "", contact: "", weight: "", quantity: "", errors: { name: false, caseNumber: false, itemDescription: false, contact: false, weight: false, quantity: false } }
    setContracts(updatedContracts)
  }

  const deleteContract = (index) => {
    if (contracts.length === 1) {
      showSnackbar('At least one delivery information form is required')
      return
    }
    const updatedContracts = contracts.filter((_, i) => i !== index)
    setContracts(updatedContracts)
  }

  const addContract = () => {
    setContracts([...contracts, { 
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
    }])
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validate drop-off and pickup locations
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

      // Validate all contracts
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

      // Calculate total luggage quantity
      const totalLuggageQuantity = contracts.reduce((sum, contract) => sum + Number(contract.quantity || 0), 0)

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

      // Format and insert luggage information
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
      setContracts([{ name: "", caseNumber: "", itemDescription: "", contact: "", weight: "", quantity: "", errors: { name: false, caseNumber: false, itemDescription: false, contact: false, weight: false, quantity: false } }])

    } catch (error) {
      showSnackbar('Error creating contract: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

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
              onPressIn={() => setShowPickupMenu(true)}
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
          onChangeText={(text) => {
            setDropOffLocation(prev => ({ ...prev, location: text }))
            setDropOffError(false)
          }}
          mode="outlined"
          style={{ marginBottom: 16 }}
          error={dropOffError}
        />
        <Text style={[fonts.titleSmall, { marginBottom: 10, color: colors.primary }]}>
          Total Luggage Quantity: 
          {contracts.reduce((sum, contract) => sum + Number(contract.quantity || 0), 0)}
        </Text>
        {contracts.map((contract, index) => (
          <View
            key={index}
            style={[styles.luggageBlock, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <View style={styles.headerContainer}>
              <Text style={[fonts.titleSmall, { color: colors.primary }]}>
                Delivery Information {index + 1}
              </Text>
              <IconButton
                icon="close"
                size={20}
                onPress={() => deleteContract(index)}
                style={{ margin: 0 }}
                disabled={contracts.length === 1}
                iconColor={contracts.length === 1 ? colors.disabled : colors.error}
              />
            </View>
            <TextInput
              label="Case Number"
              value={contract.caseNumber}
              onChangeText={(text) => handleInputChange(index, "caseNumber", text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
              error={contract.errors?.caseNumber}
            />
            <TextInput
              label="Name"
              value={contract.name}
              onChangeText={(text) => handleInputChange(index, "name", text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
              error={contract.errors?.name}
            />
            <TextInput
              label="Item Description"
              value={contract.itemDescription}
              onChangeText={(text) => handleInputChange(index, "itemDescription", text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
              error={contract.errors?.itemDescription}
            />
            <TextInput
              label="Contact Number"
              value={contract.contact}
              onChangeText={(text) => handleInputChange(index, "contact", text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
              error={contract.errors?.contact}
            />
            <TextInput
              label="Weight (kg)"
              value={contract.weight}
              onChangeText={(text) => handleInputChange(index, "weight", text)}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12 }}
              error={contract.errors?.weight}
            />
            <TextInput
              label="Quantity"
              value={contract.quantity}
              onChangeText={(text) => handleInputChange(index, "quantity", text)}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12 }}
              error={contract.errors?.quantity}
            />
            <Button
              mode="outlined"
              onPress={() => clearSingleContract(index)}
              style={{ marginTop: 12 }}
            >
              Clear Contract
            </Button>
          </View>
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
})

export default MakeContracts