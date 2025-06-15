import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ScrollView, View, StyleSheet, Image, SafeAreaView, ActivityIndicator } from 'react-native'
import { Text, Card, Button, TextInput, useTheme, Portal, Dialog, IconButton, Appbar, Menu } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import useSnackbar from '../../../hooks/useSnackbar'

const ProfileVerification = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  
  // Add error state
  const [errors, setErrors] = useState({
    gov_id_type: '',
    gov_id_number: '',
    gov_id_proof: '',
    gov_id_proof_back: '',
    vehicle_info: '',
    vehicle_plate_number: '',
    vehicle_or_cr: ''
  })

  // Validation functions
  const validateIdType = (type) => {
    if (!type) {
      setErrors(prev => ({ ...prev, gov_id_type: 'Please select an ID type' }))
      return false
    }
    setErrors(prev => ({ ...prev, gov_id_type: '' }))
    return true
  }

  const validateIdNumber = (number) => {
    if (!number?.trim()) {
      setErrors(prev => ({ ...prev, gov_id_number: 'Please enter your ID number' }))
      return false
    }
    if (number.length < 9) {
      setErrors(prev => ({ ...prev, gov_id_number: 'ID number must be at least 9 characters long' }))
      return false
    }
    if (number.length > 13) {
      setErrors(prev => ({ ...prev, gov_id_number: 'ID number cannot exceed 13 characters' }))
      return false
    }
    setErrors(prev => ({ ...prev, gov_id_number: '' }))
    return true
  }

  const validateIdProof = (proof) => {
    if (!proof) {
      setErrors(prev => ({ ...prev, gov_id_proof: 'Please upload your ID proof (front)' }))
      return false
    }
    setErrors(prev => ({ ...prev, gov_id_proof: '' }))
    return true
  }

  const validateIdProofBack = (proof) => {
    if (!proof) {
      setErrors(prev => ({ ...prev, gov_id_proof_back: 'Please upload your ID proof (back)' }))
      return false
    }
    setErrors(prev => ({ ...prev, gov_id_proof_back: '' }))
    return true
  }

  const validateVehicleInfo = (info) => {
    if (!info?.trim()) {
      setErrors(prev => ({ ...prev, vehicle_info: 'Please enter vehicle description' }))
      return false
    }
    if (info.length < 3) {
      setErrors(prev => ({ ...prev, vehicle_info: 'Vehicle description must be at least 3 characters long' }))
      return false
    }
    if (info.length > 50) {
      setErrors(prev => ({ ...prev, vehicle_info: 'Vehicle description cannot exceed 50 characters' }))
      return false
    }
    setErrors(prev => ({ ...prev, vehicle_info: '' }))
    return true
  }

  const validatePlateNumber = (number) => {
    if (!number?.trim()) {
      setErrors(prev => ({ ...prev, vehicle_plate_number: 'Please enter vehicle plate number' }))
      return false
    }
    if (number.length < 3) {
      setErrors(prev => ({ ...prev, vehicle_plate_number: 'Plate number must be at least 3 characters long' }))
      return false
    }
    if (number.length > 12) {
      setErrors(prev => ({ ...prev, vehicle_plate_number: 'Plate number cannot exceed 12 characters' }))
      return false
    }
    setErrors(prev => ({ ...prev, vehicle_plate_number: '' }))
    return true
  }

  const validateOrCr = (document) => {
    if (!document) {
      setErrors(prev => ({ ...prev, vehicle_or_cr: 'Please upload OR/CR document' }))
      return false
    }
    setErrors(prev => ({ ...prev, vehicle_or_cr: '' }))
    return true
  }

  // Combined state
  const [state, setState] = useState({
    loading: true,
    saving: false,
    roleId: null,
    idTypes: [],
    form: {
      gov_id_type: null,
      gov_id_type_id: null,
      gov_id_number: null,
      gov_id_proof: null,
      gov_id_proof_back: null,
      vehicle_info: null,
      vehicle_plate_number: null,
      vehicle_or_cr: null
    },
    dialogs: {
      imageSource: false,
      permission: false,
      confirm: false
    },
    currentImageType: null
  })

  // Simplified handlers
  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }))
  const updateForm = (updates) => setState(prev => ({ ...prev, form: { ...prev.form, ...updates } }))
  const updateDialog = (dialog, value) => setState(prev => ({ ...prev, dialogs: { ...prev.dialogs, [dialog]: value } }))

  const handleChange = (field, value) => {
    let sanitizedValue = value

    switch (field) {
      case 'gov_id_number':
        sanitizedValue = value.replace(/[^0-9]/g, '')
        validateIdNumber(sanitizedValue)
        break
      case 'vehicle_plate_number':
        sanitizedValue = value.replace(/[^A-Z0-9-]/gi, '').toUpperCase()
        validatePlateNumber(sanitizedValue)
        break
      case 'vehicle_info':
        sanitizedValue = value
        validateVehicleInfo(sanitizedValue)
        break
      case 'gov_id_type':
        sanitizedValue = value
        validateIdType(sanitizedValue)
        break
      case 'gov_id_proof':
        sanitizedValue = value
        validateIdProof(sanitizedValue)
        break
      case 'gov_id_proof_back':
        sanitizedValue = value
        validateIdProofBack(sanitizedValue)
        break
      case 'vehicle_or_cr':
        sanitizedValue = value
        validateOrCr(sanitizedValue)
        break
      default:
        sanitizedValue = value
    }

    updateForm({ [field]: sanitizedValue })
  }

  const handleImageSource = async (source) => {
    updateDialog('imageSource', false)
    
    try {
      const options = { 
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 1,
        aspect: [16, 9],
      }

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled) {
        const imageUri = result.assets[0].uri
        handleChange(state.currentImageType, imageUri)
      }
    } catch (error) {
      console.error('Error picking image:', error)
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

      // Determine bucket and folder based on role_id and image type
      let bucket, folder, fileName
      if (type === 'front' || type === 'back') {
        bucket = 'gov-id'
        folder = state.roleId === 1 ? 'admin' : state.roleId === 2 ? 'delivery' : 'airlines'
        fileName = `${user.id}_gov_id_${type}.png`
      } else if (type === 'vehicle_or_cr') {
        bucket = 'or-cr'
        folder = 'delivery'
        fileName = `${user.id}_vehicle_or_cr.png`
      } else {
        throw new Error('Invalid image type')
      }

      // Delete existing file for this user
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
      
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, decode(base64), { 
          contentType,
          upsert: true
        })
    
      if (error) {
        showSnackbar('Error uploading image: ' + error.message)
        return null
      }

      // Get a signed URL that's valid for a long time (e.g., 1 year)
      const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 31536000)

      if (signedUrlError) {
        throw signedUrlError
      }

      return signedUrl
    } catch (error) {
      console.error('Upload error:', error)
      showSnackbar('Error uploading image: ' + error.message)
      return null
    }
  }

  // Pick image from camera or gallery for either id proof and or/cr
  const pickImage = (type) => {
    updateState({ currentImageType: type })
    updateDialog('imageSource', true)
  }
  
  const saveVerification = async () => {
    try {
      // Validate all required fields
      const validations = [
        validateIdType(state.form.gov_id_type_id),
        validateIdNumber(state.form.gov_id_number),
        validateIdProof(state.form.gov_id_proof),
        validateIdProofBack(state.form.gov_id_proof_back)
      ]

      // Additional validation for delivery role
      if (state.roleId === 2) {
        validations.push(
          validateVehicleInfo(state.form.vehicle_info),
          validatePlateNumber(state.form.vehicle_plate_number),
          validateOrCr(state.form.vehicle_or_cr)
        )
      }

      if (validations.some(valid => !valid)) {
        showSnackbar('Please fix the validation errors before saving')
        return
      }

      updateState({ saving: true })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showSnackbar('User not authenticated')
        return navigation.navigate('Login')
      }

      // Get current profile data including existing image URLs
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('gov_id_proof, gov_id_proof_back, vehicle_or_cr')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      // Upload images if they exist and are new
      let govIdProofUrl = state.form.gov_id_proof
      let govIdProofBackUrl = state.form.gov_id_proof_back
      let vehicleOrCrUrl = state.form.vehicle_or_cr

      if (state.form.gov_id_proof?.startsWith('file://')) {
        govIdProofUrl = await uploadImage(state.form.gov_id_proof, 'front')
        if (!govIdProofUrl) {
          showSnackbar('Failed to upload government ID proof (front)')
          updateState({ saving: false })
          return
        }
      } else if (!state.form.gov_id_proof && currentProfile.gov_id_proof) {
        // If image was removed, delete from storage
        const bucket = 'gov-id'
        const folder = state.roleId === 1 ? 'admin' : state.roleId === 2 ? 'delivery' : 'airlines'
        const filePath = `${folder}/${user.id}_front.png`
        await supabase.storage
          .from(bucket)
          .remove([filePath])
      }

      if (state.form.gov_id_proof_back?.startsWith('file://')) {
        govIdProofBackUrl = await uploadImage(state.form.gov_id_proof_back, 'back')
        if (!govIdProofBackUrl) {
          showSnackbar('Failed to upload government ID proof (back)')
          updateState({ saving: false })
          return
        }
      } else if (!state.form.gov_id_proof_back && currentProfile.gov_id_proof_back) {
        // If image was removed, delete from storage
        const bucket = 'gov-id'
        const folder = state.roleId === 1 ? 'admin' : state.roleId === 2 ? 'delivery' : 'airlines'
        const filePath = `${folder}/${user.id}_back.png`
        await supabase.storage
          .from(bucket)
          .remove([filePath])
      }

      if (state.form.vehicle_or_cr?.startsWith('file://')) {
        vehicleOrCrUrl = await uploadImage(state.form.vehicle_or_cr, 'vehicle_or_cr')
        if (!vehicleOrCrUrl) {
          showSnackbar('Failed to upload OR/CR document')
          updateState({ saving: false })
          return
        }
      } else if (!state.form.vehicle_or_cr && currentProfile.vehicle_or_cr) {
        // If image was removed, delete from storage
        const bucket = 'or-cr'
        const folder = 'delivery'
        const filePath = `${folder}/${user.id}_vehicle_or_cr.png`
        await supabase.storage
          .from(bucket)
          .remove([filePath])
      }

      // Update verification status with signed URLs
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          verify_status_id: 3,
          updated_at: new Date().toISOString(),
          gov_id_type: state.form.gov_id_type_id,
          gov_id_number: state.form.gov_id_number,
          gov_id_proof: govIdProofUrl,
          gov_id_proof_back: govIdProofBackUrl,
          vehicle_info: state.form.vehicle_info,
          vehicle_plate_number: state.form.vehicle_plate_number,
          vehicle_or_cr: vehicleOrCrUrl
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      showSnackbar('Verification submitted successfully', true)
      navigation.navigate('Profile')
    } catch (error) {
      console.error('Error submitting verification:', error)
      showSnackbar('Error submitting verification')
    } finally {
      updateState({ saving: false })
    }
  }

  const fetchVerificationData = async () => {
    try {
      updateState({ loading: true })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData, error: profileError }, { data: idTypes, error: idTypesError }] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            verify_status_id,
            gov_id_type,
            gov_id_number,
            gov_id_proof,
            gov_id_proof_back,
            vehicle_info,
            vehicle_plate_number,
            vehicle_or_cr,
            role_id,
            verify_info_type:gov_id_type (id_type_name)
          `)
          .eq('id', user.id)
          .single(),
        supabase
          .from('verify_info_type')
          .select('id, id_type_name')
          .order('id_type_name')
      ])

      if (profileError) throw profileError
      if (idTypesError) throw idTypesError

      // If verification data exists, load it into the form
      if (profileData) {
        updateForm({
          gov_id_type: profileData.verify_info_type?.id_type_name || '',
          gov_id_type_id: profileData.gov_id_type || null,
          gov_id_number: profileData.gov_id_number || '',
          gov_id_proof: profileData.gov_id_proof || null,
          gov_id_proof_back: profileData.gov_id_proof_back || null,
          vehicle_info: profileData.vehicle_info || '',
          vehicle_plate_number: profileData.vehicle_plate_number || '',
          vehicle_or_cr: profileData.vehicle_or_cr || null
        })
        updateState({ roleId: profileData.role_id })
      }

      if (idTypes) {
        updateState({ idTypes: idTypes || [] })
      }
    } catch (error) {
      console.error('Error loading verification data:', error)
      showSnackbar('Error loading verification data')
    } finally {
      updateState({ loading: false })
    }
  }

  useFocusEffect(useCallback(() => { fetchVerificationData() }, []))

  const ImagePreview = ({ uri }) => {
    if (!uri) return null
    return (
      <View style={styles.imagePreviewContainer}>
        <Image 
          source={{ uri }} 
          style={styles.imagePreview}
          resizeMode="contain"
        />
      </View>
    )
  }

  if (state.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.navigate('Profile')} />
          <Appbar.Content title='Account Verification' titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('Profile')} />
        <Appbar.Content 
          title="Account Verification" 
          titleStyle={[{ color: colors.onSurface, ...fonts.titleLarge }]}
        />
        <Appbar.Action 
          icon="content-save" 
          onPress={() => updateDialog('confirm', true)} 
          disabled={state.saving}
          color={colors.primary}
        />
      </Appbar.Header>

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          {/* Government ID Section */}
          <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleMedium }]}>
            Government ID Information
          </Text>
          
          <Menu
            visible={state.dialogs.idTypeMenu}
            onDismiss={() => updateDialog('idTypeMenu', false)}
            anchor={
              <TextInput
                label="ID Type"
                value={state.form.gov_id_type}
                editable={false}
                style={styles.input}
                mode="outlined"
                right={<TextInput.Icon icon="chevron-down" onPress={() => updateDialog('idTypeMenu', true)} />}
                theme={{ colors: { primary: colors.primary } }}
                error={!!errors.gov_id_type}
                helperText={errors.gov_id_type}
              />
            }
            contentStyle={{ backgroundColor: colors.surface }}
          >
            {state.idTypes.map((type) => (
              <Menu.Item
                key={type.id}
                onPress={() => {
                  handleChange('gov_id_type', type.id_type_name)
                  handleChange('gov_id_type_id', type.id)
                  updateDialog('idTypeMenu', false)
                }}
                title={type.id_type_name}
                titleStyle={[
                  fonts.bodyLarge,
                  {
                    color: state.form.gov_id_type === type.id_type_name ? colors.primary : colors.onSurface,
                  },
                ]}
                leadingIcon={state.form.gov_id_type === type.id_type_name ? 'check' : undefined}
              />
            ))}
          </Menu>
          
          <TextInput
            label="ID Number"
            value={state.form.gov_id_number}
            onChangeText={(text) => handleChange('gov_id_number', text)}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            maxLength={12}
            theme={{ colors: { primary: colors.primary } }}
            error={!!errors.gov_id_number}
            helperText={errors.gov_id_number}
          />

          <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleSmall }]}>
            ID Proof (Front)
          </Text>
          <ImagePreview 
            uri={state.form.gov_id_proof} 
            type="gov_id_proof"
          />
          {errors.gov_id_proof && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.gov_id_proof}
            </Text>
          )}

          <Button
            mode="outlined"
            onPress={() => pickImage('gov_id_proof')}
            style={styles.button}
            textColor={colors.primary}
          >
            {state.form.gov_id_proof ? 'Change ID Proof (Front)' : 'Upload ID Proof (Front)'}
          </Button>

          <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleSmall }]}>
            ID Proof (Back)
          </Text>
          <ImagePreview 
            uri={state.form.gov_id_proof_back} 
            type="gov_id_proof_back"
          />
          {errors.gov_id_proof_back && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.gov_id_proof_back}
            </Text>
          )}

          <Button
            mode="outlined"
            onPress={() => pickImage('gov_id_proof_back')}
            style={styles.button}
            textColor={colors.primary}
          >
            {state.form.gov_id_proof_back ? 'Change ID Proof (Back)' : 'Upload ID Proof (Back)'}
          </Button>

          {state.roleId === 2 && (
            <>
              {/* Vehicle Information Section */}
              <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleMedium, marginTop: 20 }]}>
                Vehicle Information
              </Text>

              <TextInput
                label="Vehicle Description"
                value={state.form.vehicle_info}
                onChangeText={(text) => handleChange('vehicle_info', text)}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: colors.primary } }}
                maxLength={50}
                error={!!errors.vehicle_info}
                helperText={errors.vehicle_info}
              />

              <TextInput
                label="Plate Number"
                value={state.form.vehicle_plate_number}
                onChangeText={(text) => handleChange('vehicle_plate_number', text)}
                mode="outlined"
                style={styles.input}
                maxLength={12}
                theme={{ colors: { primary: colors.primary } }}
                error={!!errors.vehicle_plate_number}
                helperText={errors.vehicle_plate_number}
              />  

              <ImagePreview 
                uri={state.form.vehicle_or_cr} 
                type="vehicle_or_cr"
              />
              {errors.vehicle_or_cr && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.vehicle_or_cr}
                </Text>
              )}

              <Button
                mode="outlined"
                onPress={() => pickImage('vehicle_or_cr')}
                style={styles.button}
                textColor={colors.primary}
              >
                {state.form.vehicle_or_cr ? 'Change OR/CR Document' : 'Upload OR/CR Document'}
              </Button>
            </>
          )}
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

      {/* Permission Dialog */}
      <Portal>
        <Dialog
          visible={state.dialogs.permission}
          onDismiss={() => updateDialog('permission', false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
            Permission Required
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
              Please grant camera permissions to take photos
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => updateDialog('permission', false)}
              textColor={colors.primary}
            >
              OK
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
            Submit Verification
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
              Are you sure you want to submit your verification details?
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
                saveVerification()
              }}
              textColor={colors.primary}
              loading={state.saving}
              disabled={state.saving}
            >
              Submit
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
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
  },
  label: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
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
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 16,
    fontSize: 12,
  },
})

export default ProfileVerification
