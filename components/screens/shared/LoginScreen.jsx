import React, { useState, useEffect } from 'react'
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Button, useTheme } from 'react-native-paper'
import BottomModal from '../../customComponents/BottomModal'
import LoginModalContent from '../../customComponents/LoginModalContent'
import useAuth from '../../hooks/useAuth'
import AsyncStorage from '@react-native-async-storage/async-storage'

const LoginScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [modalVisible, setModalVisible] = useState(false)
  const [isResetPasswordModal, setIsResetPasswordModal] = useState(false)
  const [isOtpLoginModal, setIsOtpLoginModal] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const { checkSession } = useAuth(navigation)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingSession(true)
        const rememberMe = await AsyncStorage.getItem('rememberMe')
        if (rememberMe === 'true') {
          await checkSession()
        }
      } catch (error) {
        console.warn('Session check failed:', error)
      } finally {
        setIsCheckingSession(false)
      }
    }
    checkAuth()
  }, [])

  const showModal = () => setModalVisible(true)
  const hideModal = () => setModalVisible(false)

  const showResetPasswordModal = () => {
    setIsResetPasswordModal(true)
    setIsOtpLoginModal(false)
    showModal()
  }

  const showOtpLoginModal = () => {
    setIsOtpLoginModal(true)
    setIsResetPasswordModal(false)
    showModal()
  }

  const handleLogin = () => {
    setIsResetPasswordModal(false)
    setIsOtpLoginModal(false)
    showModal()
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isCheckingSession && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.subtitle, { color: colors.onBackground, ...fonts.titleMedium }]}>Checking session...</Text>
        </View>
      )}
      {!isCheckingSession && (
      <>
      <Image source={require('../../../assets/banner.png')} style={styles.bannerImage} />
      <Text style={[styles.title, { color: colors.primary, ...fonts.displayLarge }]}>
        EasyTrack
      </Text>
      <Text style={[styles.subtitle, { color: colors.onBackground, ...fonts.titleMedium }]}>
        For your luggage booking and tracking needs. Keep track of your luggage location in real-time.
      </Text>

      <Button
        mode="contained"
        onPress={handleLogin}
        style={[styles.button, { backgroundColor: colors.primary }]}
        labelStyle={[styles.buttonLabel, { color: colors.onPrimary, ...fonts.labelLarge }]}
      >
        Login
      </Button>
      
      <Button
        mode="text"
        onPress={showOtpLoginModal}
        style={styles.resetPasswordButton}
        labelStyle={[styles.buttonLabel, { color: colors.primary }]}
      >
        Login with Email OTP
      </Button>

      <Button
        mode="text"
        onPress={showResetPasswordModal}
        style={styles.resetPasswordButton}
        labelStyle={[styles.buttonLabel, { color: colors.primary }]}
      >
        Forgot Password?
      </Button>

      <BottomModal visible={modalVisible} onDismiss={hideModal}>
        <LoginModalContent
          isResetPasswordModal={isResetPasswordModal}
          isOtpLoginModal={isOtpLoginModal}
          onClose={hideModal}
          navigation={navigation}
        />
      </BottomModal>
      </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    alignSelf: 'center',
    maxWidth: '110%',
    maxHeight: '30%',
  },
  logoImage: {
    width: undefined,
    height: '20%',
    alignSelf: 'center',
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  title: {
    textAlign: 'center',
    marginVertical: 20,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    alignSelf: 'center',
    width: '85%',
    height: 50,
    justifyContent: 'center',
    borderRadius: 8,
    marginTop: '10%',
    marginBottom: 12,
  },
  buttonLabel: {
    textAlign: 'center',
  },
  resetPasswordButton: {
    alignSelf: 'center',
    marginTop: 12,
  },
})

export default LoginScreen