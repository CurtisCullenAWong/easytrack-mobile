import React from 'react'
import { StyleSheet, View, KeyboardAvoidingView, Platform, Modal, ScrollView } from 'react-native'
import { TextInput, Button, Text, useTheme } from 'react-native-paper'

const AdjustAmountModal = ({
  visible,
  onDismiss,
  title,
  description,
  surchargeAmount,
  setSurchargeAmount,
  surchargeError,
  setSurchargeError,
  discountAmount,
  setDiscountAmount,
  discountError,
  setDiscountError,
  loading,
  onConfirm,
  currencySymbol = ''
}) => {
  const { colors, fonts } = useTheme()

  const sanitizeNumericInput = (value) => {
    // Allow only digits and a single decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned
  }

  const handleChangeSurcharge = (value) => {
    setSurchargeAmount(sanitizeNumericInput(value))
    if (setSurchargeError) setSurchargeError('')
  }

  const handleChangeDiscount = (value) => {
    setDiscountAmount(sanitizeNumericInput(value))
    if (setDiscountError) setDiscountError('')
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>  
          <ScrollView contentContainerStyle={styles.scrollViewContainer} keyboardShouldPersistTaps="handled">
            <Text style={[fonts.headlineSmall, styles.headerText]}>{title}</Text>
            {description ? (
              <Text style={[fonts.bodyMedium, styles.descriptionText]}>{description}</Text>
            ) : null}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <TextInput
                label="Surcharge Amount"
                value={surchargeAmount}
                onChangeText={handleChangeSurcharge}
                keyboardType="decimal-pad"
                inputMode="decimal"
                maxLength={6}
                mode="outlined"
                style={styles.textInput}
                right={<TextInput.Affix text={currencySymbol} />}
                error={!!surchargeError}
                disabled={loading}
              />
              {surchargeError ? (
                <Text style={{ color: colors.error, marginBottom: 8 }}>{surchargeError}</Text>
              ) : null}

              <TextInput
                label="Discount Amount"
                value={discountAmount}
                onChangeText={handleChangeDiscount}
                keyboardType="decimal-pad"
                inputMode="decimal"
                maxLength={6}
                mode="outlined"
                style={styles.textInput}
                right={<TextInput.Affix text={currencySymbol} />}
                error={!!discountError}
                disabled={loading}
              />
              {discountError ? (
                <Text style={{ color: colors.error, marginBottom: 8 }}>{discountError}</Text>
              ) : null}
            </KeyboardAvoidingView>
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={[styles.button, { borderColor: colors.primary }]}
                textColor={colors.primary}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => onConfirm(surchargeAmount, discountAmount)}
                style={[styles.button, { backgroundColor: colors.primary }]}
                loading={loading}
                disabled={loading}
              >
                Save
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    borderRadius: 16,
    padding: 0,
    elevation: 5,
    maxHeight: '80%',
    overflow: 'hidden',
  },
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
    minHeight: 56,
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
})

export default AdjustAmountModal
