import { useEffect, useState, useCallback } from 'react'
import { Platform } from 'react-native'
import * as Updates from 'expo-updates'
import { Portal, Dialog, Button, Text, ActivityIndicator, ProgressBar } from 'react-native-paper'

const UpdatePrompt = () => {
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
      <Dialog visible={!!isUpdateAvailable} dismissable={!downloading} onDismiss={() => !downloading && setIsUpdateAvailable(false)}>
        <Dialog.Title>Update available</Dialog.Title>
        <Dialog.Content>
          {checking && (
            <>
              <Text>Checking for updates…</Text>
              <ActivityIndicator style={{ marginTop: 12 }} />
            </>
          )}
          {!checking && !downloading && (
            <Text>A new version is ready. Install now?</Text>
          )}
          {downloading && (
            <>
              <Text>Downloading update…</Text>
              <ProgressBar indeterminate style={{ marginTop: 12 }} />
            </>
          )}
          {!!errorMessage && (
            <Text style={{ color: 'red', marginTop: 12 }}>{errorMessage}</Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          {!downloading && (
            <Button onPress={() => setIsUpdateAvailable(false)}>Later</Button>
          )}
          {!downloading && (
            <Button mode="contained" onPress={downloadAndInstall}>Install</Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

export default UpdatePrompt


