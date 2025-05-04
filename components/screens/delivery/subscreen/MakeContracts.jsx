import React, { useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useTheme, TextInput, Button, Text, IconButton } from 'react-native-paper'

const MakeContracts = () => {
  const { colors, fonts } = useTheme()
  const [address, setAddress] = useState('')
  const [luggageQuantity, setLuggageQuantity] = useState(0)
  const [luggageDetails, setLuggageDetails] = useState([])
  const [quantityError, setQuantityError] = useState('')

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

  const handleSubmit = () => {
    console.log({
      address,
      luggageQuantity,
      luggageDetails,
    })
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
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
          </View>
        ))}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={{ marginTop: 20, borderRadius: 8 }}
          contentStyle={{ paddingVertical: 8 }}
        >
          Submit Contract
        </Button>
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