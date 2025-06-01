import { useState } from 'react'
import { Alert, Modal, View, Text, ActivityIndicator } from 'react-native'
import * as Updates from 'expo-updates'

const UpdateModal = ({ visible, status, theme }) => (
  <Modal transparent={true} visible={visible} animationType="fade">
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)'
    }}>
      <View style={{
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center'
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 10 }}>{status}</Text>
      </View>
    </View>
  </Modal>
)

const useAppUpdate = () => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')

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
                      Alert.alert("Update Error", "Failed to check for updates. Please try again later.")
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
        Alert.alert("Update Error", "Failed to check for updates. Please try again later.")
      }
    }
  }

  return { isUpdating, updateStatus, handleAppUpdate, UpdateModal }
}

export default useAppUpdate