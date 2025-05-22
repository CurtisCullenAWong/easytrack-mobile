import React, { useState, useCallback, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  ActivityIndicator,
  Image,
  TouchableOpacity,
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
import { DatePickerModal, el, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
registerTranslation('en', en)

const EditProfileSubScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  
  // Add error state
  const [errors, setErrors] = useState({
    email: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    suffix: '',
    contact_number: '',
    birth_date: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
  })

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email address' }))
      return false
    }
    setErrors(prev => ({ ...prev, email: '' }))
    return true
  }

  const validateName = (name, field) => {
    if (!name) {
      setErrors(prev => ({ ...prev, [field]: 'Name cannot be empty' }))
      return false
    }
    if (name.length < 2) {
      setErrors(prev => ({ ...prev, [field]: 'Name must be at least 2 characters long' }))
      return false
    }
    if (name.length > 35) {
      setErrors(prev => ({ ...prev, [field]: 'Name cannot exceed 35 characters' }))
      return false
    }
    setErrors(prev => ({ ...prev, [field]: '' }))
    return true
  }

  const validateNameSuffix = (suffix) => {
    if (suffix && suffix.length > 10) {
      setErrors(prev => ({ ...prev, suffix: 'Suffix cannot exceed 10 characters' }))
      return false
    }
    setErrors(prev => ({ ...prev, suffix: '' }))
    return true
  }

  const validateMiddleInitial = (initial) => {
    if (initial && !/^[A-Z]$/.test(initial)) {
      setErrors(prev => ({ ...prev, middle_initial: 'Middle initial must be a single uppercase letter' }))
      return false
    }
    setErrors(prev => ({ ...prev, middle_initial: '' }))
    return true
  }

  const validatePhoneNumber = (number, field) => {
    if (number && !/^9\d{9}$/.test(number)) {
      setErrors(prev => ({ ...prev, [field]: 'Phone number must start with 9 and have 10 digits' }))
      return false
    }
    setErrors(prev => ({ ...prev, [field]: '' }))
    return true
  }

  const validateBirthDate = (date) => {
    if (!date) {
      setErrors(prev => ({ ...prev, birth_date: 'Birth date is required' }))
      return false
    }
    const minDate = new Date(1935, 0, 1)
    const eighteenYearsAgo = new Date()
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
    
    if (date < minDate || date > eighteenYearsAgo) {
      setErrors(prev => ({ ...prev, birth_date: 'You must be at least 18 years old' }))
      return false
    }
    setErrors(prev => ({ ...prev, birth_date: '' }))
    return true
  }

  const validateEmergencyContact = (name) => {
    if (!name) {
      setErrors(prev => ({ ...prev, emergency_contact_name: 'Emergency contact name cannot be empty' }))
      return false
    }
    if (name.length < 2) {
      setErrors(prev => ({ ...prev, emergency_contact_name: 'Emergency contact name must be at least 2 characters long' }))
      return false
    }
    if (name.length > 50) {
      setErrors(prev => ({ ...prev, emergency_contact_name: 'Emergency contact name cannot exceed 50 characters' }))
      return false
    }
    if (!/^[A-Z][a-z']*(\s+[A-Z][a-z']*)*$/.test(name)) {
      setErrors(prev => ({ ...prev, emergency_contact_name: 'Emergency contact name must start with capital letters and can only contain letters, spaces, and apostrophes' }))
      return false
    }
    setErrors(prev => ({ ...prev, emergency_contact_name: '' }))
    return true
  }

  // Combined state
  const [state, setState] = useState({
    loading: true,
    saving: false,
    roleId: null,
    form: {
      email: '',
      first_name: '',
      middle_initial: '',
      last_name: '',
      suffix: '',
      contact_number: '',
      birth_date: null,
      emergency_contact_name: '',
      emergency_contact_number: '',
      pfp_id: null,
    },
    dialogs: {
      confirm: false,
      datePicker: false,
      imageSource: false,
      removeImage: false,
      emailConfirm: false,
    },
    initialEmail: '',
  })

  // Simplified handlers
  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }))
  const updateForm = (updates) => setState(prev => ({ ...prev, form: { ...prev.form, ...updates } }))
  const updateDialog = (dialog, value) => setState(prev => ({ ...prev, dialogs: { ...prev.dialogs, [dialog]: value } }))

  const handleChange = (field, value) => {
    let sanitizedValue = value

    switch (field) {
      case 'email':
        sanitizedValue = value.toLowerCase().trim()
        validateEmail(sanitizedValue)
        break
      case 'first_name':
      case 'last_name':
        sanitizedValue = value.replace(/[^a-zA-Z\s']/g, '')
        validateName(sanitizedValue, field)
        break
      case 'suffix':
        sanitizedValue = value.replace(/[^A-Z]/g, '')
        validateNameSuffix(sanitizedValue)
        break
      case 'middle_initial':
        sanitizedValue = value.toUpperCase()
        validateMiddleInitial(sanitizedValue)
        break
      case 'contact_number':
      case 'emergency_contact_number':
        const digitsOnly = value.replace(/\D/g, '')
        sanitizedValue = digitsOnly.startsWith('9') ? digitsOnly.slice(0, 10) : '9' + digitsOnly.slice(0, 9)
        validatePhoneNumber(sanitizedValue, field)
        break
      case 'birth_date':
        sanitizedValue = value
        validateBirthDate(sanitizedValue)
        break
      case 'emergency_contact_name':
        sanitizedValue = value.replace(/[^a-zA-Z\s']/g, '')
        validateEmergencyContact(sanitizedValue)
        break
    }

    updateForm({ [field]: sanitizedValue })
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
        handleChange('pfp_id', result.assets[0].uri)
      }
    } catch (error) {
      showSnackbar('Error picking image: ' + error.message)
    }
  }

  const uploadImage = async () => {
    if (!state.form.pfp_id?.startsWith('file://')) return null
  
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
        2: 'delivery',
        3: 'airlines'
      }[profileData.role_id]

      if (!folder) throw new Error('Invalid role')

      const filePath = `${folder}/${user.id}.png`
      await supabase.storage.from('profile-images').remove([filePath])

      const base64 = await FileSystem.readAsStringAsync(state.form.pfp_id, { encoding: FileSystem.EncodingType.Base64 })
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

  const removeImage = async () => {
    updateDialog('removeImage', false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const folder = {
        1: 'admin',
        2: 'delivery',
        3: 'airlines'
      }[profileData.role_id]

      if (folder) {
        const filePath = `${folder}/${user.id}.png`
        await supabase.storage
          .from('profile-images')
          .remove([filePath])
      }

      handleChange('pfp_id', null)
      showSnackbar('Profile picture removed successfully', true)
    } catch (error) {
      console.error('Error removing image:', error)
      showSnackbar('Error removing image')
    }
  }

  const handleEmailChange = async () => {
    try {
      updateState({ saving: true })
      const { error } = await supabase.auth.updateUser({
        email: state.form.email,
      })
      if (error) throw error
      navigation.navigate('Profile')
      showSnackbar('Email change request sent. Please check your email to confirm the change.', true)
      updateDialog('emailConfirm', false)
    } catch (error) {
      showSnackbar('Error updating email: ' + error.message)
    } finally {
      updateState({ saving: false })
    }
  }
  
  const saveProfile = async () => {
    try {
      // Validate all fields
      const validations = [
        validateEmail(state.form.email),
        validateName(state.form.first_name, 'first_name'),
        validateMiddleInitial(state.form.middle_initial),
        validateName(state.form.last_name, 'last_name'),
        validateNameSuffix(state.form.suffix),
        validatePhoneNumber(state.form.contact_number, 'contact_number'),
        validateBirthDate(state.form.birth_date),
        validateEmergencyContact(state.form.emergency_contact_name),
        validatePhoneNumber(state.form.emergency_contact_number, 'emergency_contact_number')
      ]

      if (validations.some(valid => !valid)) {
        showSnackbar('Please fix the validation errors before saving')
        return
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
      if (state.form.pfp_id?.startsWith('file://')) {
        newPfpId = await uploadImage()
        if (!newPfpId) {
          showSnackbar('Failed to upload profile picture')
          updateState({ saving: false })
          return
        }
      } else if (!state.form.pfp_id && currentProfile.pfp_id) {
        // If image was removed, delete from storage
        const folder = {
          1: 'admin',
          2: 'delivery',
          3: 'airlines'
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
          // email: state.form.email,
          first_name: capitalizeName(state.form.first_name),
          middle_initial: capitalizeName(state.form.middle_initial),
          last_name: capitalizeName(state.form.last_name),
          suffix: capitalizeName(state.form.suffix),
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
        email: data.email || '',
        first_name: data.first_name || '',
        middle_initial: data.middle_initial || '',
        last_name: data.last_name || '',
        suffix: data.suffix || '',
        contact_number: data.contact_number?.replace('+63', '') || '',
        birth_date: data.birth_date ? new Date(data.birth_date) : null,
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_number: data.emergency_contact_number?.replace('+63', '') || '',
        pfp_id: data.pfp_id || null,
      }

      updateState({
        form: initialData,
        initialEmail: data.email || '',
        roleId: data.role_id,
        loading: false
      })
    } catch (error) {
      showSnackbar('Error loading profile: ' + error.message)
      updateState({ loading: false })
    }
  }

  useFocusEffect(useCallback(() => { fetchProfile() }, []))

  const ImagePreview = ({ uri, onRemove }) => {
    if (!uri) return null
    return (
      <View style={styles.imagePreviewContainer}>
        <Image 
          source={{ uri }} 
          style={styles.imagePreview}
          resizeMode="contain"
        />
        <IconButton
          icon="close-circle"
          size={20}
          iconColor={colors.error}
          style={[styles.removeImageButton, { backgroundColor: colors.surface }]}
          onPress={onRemove}
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('Profile')} />
        <Appbar.Content title='Edit Profile' />
        <Appbar.Action 
          icon='content-save' 
          onPress={() => {
            updateDialog('confirm', true)
          }} 
          disabled={state.saving}
          color={colors.primary}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps='handled'>
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.profileContainer}>
            {state.form.pfp_id ? (
              <ImagePreview 
                uri={state.form.pfp_id} 
                onRemove={() => updateDialog('removeImage', true)} 
              />
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
            label='Email'
            value={state.form.email}
            onChangeText={(text) => handleChange('email', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='email' onPress={()=>{
              updateDialog('emailConfirm', true)
            }} color={colors.primary}/>}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='words'
            maxLength={35}
            editable={true}
            error={!!errors.email}
            helperText={errors.email}
          />

          <TextInput
            label='First Name'
            value={state.form.first_name}
            onChangeText={(text) => handleChange('first_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='words'
            maxLength={35}
            error={!!errors.first_name}
            helperText={errors.first_name}
          />

          <TextInput
            label='Middle Initial'
            value={state.form.middle_initial}
            onChangeText={(text) => handleChange('middle_initial', text)}
            mode='outlined'
            style={styles.input}
            maxLength={1}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='characters'
            error={!!errors.middle_initial}
            helperText={errors.middle_initial}
          />

          <TextInput
            label='Last Name'
            value={state.form.last_name}
            onChangeText={(text) => handleChange('last_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='words'
            maxLength={35}
            error={!!errors.last_name}
            helperText={errors.last_name}
          />

          <TextInput
            label='Name Suffix'
            value={state.form.suffix}
            onChangeText={(text) => handleChange('suffix', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='words'
            maxLength={10}
            error={!!errors.suffix}
            helperText={errors.suffix}
          />

          <Divider style={styles.divider} />

          <TextInput
            label='Contact Number'
            value={state.form.contact_number}
            onChangeText={(text) => handleChange('contact_number', text)}
            mode='outlined'
            style={styles.input}
            keyboardType='phone-pad'
            left={<TextInput.Affix text='+63' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            maxLength={10}
            error={!!errors.contact_number}
            helperText={errors.contact_number}
          />
          <TouchableOpacity onPress={() => updateDialog('datePicker', true)}>
            <TextInput
              label='Birth Date'
              value={state.form.birth_date ? state.form.birth_date.toLocaleDateString() : ''}
              editable={false}
              mode='outlined'
              style={styles.input}
              right={<TextInput.Icon icon='calendar' onPress={() => updateDialog('datePicker', true)}/>}
              theme={{ colors: { primary: colors.primary } }}
              disabled={state.saving}
              error={!!errors.birth_date}
              helperText={errors.birth_date}
            />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TextInput
            label='Emergency Contact Name'
            value={state.form.emergency_contact_name}
            onChangeText={(text) => handleChange('emergency_contact_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            autoCapitalize='words'
            maxLength={50}
            error={!!errors.emergency_contact_name}
            helperText={errors.emergency_contact_name}
          />

          <TextInput
            label='Emergency Contact Number'
            value={state.form.emergency_contact_number}
            onChangeText={(text) => handleChange('emergency_contact_number', text)}
            mode='outlined'
            style={styles.input}
            keyboardType='phone-pad'
            left={<TextInput.Affix text='+63' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={state.saving}
            maxLength={10}
            error={!!errors.emergency_contact_number}
            helperText={errors.emergency_contact_number}
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

      <Portal>
        <Dialog
          visible={state.dialogs.removeImage}
          onDismiss={() => updateDialog('removeImage', false)}
          style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Remove Profile Picture</Dialog.Title>
          <Dialog.Content>
            <Text variant='bodyMedium'>Are you sure you want to remove your profile picture?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => updateDialog('removeImage', false)}>Cancel</Button>
            <Button onPress={removeImage}>Remove</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={state.dialogs.emailConfirm}
          onDismiss={() => updateDialog('emailConfirm', false)}
          style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Change Email Address</Dialog.Title>
          <Dialog.Content>
            <Text variant='bodyMedium'>
              Are you sure you want to change your email address to {state.form.email}? 
              You will receive a confirmation email to verify this change.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => updateDialog('emailConfirm', false)} disabled={state.saving}>Cancel</Button>
            <Button onPress={handleEmailChange} loading={state.saving} disabled={state.saving}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {SnackbarElement}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
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
    width: 200,
    height: 200,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    zIndex: 1000
  },
  profilePictureButton: {
    marginTop: 8,
  },
})

export default EditProfileSubScreen