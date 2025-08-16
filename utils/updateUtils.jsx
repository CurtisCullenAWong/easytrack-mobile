import * as Updates from 'expo-updates'
import { Alert } from 'react-native'

/**
 * Utility functions for handling Expo Updates
 */

/**
 * Check if updates are available and enabled
 */
export const isUpdateAvailable = async () => {
  if (__DEV__) {
    console.log('Updates disabled in development mode')
    return false
  }

  if (!Updates.isEnabled) {
    console.log('Updates are not enabled')
    return false
  }

  try {
    const update = await Updates.checkForUpdateAsync()
    return update.isAvailable
  } catch (error) {
    console.error('Error checking for updates:', error)
    return false
  }
}

/**
 * Fetch and install update without user prompt
 */
export const installUpdateSilently = async () => {
  if (__DEV__ || !Updates.isEnabled) {
    return { success: false, reason: 'Updates not available' }
  }

  try {
    const update = await Updates.checkForUpdateAsync()
    
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync()
      await Updates.reloadAsync()
      return { success: true }
    } else {
      return { success: false, reason: 'No updates available' }
    }
  } catch (error) {
    console.error('Silent update failed:', error)
    return { success: false, reason: error.message }
  }
}

/**
 * Show update prompt to user
 */
export const showUpdatePrompt = (onInstall, onCancel) => {
  Alert.alert(
    "Update Available",
    "A new version of EasyTrack is available. Would you like to install it now?",
    [
      {
        text: "Install Now",
        onPress: onInstall
      },
      {
        text: "Later",
        style: "cancel",
        onPress: onCancel
      }
    ]
  )
}

/**
 * Get current update status
 */
export const getUpdateStatus = () => {
  return {
    isEnabled: Updates.isEnabled,
    isUpdateAvailable: Updates.isUpdateAvailable,
    updateId: Updates.updateId,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion
  }
}

/**
 * Handle update errors gracefully
 */
export const handleUpdateError = (error, showSnackbar) => {
  console.error('Update error:', error)
  
  let message = "An error occurred while updating the app."
  
  if (error.message.includes('network')) {
    message = "Network error. Please check your connection and try again."
  } else if (error.message.includes('timeout')) {
    message = "Update timed out. Please try again."
  } else if (error.message.includes('storage')) {
    message = "Storage error. Please free up space and try again."
  }
  
  if (showSnackbar) {
    showSnackbar(message, false)
  }
  
  return message
}

/**
 * Check if app needs to be restarted for updates
 */
export const needsRestart = () => {
  return Updates.isUpdateAvailable && Updates.isUpdateAvailable()
}

/**
 * Force restart the app
 */
export const restartApp = async () => {
  try {
    await Updates.reloadAsync()
  } catch (error) {
    console.error('Failed to restart app:', error)
    // Fallback: reload the app
    window.location.reload()
  }
}
