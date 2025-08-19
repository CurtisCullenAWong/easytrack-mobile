import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  ActivityIndicator,
} from 'react-native'
import {
  TextInput,
  Button,
  useTheme,
  Appbar,
  Text,
  Portal,
  Dialog,
  Surface,
  Divider,
} from 'react-native-paper'
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'

registerTranslation('en', en)

const UpdateProfileScreen = ({ navigation, route }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  
  // Get missing fields from route params
  const missingFields = route.params?.missingFields || []
  
  // Add error state
  const [errors, setErrors] = useState({
    first_name: '',
    last_name: '',
    contact_number: '',
    birth_date: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
  })

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

  const validatePhoneNumber = (number, field) => {
    if (!number) {
      setErrors(prev => ({ ...prev, [field]: 'Phone number is required' }))
      return false
    }
    if (!/^9\d{9}$/.test(number)) {
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
    form: {
      first_name: '',
      last_name: '',
      contact_number: '',
      birth_date: null,
      emergency_contact_name: '',
      emergency_contact_number: '',
    },
    dialogs: {
      confirm: false,
      datePicker: false,
    },
  })

  // Simplified handlers
  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }))
  const updateForm = (updates) => setState(prev => ({ ...prev, form: { ...prev.form, ...updates } }))
  const updateDialog = (dialog, value) => setState(prev => ({ ...prev, dialogs: { ...prev.dialogs, [dialog]: value } }))

  const handleChange = (field, value) => {
    let sanitizedValue = value

    switch (field) {
      case 'first_name':
      case 'last_name':
        sanitizedValue = value.replace(/[^a-zA-Z\s']/g, '')
        validateName(sanitizedValue, field)
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

  const saveProfile = async () => {
    try {
      // Validate only the missing fields
      const validations = []
      const fieldValidators = {
        first_name: () => validateName(state.form.first_name, 'first_name'),
        last_name: () => validateName(state.form.last_name, 'last_name'),
        contact_number: () => validatePhoneNumber(state.form.contact_number, 'contact_number'),
        birth_date: () => validateBirthDate(state.form.birth_date),
        emergency_contact_name: () => validateEmergencyContact(state.form.emergency_contact_name),
        emergency_contact_number: () => validatePhoneNumber(state.form.emergency_contact_number, 'emergency_contact_number')
      }

      missingFields.forEach(field => {
        if (fieldValidators[field]) {
          validations.push(fieldValidators[field]())
        }
      })

      if (validations.some(valid => !valid)) {
        const errorFields = Object.entries(errors)
          .filter(([field, error]) => error && missingFields.includes(field))
          .map(([field]) => field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        
        if (errorFields.length > 0) {
          showSnackbar(`Please fix the following fields: ${errorFields.join(', ')}`)
        }
        return
      }

      updateState({ saving: true })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Prepare update object with only the missing fields
      const updateData = {}
      missingFields.forEach(field => {
        if (field === 'contact_number' || field === 'emergency_contact_number') {
          updateData[field] = state.form[field] ? `+63${state.form[field]}` : null
        } else if (field === 'first_name' || field === 'last_name' || field === 'emergency_contact_name') {
          updateData[field] = capitalizeName(state.form[field])
        } else {
          updateData[field] = state.form[field]
        }
      })
      updateData.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error

      showSnackbar('Profile updated successfully', true)
      // Navigate back to profile completion check
      navigation.navigate('ProfileCompletionCheck')
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
        last_name: data.last_name || '',
        contact_number: data.contact_number?.replace('+63', '') || '',
        birth_date: data.birth_date ? new Date(data.birth_date) : null,
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_number: data.emergency_contact_number?.replace('+63', '') || '',
      }

      updateState({
        form: initialData,
        loading: false
      })
    } catch (error) {
      showSnackbar('Error loading profile: ' + error.message)
      updateState({ loading: false })
    }
  }

  useFocusEffect(useCallback(() => { fetchProfile() }, []))

  const fieldLabels = {
    first_name: 'First Name',
    last_name: 'Last Name',
    contact_number: 'Contact Number',
    birth_date: 'Birth Date',
    emergency_contact_name: 'Emergency Contact Name',
    emergency_contact_number: 'Emergency Contact Number'
  }

  if (state.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.navigate('ProfileCompletionCheck')} />
          <Appbar.Content title='Complete Profile' titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps='handled'>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('ProfileCompletionCheck')} />
        <Appbar.Content title='Complete Profile' />
        <Appbar.Action 
          icon='content-save' 
          onPress={() => {
            updateDialog('confirm', true)
          }} 
          disabled={state.saving}
          color={colors.primary}
        />
      </Appbar.Header>

        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.headerText, { color: colors.onSurface, ...fonts.headlineSmall }]}>
            Complete Your Profile
          </Text>
          <Text style={[styles.subHeaderText, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Please provide the following information to continue:
          </Text>

          <Divider style={styles.divider} />

          {missingFields.includes('first_name') && (
            <TextInput
              label='First Name*'
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
          )}

          {missingFields.includes('last_name') && (
            <TextInput
              label='Last Name*'
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
          )}

          {missingFields.includes('contact_number') && (
            <TextInput
              label='Contact Number*'
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
          )}

          {missingFields.includes('birth_date') && (
            <TextInput
              label='Birth Date*'
              value={state.form.birth_date ? state.form.birth_date.toLocaleDateString() : ''}
              editable={false}
              mode='outlined'
              style={styles.input}
              right={<TextInput.Icon icon='calendar' onPress={() => updateDialog('datePicker', true)}/>}
              theme={{ colors: { primary: colors.primary } }}
              disabled={state.saving}
              error={!!errors.birth_date}
              helperText={errors.birth_date}
              onPressIn={() => updateDialog('datePicker', true)}
            />
          )}

          {missingFields.includes('emergency_contact_name') && (
            <TextInput
              label='Emergency Contact Name*'
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
          )}

          {missingFields.includes('emergency_contact_number') && (
            <TextInput
              label='Emergency Contact Number*'
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
          )}
        </Surface>

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
      </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  scrollContainer: { 
    flexGrow: 1, 
  },
  surface: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  headerText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeaderText: {
    textAlign: 'center',
    marginBottom: 16,
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
})

export default UpdateProfileScreen
