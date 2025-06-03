import React, { useState, useCallback } from 'react'
import { View, StyleSheet, Image, ScrollView } from 'react-native'
import { Text, Card, Button, useTheme, Portal, Dialog, Appbar } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import useSnackbar from '../../../hooks/useSnackbar'
import { useFocusEffect } from '@react-navigation/native'

const DeliveryConfirmation = ({ navigation, route }) => {
  const { contract } = route.params
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  
  const [state, setState] = useState({
    loading: false,
    saving: false,
    images: {
      passenger_id: null,
      passenger_form: null
    },
    dialogs: {
      imageSource: false,
      confirm: false
    },
    currentImageType: null
  })

  // Clear images when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      updateImages({
        passenger_id: null,
        passenger_form: null
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: state.currentImageType === 'passenger_form' ? [9, 16] : [16, 9],
      }

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled) {
        const imageUri = result.assets[0].uri
        // Store the local URI temporarily
        updateImages({ [state.currentImageType]: imageUri })
      }
    } catch (error) {
      showSnackbar('Error picking image: ' + error.message)
    }
  }

  const uploadImage = async (imageUri, type) => {
    if (!imageUri?.startsWith('file://')) {
      return null
    }
  
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const bucket = 'passenger-files'
      const folder = type === 'passenger_id' ? 'passenger_id' : 'passenger_form'
      const fileName = `${contract.id}_${type}.png`

      // Delete existing file if any
      const filePath = `${folder}/${fileName}`
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      // Ignore delete error if file doesn't exist
      if (deleteError && !deleteError.message.includes('not found')) {
        console.error('Error deleting existing file:', deleteError)
      }

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const contentType = 'image/png'
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, decode(base64), { 
          contentType,
          upsert: true
        })
    
      if (uploadError) {
        throw uploadError
      }

      // Get a signed URL that's valid for a long time (e.g., 1 year)
      const { data, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 31536000)

      if (signedUrlError) {
        throw signedUrlError
      }

      return data.signedUrl
    } catch (error) {
      console.error('Upload error:', error)
      showSnackbar('Error uploading image: ' + error.message)
      return null
    }
  }

  const handleConfirmDelivery = async () => {
    try {
      updateState({ saving: true })

      if (!state.images.passenger_id || !state.images.passenger_form) {
        showSnackbar('Please upload both required images')
        return
      }

      // Upload both images only when confirming
      const [passengerIdUrl, passengerFormUrl] = await Promise.all([
        uploadImage(state.images.passenger_id, 'passenger_id'),
        uploadImage(state.images.passenger_form, 'passenger_form')
      ])

      if (!passengerIdUrl || !passengerFormUrl) {
        showSnackbar('Failed to upload one or more images')
        return
      }

      // Update contract status
      const { error: updateError } = await supabase
        .from('contract')
        .update({ 
          delivered_at: new Date().toISOString(),
          contract_status_id: 5, // Delivered
          passenger_id: passengerIdUrl,
          passenger_form: passengerFormUrl
        })
        .eq('id', contract.id)

      if (updateError) throw updateError

      showSnackbar('Delivery confirmed successfully', true)
      navigation.navigate('BookingHistory')
    } catch (error) {
      console.error('Error confirming delivery:', error)
      showSnackbar('Error confirming delivery: ' + error.message)
    } finally {
      updateState({ saving: false })
    }
  }

  const ImagePreview = ({ uri, type }) => {
    if (!uri) return null
    return (
      <View style={[
        styles.imagePreviewContainer,
        type === 'passenger_form' && styles.verticalImageContainer
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
          title="Delivery Confirmation" 
          titleStyle={[{ color: colors.onSurface, ...fonts.titleLarge }]}
        />
      </Appbar.Header>

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleMedium }]}>
            Required Documents
          </Text>

          <Text style={[styles.subLabel, { color: colors.onSurface, ...fonts.titleSmall }]}>
            Passenger ID
          </Text>
          <ImagePreview uri={state.images.passenger_id} type="passenger_id" />
          <Button
            mode="outlined"
            onPress={() => pickImage('passenger_id')}
            style={styles.button}
            textColor={colors.primary}
          >
            {state.images.passenger_id ? 'Change Passenger ID' : 'Upload Passenger ID'}
          </Button>

          <Text style={[styles.subLabel, { color: colors.onSurface, ...fonts.titleSmall }]}>
            Signed Passenger Form
          </Text>
          <ImagePreview uri={state.images.passenger_form} type="passenger_form" />
          <Button
            mode="outlined"
            onPress={() => pickImage('passenger_form')}
            style={styles.button}
            textColor={colors.primary}
          >
            {state.images.passenger_form ? 'Change Passenger Form' : 'Upload Passenger Form'}
          </Button>

          <Button
            mode="contained"
            onPress={() => updateDialog('confirm', true)}
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            loading={state.saving}
            disabled={state.saving || !state.images.passenger_id || !state.images.passenger_form}
          >
            Confirm Delivery
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
            Confirm Delivery
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
              Are you sure you want to confirm this delivery? This action cannot be undone.
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
                handleConfirmDelivery()
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
    aspectRatio: 16/9,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
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