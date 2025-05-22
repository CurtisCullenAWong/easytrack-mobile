import React, { useState, useCallback } from 'react'
import { StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View, TouchableOpacity } from 'react-native'
import { TextInput, Button, useTheme, Appbar, Text, Portal, Dialog, Surface, Divider } from 'react-native-paper'
import useSnackbar from '../../../../components/hooks/useSnackbar'
import { supabase } from '../../../../lib/supabaseAdmin'
import { useFocusEffect } from '@react-navigation/native'
import { makeRedirectUri } from 'expo-auth-session'
import * as Crypto from 'expo-crypto'

const generateSecurePassword = () => {
  // Generate 16 random bytes and convert to hex string
  const randomBytes = Crypto.getRandomBytes(16)
  return Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12)
}

const sanitizeEmail = (email) => {
  return email.trim().toLowerCase()
}

const AddAccount = ({ navigation }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [roleOptions, setRoleOptions] = useState([])
  const [role_id, setRole_id] = useState('')
  const [form, setForm] = useState({
    email: '',
    role: '',
  })
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDialogConfirm, setShowDialogConfirm] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  // Add error state
  const [errors, setErrors] = useState({
    email: '',
    role: ''
  })

  // Update validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }))
      return false
    }
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
      return false
    }
    setErrors(prev => ({ ...prev, email: '' }))
    return true
  }

  const validateRole = (role) => {
    if (!role) {
      setErrors(prev => ({ ...prev, role: 'Please select a role' }))
      return false
    }
    setErrors(prev => ({ ...prev, role: '' }))
    return true
  }

  const fetchRoles = async () => {
    const { data } = await supabase
      .from('profiles_roles')
      .select('*')
      .range(0, 2)
    setRoleOptions(data)
  }
  useFocusEffect(
    useCallback(() => {
      fetchRoles()
    }, [])
  )

  const handleChange = (field, value) => {
    if (field === 'role') {
      const selectedRole = roleOptions.find(role => role.role_name === value)
      setRole_id(selectedRole?.id || '')
      validateRole(value)
    } else if (field === 'email') {
      validateEmail(value)
    }
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateAccount = async () => {
    try {
      setLoading(true)
      const { email } = form
      
      // Validate all fields
      const validations = [
        validateEmail(email),
        validateRole(form.role)
      ]

      if (validations.some(valid => !valid)) {
        showSnackbar('Please fix the validation errors before creating account')
        return
      }

      if (!role_id) {
        setErrors(prev => ({ ...prev, role: 'Invalid role selected' }))
        showSnackbar('Invalid role selected')
        return
      }
      
      const sanitizedEmail = sanitizeEmail(email)
      const encryptedValue = generateSecurePassword()
      //SEND EMAIL HERE
      const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(sanitizedEmail, {
        email: sanitizedEmail,
        data: {
          password: encryptedValue,
          role: form.role,
        },
        options: {
          emailRedirectTo: makeRedirectUri({
            scheme: 'easytrack',
            path: 'confirm-email'
          }),
        },
      })
      if (inviteError) {
        showSnackbar(inviteError.message)
        return
      }
      const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, {
        email: sanitizedEmail,
        password: encryptedValue,
        user_metadata: {
          password: null,
          role: null,
        }
      })
      if (updateError) {
        showSnackbar(updateError.message)
        return
      }
      // Insert profile with role_id and pending status
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: sanitizedEmail,
          role_id: role_id,
          user_status_id: 4,
        })
    
      if (profileError) {
        return showSnackbar('Profile creation failed: ' + profileError.message)
      }
      navigation.navigate('UserManagement')
      showSnackbar('Account created! Check your email to verify.', true)
    } catch (error) {
      showSnackbar(error.message)
      console.log(error)
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setShowDialogConfirm(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
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
              label="Email"
              value={form.email}
              onChangeText={(text) => handleChange('email', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              right={<TextInput.Icon icon="email" />}
              theme={{ colors: { primary: colors.primary } }}
              error={!!errors.email}
              helperText={errors.email}
            />
            <TouchableOpacity onPress={() => setShowRoleMenu(true)}>
              <TextInput
                label="Role"
                value={form.role}
                editable={false}
                mode="outlined"
                style={styles.input}
                right={<TextInput.Icon icon="account-cog" onPress={() => setShowRoleMenu(true)}/>}
                theme={{ colors: { primary: colors.primary } }}
                error={!!errors.role}
                helperText={errors.role}
              />
            </TouchableOpacity>

            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={() => setShowConfirmDialog(true)}
              style={[styles.button, { backgroundColor: colors.primary }]}
              labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
              loading={loading}
              disabled={loading}
            >
              Create Account
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('UserManagement')}
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
        <Dialog
          visible={showRoleMenu}
          onDismiss={() => setShowRoleMenu(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Select Role</Dialog.Title>
          <Dialog.Content>
            {roleOptions.map((role) => (
              <Button
                key={role.id}
                mode="text"
                onPress={() => {
                  handleChange('role', role.role_name)
                  setShowRoleMenu(false)
                }}
                style={styles.roleButton}
                textColor={form.role === role.role_name ? colors.primary : colors.onSurface}
              >
                {role.role_name}
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
          <Dialog.Title>Account Creation for {form.email}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This will create a new account with the following details:
            </Text>
            <Text variant="bodyMedium">
              Email: {form.email}
            </Text>
            <Text variant="bodyMedium">
              Role: {form.role}
            </Text>
            <Text variant="bodyMedium">
              Are you sure you want to proceed?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onPress={() => {
              setShowDialogConfirm(true)
              setShowConfirmDialog(false)
            }}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={showDialogConfirm}
          onDismiss={() => setShowDialogConfirm(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Are you sure you want to create this account?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Account Email: {form.email}</Text>
            <Text variant="bodyMedium">Role: {form.role}</Text>
            <Text variant="bodyMedium">This action will send a verification email to the user.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialogConfirm(false)}>Cancel</Button>
            <Button 
              style={{backgroundColor: colors.primary}} 
              onPress={() => {
                setShowDialogConfirm(false)
                handleCreateAccount()
              }}
            >
              <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>Confirm Creation</Text>
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

export default AddAccount
