import { useEffect, useState, useCallback } from 'react'
import { Platform, StyleSheet } from 'react-native'
import * as Updates from 'expo-updates'
import { Portal, Dialog, Button, Text, ActivityIndicator, ProgressBar, useTheme } from 'react-native-paper'

const UpdatePrompt = () => {
  const { colors, fonts } = useTheme()
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const checkForUpdates = useCallback(async () => {
    if (Platform.OS === 'web') return
    try {
      setChecking(true)
      const result = await Updates.checkForUpdateAsync()
      setIsUpdateAvailable(!!result.isAvailable)
    } catch (error) {
      setErrorMessage('Failed to check for updates.')
    } finally {
      setChecking(false)
    }
  }, [])

  const downloadAndInstall = useCallback(async () => {
    if (Platform.OS === 'web') return
    try {
      setErrorMessage(null)
      setDownloading(true)
      const update = await Updates.fetchUpdateAsync()
      if (update && update.isNew) {
        setIsUpdateAvailable(false)
        setDownloading(false)
        setTimeout(() => {
          Updates.reloadAsync().catch(() => {})
        }, 250)
      } else {
        setIsUpdateAvailable(false)
      }
    } catch (error) {
      setErrorMessage('Failed to download or install update.')
    } finally {
      setDownloading(false)
    }
  }, [])

  useEffect(() => {
    checkForUpdates()
  }, [checkForUpdates])

  return (
    <Portal>
      <Dialog 
        visible={!!isUpdateAvailable} 
        dismissable={!downloading} 
        onDismiss={() => !downloading && setIsUpdateAvailable(false)}
        style={{ backgroundColor: colors.surface }}
      >
        <Dialog.Title style={[fonts.headlineSmall, { color: colors.onSurface }]}>
          Update available
        </Dialog.Title>
        <Dialog.Content>
          {checking && (
            <>
              <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
                Checking for updates…
              </Text>
              <ActivityIndicator 
                style={styles.loadingContainer} 
                color={colors.primary}
              />
            </>
          )}
          {!checking && !downloading && (
            <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
              A new version is ready. Install now?
            </Text>
          )}
          {downloading && (
            <>
              <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
                Downloading update…
              </Text>
              <ProgressBar 
                indeterminate 
                style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}
                color={colors.primary}
              />
            </>
          )}
          {!!errorMessage && (
            <Text style={[fonts.bodyMedium, { color: colors.error, marginTop: 12 }]}>
              {errorMessage}
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          {!downloading && (
            <Button 
              onPress={() => setIsUpdateAvailable(false)}
              textColor={colors.primary}
              labelStyle={fonts.labelLarge}
              style={{ borderRadius: 8 }}
            >
              Later
            </Button>
          )}
          {!downloading && (
            <Button 
              mode="contained" 
              onPress={downloadAndInstall}
              style={{ backgroundColor: colors.primary, borderRadius: 8 }}
              labelStyle={[fonts.labelLarge, { color: colors.onPrimary }]}
            >
              Install
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

export default UpdatePrompt


const styles = StyleSheet.create({
  loadingContainer: {
    marginTop: 16
  },
  progressBar: {
    marginTop: 16
  }
})