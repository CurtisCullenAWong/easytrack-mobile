import React, { useState } from 'react'
import { View, Image, Text, StyleSheet } from 'react-native'
import { Button, useTheme } from 'react-native-paper'
import BottomModal from '../customComponents/BottomModal'
import LoginModalContent from '../customComponents/LoginModalContent'

const LoginScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [modalVisible, setModalVisible] = useState(false)
  const [isResetPasswordModal, setIsResetPasswordModal] = useState(false)

  const showModal = () => setModalVisible(true)
  const hideModal = () => setModalVisible(false)

  const showResetPasswordModal = () => {
    setIsResetPasswordModal(true)
    showModal()
  }

  const handleLogin = () => {
    setIsResetPasswordModal(false)
    showModal()
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require('../../assets/banner.png')} style={styles.bannerImage} />
      <Image source={require('../../assets/icon-w_o-name.png')} style={styles.logoImage} />

      <Text style={[styles.title, { color: colors.primary, ...fonts.displayLarge }]}>
        EasyTrack
      </Text>

      <Text style={[styles.subtitle, { color: colors.onBackground, ...fonts.titleMedium }]}>
        For your luggage contracting and tracking needs. Keep track of your luggage location in real-time.
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
        onPress={showResetPasswordModal}
        style={styles.resetPasswordButton}
        labelStyle={[styles.buttonLabel, { color: colors.primary }]}
      >
        Forgot Password?
      </Button>

      <BottomModal visible={modalVisible} onDismiss={hideModal}>
        <LoginModalContent
          isResetPasswordModal={isResetPasswordModal}
          onClose={hideModal}
          navigation={navigation}
        />
      </BottomModal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
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
    marginBottom: 20,
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
