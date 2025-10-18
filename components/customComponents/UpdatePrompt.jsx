import { useEffect, useState, useCallback } from 'react'
import { Platform, StyleSheet } from 'react-native'
import * as Updates from 'expo-updates'
import { Portal, Dialog, Text, ProgressBar, useTheme } from 'react-native-paper'

const UpdatePrompt = () => {
  const { colors, fonts } = useTheme()
  const [downloading, setDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const checkAndUpdate = useCallback(async () => {
    if (Platform.OS === 'web') return

    try {
      const result = await Updates.checkForUpdateAsync()
      if (result.isAvailable) {
        // Automatically download and install the update
        setDownloading(true)
        setErrorMessage(null)
        
        const update = await Updates.fetchUpdateAsync()
        if (update && update.isNew) {
          // Give a brief moment to show completion, then reload
          setTimeout(() => {
            Updates.reloadAsync().catch(() => {})
          }, 500)
        } else {
          setDownloading(false)
        }
      }
    } catch (error) {
      setErrorMessage('Update unavailable. Will retry later.')
      setDownloading(false)
      // Clear error after 2 seconds
      setTimeout(() => setErrorMessage(null), 2000)
    }
  }, [])

  useEffect(() => {
    checkAndUpdate()
    // Check periodically (every 30 minutes)
    const interval = setInterval(() => {
      checkAndUpdate()
    }, 1000 * 60 * 30)

    return () => clearInterval(interval)
  }, [checkAndUpdate])

  return (
    <Portal>
      <Dialog 
        visible={downloading || !!errorMessage} 
        dismissable={false}
        style={{ backgroundColor: colors.surface }}
      >
        <Dialog.Title style={[fonts.headlineSmall, { color: colors.onSurface }]}>
          {downloading ? 'Updating app' : 'Update failed'}
        </Dialog.Title>
        <Dialog.Content>
          {downloading && (
            <>
              <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
                Downloading and installing update…
              </Text>
              <ProgressBar 
                indeterminate 
                style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}
                color={colors.primary}
              />
            </>
          )}
          {!!errorMessage && (
            <Text style={[fonts.bodyMedium, { color: colors.error }]}>
              {errorMessage}
            </Text>
          )}
        </Dialog.Content>
      </Dialog>
    </Portal>
  )
}

export default UpdatePrompt

const styles = StyleSheet.create({
  progressBar: {
    marginTop: 16
  }
})