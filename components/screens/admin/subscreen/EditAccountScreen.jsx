import React, { useState, useCallback, useMemo } from 'react'
import { useFocusEffect } from '@react-navigation/native'
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
import { validateProfileForm, handleTextChange } from '../../../../utils/profileValidation'

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
  invalidVerifyStatus: 'Please select a valid verification status',
}

registerTranslation('en', en)


// Custom hook for form data with validation
const useFormData = (initialState) => {
  const [formData, setFormData] = useState(initialState)
  const [errors, setErrors] = useState({})

  const validateField = (field, value) => {
    let error = ''
    switch (field) {
      case 'first_name':
      case 'last_name':
      case 'emergency_contact_name':
        if (!value) {
          error = 'This field is required'
        }
        break
      case 'email':
        if (!value) {
          error = 'This field is required'
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          error = 'Please enter a valid email address'
        }
        break
      case 'contact_number':
      case 'emergency_contact_number':
        if (!value) {
          error = 'This field is required'
        } else if (!/^9\d{9}$/.test(value)) {
          error = 'Contact number must be in format: 9xxxxxxxxx'
        }
        break
      case 'birth_date':
        if (!value) {
          error = 'This field is required'
        } else if (value > new Date()) {
          error = 'Birth date cannot be in the future'
        } else {
          const age = new Date().getFullYear() - value.getFullYear()
          if (age < 18) {
            error = 'Must be at least 18 years old'
          }
        }
        break
      case 'role':
        if (!value) {
          error = 'Please select a valid role'
        }
        break
      case 'user_status':
        if (!value) {
          error = 'Please select a valid status'
        }
        break
      case 'verify_status':
        if (!value) {
          error = 'Please select a valid verification status'
        }
        break
    }
    return error
  }

  const handleChange = useCallback((field, value) => {
    const sanitizedValue = handleTextChange(field, value)
    const error = validateField(field, sanitizedValue)
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }))
    setErrors(prev => ({ ...prev, [field]: error }))
    return sanitizedValue
  }, [])

  const validateForm = () => {
    const newErrors = {}
    const validationMessages = []
    
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field])
      if (error) {
        newErrors[field] = error
        validationMessages.push(error)
      }
    })
    
    setErrors(newErrors)
    return validationMessages
  }

  return { formData, setFormData, handleChange, errors, validateForm }
}

// Reusable components
const MemoizedMenuItem = React.memo(({ item, selected, onPress, colors, fonts }) => (
  <Menu.Item
    onPress={onPress}
    title={item}
    titleStyle={[fonts.bodyLarge, { color: selected ? colors.primary : colors.onSurface }]}
    leadingIcon={selected ? 'check' : undefined}
  />
))

const FormInput = React.memo(({ 
  label, 
  value, 
  onChangeText, 
  mode = 'outlined', 
  right, 
  left,
  error,
  ...props 
}) => (
  <TextInput
    label={label}
    value={value || ''}
    onChangeText={onChangeText}
    style={styles.input}
    mode={mode}
    right={right}
    left={left}
    error={error}
    {...props}
  />
))

