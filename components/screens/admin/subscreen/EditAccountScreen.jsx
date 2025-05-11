import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import {
  TextInput,
  Button,
  Text,
  useTheme,
  Appbar,
  Menu,
  Avatar,
  Surface,
  Divider,
  Portal,
  Dialog,
} from 'react-native-paper'
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../../components/hooks/useSnackbar'

// Register the English locale
registerTranslation('en', en)

// Validation patterns
const VALIDATION_PATTERNS = {
  name: /^[a-zA-Z\s'-]{2,50}$/,
  middleInitial: /^[a-zA-Z]$/,
  phone: /^(\+63|0)[0-9]{10}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
}

// Validation messages
const VALIDATION_MESSAGES = {
  required: 'This field is required',
  invalidName: 'Name should only contain letters, spaces, hyphens, and apostrophes (2-50 characters)',
  invalidMiddleInitial: 'Middle initial should be a single letter',
  invalidPhone: 'Please enter a valid Philippine phone number (e.g., +639123456789 or 09123456789)',
  invalidEmail: 'Please enter a valid email address',
  invalidBirthDate: 'Birth date cannot be in the future',
  invalidRole: 'Please select a valid role',
  invalidStatus: 'Please select a valid status',
}

// Phone number formatting function
const formatPhoneNumber = (value) => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')
  
  // If empty, return empty string
  if (!digits) return ''
  
  // If starts with 63, convert to +63
  if (digits.startsWith('63')) {
    return `+63${digits.slice(2)}`
  }
  
  // If starts with 0, keep it
  if (digits.startsWith('0')) {
    return digits
  }
  
  // If starts with 9, add 0
  if (digits.startsWith('9')) {
    return `0${digits}`
  }
  
  // If none of the above, add 0
  return `0${digits}`
}

// Memoized Menu Item component
const MemoizedMenuItem = React.memo(({ item, selected, onPress, colors, fonts }) => (
  <Menu.Item
    onPress={onPress}
    title={item}
    titleStyle={[
      fonts.bodyLarge,
      {
        color: selected ? colors.primary : colors.onSurface,
      },
    ]}
    leadingIcon={selected ? 'check' : undefined}
  />
))

