import React, { useState, useCallback } from 'react'
import { View, StyleSheet, Image, ScrollView } from 'react-native'
import { Text, Card, Button, useTheme, Portal, Dialog, Appbar, TextInput } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import useSnackbar from '../../../hooks/useSnackbar'
import { useFocusEffect } from '@react-navigation/native'
import { sendNotificationToUsers } from '../../../../utils/registerForPushNotifications'

const DeliveryConfirmation = ({ navigation, route }) => {
  const { contract, action = 'deliver' } = route.params || {}
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  
  const [state, setState] = useState({
    loading: false,
    saving: false,
    images: {
      proof_of_pickup: null,
      passenger_id: null,
      passenger_form: null,
      proof_of_delivery: null
    },
    dialogs: {
      imageSource: false,
      confirm: false
    },
    currentImageType: null,
    remarks: ''
  })

  useFocusEffect(
    useCallback(() => {
      updateImages({
        proof_of_pickup: null,
        passenger_id: null,
        passenger_form: null,
        proof_of_delivery: null
      })
    }, [])
  )

  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }))
  const updateImages = (updates) => setState(prev => ({ 
    ...prev, 
    images: { ...prev.images, ...updates } 
  }))
  const updateDialog = (dialog, value) => setState(prev => ({ 
    ...prev, 
    dialogs: { ...prev.dialogs, [dialog]: value } 
  }))

  const pickImage = async (type) => {
    try {
      updateState({ currentImageType: type })
      updateDialog('imageSource', true)
    } catch (error) {
      showSnackbar('Error selecting image: ' + error.message)
    }
  }

  const handleImageSource = async (source) => {
    updateDialog('imageSource', false)
    
    try {
      const options = { 
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 1,
        aspect: state.currentImageType === 'passenger_form' ? [9, 16] : [4, 3],
      }

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled) {
        const imageUri = result.assets[0].uri
        updateImages({ [state.currentImageType]: imageUri })
      }
    } catch (error) {
      showSnackbar('Error picking image: ' + error.message)
    }
  }

  const uploadImage = async (imageUri, type) => {
    if (!imageUri?.startsWith('file://')) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const bucket = 'passenger-files'
      const folder = type === 'proof_of_delivery' 
        ? 'proof_of_delivery' 
        : type === 'passenger_id' 
        ? 'passenger_id' 
        : type === 'passenger_form'
        ? 'passenger_form'
        : 'proof_of_pickup'

      const fileName = `${contract.id}.png`
      const filePath = `${folder}/${fileName}`

      // Remove existing file if exists
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([filePath])
      if (deleteError && !deleteError.message.includes('not found')) {
        console.error('Error deleting existing file:', deleteError)
      }

      // Read the file as a Blob directly
      const fileBlob = await (await fetch(imageUri)).blob()

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBlob, {
          contentType: fileBlob.type || 'image/png',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 31536000) // 1 year

      if (signedUrlError) throw signedUrlError

      return data.signedUrl
    } catch (error) {
      console.error('Upload error:', error)
      showSnackbar('Error uploading image: ' + error.message)
      return null
    }
  }


  const handleConfirm = async () => {
    try {
      updateState({ saving: true })

      if (action === 'pickup') {
        if (!state.images.proof_of_pickup) {
          showSnackbar('Please upload proof of pickup image')
          return
        }

        const proofUrl = await uploadImage(state.images.proof_of_pickup, 'proof_of_pickup')
        if (!proofUrl) {
          showSnackbar('Failed to upload proof of pickup image')
          return
        }

        const { error } = await supabase
          .from('contracts')
          .update({
            contract_status_id: 4, // In Transit
            pickup_at: new Date().toISOString(),
            proof_of_pickup: proofUrl,
          })
          .eq('id', contract.id)
        if (error) throw error
        // Notify airline about pickup/in-transit status
        try {
          await sendNotificationToUsers(
            contract.airline_id,
            'Luggage Picked Up',
            `Luggage for booking #${contract.id} has been picked up and is now in transit.`
          )
        } catch (notifyError) {
          console.error('Notification error (pickup):', notifyError)
        }
        showSnackbar('Luggage picked up successfully', true)
        navigation.navigate('ContractsInTransit')
        return
      }

      if (action === 'deliver') {
        if (!state.images.passenger_id || !state.images.passenger_form || !state.images.proof_of_delivery) {
          showSnackbar('Please upload all required images')
          return
        }
        const [passengerIdUrl, passengerFormUrl, proofOfDeliveryUrl] = await Promise.all([
          uploadImage(state.images.passenger_id, 'passenger_id'),
          uploadImage(state.images.passenger_form, 'passenger_form'),
          uploadImage(state.images.proof_of_delivery, 'proof_of_delivery')
        ])
        if (!passengerIdUrl || !passengerFormUrl || !proofOfDeliveryUrl) {
          showSnackbar('Failed to upload one or more images')
          return
        }
        const { error } = await supabase
          .from('contracts')
          .update({
            delivered_at: new Date().toISOString(),
            contract_status_id: 5, // Delivered
            passenger_id: passengerIdUrl,
            passenger_form: passengerFormUrl,
            proof_of_delivery: proofOfDeliveryUrl,
            remarks: state.remarks?.trim() || 'N/A'
          })
          .eq('id', contract.id)
        if (error) throw error
        // Notify airline about delivery
        try {
          await sendNotificationToUsers(
            contract.airline_id,
            'Delivery Confirmed',
            `Delivery for booking #${contract.id} has been completed.`
          )
        } catch (notifyError) {
          console.error('Notification error (deliver):', notifyError)
        }
        showSnackbar('Delivery confirmed successfully', true)
        navigation.navigate('BookingHistory')
        return
      }

      if (action === 'failed') {
        if (!state.images.proof_of_delivery) {
          showSnackbar('Please upload proof of delivery image')
          return
        }
        if (!state.remarks?.trim()) {
          showSnackbar('Please provide remarks')
          return
        }
        const proofUrl = await uploadImage(state.images.proof_of_delivery, 'proof_of_delivery')
        if (!proofUrl) {
          showSnackbar('Failed to upload proof image')
          return
        }
        const { error } = await supabase
          .from('contracts')
          .update({
            cancelled_at: new Date().toISOString(),
            contract_status_id: 6, // Failed
            remarks: state.remarks,
            proof_of_delivery: proofUrl
          })
          .eq('id', contract.id)
        if (error) throw error
        // Notify airline about failed delivery
        try {
          await sendNotificationToUsers(
            contract.airline_id,
            'Delivery Failed',
            `Delivery for booking #${contract.id} failed. Remarks: ${state.remarks}`
          )
        } catch (notifyError) {
          console.error('Notification error (failed):', notifyError)
        }
        showSnackbar('Contract marked as failed successfully', true)
        navigation.navigate('BookingHistory')
        return
      }

      if (action === 'cancel') {
        if (!state.remarks?.trim()) {
          showSnackbar('Please provide remarks')
          return
        }
        const { error } = await supabase
          .from('contracts')
          .update({
            cancelled_at: new Date().toISOString(),
            contract_status_id: 2, // Cancelled
            remarks: state.remarks,
          })
          .eq('id', contract.id)
        if (error) throw error
        // Notify airline about cancellation
        try {
          await sendNotificationToUsers(
            contract.airline_id,
            'Contract Cancelled',
            `Booking #${contract.id} was cancelled. Remarks: ${state.remarks}`
          )
        } catch (notifyError) {
          console.error('Notification error (cancel):', notifyError)
        }
        showSnackbar('Contract cancelled successfully', true)
        navigation.goBack()
        return
      }
    } catch (error) {
      console.error('Error processing action:', error)
      showSnackbar('Error: ' + error.message)
    } finally {
      updateState({ saving: false })
    }
  }

  const ImagePreview = ({ uri, type }) => {
    if (!uri) return null
    return (
      <View style={[
        styles.imagePreviewContainer,
        type === 'passenger_form' ? styles.verticalImageContainer : styles.horizontalImageContainer
      ]}>
        <Image 
          source={{ uri }} 
          style={styles.imagePreview}
          resizeMode="contain"
        />
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement')} />
        <Appbar.Content 
          title={action === 'pickup' ? 'Pickup Luggage' : action === 'deliver' ? 'Delivery Confirmation' : action === 'failed' ? 'Mark as Failed' : 'Cancel Contract'} 
          titleStyle={[{ color: colors.onSurface, ...fonts.titleLarge }]}
        />
      </Appbar.Header>

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          {action !== 'cancel' && (
            <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleMedium }]}>Required Documents</Text>
          )}

          {action === 'pickup' && (
            <>
              <Text style={[styles.subLabel, { color: colors.onSurface, ...fonts.titleSmall }]}>Proof of Pickup</Text>
              <ImagePreview uri={state.images.proof_of_pickup} type="proof_of_pickup" />
              <Button mode="outlined" onPress={() => pickImage('proof_of_pickup')} style={styles.button} textColor={colors.primary}>
                {state.images.proof_of_pickup ? 'Change Proof of Pickup' : 'Upload Proof of Pickup'}
              </Button>
            </>
          )}

          {action === 'deliver' && (
            <>
              <Text style={[styles.subLabel, { color: colors.onSurface, ...fonts.titleSmall }]}>Passenger ID</Text>
              <ImagePreview uri={state.images.passenger_id} type="passenger_id" />
              <Button mode="outlined" onPress={() => pickImage('passenger_id')} style={styles.button} textColor={colors.primary}>
                {state.images.passenger_id ? 'Change Passenger ID' : 'Upload Passenger ID'}
              </Button>

              <Text style={[styles.subLabel, { color: colors.onSurface, ...fonts.titleSmall }]}>Signed Passenger Form</Text>
              <ImagePreview uri={state.images.passenger_form} type="passenger_form" />
              <Button mode="outlined" onPress={() => pickImage('passenger_form')} style={styles.button} textColor={colors.primary}>
                {state.images.passenger_form ? 'Change Passenger Form' : 'Upload Passenger Form'}
              </Button>

              <Text style={[styles.subLabel, { color: colors.onSurface, ...fonts.titleSmall }]}>Proof of Delivery</Text>
              <ImagePreview uri={state.images.proof_of_delivery} type="proof_of_delivery" />
              <Button mode="outlined" onPress={() => pickImage('proof_of_delivery')} style={styles.button} textColor={colors.primary}>
                {state.images.proof_of_delivery ? 'Change Proof of Delivery' : 'Upload Proof of Delivery'}
              </Button>
            </>
          )}

          {action === 'failed' && (
            <>
              <Text style={[styles.subLabel, { color: colors.onSurface, ...fonts.titleSmall }]}>Proof of Delivery</Text>
              <ImagePreview uri={state.images.proof_of_delivery} type="proof_of_delivery" />
              <Button mode="outlined" onPress={() => pickImage('proof_of_delivery')} style={styles.button} textColor={colors.primary}>
                {state.images.proof_of_delivery ? 'Change Proof of Delivery' : 'Upload Proof of Delivery'}
              </Button>
            </>
          )}

          {(action === 'deliver' || action === 'failed' || action === 'cancel') && (
            <TextInput
              label="Remarks"
              value={state.remarks}
              onChangeText={(t) => updateState({ remarks: t })}
              mode="outlined"
              style={styles.button}
              multiline
              numberOfLines={3}
              placeholder={action === 'deliver' ? 'Optional (defaults to N/A)' : 'Required'}
            />
          )}

          <Button
            mode="contained"
            onPress={() => updateDialog('confirm', true)}
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            loading={state.saving}
            disabled={state.saving}
          >
            {action === 'pickup' ? 'Confirm Pickup' : action === 'deliver' ? 'Confirm Delivery' : action === 'failed' ? 'Confirm Failed' : 'Confirm Cancel'}
          </Button>
        </Card.Content>
      </Card>

      {/* Image Source Selection Dialog */}
      <Portal>
        <Dialog
          visible={state.dialogs.imageSource}
          onDismiss={() => updateDialog('imageSource', false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
            Choose Image Source
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
              Select where you want to get the image from
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => handleImageSource('camera')}
              textColor={colors.primary}
            >
              Camera
            </Button>
            <Button
              onPress={() => handleImageSource('gallery')}
              textColor={colors.primary}
            >
              Gallery
            </Button>
            <Button
              onPress={() => updateDialog('imageSource', false)}
              textColor={colors.error}
            >
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={state.dialogs.confirm}
          onDismiss={() => updateDialog('confirm', false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
            {action === 'pickup' ? 'Confirm Pickup' : action === 'deliver' ? 'Confirm Delivery' : action === 'failed' ? 'Confirm Failed' : 'Confirm Cancel'}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
              Are you sure you want to proceed? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => updateDialog('confirm', false)}
              textColor={colors.primary}
              disabled={state.saving}
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                updateDialog('confirm', false)
                handleConfirm()
              }}
              textColor={colors.primary}
              loading={state.saving}
              disabled={state.saving}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {SnackbarElement}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
  },
  label: {
    marginBottom: 16,
  },
  subLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  button: {
    marginBottom: 16,
  },
  confirmButton: {
    marginTop: 16,
  },
  imagePreviewContainer: {
    marginVertical: 8,
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  horizontalImageContainer: {
    aspectRatio: 4/3,
  },
  verticalImageContainer: {
    aspectRatio: 9/16,
    maxHeight: 400,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
})

export default DeliveryConfirmation 