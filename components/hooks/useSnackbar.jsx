import React, { useState } from 'react'
import { Snackbar, Text, useTheme, Portal } from 'react-native-paper'

const useSnackbar = () => {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const { colors, fonts } = useTheme()

  const showSnackbar = (msg, isSuccess = false) => {
    setMessage(msg)
    setSuccess(isSuccess)
    setVisible(true)
  }

  const hideSnackbar = () => setVisible(false)

  const SnackbarElement = (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={hideSnackbar}
        duration={3000}
        style={{
          backgroundColor: success ? colors.primary : colors.error,
          borderRadius: 8,
          marginHorizontal: '10%',
          marginBottom: '20%',
          zIndex: 9999,
        }}
      >
        <Text style={[fonts.bodyMedium, { color: 'white', textAlign: 'center' }]}>
          {message}
        </Text>
      </Snackbar>
    </Portal>
  )

  return {
    showSnackbar,
    SnackbarElement,
  }
}

export default useSnackbar
