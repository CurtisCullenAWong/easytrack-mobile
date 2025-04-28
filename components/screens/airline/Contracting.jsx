import React, { useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useTheme, TextInput, Button, Text, IconButton } from 'react-native-paper'
import Header from '../../customComponents/Header'

const Contracting = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [address, setAddress] = useState('')
  const [luggageQuantity, setLuggageQuantity] = useState(0)
  const [luggageDetails, setLuggageDetails] = useState([])
  const [quantityError, setQuantityError] = useState('') // State for error message

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1 || newQuantity > 10) {
      setQuantityError('Luggage quantity must be between 1 and 10.')
      return
    } else {
      setQuantityError('')
    }
    
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
      <Header navigation={navigation} title="Issue Contract" />
      <View style={{ padding: 16 }}>
        <TextInput
          label="Delivery Address"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          style={{ marginBottom: 16 }}
          theme={{ colors: { primary: colors.primary } }}
        />

        <View style={styles.quantityContainer}>
          <Text style={[styles.label, { color: colors.primary }]}>
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
                const newValue = Math.min(10, Math.max(1, Number(text))) // Ensure the value is between 1 and 10
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
            <Text style={[styles.errorText, { color: colors.error }]}>{quantityError}</Text>
          ) : null}
        </View>

        {luggageDetails.map((detail, index) => (
          <View
            key={index}
            style={[styles.luggageBlock, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <Text style={[styles.luggageTitle, { color: colors.primary }]}>
              Luggage {index + 1}
            </Text>
            <TextInput
              label="Name"
              value={detail.name}
              onChangeText={(text) => handleDetailChange(index, 'name', text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
              theme={{ colors: { primary: colors.primary } }}
            />
            <TextInput
              label="Case Number"
              value={detail.caseNumber}
              onChangeText={(text) => handleDetailChange(index, 'caseNumber', text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
              theme={{ colors: { primary: colors.primary } }}
            />
            <TextInput
              label="Item Description"
              value={detail.itemDescription}
              onChangeText={(text) => handleDetailChange(index, 'itemDescription', text)}
              mode="outlined"
              style={{ marginBottom: 12 }}
              theme={{ colors: { primary: colors.primary } }}
            />
            <TextInput
              label="Weight (kg)"
              value={detail.weight}
              onChangeText={(text) => handleDetailChange(index, 'weight', text)}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12 }}
              theme={{ colors: { primary: colors.primary } }}
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
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 60,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  luggageBlock: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  luggageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: 'italic',
    alignSelf: 'center',
  },
})

export default Contracting
