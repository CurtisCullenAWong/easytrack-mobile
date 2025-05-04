import React, { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { TextInput, Button, useTheme, Text } from 'react-native-paper'
import { supabase } from '../../lib/supabase'
import useSnackbar from '../hooks/useSnackbar' // the new combined hook

const LoginModalContent = ({ isResetPasswordModal, onClose, navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [credentials, setCredentials] = useState({
    email: '', password: '', newPassword: '', confirmPassword: '',
  })
  const [visibility, setVisibility] = useState({
    password: false, newPassword: false, confirmPassword: false,
  })

  const handleChange = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = (field) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleResetPassword = () => {
    const { email, newPassword, confirmPassword } = credentials
    if (!email || !newPassword || !confirmPassword) {
      return showSnackbar('All fields are required.')
    }
    if (newPassword !== confirmPassword) {
      return showSnackbar('Passwords do not match.')
    }
    console.log('Reset Password Submitted:', { email, newPassword })
    onClose()
  }

  const handleLogin = async () => {
    const { email, password } = credentials
    if (!email || !password) {
      return showSnackbar('Email and password are required.')
    }
  
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  
    if (error) {
      return showSnackbar(error.message)
    }
  
    const user = data.user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
  
    if (profileError) {
      return showSnackbar('Login successful, but profile not found.')
    }
  
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', user.id)
  
    if (updateError) {
      console.warn('Failed to update last_login:', updateError.message)
    }
  
  
    switch (profile.role || true) {
      case 'Administrator':
        navigation.navigate('AdminDrawer')
        break
      case 'Delivery Personnel':
        navigation.navigate('DeliveryDrawer')
        break
      case 'Airline Staff':
        navigation.navigate('AirlineDrawer')
        break
      default:
        return showSnackbar('Unauthorized role or unknown user.')
    }
  
    onClose()
  }
  

  const renderPasswordInput = (label, valueKey, visibilityKey) => (
    <TextInput
      label={label}
      value={credentials[valueKey]}
      onChangeText={(text) => handleChange(valueKey, text)}
      secureTextEntry={!visibility[visibilityKey]}
      mode="outlined"
      style={styles.textInput}
      right={
        <TextInput.Icon
          icon={visibility[visibilityKey] ? 'eye' : 'eye-off'}
          iconColor={colors.primary}
          onPress={() => toggleVisibility(visibilityKey)}
        />
      }
    />
  )

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <Text style={[fonts.headlineSmall, styles.headerText]}>
        {isResetPasswordModal ? 'Reset Password' : 'Login'}
      </Text>

      <TextInput
        label="Email Address"
        value={credentials.email}
        onChangeText={(text) => handleChange('email', text)}
        mode="outlined"
        style={styles.textInput}
      />

      {isResetPasswordModal ? (
        <>
          {renderPasswordInput('New Password', 'newPassword', 'newPassword')}
          {renderPasswordInput('Confirm New Password', 'confirmPassword', 'confirmPassword')}
          <Button
            mode="contained"
            onPress={handleResetPassword}
            style={styles.button}
            labelStyle={[fonts.titleMedium, { color: colors.onPrimary }]}
          >
            Send Email
          </Button>
        </>
      ) : (
        <>
          {renderPasswordInput('Password', 'password', 'password')}
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.button}
            labelStyle={[fonts.titleMedium, { color: colors.onPrimary }]}
          >
            Login
          </Button>
        </>
      )}

      {SnackbarElement}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerText: {
    marginBottom: 24,
  },
  textInput: {
    marginBottom: 16,
  },
  button: {
    marginTop: 20,
    alignSelf: 'center',
    width: '85%',
    height: 50,
    justifyContent: 'center',
  },
})

export default LoginModalContent
