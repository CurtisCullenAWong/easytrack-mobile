import React, { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { TextInput, Button, Snackbar, useTheme, Text, Portal } from 'react-native-paper'

const LoginModalContent = ({ isResetPasswordModal, onClose, navigation }) => {
  const { colors, fonts } = useTheme()

  const [credentials, setCredentials] = useState({
    email: '', password: '', newPassword: '', confirmPassword: '',
  })
  const [visibility, setVisibility] = useState({
    password: false, newPassword: false, confirmPassword: false,
  })
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' })

  const handleChange = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = (field) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const showSnackbar = (message) => {
    setSnackbar({ message, visible: true })
  }

  const handleResetPassword = () => {
    const { email } = credentials
    if (!email || !newPassword || !confirmPassword) {
      return showSnackbar('All fields are required.')
    }
    if (newPassword !== confirmPassword) {
      return showSnackbar('Passwords do not match.')
    }
    console.log('Reset Password Submitted:', { email, newPassword })
    onClose()
  }

  const handleLogin = () => {
    const { email, password } = credentials
    if (!email || !password) {
      return showSnackbar('Email and password are required.')
    }
    console.log('Login Creds:', { email, password })

    if (email.includes('@admin')) navigation.navigate('AdminDrawer')
    else if (email.includes('@delivery')) navigation.navigate('DeliveryDrawer')
    else if (email.includes('@airline')) navigation.navigate('AirlineDrawer')

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

      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar(prev => ({ ...prev, visible: false }))}
          duration={3000}
          style={[styles.snackbar, { backgroundColor: colors.error }]}
        >
          <Text style={[fonts.default, styles.snackbarText]}>
            {snackbar.message}
          </Text>
        </Snackbar>
      </Portal>
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
  snackbar: {
    borderRadius: 8,
    width: 'auto',
    marginHorizontal: '10%',
    marginBottom: '20%',
  },
  snackbarText: {
    textAlign: 'center',
    color: 'white',
  },
})

export default LoginModalContent
