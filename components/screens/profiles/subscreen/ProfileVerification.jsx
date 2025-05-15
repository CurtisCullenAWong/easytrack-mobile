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
  
  // Validation functions
  const validateIdType = (type) => {
    if (!type) {
      return { isValid: false, message: 'Please select an ID type' }
    }
    return { isValid: true }
  }

  const validateIdNumber = (number) => {
    if (!number?.trim()) {
      return { isValid: false, message: 'Please enter your ID number' }
    }
    return { isValid: true }
  }

  const validateIdProof = (proof) => {
    if (!proof) {
      return { isValid: false, message: 'Please upload your ID proof (front)' }
    }
    return { isValid: true }
  }

  const validateIdProofBack = (proof) => {
    if (!proof) {
      return { isValid: false, message: 'Please upload your ID proof (back)' }
    }
    return { isValid: true }
  }

  const validateVehicleInfo = (info) => {
    if (!info?.trim()) {
      return { isValid: false, message: 'Please enter vehicle description' }
    }
    return { isValid: true }
  }

  const validatePlateNumber = (number) => {
    if (!number?.trim()) {
      return { isValid: false, message: 'Please enter vehicle plate number' }
    }
    return { isValid: true }
  }

  const validateOrCr = (document) => {
    if (!document) {
      return { isValid: false, message: 'Please upload OR/CR document' }
    }
    return { isValid: true }
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
        break
      case 'vehicle_plate_number':
        sanitizedValue = value.replace(/[^A-Z0-9-]/gi, '').toUpperCase()
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
        mediaTypes: ['images'],
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
      // Validate all required fields before saving
      const validations = [
        { field: 'gov_id_type', value: state.form.gov_id_type_id, validator: validateIdType },
        { field: 'gov_id_number', value: state.form.gov_id_number, validator: validateIdNumber },
        { field: 'gov_id_proof', value: state.form.gov_id_proof, validator: validateIdProof },
        { field: 'gov_id_proof_back', value: state.form.gov_id_proof_back, validator: validateIdProofBack }
      ]
  
      // Additional validation for delivery role
      if (state.roleId === 2) {
        validations.push(
          { field: 'vehicle_info', value: state.form.vehicle_info, validator: validateVehicleInfo },
          { field: 'vehicle_plate_number', value: state.form.vehicle_plate_number, validator: validatePlateNumber },
          { field: 'vehicle_or_cr', value: state.form.vehicle_or_cr, validator: validateOrCr }
        )
      }
  
      for (const validation of validations) {
        const result = validation.validator(validation.value)
        if (!result.isValid) {
          showSnackbar(result.message)
          return false
        }
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

  const ImagePreview = ({ uri, onRemove, type }) => {
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
          <Appbar.Content title='Edit Profile' titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
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
          />

          <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleSmall }]}>
            ID Proof (Front)
          </Text>
          <ImagePreview 
            uri={state.form.gov_id_proof} 
            type="gov_id_proof"
          />

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
              />

              <TextInput
                label="Plate Number"
                value={state.form.vehicle_plate_number}
                onChangeText={(text) => handleChange('vehicle_plate_number', text)}
                mode="outlined"
                style={styles.input}
                maxLength={12}
                theme={{ colors: { primary: colors.primary } }}
              />  

              <ImagePreview 
                uri={state.form.vehicle_or_cr} 
                type="vehicle_or_cr"
              />

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
})

export default ProfileVerification
