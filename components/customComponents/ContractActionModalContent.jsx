import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, useTheme, Text, Divider } from 'react-native-paper'

const ContractActionModalContent = ({ dialogType, onClose, onConfirm, loading, showCancelConfirmation, contract }) => {
  const { colors, fonts } = useTheme()

  const isDeliverAction = dialogType === 'deliver'
  const isCancelAction = dialogType === 'cancel'
  const isPickupAction = dialogType === 'pickup'
  
  const getTitle = () => {
    if (isDeliverAction) return 'Mark as Delivered'
    if (isPickupAction) return 'Pickup Luggage'
    if (isCancelAction) return showCancelConfirmation ? 'Confirm Cancellation' : 'Cancel Contract'
    return 'Mark as Failed'
  }

  const getDescription = () => (
    isDeliverAction
      ? 'Proceed to Delivery Confirmation to upload required documents.'
      : isPickupAction
      ? 'Proceed to Pickup to upload proof of pickup.'
      : isCancelAction
      ? (showCancelConfirmation ? 'WARNING: This action cannot be undone.' : 'Proceed to Cancel to add remarks.')
      : 'Proceed to Failed to upload proof and add remarks.'
  )


  const handleConfirm = async () => onConfirm()

  const getButtonColor = () => {
    if (isDeliverAction || isPickupAction) return colors.primary
    return showCancelConfirmation ? colors.error : colors.error
  }

  const getButtonText = () => {
    if (isPickupAction) return 'Pickup'
    if (isCancelAction && showCancelConfirmation) return 'Yes'
    if (isCancelAction && !showCancelConfirmation) return 'Confirm'
    return 'Confirm'
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <Text style={[fonts.headlineSmall, styles.headerText]}>
          {getTitle()}
        </Text>
        <Text style={[fonts.bodyMedium, styles.descriptionText]}>
          {getDescription()}
        </Text>
        {contract && (
          <View style={styles.contractInfoContainer}>
            <Divider style={{ marginBottom: 12 }} />
            <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant, marginBottom: 4 }]}>Selected Contract</Text>
            <Text style={[fonts.bodyMedium, { color: colors.onSurface }]}>
              ID: {contract?.id || 'N/A'}
            </Text>
            <Divider style={{ marginVertical: 12 }} />
            {(contract.owner_first_name || contract.owner_last_name) && (
              <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                Passenger: {[contract.owner_first_name, contract.owner_middle_initial, contract.owner_last_name].filter(Boolean).join(' ')}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <Button mode="outlined" onPress={onClose} style={[styles.button, { borderColor: colors.primary }]} textColor={colors.primary} disabled={loading}>Cancel</Button>
          <Button mode="contained" onPress={handleConfirm} style={[styles.button, { backgroundColor: getButtonColor() }]} loading={loading} disabled={loading}>{getButtonText()}</Button>
        </View>
      </ScrollView>

    </>
  )
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  descriptionText: {
    marginBottom: 24,
    textAlign: 'center',
  },
  textInput: {
    marginBottom: 24,
    minHeight: 100,
  },
  textInputContent: {
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  button: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    borderRadius: 8,
  },
  contractInfoContainer: {
    marginBottom: 24,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageLabel: {
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageButton: {
    marginBottom: 8,
  },
})

export default ContractActionModalContent 