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
import { validateProfileForm, handleTextChange } from '../../../../utils/profileValidation'

registerTranslation('en', en)

const EditProfileSubScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [image, setImage] = useState(null)
  const [form, setFormData] = useState({
    first_name: '',
    middle_initial: '',
    last_name: '',
    name_suffix: '',
    contact_number: '',
    birth_date: null,
    emergency_contact_name: '',
    emergency_contact_number: '',
    pfp_id: null,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showImageSourceDialog, setShowImageSourceDialog] = useState(false)

  const handleDateConfirm = useCallback(({ date }) => {
    if (date) {
      const age = new Date().getFullYear() - date.getFullYear()
      if (age < 18) {
        showSnackbar('Must be at least 18 years old')
        return
      }
      handleChange('birth_date', date)
    }
    setShowDatePicker(false)
  }, [])

  const handleDateDismiss = useCallback(() => {
    setShowDatePicker(false)
  }, [])

  const openDatePicker = useCallback(() => {
    setShowDatePicker(true)
  }, [])

  const handleImageSource = async (source) => {
    setShowImageSourceDialog(false)

    try {
      const options = { 
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
        aspect: [1, 1],
      }

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled) {
        setImage(result.assets[0].uri)
        handleChange('pfp_id', result.assets[0].uri)
      }
    } catch (error) {
      showSnackbar('Error picking image: ' + error.message)
    }
  }

  const uploadImage = async () => {
    if (!image?.startsWith('file://')) {
      return null
    }
  
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      let folder
      switch (profileData.role_id) {
        case 1:
          folder = 'admin'
          break
        case 2:
          folder = 'airlines'
          break
        case 3:
          folder = 'delivery'
          break
        default:
          throw new Error('Invalid role')
      }

      const filePath = `${folder}/${user.id}.png`
      await supabase.storage
        .from('profile-images')
        .remove([filePath])

      const base64 = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const contentType = 'image/png'
      
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, decode(base64), { 
          contentType,
          upsert: true
        })
  
      if (error) {
        showSnackbar('Error uploading image: ' + error.message)
        return null
      }

      const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
        .from('profile-images')
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

  const saveProfile = async () => {
    if (!validateProfileForm(form, showSnackbar)) {
      return
    }

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        showSnackbar('User not authenticated')
        return
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role_id, pfp_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      let newPfpId = form.pfp_id
      if (image?.startsWith('file://')) {
        newPfpId = await uploadImage()
      }

      if (!newPfpId && currentProfile.pfp_id) {
        let folder
        switch (currentProfile.role_id) {
          case 1:
            folder = 'admin'
            break
          case 2:
            folder = 'airlines'
            break
          case 3:
            folder = 'delivery'
            break
        }

        if (folder) {
          await supabase.storage
            .from('profile-images')
            .remove([`${folder}/${user.id}.png`])
        }
      }

      // Format phone numbers with +63 prefix
      const formattedContactNumber = form.contact_number ? `+63${form.contact_number}` : null
      const formattedEmergencyNumber = form.emergency_contact_number ? `+63${form.emergency_contact_number}` : null

      // Combine last name and suffix if suffix exists
      const fullLastName = form.name_suffix 
        ? `${form.last_name} ${form.name_suffix}`
        : form.last_name

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name.trim(),
          middle_initial: form.middle_initial.trim(),
          last_name: fullLastName.trim(),
          contact_number: formattedContactNumber,
          birth_date: form.birth_date,
          emergency_contact_name: form.emergency_contact_name.trim(),
          emergency_contact_number: formattedEmergencyNumber,
          pfp_id: newPfpId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        showSnackbar('Error updating profile: ' + error.message)
        return
      }

      showSnackbar('Profile updated successfully', true)
      navigation.navigate('Profile')
    } catch (error) {
      showSnackbar('Error updating profile')
    } finally {
      setSaving(false)
    }
  }

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        showSnackbar('User not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        showSnackbar('Error fetching profile: ' + error.message)
        return
      }

      // Extract suffix from last name if it exists
      const lastNameParts = data.last_name?.split(' ') || []
      const lastName = lastNameParts[0] || ''
      const nameSuffix = lastNameParts.slice(1).join(' ') || ''

      setFormData({
        first_name: data.first_name || '',
        middle_initial: data.middle_initial || '',
        last_name: lastName,
        name_suffix: nameSuffix,
        contact_number: data.contact_number?.replace('+63', '') || '',
        birth_date: data.birth_date ? new Date(data.birth_date) : null,
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_number: data.emergency_contact_number?.replace('+63', '') || '',
        pfp_id: data.pfp_id || null,
      })
    } catch (error) {
      showSnackbar('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchProfile()
    }, [])
  )

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleInputChange = (field, value) => {
    const sanitizedValue = handleTextChange(field, value)
    handleChange(field, sanitizedValue)
  }

  if (loading) {
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
          onPress={() => setShowConfirmDialog(true)} 
          disabled={loading}
          color={colors.primary}
        />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps='handled'>
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.profileContainer}>
            {form.pfp_id ? (
              <>
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: form.pfp_id }} 
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
              </>
            ) : (
              <Avatar.Text size={80} label={(form.first_name || 'N')[0].toUpperCase()} />
            )}
            <Button
              mode='outlined'
              onPress={() => setShowImageSourceDialog(true)}
              style={styles.profilePictureButton}
              textColor={colors.primary}
              disabled={saving}
            >
              {form.pfp_id ? 'Change Profile Picture' : 'Upload Profile Picture'}
            </Button>
          </View>

          <Divider style={styles.divider} />

          <TextInput
            label='First Name and Second Name'
            value={form.first_name}
            onChangeText={(text) => handleInputChange('first_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
            autoCapitalize='words'
            maxLength={35}
          />

          <TextInput
            label='Middle Initial'
            value={form.middle_initial}
            onChangeText={(text) => handleInputChange('middle_initial', text)}
            mode='outlined'
            style={styles.input}
            maxLength={1}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
            autoCapitalize='characters'
          />

          <TextInput
            label='Last Name'
            value={form.last_name}
            onChangeText={(text) => handleInputChange('last_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
            autoCapitalize='words'
            maxLength={35}
          />

          <TextInput
            label='Name Suffix (e.g., Jr., Sr., III)'
            value={form.name_suffix}
            onChangeText={(text) => handleInputChange('name_suffix', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
            autoCapitalize='characters'
            maxLength={10}
          />

          <Divider style={styles.divider} />

          <TextInput
            label='Contact Number'
            value={form.contact_number}
            onChangeText={(text) => handleInputChange('contact_number', text)}
            mode='outlined'
            style={styles.input}
            keyboardType='phone-pad'
            left={<TextInput.Affix text='+63' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
            maxLength={10}
          />

          <TextInput
            label='Birth Date'
            value={form.birth_date ? form.birth_date.toLocaleDateString() : ''}
            editable={false}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='calendar' onPress={openDatePicker} />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
          />

          <Divider style={styles.divider} />

          <TextInput
            label='Emergency Contact Name and Last Name'
            value={form.emergency_contact_name}
            onChangeText={(text) => handleInputChange('emergency_contact_name', text)}
            mode='outlined'
            style={styles.input}
            right={<TextInput.Icon icon='account' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
            autoCapitalize='words'
            maxLength={50}
          />

          <TextInput
            label='Emergency Contact Number'
            value={form.emergency_contact_number}
            onChangeText={(text) => handleInputChange('emergency_contact_number', text)}
            mode='outlined'
            style={styles.input}
            keyboardType='phone-pad'
            left={<TextInput.Affix text='+63' />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
            maxLength={10}
          />
        </Surface>
      </ScrollView>

      <Portal>
        <DatePickerModal
          locale='en'
          mode='single'
          visible={showDatePicker}
          onDismiss={handleDateDismiss}
          date={form.birth_date}
          onConfirm={handleDateConfirm}
          title='Select Birth Date'
          animationType='slide'
          presentationStyle='formSheet'
          saveLabel='Select'
          label='Enter the birth date'
          startYear={1935}
          endYear={new Date().getFullYear()}
          validRange={{
            startDate: new Date(1935, 0, 1),
            endDate: new Date().getFullYear(),
          }}
        />
      </Portal>

      <Portal>
        <Dialog
          visible={showImageSourceDialog}
          onDismiss={() => setShowImageSourceDialog(false)}
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
            <Button onPress={() => setShowImageSourceDialog(false)} textColor={colors.error}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={showConfirmDialog}
          onDismiss={() => setShowConfirmDialog(false)}
          style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Save Changes</Dialog.Title>
          <Dialog.Content>
            <Text variant='bodyMedium'>Are you sure you want to save these changes?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)} disabled={saving}>Cancel</Button>
            <Button onPress={() => {
              setShowConfirmDialog(false)
              saveProfile()
            }} loading={saving} disabled={saving}>Save</Button>
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