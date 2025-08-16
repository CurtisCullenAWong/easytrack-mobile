import { useState } from 'react'
import * as Updates from 'expo-updates'
import { Portal, Modal, ActivityIndicator, Text, useTheme } from 'react-native-paper'
import useSnackbar from './useSnackbar'
import { 
  isUpdateAvailable, 
  installUpdateSilently, 
  showUpdatePrompt, 
  handleUpdateError 
} from '../../utils/updateUtils'

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
    // Skip updates in development
    if (__DEV__) {
      console.log('Skipping update check in development mode')
      return
    }

    // Check if updates are enabled
    if (!Updates.isEnabled) {
      console.log('Updates are not enabled')
      return
    }

    try {
      setUpdateStatus('Checking for updates...')
      const hasUpdate = await isUpdateAvailable()
      
      if (hasUpdate) {
        setUpdateStatus('Update found. Downloading...')
        
        if (showPrompt) {
          showUpdatePrompt(
            async () => {
              try {
                setIsUpdating(true)
                setUpdateStatus('Installing update...')
                const result = await installUpdateSilently()
                
                if (!result.success) {
                  throw new Error(result.reason)
                }
              } catch (error) {
                console.error('Update installation error:', error)
                setUpdateStatus('')
                setIsUpdating(false)
                handleUpdateError(error, showSnackbar)
              }
            },
            () => {
              setUpdateStatus('')
              showSnackbar("Update will be installed on next app restart", true)
            }
          )
        } else {
          setIsUpdating(true)
          setUpdateStatus('Installing update...')
          const result = await installUpdateSilently()
          
          if (!result.success) {
            throw new Error(result.reason)
          }
        }
      } else {
        setUpdateStatus('')
        console.log('No updates available')
      }
    } catch (error) {
      console.error('Update check error:', error)
      setUpdateStatus('')
      setIsUpdating(false)
      handleUpdateError(error, showSnackbar)
    }
  }

  const checkForUpdates = async () => {
    return await isUpdateAvailable()
  }

  const getUpdateInfo = () => {
    return {
      isEnabled: Updates.isEnabled,
      updateId: Updates.updateId,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion
    }
  }

  return { 
    isUpdating, 
    updateStatus, 
    handleAppUpdate, 
    checkForUpdates,
    getUpdateInfo,
    UpdateModal, 
    SnackbarElement 
  }
}

export default useAppUpdate