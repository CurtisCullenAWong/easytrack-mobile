import { useState } from 'react'
import * as Updates from 'expo-updates'
import { Portal, Modal, ActivityIndicator, Text, useTheme } from 'react-native-paper'
import useSnackbar from './useSnackbar'

const UpdateModal = ({ visible, status }) => {
  const theme = useTheme()
  
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => {}}
        contentContainerStyle={{
          backgroundColor: 'white',
          padding: 20,
          margin: 20,
          borderRadius: 10,
          alignItems: 'center'
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={{ marginTop: 10 }}>{status}</Text>
      </Modal>
    </Portal>
  )
}

const useAppUpdate = () => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const handleAppUpdate = async (showPrompt = true) => {
    if (__DEV__) return

    try {
      setUpdateStatus('Checking for updates...')
      const update = await Updates.checkForUpdateAsync()
      
      if (update.isAvailable) {
        setUpdateStatus('Update found. Downloading...')
        await Updates.fetchUpdateAsync()
        
        if (showPrompt) {
          Alert.alert(
            "Update Available",
            "A new version is ready to install. Would you like to install it now?",
            [
              {
                text: "Install Now",
                onPress: async () => {
                  try {
                    setIsUpdating(true)
                    setUpdateStatus('Installing update...')
                    await Updates.reloadAsync()
                  } catch (error) {
                    console.error('Update error:', error)
                    setUpdateStatus('')
                    setIsUpdating(false)
                    if (!__DEV__) {
                      showSnackbar("Failed to install update. Please try again later.", false)
                    }
                  }
                }
              },
              {
                text: "Later",
                style: "cancel",
                onPress: () => setUpdateStatus('')
              }
            ]
          )
        } else {
          setIsUpdating(true)
          setUpdateStatus('Installing update...')
          await Updates.reloadAsync()
        }
      } else {
        setUpdateStatus('')
      }
    } catch (error) {
      console.error('Update error:', error)
      setUpdateStatus('')
      setIsUpdating(false)
      if (!__DEV__) {
        showSnackbar("Failed to check for updates. Please try again later.", false)
      }
    }
  }

  return { isUpdating, updateStatus, handleAppUpdate, UpdateModal, SnackbarElement }
}

export default useAppUpdate