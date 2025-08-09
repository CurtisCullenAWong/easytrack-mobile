import { useState } from 'react'
import { ScrollView, StyleSheet, View, Image } from 'react-native'
import { TextInput, Button, useTheme, Text, Portal, Dialog } from 'react-native-paper'
import useSnackbar from '../hooks/useSnackbar'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../../lib/supabase'

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in km
}

const deg2rad = (deg) => deg * (Math.PI / 180)

const parseGeometry = (geoString) => {
  if (!geoString) return null
  
  try {
    if (typeof geoString === 'string') {
      const coords = geoString.replace(/[POINT()]/g, '').split(' ')
      return {
        longitude: parseFloat(coords[0]),
        latitude: parseFloat(coords[1]),
      }
    } 
    
    if (geoString?.coordinates?.length >= 2) {
      return {
        longitude: parseFloat(geoString.coordinates[0]),
        latitude: parseFloat(geoString.coordinates[1]),
      }
    }
  } catch (error) {
    console.error('Error parsing geometry:', error)
  }
  return null
}

const ContractActionModalContent = ({ dialogType, onClose, onConfirm, loading, contract, showCancelConfirmation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [remarks, setRemarks] = useState('')
  const [checkingVicinity, setCheckingVicinity] = useState(false)
  const [proofOfDeliveryImage, setProofOfDeliveryImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showImageSourceDialog, setShowImageSourceDialog] = useState(false)

  const isDeliverAction = dialogType === 'deliver'
  const isCancelAction = dialogType === 'cancel'
  
  const getTitle = () => {
    if (isDeliverAction) return 'Mark as Delivered'
    if (isCancelAction) return showCancelConfirmation ? 'Confirm Cancellation' : 'Cancel Contract'
    return 'Mark as Failed'
  }

  const getDescription = () => {
    if (isDeliverAction) return 'Are you sure you want to mark this contract as delivered?'
    if (isCancelAction) {
      return showCancelConfirmation 
        ? 'WARNING: This action will cancel the contract and the airline will NOT be charged. This action cannot be undone. Are you absolutely sure you want to proceed?'
        : 'Are you sure you want to cancel this contract?'
    }
    return 'Are you sure you want to mark this contract as failed?'
  }

  const handleImageSource = async (source) => {
    setShowImageSourceDialog(false)
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          showSnackbar('Permission to access camera is required')
          return
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
          showSnackbar('Permission to access media library is required')
          return
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
          })

      if (!result.canceled) {
        setProofOfDeliveryImage(result.assets[0].uri)
      }
    } catch (error) {
      showSnackbar('Error picking image: ' + error.message)
    }
  }

  const uploadImage = async (imageUri) => {
    if (!imageUri?.startsWith('file://')) {
      return null
    }

    try {
      setUploadingImage(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const bucket = 'passenger-files'
      const folder = 'proof_of_delivery'
      const fileName = `${contract.tracking_id || contract.id}.png`
      const filePath = `${folder}/${fileName}`

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
    } finally {
      setUploadingImage(false)
    }
  }

  const handleConfirm = async () => {
    if (!remarks.trim() && !isDeliverAction) {
      showSnackbar('Please provide remarks for marking the contract as failed or cancelled')
      return
    }

    if (!proofOfDeliveryImage && !isCancelAction && !isDeliverAction) {
      showSnackbar('Please upload proof of delivery image')
      return
    }

    if (isDeliverAction || dialogType === 'failed') {
      try {
        setCheckingVicinity(true)
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          showSnackbar('Location permission is required to mark delivery status')
          return
        }

        const { coords: currentLocation } = await Location.getCurrentPositionAsync({})
        const dropOffCoords = parseGeometry(contract.drop_off_location_geo)

        if (!dropOffCoords) {
          showSnackbar('Drop-off location coordinates are missing')
          return
        }
console.log(currentLocation.latitude,
  currentLocation.longitude,
  dropOffCoords.latitude,
  dropOffCoords.longitude)
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          dropOffCoords.latitude,
          dropOffCoords.longitude
        )

        if (distance > 0.5) {
          showSnackbar('You must be within 500m of the drop-off location to mark delivery status')
          return
        }
      } catch (error) {
        showSnackbar('Error checking location: ' + error.message)
        return
      } finally {
        setCheckingVicinity(false)
      }
    }

    const imageUrl = proofOfDeliveryImage ? await uploadImage(proofOfDeliveryImage) : null
    if (!imageUrl && !isCancelAction && !isDeliverAction) {
      showSnackbar('Failed to upload proof of delivery image')
      return
    }

    onConfirm(remarks, imageUrl)
  }

  const getButtonColor = () => {
    if (isDeliverAction) return colors.primary
    return showCancelConfirmation ? colors.error : colors.error
  }

  const getButtonText = () => {
    if (showCancelConfirmation) return 'Cancel'
    return 'Confirm'
  }

  return (
    <>
      {SnackbarElement}
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <Text style={[fonts.headlineSmall, styles.headerText]}>
          {getTitle()}
        </Text>
        <Text style={[fonts.bodyMedium, styles.descriptionText]}>
          {getDescription()}
        </Text>
        {!isDeliverAction && (
          <TextInput
            label="Remarks"
            value={remarks}
            onChangeText={setRemarks}
            mode="outlined"
            style={styles.textInput}
            contentStyle={styles.textInputContent}
            multiline
            numberOfLines={3}
            placeholder="Enter remarks here..."
            autoCapitalize="none"
            autoCorrect={false}
            disabled={loading}
          />
        )}
        {!isCancelAction && !isDeliverAction && (
          <View style={styles.imageSection}>
            <Text style={[fonts.titleSmall, styles.imageLabel]}>
              Proof of Delivery Image
            </Text>
            {proofOfDeliveryImage && (
              <Image
                source={{ uri: proofOfDeliveryImage }}
                style={styles.imagePreview}
                resizeMode="contain"
              />
            )}
            <Button
              mode="outlined"
              onPress={() => setShowImageSourceDialog(true)}
              style={styles.imageButton}
              textColor={colors.primary}
              disabled={loading || uploadingImage}
            >
              {proofOfDeliveryImage ? 'Change Image' : 'Upload Image'}
            </Button>
          </View>
        )}
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={onClose}
            style={[styles.button, { borderColor: colors.primary }]}
            textColor={colors.primary}
            disabled={loading || checkingVicinity}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirm}
            style={[styles.button, { backgroundColor: getButtonColor() }]}
            loading={loading || checkingVicinity || uploadingImage}
            disabled={loading || checkingVicinity || uploadingImage}
          >
            {getButtonText()}
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={showImageSourceDialog}
          onDismiss={() => setShowImageSourceDialog(false)}
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
              onPress={() => setShowImageSourceDialog(false)}
              textColor={colors.error}
            >
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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