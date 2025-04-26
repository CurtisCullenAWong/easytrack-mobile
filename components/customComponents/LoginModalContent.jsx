import React, { useState } from 'react'
import { ScrollView, Text, StyleSheet } from 'react-native'
import { TextInput, Button, useTheme, Snackbar } from 'react-native-paper'

const LoginModalContent = ({ isResetPasswordModal, onClose, navigation }) => {
  const { colors, fonts } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) 
  const [showNewPassword, setShowNewPassword] = useState(false) 
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  const handleResetPassword = () => {
    if (!email || !newPassword || !confirmPassword) {
      setSnackbarMessage('All fields are required.')
      setSnackbarVisible(true)
      return
    }
    if (newPassword !== confirmPassword) {
      setSnackbarMessage('Passwords do not match.')
      setSnackbarVisible(true)
      return
    }
    console.log('Reset Password Submitted:', { email, newPassword })
    onClose()
  }

  const handleLogin = () => {
    if (!email || !password) {
      setSnackbarMessage('Email and password are required.')
      setSnackbarVisible(true)
      return
    }
    console.log('Login Creds:', { email, password })
    if (email.includes('@admin')) {
      navigation.navigate('AdminDrawer')
    }
    if (email.includes('@delivery')) {
      navigation.navigate('DeliveryDrawer')
    }
    if (email.includes('@airline')) {
      navigation.navigate('AirlineDrawer')
    }
    onClose()
  }

  return (
    <ScrollView contentContainerStyle={styles.modalContentContainer}>
      <Text style={[styles.modalTitle, { color: colors.primary, fontFamily: fonts.regular.fontFamily }]}>
        {isResetPasswordModal ? 'Reset Password' : 'Login'}
      </Text>

      <TextInput
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        theme={{ colors: { primary: colors.primary, text: colors.tertiary } }}
      />

      {isResetPasswordModal ? (
        <>
          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: colors.primary, text: colors.tertiary } }}
            right={
              <TextInput.Icon
                icon={showNewPassword ? 'eye' : 'eye-off'}
                onPress={() => setShowNewPassword(!showNewPassword)}
                color={colors.iconColor}
              />
            }
          />
          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: colors.primary, text: colors.tertiary } }}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye' : 'eye-off'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                color={colors.iconColor}
              />
            }
          />
          <Button
            mode="contained"
            onPress={handleResetPassword}
            buttonColor={colors.primary}
            labelStyle={[styles.buttonLabel, { color: '#FFFFFF', fontFamily: fonts.regular.fontFamily }]}
            style={styles.loginButton}
          >
            Send Email
          </Button>
        </>
      ) : (
        <>
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: colors.primary, text: colors.tertiary } }}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye' : 'eye-off'}
                onPress={() => setShowPassword(!showPassword)}
                color={colors.iconColor}
              />
            }
          />
          <Button
            mode="contained"
            onPress={handleLogin}
            buttonColor={colors.primary}
            labelStyle={[styles.buttonLabel, { color: '#FFFFFF', fontFamily: fonts.regular.fontFamily }]}
            style={styles.loginButton}
          >
            Login
          </Button>
        </>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  )
}


const styles = StyleSheet.create({
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'left',
  },
  modalContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 30,
  },
  input: {
    minWidth: '100%',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  loginButton: {
    alignSelf: 'center',
    marginTop: 20,
    width: '85%',
    height: 50,
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
  snackbar: {
    borderRadius: 8,
    left: '9%',
  },

})

export default LoginModalContent
