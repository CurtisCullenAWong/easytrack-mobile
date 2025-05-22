import React, { useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useTheme, TextInput, Button, Text, IconButton } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'

const MakeContracts = () => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [address, setAddress] = useState('')
  const [luggageQuantity, setLuggageQuantity] = useState(0)
  const [luggageDetails, setLuggageDetails] = useState([])
  const [quantityError, setQuantityError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1 || newQuantity > 10) {
      setQuantityError('Luggage quantity must be between 1 and 10.')
      return
    }
    setQuantityError('')
    setLuggageQuantity(newQuantity)

    const updatedDetails = Array.from({ length: newQuantity }, (_, index) => luggageDetails[index] || {
      name: '',
      caseNumber: '',
      itemDescription: '',
      weight: '',
    })
    setLuggageDetails(updatedDetails)
  }

  const handleDetailChange = (index, field, value) => {
    const updatedDetails = [...luggageDetails]
    updatedDetails[index][field] = value
    setLuggageDetails(updatedDetails)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      // Validate required fields
      if (!address) {
        showSnackbar('Please enter a delivery address')
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

      // Insert luggage information first
      const { data: luggageInfo, error: luggageError } = await supabase
        .from('contract_luggage_information')
        .insert(
          luggageDetails.map(detail => ({
            id: 1,
            luggage_owner: detail.name,
            case_number: detail.caseNumber,
            item_description: detail.itemDescription,
            weight: parseFloat(detail.weight),
            contact_number: detail.contact
          }))
        )
        .select()

      if (luggageError) throw luggageError

      // Insert contract
      const { data: contract, error: contractError } = await supabase
        .from('contract')
        .insert({
          id: 1,
          contract_status_id: 1, // Assuming 1 is the initial status
          airline_uid: user.id,
          luggage_quantity: luggageQuantity,
          drop_off_location: address,
          luggage_information_id: luggageInfo[0].id // Using the first luggage info ID as reference
        })
        .select()

      if (contractError) throw contractError

      showSnackbar('Contract created successfully', true)
      
      // Reset form
      setAddress('')
      setLuggageQuantity(0)
      setLuggageDetails([])
      setQuantityError('')

    } catch (error) {
      console.error('Error creating contract:', error)
      showSnackbar('Error creating contract: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {SnackbarElement}
      <View style={{ padding: 16 }}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={{ marginTop: 20, borderRadius: 8 }}
          contentStyle={{ paddingVertical: 8 }}
          loading={loading}
          disabled={loading}
        >
          Submit Contract
        </Button>
        <TextInput
          label="Delivery Address"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          style={{ marginBottom: 16 }}
        />

        <View style={styles.quantityContainer}>
          <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 8 }]}>
            Luggage Quantity
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

        {luggageDetails.map((detail, index) => (
          <View
            key={index}
            style={[styles.luggageBlock, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <Text style={[fonts.titleSmall, { color: colors.primary, marginBottom: 12 }]}>
              Luggage {index + 1}
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