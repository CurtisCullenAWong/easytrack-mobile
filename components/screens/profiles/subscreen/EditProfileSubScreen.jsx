import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  ActivityIndicator,
  Image,
} from 'react-native'
import {
  TextInput,
  Button,
  useTheme,
  Appbar,
  Text,
  Portal,
  Dialog,
  Avatar,
  Surface,
  Divider,
  IconButton,
} from 'react-native-paper'
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'

registerTranslation('en', en)

const EditProfileSubScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  
  // Validation functions
  const validateName = (name) => {
    if (!name) {
      return { isValid: false, message: 'Name cannot be empty' }
    }
    return { isValid: true }
  }

  const validateMiddleInitial = (initial) => {
    if (initial && !/^[A-Z]$/.test(initial)) {
      return { isValid: false, message: 'Middle initial must be a single uppercase letter' }
    }
    return { isValid: true }
  }

  const validatePhoneNumber = (number) => {
    if (number && !/^9\d{9}$/.test(number)) {
      return { isValid: false, message: 'Phone number must start with 9 and have 10 digits' }
    }
    return { isValid: true }
  }

  const validateBirthDate = (date) => {
    if (!date) {
      return { isValid: false, message: 'Birth date is required' }
    }
    const minDate = new Date(1935, 0, 1)
    const eighteenYearsAgo = new Date()
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
    
    if (date < minDate || date > eighteenYearsAgo) {
      return { isValid: false, message: 'You must be at least 18 years old' }
    }
    return { isValid: true }
  }

  const validateEmergencyContact = (name) => {
    if (name && !/^[A-Z][a-z']*(\s+[A-Z][a-z']*)*$/.test(name)) {
      return { isValid: false, message: 'Emergency contact name must start with capital letters and can only contain letters, spaces, and apostrophes' }
    }
    return { isValid: true }
  }

  // Combined state
  const [state, setState] = useState({
    loading: true,
    saving: false,
    image: null,
    form: {
      first_name: '',
      middle_initial: '',
      last_name: '',
      contact_number: '',
      birth_date: null,
      emergency_contact_name: '',
      emergency_contact_number: '',
      pfp_id: null,
    },
    inputValues: {
      first_name: '',
      middle_initial: '',
      last_name: '',
      contact_number: '',
      emergency_contact_name: '',
      emergency_contact_number: '',
    },
    dialogs: {
      confirm: false,
      datePicker: false,
      imageSource: false,
    }
  })

  // Simplified handlers
  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }))
  const updateForm = (updates) => setState(prev => ({ ...prev, form: { ...prev.form, ...updates } }))
  const updateInput = (updates) => setState(prev => ({ ...prev, inputValues: { ...prev.inputValues, ...updates } }))
  const updateDialog = (dialog, value) => setState(prev => ({ ...prev, dialogs: { ...prev.dialogs, [dialog]: value } }))

  const handleChange = (field, value) => {
    let sanitizedValue = value

    switch (field) {
      case 'first_name':
      case 'last_name':
      case 'emergency_contact_name':
        // Remove any characters that aren't letters, spaces, or apostrophes
        sanitizedValue = value.replace(/[^a-zA-Z\s']/g, '')
        break
      case 'middle_initial':
        sanitizedValue = value.toUpperCase()
        break
      case 'contact_number':
      case 'emergency_contact_number':
        const digitsOnly = value.replace(/\D/g, '')
        sanitizedValue = digitsOnly.startsWith('9') ? digitsOnly.slice(0, 10) : '9' + digitsOnly.slice(0, 9)
        break
      case 'birth_date':
        sanitizedValue = value
        break
    }

    updateForm({ [field]: sanitizedValue })
    updateInput({ [field]: sanitizedValue })
  }

  const capitalizeName = (name) => {
    return name.split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const handleDateConfirm = useCallback(({ date }) => {
    if (date) handleChange('birth_date', date)
    updateDialog('datePicker', false)
  }, [])

  const handleImageSource = async (source) => {
    updateDialog('imageSource', false)
    try {
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1, aspect: [1, 1] })

      if (!result.canceled) {
        updateState({ image: result.assets[0].uri })
        handleChange('pfp_id', result.assets[0].uri)
      }
    } catch (error) {
      showSnackbar('Error picking image: ' + error.message)
    }
  }

  const uploadImage = async () => {
    if (!state.image?.startsWith('file://')) return null
  
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const folder = {
        1: 'admin',
        2: 'airlines',
        3: 'delivery'
      }[profileData.role_id]

      if (!folder) throw new Error('Invalid role')

      const filePath = `${folder}/${user.id}.png`
      await supabase.storage.from('profile-images').remove([filePath])

      const base64 = await FileSystem.readAsStringAsync(state.image, { encoding: FileSystem.EncodingType.Base64 })
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, decode(base64), { contentType: 'image/png', upsert: true })
  
      if (error) throw error

      const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
        .from('profile-images')
        .createSignedUrl(filePath, 31536000)

      if (signedUrlError) throw signedUrlError
      return signedUrl
    } catch (error) {
      console.error('Upload error:', error)
      showSnackbar('Error uploading image: ' + error.message)
      return null
    }
  }

  const saveProfile = async () => {
    try {
      // Validate all required fields before saving
      const validations = [
        { field: 'first_name', value: state.form.first_name, validator: validateName },
        { field: 'last_name', value: state.form.last_name, validator: validateName },
        { field: 'middle_initial', value: state.form.middle_initial, validator: validateMiddleInitial },
        { field: 'contact_number', value: state.form.contact_number, validator: validatePhoneNumber },
        { field: 'birth_date', value: state.form.birth_date, validator: validateBirthDate },
        { field: 'emergency_contact_name', value: state.form.emergency_contact_name, validator: validateEmergencyContact },
        { field: 'emergency_contact_number', value: state.form.emergency_contact_number, validator: validatePhoneNumber }
      ]

      for (const validation of validations) {
        const result = validation.validator(validation.value)
        if (!result.isValid) {
          showSnackbar(result.message)
          return
        }
      }

      updateState({ saving: true })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role_id, pfp_id')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      let newPfpId = state.form.pfp_id
      if (state.image?.startsWith('file://')) {
        newPfpId = await uploadImage()
      }

      if (!newPfpId && currentProfile.pfp_id) {
        const folder = {
          1: 'admin',
          2: 'airlines',
          3: 'delivery'
        }[currentProfile.role_id]

        if (folder) {
          await supabase.storage
            .from('profile-images')
            .remove([`${folder}/${user.id}.png`])
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: capitalizeName(state.form.first_name),
          middle_initial: capitalizeName(state.form.middle_initial),
          last_name: capitalizeName(state.form.last_name),
          contact_number: state.form.contact_number ? `+63${state.form.contact_number}` : null,
          birth_date: state.form.birth_date,
          emergency_contact_name: capitalizeName(state.form.emergency_contact_name),
          emergency_contact_number: state.form.emergency_contact_number ? `+63${state.form.emergency_contact_number}` : null,
          pfp_id: newPfpId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      showSnackbar('Profile updated successfully', true)
      navigation.navigate('Profile')
    } catch (error) {
      showSnackbar('Error updating profile: ' + error.message)
    } finally {
      updateState({ saving: false })
    }
  }

  const fetchProfile = async () => {
    try {
      updateState({ loading: true })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      const initialData = {
        first_name: data.first_name || '',
        middle_initial: data.middle_initial || '',
        last_name: data.last_name || '',
        contact_number: data.contact_number?.replace('+63', '') || '',
        birth_date: data.birth_date ? new Date(data.birth_date) : null,
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_number: data.emergency_contact_number?.replace('+63', '') || '',
        pfp_id: data.pfp_id || null,
      }

      updateState({
        form: initialData,
        inputValues: { ...initialData },
        loading: false
      })
    } catch (error) {
      showSnackbar('Error loading profile: ' + error.message)
      updateState({ loading: false })
    }
  }

  useFocusEffect(useCallback(() => { fetchProfile() }, []))

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('Profile')} />
        <Appbar.Content title='Edit Profile' />
        <Appbar.Action 
          icon='content-save' 
          onPress={() => updateDialog('confirm', true)} 
          disabled={state.loading}
          color={colors.primary}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps='handled'>
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.profileContainer}>
            {state.form.pfp_id ? (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: state.form.pfp_id }} 
                  style={styles.imagePreview}
                  resizeMode='cover'
                />
                <IconButton
                  icon='close-circle'
                  size={20}
                  iconColor={colors.error}
                  style={[styles.removeImageButton, { backgroundColor: colors.surface }]}
                  onPress={() => handleChange('pfp_id', null)}
                />
              </View>
            ) : (
              <Avatar.Text size={80} label={(state.form.first_name || 'N')[0].toUpperCase()} />
            )}
            <Button
              mode='outlined'
              onPress={() => updateDialog('imageSource', true)}
              style={styles.profilePictureButton}
              textColor={colors.primary}
              disabled={state.saving}
            >
              {state.form.pfp_id ? 'Change Profile Picture' : 'Upload Profile Picture'}
            </Button>
          </View>

          <Divider style={styles.divider} />

          <TextInput
            label='First Name'
            value={state.inputValues.first_name}
            onChangeText={(text) => handleChange('first_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='words'
            maxLength={35}
          />

          <TextInput
            label='Middle Initial'
            value={state.inputValues.middle_initial}
            onChangeText={(text) => handleChange('middle_initial', text)}
            mode='outlined'
            style={styles.input}
            maxLength={1}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='characters'
          />

          <TextInput
            label='Last Name'
            value={state.inputValues.last_name}
            onChangeText={(text) => handleChange('last_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='words'
            maxLength={35}
          />

          <Divider style={styles.divider} />

          <TextInput
            label='Contact Number'
            value={state.inputValues.contact_number}
            onChangeText={(text) => handleChange('contact_number', text)}
            mode='outlined'
            style={styles.input}
            keyboardType='phone-pad'
            left={<TextInput.Affix text='+63' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            maxLength={10}
          />

          <TextInput
            label='Birth Date'
            value={state.form.birth_date ? state.form.birth_date.toLocaleDateString() : ''}
            editable={false}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='calendar' onPress={() => updateDialog('datePicker', true)} />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
          />

          <Divider style={styles.divider} />

          <TextInput
            label='Emergency Contact Name and Last Name'
            value={state.inputValues.emergency_contact_name}
            onChangeText={(text) => handleChange('emergency_contact_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='words'
            maxLength={50}
          />

          <TextInput
            label='Emergency Contact Number'
            value={state.inputValues.emergency_contact_number}
            onChangeText={(text) => handleChange('emergency_contact_number', text)}
            mode='outlined'
            style={styles.input}
            keyboardType='phone-pad'
            left={<TextInput.Affix text='+63' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            maxLength={10}
          />
        </Surface>
      </ScrollView>

      <Portal>
        <DatePickerModal
          locale='en'
          mode='single'
          visible={state.dialogs.datePicker}
          onDismiss={() => updateDialog('datePicker', false)}
          date={state.form.birth_date}
          onConfirm={handleDateConfirm}
          title='Select Birth Date'
          animationType='slide'
          presentationStyle='formSheet'
          saveLabel='Select'
          label='Enter the birth date'
          startYear={1935}
          endYear={new Date().getFullYear() - 18}
          validRange={{
            startDate: new Date(1935, 0, 1),
            endDate: new Date().getFullYear() - 18,
          }}
        />
      </Portal>

      <Portal>
        <Dialog
          visible={state.dialogs.imageSource}
          onDismiss={() => updateDialog('imageSource', false)}
          style={{ backgroundColor: colors.surface }}>
          <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
            Choose Image Source
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
              Select where you want to get the image from
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => handleImageSource('camera')} textColor={colors.primary}>
              Camera
            </Button>
            <Button onPress={() => handleImageSource('gallery')} textColor={colors.primary}>
              Gallery
            </Button>
            <Button onPress={() => updateDialog('imageSource', false)} textColor={colors.error}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={state.dialogs.confirm}
          onDismiss={() => updateDialog('confirm', false)}
          style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Save Changes</Dialog.Title>
          <Dialog.Content>
            <Text variant='bodyMedium'>Are you sure you want to save these changes?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => updateDialog('confirm', false)} disabled={state.saving}>Cancel</Button>
            <Button onPress={() => {
              updateDialog('confirm', false)
              saveProfile()
            }} loading={state.saving} disabled={state.saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {SnackbarElement}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scrollContainer: { 
    flexGrow: 1, 
    padding: 16
  },
  surface: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  profileContainer: {
    alignItems: 'center',
  },
  avatarText: {
    marginTop: 8,
  },
  input: { 
    marginBottom: 16
  },
  divider: {
    marginVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    marginVertical: 8,
    position: 'relative',
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 1000
  },
  profilePictureButton: {
    marginTop: 8,
  },
})

export default EditProfileSubScreen