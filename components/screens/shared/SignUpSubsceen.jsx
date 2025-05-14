import React, { useState, useCallback } from 'react'
import { StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { TextInput, Button, useTheme, Appbar, Text, Portal, Dialog, Surface, Divider } from 'react-native-paper'
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'

// Register the English locale
registerTranslation('en', en)

// Validation patterns
const VALIDATION_PATTERNS = {
  name: /^[a-zA-Z\s'-]{2,50}$/,
  middleInitial: /^[a-zA-Z]$/,
  phone: /^(\+63|0)[0-9]{10}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/,
}

// Validation messages
const VALIDATION_MESSAGES = {
  required: 'This field is required',
  invalidName: 'Name should only contain letters, spaces, hyphens, and apostrophes (2-50 characters)',
  invalidMiddleInitial: 'Middle initial should be a single letter',
  invalidPhone: 'Please enter a valid Philippine phone number (e.g., +639123456789 or 09123456789)',
  invalidEmail: 'Please enter a valid email address',
  invalidBirthDate: 'Birth date cannot be in the future',
  invalidPassword: 'Password must be at least 6 characters long and contain at least one letter and one number',
  passwordMismatch: 'Passwords do not match',
  invalidRole: 'Please select a valid role',
}

// Phone number formatting function
const formatPhoneNumber = (value) => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')
  
  // If empty, return empty string
  if (!digits) return ''
  
  // If starts with 0, keep it
  if (digits.startsWith('0')) {
    return digits
  }
  
  // If starts with 9, add 0
  if (digits.startsWith('9')) {
    return `0${digits}`
  }
  
  // If none of the above, add 0
  return `09${digits}`
}

const SignUpSubScreen = ({ navigation, onClose }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    contact_number: '',
    birth_date: null,
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  const [visibility, setVisibility] = useState({
    password: false,
    confirmPassword: false,
  })

  const roleOptions = ['Administrator', 'Airline Staff', 'Delivery Personnel']

  // Validation functions
  const validateField = (field, value) => {
    let error = '';
    switch (field) {
      case 'first_name':
      case 'last_name':
        if (!value) {
          error = VALIDATION_MESSAGES.required;
        } else if (!VALIDATION_PATTERNS.name.test(value)) {
          error = VALIDATION_MESSAGES.invalidName;
        }
        break;
      case 'middle_initial':
        if (value && !VALIDATION_PATTERNS.middleInitial.test(value)) {
          error = VALIDATION_MESSAGES.invalidMiddleInitial;
        }
        break;
      case 'email':
        if (!value) {
          error = VALIDATION_MESSAGES.required;
        } else if (!VALIDATION_PATTERNS.email.test(value)) {
          error = VALIDATION_MESSAGES.invalidEmail;
        }
        break;
      case 'password':
        if (!value) {
          error = VALIDATION_MESSAGES.required;
        }
        else if (!VALIDATION_PATTERNS.password.test(value)) {
          error = VALIDATION_MESSAGES.invalidPassword;
        }
        break;
      case 'confirmPassword':
        if (!value) {
          error = VALIDATION_MESSAGES.required;
        } else if (value !== form.password) {
          error = VALIDATION_MESSAGES.passwordMismatch;
        }
        break;
      case 'contact_number':
        if (!value) {
          error = VALIDATION_MESSAGES.required;
        } else if (!VALIDATION_PATTERNS.phone.test(value)) {
          error = VALIDATION_MESSAGES.invalidPhone;
        }
        break;
      case 'birth_date':
        if (!value) {
          error = VALIDATION_MESSAGES.required;
        } else if (value > new Date()) {
          error = VALIDATION_MESSAGES.invalidBirthDate;
        }
        break;
      case 'role':
        if (!value) {
          error = VALIDATION_MESSAGES.invalidRole;
        }
        break;
    }
    return error;
  }

  // Sanitization functions
  const sanitizeInput = (field, value) => {
    switch (field) {
      case 'first_name':
      case 'last_name':
        return value.trim().replace(/\s+/g, ' ')
      case 'middle_initial':
        return value.trim().toUpperCase()
      case 'email':
        return value.trim().toLowerCase()
      case 'contact_number':
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
    const validationMessages = []
    
    Object.keys(form).forEach(field => {
      const error = validateField(field, form[field])
      if (error) {
        newErrors[field] = error
        validationMessages.push(error)
      }
    })
    
    setErrors(newErrors)
    
    if (validationMessages.length > 0) {
      // Show all validation messages in sequence
      validationMessages.forEach((message, index) => {
        setTimeout(() => {
          showSnackbar(message)
        }, index * 2000) // Show each message with a 2-second delay
      })
      return false
    }
    
    return true
  }

  const handleChange = (field, value) => {
    const sanitizedValue = sanitizeInput(field, value)
    const error = validateField(field, sanitizedValue)
    
    setForm(prev => ({ ...prev, [field]: sanitizedValue }))
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const toggleVisibility = (field) => setVisibility(prev => ({ ...prev, [field]: !prev[field] }))

  const handleSignUp = async () => {
    if (!validateForm()) {
      return null
    }

    try {
      setLoading(true)
      const { email, password, first_name, middle_initial, last_name, contact_number, birth_date, role } = form
  
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
  
      if (signUpError) {
        return showSnackbar(signUpError.message)
      }
  
      const user = data.user
      
      if (user) {
        try {
          // Get role_id based on role name
          const { data: roleData, error: roleError } = await supabase
            .from('profiles_roles')
            .select('id')
            .eq('role_name', role)
            .single()

          if (roleError) {
            throw new Error('Invalid role selected')
          }

          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              first_name: first_name,
              middle_initial: middle_initial,
              last_name: last_name,
              contact_number: contact_number,
              birth_date: birth_date,
              role_id: roleData.id,
              user_status_id: 3, // Pending status
            })  
  
          if (profileError) {
            return showSnackbar('Profile creation failed: ' + profileError.message)
          }
  
          showSnackbar('Account created! Check your email to verify.', true)
          navigation.navigate('Login')

  
        } catch (error) {
          console.error("Error creating profile:", error)
          showSnackbar('Something went wrong while creating the profile.')
        }
      } else {
        showSnackbar('User creation failed.')
      }
    } catch (error) {
      showSnackbar('Error during sign up process')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Create an Account" />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
            <TextInput
              label="First Name"
              value={form.first_name}
              onChangeText={(text) => handleChange('first_name', text)}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="account" />}
              error={!!errors.first_name}
              helperText={errors.first_name}
            />
            <TextInput
              label="Middle Initial"
              value={form.middle_initial}
              onChangeText={(text) => handleChange('middle_initial', text)}
              mode="outlined"
              style={styles.input}
              maxLength={1}
              right={<TextInput.Icon icon="account" />}
              error={!!errors.middle_initial}
              helperText={errors.middle_initial}
            />
            <TextInput
              label="Last Name"
              value={form.last_name}
              onChangeText={(text) => handleChange('last_name', text)}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="account" />}
              error={!!errors.last_name}
              helperText={errors.last_name}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Contact Number"
              value={form.contact_number}
              onChangeText={(text) => handleChange('contact_number', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              left={<TextInput.Affix text="+63" />}
              error={!!errors.contact_number}
              helperText={errors.contact_number}
              maxLength={11}
            />

            <TextInput
              label="Birth Date"
              value={form.birth_date ? form.birth_date.toLocaleDateString() : ''}
              editable={false}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="calendar" onPress={openDatePicker} />}
              error={!!errors.birth_date}
              helperText={errors.birth_date}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Email"
              value={form.email}
              onChangeText={(text) => handleChange('email', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              right={<TextInput.Icon icon="email" />}
              error={!!errors.email}
              helperText={errors.email}
            />

            <TextInput
              label="Password"
              value={form.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry={!visibility.password}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={visibility.password ? 'eye' : 'eye-off'}
                  onPress={() => toggleVisibility('password')}
                />
              }
              error={!!errors.password}
              helperText={errors.password}
            />

            <TextInput
              label="Confirm Password"
              value={form.confirmPassword}
              onChangeText={(text) => handleChange('confirmPassword', text)}
              secureTextEntry={!visibility.confirmPassword}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={visibility.confirmPassword ? 'eye' : 'eye-off'}
                  onPress={() => toggleVisibility('confirmPassword')}
                />
              }
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
            />

            <TextInput
              label="Role"
              value={form.role}
              editable={false}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="account-cog" onPress={() => setShowRoleMenu(true)} />}
              error={!!errors.role}
              helperText={errors.role}
            />

            <Button
              mode="contained"
              onPress={() => setShowConfirmDialog(true)}
              style={[styles.button, { backgroundColor: colors.primary }]}
              labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
              loading={loading}
              disabled={loading}
            >
              Sign Up
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.cancelButton}
              labelStyle={{ color: colors.primary }}
              disabled={loading}
            >
              Cancel
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showDatePicker}
          onDismiss={handleDateDismiss}
          date={form.birth_date}
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
        <Dialog
          visible={showRoleMenu}
          onDismiss={() => setShowRoleMenu(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Select Role</Dialog.Title>
          <Dialog.Content>
            {roleOptions.map((role) => (
              <Button
                key={role}
                mode="text"
                onPress={() => {
                  handleChange('role', role)
                  setShowRoleMenu(false)
                }}
                style={styles.roleButton}
                textColor={form.role === role ? colors.primary : colors.onSurface}
              >
                {role}
              </Button>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRoleMenu(false)} textColor={colors.error}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={showConfirmDialog}
          onDismiss={() => setShowConfirmDialog(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Confirm Sign Up</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to create an account with these details?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onPress={() => {
                setShowConfirmDialog(false)
                handleSignUp()
              }}
              loading={loading}
              disabled={loading}
            >
              Sign Up
            </Button>
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
  input: { 
    marginBottom: 16
  },
  divider: {
    marginVertical: 16,
  },
  button: { 
    marginTop: 12, 
    height: 50, 
    justifyContent: 'center', 
    borderRadius: 8 
  },
  buttonLabel: { 
    fontWeight: 'bold' 
  },
  cancelButton: { 
    marginTop: 8, 
    alignSelf: 'center' 
  },
  roleButton: {
    marginVertical: 4,
  },
})

export default SignUpSubScreen
