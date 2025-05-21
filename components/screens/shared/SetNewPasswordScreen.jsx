import React, { useState, useEffect } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Appbar, TextInput, Button, useTheme, Text } from 'react-native-paper'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'

const SetNewPasswordScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [visibility, setVisibility] = useState({ password: false, confirmPassword: false })
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })
  const [email, setEmail] = useState('')
  const handleChange = (field, value) => {
    setPasswords(prev => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = (field) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }))
  }
  const fetchEmail = async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error fetching email:', error)
    } else {
      setEmail(data.user.email)
    }
  }
  useEffect(() => {
    fetchEmail()
  }, [])

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  const handleSetNewPassword = async () => {
    try {
      if (!passwords.password || !passwords.confirmPassword) {
        return showSnackbar('Please fill in all fields')
      }

      if (passwords.password !== passwords.confirmPassword) {
        return showSnackbar('Passwords do not match')
      }

      const passwordError = validatePassword(passwords.password)
      if (passwordError) {
        return showSnackbar(passwordError)
      }

      setLoading(true)
      const { data, error } = await supabase.auth.updateUser({
        password: passwords.password
      })

      if (error) {
        throw error
      }

      if (data?.user) {
        showSnackbar('Password updated successfully', 'success')
        navigation.navigate('Login')
      } else {
        throw new Error('Failed to update password')
      }
    } catch (error) {
      console.error('Password update error:', error)
      showSnackbar(error.message || 'Error updating password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.navigate('Login')} />
          <Appbar.Content title='Set New Password' />
          <Appbar.Action 
          color={colors.primary}
        />
        </Appbar.Header>
        <View style={styles.contentContainer}>
      <Text style={[styles.title, { color: colors.primary, ...fonts.headlineMedium }]}>
        Please enter a new password for your account
      </Text>
      <Text style={[styles.subtitle, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Please enter a strong password that is at least 8 characters long and includes uppercase, lowercase, and numbers.
      </Text>
      {SnackbarElement}
      <TextInput
        label="Email"
        value={email}
        onChangeText={(text) => setEmail(text)}
        mode="outlined"
        style={styles.textInput}
        right={
          <TextInput.Icon
            icon={'email'}
            iconColor={colors.primary}
          />
        }
        editable={false}
      />
      <TextInput
        label="New Password"
        value={passwords.password}
        onChangeText={(text) => handleChange('password', text)}
        secureTextEntry={!visibility.password}
        mode="outlined"
        style={styles.textInput}
        right={
          <TextInput.Icon
            icon={visibility.password ? 'eye' : 'eye-off'}
            iconColor={colors.primary}
            onPress={() => toggleVisibility('password')}
          />
        }
      />
      <TextInput
        label="Confirm New Password"
        value={passwords.confirmPassword}
        onChangeText={(text) => handleChange('confirmPassword', text)}
        secureTextEntry={!visibility.confirmPassword}
        mode="outlined"
        style={styles.textInput}
        right={
          <TextInput.Icon
            icon={visibility.confirmPassword ? 'eye' : 'eye-off'}
            iconColor={colors.primary}
            onPress={() => toggleVisibility('confirmPassword')}
          />
        }
      />
      <Button
        mode="contained"
        onPress={handleSetNewPassword}
        style={[styles.button, { backgroundColor: colors.primary }]}
        labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
        loading={loading}
        disabled={loading}
      >
          Update Password
        </Button>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  contentContainer: {
    padding: 20,
    justifyContent: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  textInput: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    height: 50,
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
})

export default SetNewPasswordScreen 