// Main component
const EditAccount = ({ route, navigation }) => {
  const { userId } = route.params
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [roleMenuVisible, setRoleMenuVisible] = useState(false)
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)
  const [verifyStatusMenuVisible, setVerifyStatusMenuVisible] = useState(false)
  const [roleOptions, setRoleOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [verifyStatusOptions, setVerifyStatusOptions] = useState([])

  const { formData, setFormData, handleChange, errors, validateForm } = useFormData(null)

  // Date picker handlers
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
  }, [handleChange])

  const handleDateDismiss = useCallback(() => {
    setShowDatePicker(false)
  }, [])

  // Save user data
  const saveUser = async () => {
    const validationMessages = validateForm()
    if (validationMessages.length > 0) {
      // Show all validation messages in sequence
      validationMessages.forEach((message, index) => {
        setTimeout(() => {
          showSnackbar(message)
        }, index * 2000) // Show each message with a 2-second delay
      })
      return
    }

    setSaving(true)
    try {
      const [{ data: roleData }, { data: statusData }, { data: verifyStatusData }] = await Promise.all([
        supabase.from('profiles_roles').select('id').eq('role_name', formData.role).single(),
        supabase.from('profiles_status').select('id').eq('status_name', formData.user_status).single(),
        supabase.from('verify_status').select('id').eq('status_name', formData.verify_status).single()
      ])

      if (!roleData || !statusData || !verifyStatusData) {
        showSnackbar('Error: Invalid role, status, or verification status selected')
        return
      }

      // Format phone numbers with +63 prefix
      const formattedContactNumber = formData.contact_number ? `+63${formData.contact_number}` : null
      const formattedEmergencyNumber = formData.emergency_contact_number ? `+63${formData.emergency_contact_number}` : null

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name.trim(),
          middle_initial: formData.middle_initial.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email,
          contact_number: formattedContactNumber,
          birth_date: formData.birth_date,
          emergency_contact_name: formData.emergency_contact_name.trim(),
          emergency_contact_number: formattedEmergencyNumber,
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
      setSaving(false)
    }
  }

  const fetchAccount = async () => {
    setLoading(true)
    try {
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
        supabase.from('verify_status').select('status_name').in('id', [1, 4])
      ])

      if (userError) throw userError

      setFormData({
        ...userData,
        role: userData.profile_roles?.role_name,
        user_status: userData.profile_status?.status_name,
        verify_status: userData.verify_status?.status_name,
        birth_date: userData.birth_date ? new Date(userData.birth_date) : null,
        contact_number: userData.contact_number?.replace('+63', '') || '',
        emergency_contact_name: userData.emergency_contact_name || '',
        emergency_contact_number: userData.emergency_contact_number?.replace('+63', '') || '',
      })

      if (roles) setRoleOptions(roles.map(r => r.role_name))
      if (statuses) setStatusOptions(statuses.map(s => s.status_name))
      if (verifyStatuses) setVerifyStatusOptions(verifyStatuses.map(s => s.status_name))
    } catch (error) {
      showSnackbar('Error loading user data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch initial data
  useFocusEffect(
    useCallback(() => {
      fetchAccount()
  }, [userId])
  )

  // Memoized menu items
  const roleMenuItems = useMemo(() => 
    roleOptions.map(role => (
      <MemoizedMenuItem
        key={role}
        item={role}
        selected={formData?.role === role}
        onPress={() => {
          handleChange('role', role)
          setRoleMenuVisible(false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [roleOptions, formData?.role, colors, fonts])

  const statusMenuItems = useMemo(() => 
    statusOptions.map(status => (
      <MemoizedMenuItem
        key={status}
        item={status}
        selected={formData?.user_status === status}
        onPress={() => {
          handleChange('user_status', status)
          setStatusMenuVisible(false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [statusOptions, formData?.user_status, colors, fonts])

  const verifyStatusMenuItems = useMemo(() => 
    verifyStatusOptions.map(status => (
      <MemoizedMenuItem
        key={status}
        item={status}
        selected={formData?.verify_status === status}
        onPress={() => {
          handleChange('verify_status', status)
          setVerifyStatusMenuVisible(false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [verifyStatusOptions, formData?.verify_status, colors, fonts])

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>       
        <Text variant="bodyLarge" style={{ color: colors.onSurface }}>Loading user...</Text>
      </View>
    )
  }

  if (!formData) {
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
        <Appbar.Content title="Edit Account" />
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
              {formData.pfp_id ? (
                <Avatar.Image size={80} source={{ uri: formData.pfp_id }} />
              ) : (
                <Avatar.Text size={80} label={(formData.first_name || 'N')[0].toUpperCase()} />
              )}
              <Text variant="bodyLarge" style={[styles.avatarText, { color: colors.onSurface }]}>Profile Picture</Text>
            </View>

            <Divider style={styles.divider} />

            <FormInput
              label="First Name"
              value={formData.first_name}
              onChangeText={text => handleChange('first_name', text)}
              right={<TextInput.Icon icon="account" />}
              error={errors.first_name}
              maxLength={50}
              autoCapitalize="words"
            />

            <FormInput
              label="Middle Initial"
              value={formData.middle_initial}
              onChangeText={text => handleChange('middle_initial', text)}
              maxLength={1}
              right={<TextInput.Icon icon="account" />}
              error={errors.middle_initial}
              autoCapitalize="characters"
            />

            <FormInput
              label="Last Name"
              value={formData.last_name}
              onChangeText={text => handleChange('last_name', text)}
              right={<TextInput.Icon icon="account" />}
              error={errors.last_name}
              maxLength={50}
              autoCapitalize="words"
            />

            <Divider style={styles.divider} />

            <FormInput
              label="Email"
              value={formData.email}
              onChangeText={text => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              disabled={true}
              right={<TextInput.Icon icon="email" />}
              error={errors.email}
            />

            <FormInput
              label="Contact Number"
              value={formData.contact_number}
              onChangeText={text => handleChange('contact_number', text)}
              keyboardType="phone-pad"
              right={<TextInput.Icon icon="phone" />}
              maxLength={10}
              error={errors.contact_number}
              left={<TextInput.Affix text="+63" />}
            />

            <FormInput
              label="Birth Date"
              value={formData.birth_date ? formData.birth_date.toLocaleDateString() : ''}
              editable={false}
              right={<TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
              error={errors.birth_date}
            />

            <Divider style={styles.divider} />

            <FormInput
              label="Emergency Contact Name"
              value={formData.emergency_contact_name}
              onChangeText={text => handleChange('emergency_contact_name', text)}
              right={<TextInput.Icon icon="account" />}
              error={errors.emergency_contact_name}
              maxLength={50}
              autoCapitalize="words"
            />

            <FormInput
              label="Emergency Contact Number"
              value={formData.emergency_contact_number}
              onChangeText={text => handleChange('emergency_contact_number', text)}
              keyboardType="phone-pad"
              right={<TextInput.Icon icon="phone" />}
              maxLength={10}
              error={errors.emergency_contact_number}
              left={<TextInput.Affix text="+63" />}
            />

            <Divider style={styles.divider} />

            <Menu
              visible={roleMenuVisible}
              onDismiss={() => setRoleMenuVisible(false)}
              anchor={
                <FormInput
                  label="Role"
                  value={formData?.role}
                  editable={false}
                  right={<TextInput.Icon icon="account-cog" onPress={() => setRoleMenuVisible(true)} />}
                  error={errors.role}
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
                <FormInput
                  label="Status"
                  value={formData?.user_status}
                  editable={false}
                  right={<TextInput.Icon icon="account-check" onPress={() => setStatusMenuVisible(true)} />}
                  error={errors.user_status}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {statusMenuItems}
            </Menu>

            {(formData.role_id === 2 || formData.role_id === 3) && (
              <Menu
                visible={verifyStatusMenuVisible}
                onDismiss={() => setVerifyStatusMenuVisible(false)}
                anchor={
                  <FormInput
                    label="Verification Status"
                    value={formData?.verify_status}
                    editable={false}
                    right={<TextInput.Icon icon="shield-check" onPress={() => setVerifyStatusMenuVisible(true)} />}
                    error={errors.verify_status}
                  />
                }
                contentStyle={{ backgroundColor: colors.surface }}
              >
                {verifyStatusMenuItems}
              </Menu>
            )}
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showDatePicker}
          onDismiss={handleDateDismiss}
          date={formData.birth_date}
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
            endDate: new Date(),
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