import React, { useState } from 'react'
import { View, Image, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { Button, useTheme } from 'react-native-paper'
import BottomModal from '../customComponents/BottomModal'
import LoginModalContent from '../customComponents/LoginModalContent'

const LoginScreen = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [isResetPasswordModal, setIsResetPasswordModal] = useState(false)
  const { colors, fonts } = useTheme()

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
      <Image source={require('../../assets/banner.png')} style={styles.banner} />
      <Image source={require('../../assets/icon-w_o-name.png')} style={styles.image}
      />
      <Text style={[styles.title, { color: colors.primary, fontFamily: fonts.regular.fontFamily }]}>
        EasyTrack
      </Text>
      <Text style={[styles.description, { color: colors.tertiary, fontFamily: fonts.regular.fontFamily }]}>
        For your luggage contracting and tracking needs. Keep track of your luggage location in real-time.
      </Text>

      <Button
        mode="contained"
        onPress={handleLogin}
        buttonColor={colors.primary}
        labelStyle={[styles.buttonLabel, { color: '#FFFFFF', fontFamily: fonts.regular.fontFamily }]}
        style={styles.firstButton}
      >
        Login
      </Button>

      <Button
        mode="text"
        onPress={showResetPasswordModal}
        labelStyle={[styles.buttonLabel, { color: colors.primary, fontFamily: fonts.regular.fontFamily }]}
        style={styles.secondaryButton}
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
  banner: {
    alignSelf: 'center',
    maxWidth: '110%',
    maxHeight: '30%',
  },
  image: {
    width: undefined,  // Adjusts the width to 50% of the parent container
    height: '20%',  // Automatically adjusts height based on aspect ratio
    alignSelf:'center',
    aspectRatio: 1,  // Maintains the aspect ratio of the image
    resizeMode: 'contain',  // Ensures the image fits within the bounds
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  firstButton: {
    alignSelf: 'center',
    width: '85%',
    height: 50,
    justifyContent: 'center',
    borderRadius: 8,
    marginTop: '10%',
    marginBottom: 12,
  },
  secondaryButton: {
    alignSelf: 'center',
    marginTop: 12,
  },
  buttonLabel: {
    fontSize: 16,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  signUpText: {
    fontSize: 16,
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default LoginScreen
