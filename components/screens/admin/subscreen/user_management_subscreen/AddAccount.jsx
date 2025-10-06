import React, { useState, useCallback } from 'react'
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import useSnackbar from '../../../../hooks/useSnackbar'
import { supabase } from '../../../../../lib/supabase'
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
      
      // Clear corporation selection when role changes to prevent invalid combinations
      if (selectedRole?.id && (selectedRole.id === 1 || selectedRole.id === 2)) {
        // Role 1 or 2 - only allow corporation_id = 1
        const corp1 = corporationOptions.find(c => c.id === 1)
        if (corp1) {
          setForm(prev => ({ ...prev, corporation: corp1.corporation_name }))
          setCorporation_id(1)
          validateCorporation(corp1.corporation_name)
        }
      } else if (selectedRole?.id) {
        // Role not 1 or 2 - clear corporation if it was set to 1
        if (corporation_id === 1) {
          setForm(prev => ({ ...prev, corporation: '' }))
          setCorporation_id('')
          setErrors(prev => ({ ...prev, corporation: 'Please select a corporation' }))
        }
      }
    } else if (field === 'corporation') {
      const selectedCorporation = corporationOptions.find(c => c.corporation_name === value)
      setCorporation_id(selectedCorporation?.id || '')
      validateCorporation(value)
    } else if (field === 'email') {
      validateEmail(value)
    }
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const adminCreateAccount = async () => {
    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()

      const { data, error } = await supabase.functions.invoke('admin-create-account', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: {
          email: form.email,
          role_id,
          corporation_id,
          redirectUrl: 'easytrack://login'
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      showSnackbar('Account created successfully', true)
      navigation.navigate('UserManagement')
      setShowDialogConfirm(false)
    } catch (err) {
      console.error('Admin create account error:', err)
      showSnackbar(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
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
                right={<TextInput.Icon icon="account-cog" onPress={() => setShowRoleMenu(true)}/>}
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
                right={<TextInput.Icon icon="office-building" onPress={() => setShowCorpMenu(true)}/>}
                error={!!errors.corporation}
              />
            </TouchableOpacity>
            {errors.corporation ? <Text style={{ color: colors.error }}>{errors.corporation}</Text> : null}

            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={() => setShowDialogConfirm(true)}
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
            {corporationOptions.map(corp => {
              // Disable corporation_id = 1 if role_id is not 1 or 2
              const isDisabled = (role_id === 1 || role_id === 2) 
                ? corp.id !== 1  // Only allow corp_id = 1 for roles 1 or 2
                : corp.id === 1  // Disable corp_id = 1 for other roles
              
              return (
                <Button
                  key={corp.id}
                  onPress={() => {
                    if (!isDisabled) {
                      handleChange('corporation', corp.corporation_name)
                      setShowCorpMenu(false)
                    }
                  }}
                  disabled={isDisabled}
                  textColor={
                    isDisabled 
                      ? colors.disabled 
                      : form.corporation === corp.corporation_name 
                        ? colors.primary 
                        : colors.onSurface
                  }
                >
                  {corp.corporation_name}
                  {isDisabled && ' (Not Available)'}
                </Button>
              )
            })}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCorpMenu(false)} textColor={colors.error}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Final Confirm Dialog */}
      <Portal>
        <Dialog visible={showDialogConfirm} onDismiss={() => setShowDialogConfirm(false)} dismissable={!loading} style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Confirm Creation</Dialog.Title>
          <Dialog.Content>
            <Text>Email: {form.email}</Text>
            <Text>Role: {form.role}</Text>
            <Text>Corporation: {form.corporation}</Text>
            <Text>This action will send a verification email to the user.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialogConfirm(false)} disabled={loading}>Cancel</Button>
            <Button mode="contained" style={{ backgroundColor: colors.primary }} onPress={adminCreateAccount} loading={loading} disabled={loading}>
              <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>Confirm Creation</Text>
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {SnackbarElement}
    </ScrollView>
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
