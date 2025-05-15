import React, { useState, useCallback, useMemo } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  Menu,
  Avatar,
} from 'react-native-paper'
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../hooks/useSnackbar'

registerTranslation('en', en)

// Reusable components
const MemoizedMenuItem = React.memo(({ item, selected, onPress, colors, fonts }) => (
  <Menu.Item
    onPress={onPress}
    title={item}
    titleStyle={[fonts.bodyLarge, { color: selected ? colors.primary : colors.onSurface }]}
    leadingIcon={selected ? 'check' : undefined}
  />
))

const EditAccountScreen = ({ route, navigation }) => {
  const { userId } = route.params
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

  const validateEmail = (email) => {
    if (!email) {
      return { isValid: false, message: 'Email cannot be empty' }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' }
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
    form: {
      first_name: '',
      middle_initial: '',
      last_name: '',
      email: '',
      contact_number: '',
      birth_date: null,
      emergency_contact_name: '',
      emergency_contact_number: '',
      role: '',
      user_status: '',
      verify_status: '',
    },
    dialogs: {
      confirm: false,
      datePicker: false,
      roleMenu: false,
      statusMenu: false,
      verifyStatusMenu: false,
    },
    options: {
      roles: [],
      statuses: [],
      verifyStatuses: [],
    }
  })

  // Simplified handlers
  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }))
  const updateForm = (updates) => setState(prev => ({ ...prev, form: { ...prev.form, ...updates } }))
  const updateDialog = (dialog, value) => setState(prev => ({ ...prev, dialogs: { ...prev.dialogs, [dialog]: value } }))
  const updateOptions = (updates) => setState(prev => ({ ...prev, options: { ...prev.options, ...updates } }))

  // Handle changes
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
      case 'email':
        sanitizedValue = value.toLowerCase()
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

  const saveUser = async () => {
    try {
      // Validate all required fields before saving
      const validations = [
        { field: 'first_name', value: state.form.first_name, validator: validateName },
        { field: 'last_name', value: state.form.last_name, validator: validateName },
        { field: 'middle_initial', value: state.form.middle_initial, validator: validateMiddleInitial },
        { field: 'email', value: state.form.email, validator: validateEmail },
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
      const [{ data: roleData }, { data: statusData }, { data: verifyStatusData }] = await Promise.all([
        supabase.from('profiles_roles').select('id').eq('role_name', state.form.role).single(),
        supabase.from('profiles_status').select('id').eq('status_name', state.form.user_status).single(),
        supabase.from('verify_status').select('id').eq('status_name', state.form.verify_status).single()
      ])

      if (!roleData || !statusData || !verifyStatusData) {
        throw new Error('Invalid role, status, or verification status selected')
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: capitalizeName(state.form.first_name),
          middle_initial: capitalizeName(state.form.middle_initial),
          last_name: capitalizeName(state.form.last_name),
          email: state.form.email,
          contact_number: state.form.contact_number ? `+63${state.form.contact_number}` : null,
          birth_date: state.form.birth_date,
          emergency_contact_name: capitalizeName(state.form.emergency_contact_name),
          emergency_contact_number: state.form.emergency_contact_number ? `+63${state.form.emergency_contact_number}` : null,
          role_id: roleData.id,
          user_status_id: statusData.id,
          verify_status_id: verifyStatusData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      showSnackbar('User updated successfully', true)
      navigation.navigate('UserManagement')
    } catch (error) {
      showSnackbar('Error updating user: ' + error.message)
    } finally {
      updateState({ saving: false })
    }
  }

  const fetchUser = async () => {
    try {
      updateState({ loading: true })
      const [{ data: userData, error: userError }, { data: roles }, { data: statuses }, { data: verifyStatuses }] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            *,
            profile_status:user_status_id (status_name),
            profile_roles:role_id (role_name),
            verify_status:verify_status_id (status_name)
          `)
          .eq('id', userId)
          .single(),
        supabase.from('profiles_roles').select('role_name'),
        supabase.from('profiles_status').select('status_name').in('id', [4, 5]),
        supabase.from('verify_status').select('status_name').in('id', [1, 2, 4])
      ])

      if (userError) throw userError

      const initialData = {
        first_name: userData.first_name || '',
        middle_initial: userData.middle_initial || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        contact_number: userData.contact_number?.replace('+63', '') || '',
        birth_date: userData.birth_date ? new Date(userData.birth_date) : null,
        emergency_contact_name: userData.emergency_contact_name || '',
        emergency_contact_number: userData.emergency_contact_number?.replace('+63', '') || '',
        role: userData.profile_roles?.role_name,
        user_status: userData.profile_status?.status_name,
        verify_status: userData.verify_status?.status_name,
        role_id: userData.role_id,
        pfp_id: userData.pfp_id,
      }

      updateState({
        form: initialData,
        loading: false
      })

      if (roles) updateOptions({ roles: roles.map(r => r.role_name) })
      if (statuses) updateOptions({ statuses: statuses.map(s => s.status_name) })
      if (verifyStatuses) updateOptions({ verifyStatuses: verifyStatuses.map(s => s.status_name) })
    } catch (error) {
      showSnackbar('Error loading user data: ' + error.message)
      updateState({ loading: false })
    }
  }

  useFocusEffect(useCallback(() => { fetchUser() }, [userId]))

  // Memoized menu items
  const roleMenuItems = useMemo(() => 
    state.options.roles.map(role => (
      <MemoizedMenuItem
        key={role}
        item={role}
        selected={state.form.role === role}
        onPress={() => {
          handleChange('role', role)
          updateDialog('roleMenu', false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [state.options.roles, state.form.role, colors, fonts])

  const statusMenuItems = useMemo(() => 
    state.options.statuses.map(status => (
      <MemoizedMenuItem
        key={status}
        item={status}
        selected={state.form.user_status === status}
        onPress={() => {
          handleChange('user_status', status)
          updateDialog('statusMenu', false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [state.options.statuses, state.form.user_status, colors, fonts])
    
  const verifyStatusMenuItems = useMemo(() => 
    state.options.verifyStatuses.map(status => (
      <MemoizedMenuItem
        key={status}
        item={status}
        selected={state.form.verify_status === status}
        onPress={() => {
          handleChange('verify_status', status)
          updateDialog('verifyStatusMenu', false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [state.options.verifyStatuses, state.form.verify_status, colors, fonts])

  if (state.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
          <Appbar.Content title='Edit Account' titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
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
        <Appbar.BackAction onPress={() => navigation.navigate('ViewAccount', { userId })} />
        <Appbar.Content title='Edit Account' />
        <Appbar.Action 
          icon='content-save' 
          onPress={() => updateDialog('confirm', true)} 
          disabled={state.loading}
          color={colors.primary}
        />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps='handled'>
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={styles.avatarContainer}>
              {state.form.pfp_id ? (
                <Avatar.Image size={150} source={{ uri: state.form.pfp_id }} />
              ) : (
                <Avatar.Text size={100} label={(state.form.first_name || 'N')[0].toUpperCase()} />
              )}
              <Text variant='bodyLarge' style={[styles.avatarText, { color: colors.onSurface }]}>Profile Picture</Text>
            </View>

            <Divider style={styles.divider} />

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
            />

            <Divider style={styles.divider} />

            <TextInput
              label='Email'
              value={state.form.email}
              onChangeText={(text) => handleChange('email', text)}
              mode='outlined'
              style={styles.input}
              keyboardType='email-address'
              right={<TextInput.Icon icon='email' />}
              editable={false}
              theme={{ colors: { primary: colors.primary } }}
              disabled={state.saving}
              autoCapitalize='none'
              maxLength={50}
            />

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
            />

            <Divider style={styles.divider} />

            <Menu
              visible={state.dialogs.roleMenu}
              onDismiss={() => updateDialog('roleMenu', false)}
              anchor={
                <TextInput
                  label='Role'
                  value={state.form.role}
                  editable={false}
                  mode='outlined'
                  style={styles.input}
                  right={<TextInput.Icon icon='account-cog' onPress={() => updateDialog('roleMenu', true)} />}
                  theme={{ colors: { primary: colors.primary } }}
                  disabled={state.saving}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {roleMenuItems}
            </Menu>

            <Menu
              visible={state.dialogs.statusMenu}
              onDismiss={() => updateDialog('statusMenu', false)}
              anchor={
                <TextInput
                  label='Status'
                  value={state.form.user_status}
                  editable={false}
                  mode='outlined'
                  style={styles.input}
                  right={<TextInput.Icon icon='account-check' onPress={() => updateDialog('statusMenu', true)} />}
                  theme={{ colors: { primary: colors.primary } }}
                  disabled={state.saving}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {statusMenuItems}
            </Menu>

            <Menu
              visible={state.dialogs.verifyStatusMenu}
              onDismiss={() => updateDialog('verifyStatusMenu', false)}
              anchor={
                <TextInput
                  label='Verification Status'
                  value={state.form.verify_status}
                  editable={false}
                  mode='outlined'
                  style={styles.input}
                  right={<TextInput.Icon icon='shield-check' onPress={() => updateDialog('verifyStatusMenu', true)} />}
                  theme={{ colors: { primary: colors.primary } }}
                  disabled={state.saving}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {verifyStatusMenuItems}
            </Menu>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

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
              saveUser()
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
  avatarContainer: {
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
})

export default EditAccountScreen