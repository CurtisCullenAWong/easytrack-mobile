import React, { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { TextInput, Button, useTheme, Text } from 'react-native-paper'
import useAuth from '../hooks/useAuth'
const LoginModalContent = ({ isResetPasswordModal, onClose, navigation }) => {
  const { colors, fonts } = useTheme()
  const { login, resetPassword, SnackbarElement } = useAuth(navigation, onClose)
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [visibility, setVisibility] = useState({ password: false })
  const [isLoading, setIsLoading] = useState(false)
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

  const handleResetPassword = () => {
    resetPassword(credentials.email)
  }

  const handleLogin = () => {
    setIsLoading(true)
    login(credentials)
    setIsLoading(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <Text style={[fonts.headlineSmall, styles.headerText]}>
        {isResetPasswordModal ? 'Reset Password' : 'Login'}
      </Text>
      {SnackbarElement}
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
          loading={isLoading}
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
            loading={isLoading}
          >
            Login
          </Button>
        </>
      )}
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
