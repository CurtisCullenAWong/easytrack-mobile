import React, { useState, useEffect } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { TextInput, Button, useTheme, Text } from 'react-native-paper'
import { supabase } from '../../lib/supabase'
import useSnackbar from '../hooks/useSnackbar'

const LoginModalContent = ({ isResetPasswordModal, onClose, navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [visibility, setVisibility] = useState({ password: false })

  const handleChange = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = (field) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const renderPasswordInput = () => (
    <TextInput
      label="Password"
      value={credentials.password}
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
  )

  const routeUserByRole = async (user) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) return showSnackbar('Logged in, but no profile found.')

    await supabase
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', user.id)

    const routeMap = {
      Administrator: 'AdminDrawer',
      'Delivery Personnel': 'DeliveryDrawer',
      'Airline Staff': 'AirlineDrawer',
    }

    const targetRoute = routeMap[profile?.role]
    if (!targetRoute) return showSnackbar('Unauthorized role or unknown user.')

    navigation.navigate(targetRoute)
    onClose?.()
  }

  const handleResetPassword = async () => {
    if (!credentials.email) return showSnackbar('Email is required.')

    const { error } = await supabase.auth.resetPasswordForEmail(credentials.email, {
      redirectTo: 'myapp://reset-password',
    })

    if (error) return showSnackbar(error.message)
    showSnackbar('Password reset email sent.', 'success')
    onClose?.()
  }

  const handleLogin = async () => {
    const { email, password } = credentials
    if (!email || !password) return showSnackbar('Email and password are required.')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return showSnackbar(error.message)

    routeUserByRole(data.user)
  }

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
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {isResetPasswordModal ? (
        <Button
          mode="contained"
          onPress={handleResetPassword}
          style={[styles.button, { backgroundColor: colors.primary }]}
          labelStyle={[fonts.titleMedium, { color: colors.onPrimary }]}
        >
          Send Reset Email
        </Button>
      ) : (
        <>
          {renderPasswordInput()}

          <Button
            mode="contained"
            onPress={handleLogin}
            style={[styles.button, { backgroundColor: colors.primary }]}
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
    textAlign: 'center',
  },
  textInput: {
    marginBottom: 16,
  },
  button: {
    alignSelf: 'center',
    width: '85%',
    height: 50,
    justifyContent: 'center',
    borderRadius: 8,
    marginTop: 16,
  },
})

export default LoginModalContent
