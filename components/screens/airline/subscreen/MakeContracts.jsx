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
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [showPickupMenu, setShowPickupMenu] = useState(false)
  const [luggageQuantity, setLuggageQuantity] = useState(1)
  const [luggageDetails, setLuggageDetails] = useState([])
  const [quantityError, setQuantityError] = useState('')
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(null)

  const pickupBays = Array.from({ length: 18 }, (_, i) => `Terminal 3, Bay ${i + 1}`)

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1 || newQuantity > 10) {
      setQuantityError('Passenger count must be between 1 and 10.')
      return
    }
    setQuantityError('')
    setLuggageQuantity(newQuantity)

    const updatedDetails = Array.from({ length: newQuantity }, (_, index) => luggageDetails[index] || {
      name: '',
      caseNumber: '',
      itemDescription: '',
      weight: '',
      contact: '',
      luggageQuantity: 1
    })
    setLuggageDetails(updatedDetails)
  }

  const handleDetailChange = (index, field, value) => {
    const updatedDetails = [...luggageDetails]
    updatedDetails[index][field] = value
    setLuggageDetails(updatedDetails)
  }

  const calculateTotalLuggage = () => {
    return luggageDetails.reduce((total, detail) => total + (parseInt(detail.luggageQuantity) || 0), 0)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      // Validate required fields
      if (!dropOffLocation) {
        showSnackbar('Please enter a drop-off location')
        return
      }

      if (!pickupLocation) {
        showSnackbar('Please select a pickup location')
        return
      }

      if (luggageQuantity < 1) {
        showSnackbar('Please add at least one luggage')
        return
      }

      // Validate luggage details
      for (const detail of luggageDetails) {
        if (!detail.name || !detail.caseNumber || !detail.itemDescription || !detail.weight || !detail.contact) {
          showSnackbar('Please fill in all luggage details')
          return
        }
      }

      // Insert contract first
      const { data: contract, error: contractError } = await supabase
        .from('contract')
        .insert({
          pickup_location: pickupLocation,
          drop_off_location: dropOffLocation,
          airline_id: user.id,
          luggage_quantity: calculateTotalLuggage(),
        })
        .select()

      if (contractError) throw contractError

      // Insert luggage information with contract reference
      const { error: luggageError } = await supabase
        .from('contract_luggage_information')
        .insert(
          luggageDetails.map(detail => ({
            luggage_owner: detail.name,
            case_number: detail.caseNumber,
            item_description: detail.itemDescription,
            weight: parseInt(detail.weight),
            contact_number: detail.contact,
            contract_id: contract[0].id,
            quantity: parseInt(detail.luggageQuantity)
          }))
        )

      if (luggageError) throw luggageError

      showSnackbar('Contract created successfully', true)
      
      // Reset form
      setDropOffLocation('')
      setPickupLocation('')
      setLuggageQuantity(1)
      setLuggageDetails([])
      setQuantityError('')

    } catch (error) {
      showSnackbar('Error creating contract: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    handleQuantityChange(luggageQuantity)
  }, [luggageQuantity])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {SnackbarElement}
      <View style={{ paddingHorizontal: 16 }}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={{ borderRadius: 8 }}
          contentStyle={{ paddingVertical: 8 }}
          loading={loading}
          disabled={loading}
        >
          Submit Contract
        </Button>
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
              }}
              title={bay}
            />
          ))}
        </Menu>

        <TextInput
          label="Drop-off Location"
          value={dropOffLocation}
          onChangeText={setDropOffLocation}
          mode="outlined"
          style={{ marginBottom: 16 }}
        />

        <View style={styles.quantityContainer}>
          <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 8 }]}>
            Passenger Count
          </Text>
          <View style={styles.quantityControls}>
            <IconButton
              icon="minus"
              size={24}
              onPress={() => handleQuantityChange(luggageQuantity - 1)}
              style={{ backgroundColor: colors.primary }}
              iconColor={colors.onPrimary}
            />
            <TextInput
              value={String(luggageQuantity)}
              onChangeText={(text) => {
                const newValue = Math.min(10, Math.max(1, Number(text)))
                handleQuantityChange(newValue)
              }}
              keyboardType="numeric"
              mode="outlined"
              style={styles.quantityInput}
            />
            <IconButton
              icon="plus"
              size={24}
              onPress={() => handleQuantityChange(luggageQuantity + 1)}
              style={{ backgroundColor: colors.primary }}
              iconColor={colors.onPrimary}
            />
          </View>
          {quantityError ? (
            <Text style={[fonts.bodyMedium, styles.errorText, { color: colors.error }]}>
              {quantityError}
            </Text>
          ) : null}
        </View>
        <Text style={[fonts.titleMedium, { color: colors.primary, marginTop: 16, marginBottom: 8 }]}>
          Total Luggage: {calculateTotalLuggage()}
        </Text>
        {luggageDetails.map((detail, index) => (
          <View
            key={index}
            style={[styles.luggageBlock, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 12 }]}>
              Passenger {index + 1}
            </Text>
            <TextInput
              label="Name"
              value={detail.name}
              onChangeText={(text) => handleDetailChange(index, 'name', text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Case Number"
              value={detail.caseNumber}
              onChangeText={(text) => handleDetailChange(index, 'caseNumber', text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Item Description"
              value={detail.itemDescription}
              onChangeText={(text) => handleDetailChange(index, 'itemDescription', text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Weight (kg)"
              value={detail.weight}
              onChangeText={(text) => handleDetailChange(index, 'weight', text)}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Contact Number"
              value={detail.contact}
              onChangeText={(text) => handleDetailChange(index, 'contact', text)}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Luggage Quantity"
              value={String(detail.luggageQuantity)}
              onChangeText={(text) => handleDetailChange(index, 'luggageQuantity', text)}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  quantityContainer: {
    marginBottom: 24,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 60,
    marginHorizontal: 12,
    textAlign: 'center'
  },
  luggageBlock: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    marginTop: 8,
    alignSelf: 'center',
  },
})

export default MakeContracts