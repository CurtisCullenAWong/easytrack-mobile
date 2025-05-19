import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { TextInput, Button, useTheme, Text, Checkbox } from 'react-native-paper'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useAuth from '../hooks/useAuth'

const LoginModalContent = ({ isResetPasswordModal, isOtpLoginModal, onClose, navigation }) => {
  const { colors, fonts } = useTheme()
  const { login, resetPassword, loginWithOtp, SnackbarElement } = useAuth(navigation, onClose)
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [visibility, setVisibility] = useState({ password: false })
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleChange = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = (field) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleResetPassword = () => {
    setLoading(true)
    resetPassword(credentials.email)
    setLoading(false)
  }

  const handleOtpLogin = async () => {
    setLoading(true)
    await loginWithOtp(credentials.email)
    setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true)
    await AsyncStorage.setItem('rememberMe', rememberMe ? 'true' : 'false')
    await login(credentials)
    setLoading(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <Text style={[fonts.headlineSmall, styles.headerText]}>
        {isResetPasswordModal ? 'Reset Password' : isOtpLoginModal ? 'Login with Email OTP' : 'Login'}
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
        disabled={loading}
      />

      {isResetPasswordModal ? (
        <Button
          mode="contained"
          onPress={handleResetPassword}
          style={[styles.button, { backgroundColor: colors.primary }]}
          labelStyle={[fonts.labelLarge, { color: colors.onPrimary }]}
          disabled={loading}
          loading={loading}
        >
          Send Reset Email
        </Button>
      ) : isOtpLoginModal ? (
        <Button
          mode="contained"
          onPress={handleOtpLogin}
          style={[styles.button, { backgroundColor: colors.primary }]}
          labelStyle={[fonts.labelLarge, { color: colors.onPrimary }]}
          disabled={loading}
          loading={loading}
        >
          Send OTP
        </Button>
      ) : (
        <>
          <TextInput
            label="Password"
            value={credentials.password}
            onChangeText={(text) => handleChange('password', text)}
            secureTextEntry={!visibility.password}
            mode="outlined"
            disabled={loading}
            style={styles.textInput}
            right={
              <TextInput.Icon
                icon={visibility.password ? 'eye' : 'eye-off'}
                iconColor={colors.primary}
                onPress={() => toggleVisibility('password')}
              />
            }
          />
          <View style={styles.rememberMeContainer}>
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
              color={colors.primary}
              disabled={loading}
            />
            <Text onPress={() => setRememberMe(!rememberMe)} style={[styles.rememberMeText,fonts.labelMedium]}>
              Remember Me
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={handleLogin}
            style={[styles.button, { backgroundColor: colors.primary }]}
            labelStyle={[fonts.labelLarge, { color: colors.onPrimary }]}
            loading={loading}
            disabled={loading}
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
})

export default LoginModalContent