const EditAccount = ({ route, navigation }) => {
  const { userId } = route.params
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [errors, setErrors] = useState({})

  const [roleMenuVisible, setRoleMenuVisible] = useState(false)
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)

  const [roleOptions, setRoleOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])

  // Validation functions
  const validateField = (field, value) => {
    switch (field) {
      case 'first_name':
      case 'last_name':
      case 'emergency_contact_name':
        return !value ? VALIDATION_MESSAGES.required :
          !VALIDATION_PATTERNS.name.test(value) ? VALIDATION_MESSAGES.invalidName : ''
      case 'middle_initial':
        return value && !VALIDATION_PATTERNS.middleInitial.test(value) ? VALIDATION_MESSAGES.invalidMiddleInitial : ''
      case 'email':
        return !value ? VALIDATION_MESSAGES.required :
          !VALIDATION_PATTERNS.email.test(value) ? VALIDATION_MESSAGES.invalidEmail : ''
      case 'contact_number':
      case 'emergency_contact_number':
        return !value ? VALIDATION_MESSAGES.required :
          !VALIDATION_PATTERNS.phone.test(value) ? VALIDATION_MESSAGES.invalidPhone : ''
      case 'birth_date':
        return !value ? VALIDATION_MESSAGES.required :
          value > new Date() ? VALIDATION_MESSAGES.invalidBirthDate : ''
      case 'role':
        return !value ? VALIDATION_MESSAGES.invalidRole : ''
      case 'user_status':
        return !value ? VALIDATION_MESSAGES.invalidStatus : ''
      default:
        return ''
    }
  }

  // Sanitization functions
  const sanitizeInput = (field, value) => {
    switch (field) {
      case 'first_name':
      case 'last_name':
      case 'emergency_contact_name':
        return value.trim().replace(/\s+/g, ' ')
      case 'middle_initial':
        return value.trim().toUpperCase()
      case 'email':
        return value.trim().toLowerCase()
      case 'contact_number':
      case 'emergency_contact_number':
        return formatPhoneNumber(value)
      default:
        return value
    }
  }

  const handleDateConfirm = useCallback(({ date }) => {
    if (date) {
      const error = validateField('birth_date', date)
      if (error) {
        showSnackbar(error)
        return
      }
      handleChange('birth_date', date)
    }
    setShowDatePicker(false)
  }, [showSnackbar])

  const handleDateDismiss = useCallback(() => {
    setShowDatePicker(false)
  }, [])

  const openDatePicker = useCallback(() => {
    setShowDatePicker(true)
  }, [])

  const validateForm = () => {
    const newErrors = {}
    Object.keys(user).forEach(field => {
      const error = validateField(field, user[field])
      if (error) newErrors[field] = error
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveUser = async () => {
    if (!validateForm()) {
      showSnackbar('Please fix the errors before saving')
      return
    }

    try {
      setSaving(true)

      // First get the role_id and user_status_id based on the selected names
      const [{ data: roleData }, { data: statusData }] = await Promise.all([
        supabase
          .from('profiles_roles')
          .select('id')
          .eq('role_name', user.role)
          .single(),
        supabase
          .from('profiles_status')
          .select('id')
          .eq('status_name', user.user_status)
          .single()
      ])

      if (!roleData || !statusData) {
        showSnackbar('Error: Invalid role or status selected')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: user.first_name,
          middle_initial: user.middle_initial,
          last_name: user.last_name,
          email: user.email,
          contact_number: user.contact_number,
          birth_date: user.birth_date,
          role_id: roleData.id,
          user_status_id: statusData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        showSnackbar('Error updating user: ' + error.message)
        return
      }

      showSnackbar('User updated successfully', true)
      navigation.navigate('UserManagement')
    } catch (error) {
      showSnackbar('Error updating user')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [{ data: userData, error: userError }, { data: roles }, { data: statuses }] = await Promise.all([
          supabase
            .from('profiles')
            .select(`
              *,
              profile_status:user_status_id (status_name),
              profile_roles:role_id (role_name)
            `)
            .eq('id', userId)
            .single(),
          supabase.from('profiles_roles').select('role_name'),
          supabase.from('profiles_status').select('status_name').in('id', [4, 5]),
        ])

        if (userError) {
          showSnackbar('Error loading user data: ' + userError.message)
          return
        }

        setUser({
          ...userData,
          role: userData.profile_roles?.role_name,
          user_status: userData.profile_status?.status_name,
          birth_date: userData.birth_date ? new Date(userData.birth_date) : null,
        })

        if (roles) setRoleOptions(roles.map(r => r.role_name))
        if (statuses) setStatusOptions(statuses.map(s => s.status_name))
      } catch (error) {
        showSnackbar('Error loading user data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleChange = (field, value) => {
    const sanitizedValue = sanitizeInput(field, value)
    const error = validateField(field, sanitizedValue)
    
    setUser(prev => ({ ...prev, [field]: sanitizedValue }))
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  // Memoize the role menu items
  const roleMenuItems = useMemo(() => 
    roleOptions.map(role => (
      <MemoizedMenuItem
        key={role}
        item={role}
        selected={user?.role === role}
        onPress={() => {
          handleChange('role', role)
          setRoleMenuVisible(false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [roleOptions, user?.role, colors, fonts])

  // Memoize the status menu items
  const statusMenuItems = useMemo(() => 
    statusOptions.map(status => (
      <MemoizedMenuItem
        key={status}
        item={status}
        selected={user?.user_status === status}
        onPress={() => {
          handleChange('user_status', status)
          setStatusMenuVisible(false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [statusOptions, user?.user_status, colors, fonts])

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text variant="bodyLarge" style={{ color: colors.onSurface }}>Loading user...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text variant="bodyLarge" style={{ color: colors.error }}>User not found.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
        <Appbar.Content title="Edit Profile" />
        <Appbar.Action 
          icon="content-save" 
          onPress={() => setShowConfirmDialog(true)} 
          disabled={loading}
          color={colors.primary}
        />
      </Appbar.Header>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={styles.avatarContainer}>
              {user.avatar_url ? (
                <Avatar.Image size={80} source={{ uri: user.avatar_url }} />
              ) : (
                <Avatar.Text size={80} label={(user.first_name || 'N')[0].toUpperCase()} />
              )}
              <Text variant="bodyLarge" style={[styles.avatarText, { color: colors.onSurface }]}>Profile Picture</Text>
            </View>

            <Divider style={styles.divider} />

            <TextInput
              label="First Name"
              value={user.first_name || ''}
              onChangeText={text => handleChange('first_name', text)}
              style={styles.input}
              mode="outlined"
              right={<TextInput.Icon icon="account" />}
              error={!!errors.first_name}
              helperText={errors.first_name}
            />

            <TextInput
              label="Middle Initial"
              value={user.middle_initial || ''}
              onChangeText={text => handleChange('middle_initial', text)}
              style={styles.input}
              mode="outlined"
              maxLength={1}
              right={<TextInput.Icon icon="account" />}
              error={!!errors.middle_initial}
              helperText={errors.middle_initial}
            />

            <TextInput
              label="Last Name"
              value={user.last_name || ''}
              onChangeText={text => handleChange('last_name', text)}
              style={styles.input}
              mode="outlined"
              right={<TextInput.Icon icon="account" />}
              error={!!errors.last_name}
              helperText={errors.last_name}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Email"
              value={user.email || ''}
              onChangeText={text => handleChange('email', text)}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              right={<TextInput.Icon icon="email" />}
              error={!!errors.email}
              helperText={errors.email}
            />

            <TextInput
              label="Contact Number"
              value={user.contact_number || ''}
              onChangeText={text => handleChange('contact_number', text)}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              left={<TextInput.Affix text="+63" />}
              right={<TextInput.Icon icon="phone" />}
              error={!!errors.contact_number}
              helperText={errors.contact_number}
              maxLength={13}
            />

            <TextInput
              label="Birth Date"
              value={user.birth_date ? user.birth_date.toLocaleDateString() : ''}
              editable={false}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="calendar" onPress={openDatePicker} />}
              error={!!errors.birth_date}
              helperText={errors.birth_date}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Emergency Contact Name"
              value={user.emergency_contact_name || ''}
              onChangeText={text => handleChange('emergency_contact_name', text)}
              style={styles.input}
              mode="outlined"
              right={<TextInput.Icon icon="account" />}
              error={!!errors.emergency_contact_name}
              helperText={errors.emergency_contact_name}
            />

            <TextInput
              label="Emergency Contact Number"
              value={user.emergency_contact_number || ''}
              onChangeText={text => handleChange('emergency_contact_number', text)}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              left={<TextInput.Affix text="+63" />}
              right={<TextInput.Icon icon="phone" />}
              error={!!errors.emergency_contact_number}
              helperText={errors.emergency_contact_number}
              maxLength={13}
            />

            <Divider style={styles.divider} />

            <Menu
              visible={roleMenuVisible}
              onDismiss={() => setRoleMenuVisible(false)}
              anchor={
                <TextInput
                  label="Role"
                  value={user?.role || ''}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  right={<TextInput.Icon icon="account-cog" onPress={() => setRoleMenuVisible(true)} />}
                  error={!!errors.role}
                  helperText={errors.role}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {roleMenuItems}
            </Menu>

            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <TextInput
                  label="Status"
                  value={user?.user_status || ''}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  right={<TextInput.Icon icon="account-check" onPress={() => setStatusMenuVisible(true)} />}
                  error={!!errors.user_status}
                  helperText={errors.user_status}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {statusMenuItems}
            </Menu>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showDatePicker}
          onDismiss={handleDateDismiss}
          date={user.birth_date}
          onConfirm={handleDateConfirm}
          title="Select Birth Date"
          animationType="slide"
          presentationStyle="formSheet"
          saveLabel="Select"
          label="Enter the birth date"
          startYear={1935}
          endYear={new Date().getFullYear()}
          validRange={{
            startDate: new Date(1935, 0, 1),
            endDate: new Date().getFullYear(),
          }}
        />
      </Portal>

      <Portal>
        <Dialog visible={showConfirmDialog} onDismiss={() => setShowConfirmDialog(false)} style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Save Changes</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to save these changes?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)} disabled={saving}>Cancel</Button>
            <Button onPress={() => {
              setShowConfirmDialog(false)
              saveUser()
            }} loading={saving} disabled={saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {SnackbarElement}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
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
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
})

export default EditAccount
