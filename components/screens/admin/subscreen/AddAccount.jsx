import React, { useState, useCallback } from 'react'
import {
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  TouchableOpacity
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
  Divider
} from 'react-native-paper'
import useSnackbar from '../../../../components/hooks/useSnackbar'
import { supabase } from '../../../../lib/supabaseAdmin'
import { useFocusEffect } from '@react-navigation/native'
import { makeRedirectUri } from 'expo-auth-session'
import * as Crypto from 'expo-crypto'

const generateSecurePassword = () => {
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
  const [corporationOptions, setCorporationOptions] = useState([])

  const [role_id, setRole_id] = useState('')
  const [corporation_id, setCorporation_id] = useState('')
  const [form, setForm] = useState({ email: '', role: '', corporation: '' })
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDialogConfirm, setShowDialogConfirm] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showCorpMenu, setShowCorpMenu] = useState(false)

  const [errors, setErrors] = useState({ email: '', role: '', corporation: '' })

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

  const validateCorporation = (corporation) => {
    if (!corporation) {
      setErrors(prev => ({ ...prev, corporation: 'Please select a corporation' }))
      return false
    }
    setErrors(prev => ({ ...prev, corporation: '' }))
    return true
  }

  const fetchRoles = async () => {
    const { data } = await supabase.from('profiles_roles').select('*').range(0, 2)
    setRoleOptions(data || [])
  }

  const fetchCorporations = async () => {
    const { data } = await supabase.from('profiles_corporation').select('*')
    setCorporationOptions(data || [])
  }

  useFocusEffect(
    useCallback(() => {
      fetchRoles()
      fetchCorporations()
    }, [])
  )

  const handleChange = (field, value) => {
    if (field === 'role') {
      const selectedRole = roleOptions.find(role => role.role_name === value)
      setRole_id(selectedRole?.id || '')
      validateRole(value)
    } else if (field === 'corporation') {
      const selectedCorporation = corporationOptions.find(c => c.corporation_name === value)
      setCorporation_id(selectedCorporation?.id || '')
      validateCorporation(value)
    } else if (field === 'email') {
      validateEmail(value)
    }
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateAccount = async () => {
    try {
      setLoading(true)
      const { email } = form

      const validations = [
        validateEmail(email),
        validateRole(form.role),
        validateCorporation(form.corporation)
      ]
      if (validations.some(v => !v)) {
        showSnackbar('Please fix the validation errors before creating account')
        return
      }

      if (!role_id || !corporation_id) {
        if (!role_id) setErrors(prev => ({ ...prev, role: 'Invalid role selected' }))
        if (!corporation_id) setErrors(prev => ({ ...prev, corporation: 'Invalid corporation selected' }))
        showSnackbar('Invalid role or corporation selected')
        return
      }

      const sanitizedEmail = sanitizeEmail(email)
      const encryptedValue = generateSecurePassword()

      const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(sanitizedEmail, {
        email: sanitizedEmail,
        data: {
          password: encryptedValue,
          role: form.role,
        },
        redirectTo: makeRedirectUri({
          scheme: 'easytrack',
          path: 'login'
        }),
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

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: sanitizedEmail,
          role_id: role_id,
          corporation_id: corporation_id,
          user_status_id: 4
        })

      if (profileError) {
        showSnackbar('Profile creation failed: ' + profileError.message)
        return
      }

      showSnackbar('Account created! Check your email to verify.', true)
      navigation.navigate('UserManagement')

      setForm({ email: '', role: '', corporation: '' })
      setRole_id('')
      setCorporation_id('')
    } catch (error) {
      showSnackbar(error.message)
      console.error(error)
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
              error={!!errors.email}
            />
            {errors.email ? <Text style={{ color: colors.error }}>{errors.email}</Text> : null}

            <TouchableOpacity onPress={() => setShowRoleMenu(true)}>
              <TextInput
                label="Role"
                value={form.role}
                editable={false}
                mode="outlined"
                style={styles.input}
                right={<TextInput.Icon icon="account-cog" />}
                error={!!errors.role}
              />
            </TouchableOpacity>
            {errors.role ? <Text style={{ color: colors.error }}>{errors.role}</Text> : null}

            <TouchableOpacity onPress={() => setShowCorpMenu(true)}>
              <TextInput
                label="Corporation"
                value={form.corporation}
                editable={false}
                mode="outlined"
                style={styles.input}
                right={<TextInput.Icon icon="office-building" />}
                error={!!errors.corporation}
              />
            </TouchableOpacity>
            {errors.corporation ? <Text style={{ color: colors.error }}>{errors.corporation}</Text> : null}

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

      {/* Role Selection Dialog */}
      <Portal>
        <Dialog visible={showRoleMenu} onDismiss={() => setShowRoleMenu(false)} style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Select Role</Dialog.Title>
          <Dialog.Content>
            {roleOptions.map(role => (
              <Button
                key={role.id}
                onPress={() => {
                  handleChange('role', role.role_name)
                  setShowRoleMenu(false)
                }}
                textColor={form.role === role.role_name ? colors.primary : colors.onSurface}
              >
                {role.role_name}
              </Button>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRoleMenu(false)} textColor={colors.error}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Corporation Selection Dialog */}
      <Portal>
        <Dialog visible={showCorpMenu} onDismiss={() => setShowCorpMenu(false)} style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Select Corporation</Dialog.Title>
          <Dialog.Content>
            {corporationOptions.map(corp => (
              <Button
                key={corp.id}
                onPress={() => {
                  handleChange('corporation', corp.corporation_name)
                  setShowCorpMenu(false)
                }}
                textColor={form.corporation === corp.corporation_name ? colors.primary : colors.onSurface}
              >
                {corp.corporation_name}
              </Button>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCorpMenu(false)} textColor={colors.error}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Initial Confirm Dialog */}
      <Portal>
        <Dialog visible={showConfirmDialog} onDismiss={() => setShowConfirmDialog(false)} style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Account Creation</Dialog.Title>
          <Dialog.Content>
            <Text>Email: {form.email}</Text>
            <Text>Role: {form.role}</Text>
            <Text>Corporation: {form.corporation}</Text>
            <Text>Are you sure you want to proceed?</Text>
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

      {/* Final Confirm Dialog */}
      <Portal>
        <Dialog visible={showDialogConfirm} onDismiss={() => setShowDialogConfirm(false)} style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Confirm Creation</Dialog.Title>
          <Dialog.Content>
            <Text>Email: {form.email}</Text>
            <Text>Role: {form.role}</Text>
            <Text>Corporation: {form.corporation}</Text>
            <Text>This action will send a verification email to the user.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialogConfirm(false)}>Cancel</Button>
            <Button style={{ backgroundColor: colors.primary }} onPress={handleCreateAccount}>
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
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  surface: { padding: 16, borderRadius: 8, marginBottom: 16 },
  input: { marginBottom: 16 },
  divider: { marginVertical: 16 },
  button: { marginTop: 12, height: 50, justifyContent: 'center', borderRadius: 8 },
  buttonLabel: { fontWeight: 'bold' },
  cancelButton: { marginTop: 8, alignSelf: 'center' },
})

export default AddAccount
