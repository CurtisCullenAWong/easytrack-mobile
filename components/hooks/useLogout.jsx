import React, { useState } from 'react'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { Portal, Dialog, Button, Text, ActivityIndicator, useTheme } from 'react-native-paper'
import { supabase } from '../../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { stopBackgroundTracking } from './useLocation'
import { unregisterPushToken } from '../../utils/registerForPushNotifications'
const useLogout = () => {
  const navigation = useNavigation()
  const [isDialogVisible, setIsDialogVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // <-- Loading state
  const { colors, fonts } = useTheme()

  const handleLogout = () => setIsDialogVisible(true)

  const confirmLogout = async () => {
    setIsLoading(true) // <-- Start loading
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Update user status to offline
        await supabase
          .from('profiles')
          .update({ user_status_id: 2 })
          .eq('id', user.id)
      }

      // Attempt to remove push token row for this device/user before sign out
      try {
        if (user) await unregisterPushToken(user.id)
      } catch (e) {
        console.warn('Failed to unregister push token during logout', e)
      }

      // Disable autologin
      await AsyncStorage.setItem('rememberMe', 'false')

  // Use local scope to only sign out this session/device and avoid revoking other devices' sessions
  const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.error('Logout error:', error.message)
        setIsLoading(false)
        return
      }

      setIsDialogVisible(false)
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      )

      stopBackgroundTracking()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelLogout = () => setIsDialogVisible(false)

  const LogoutDialog = (
    <Portal>
      <Dialog visible={isDialogVisible} onDismiss={cancelLogout} style={{ backgroundColor: colors.surface }}>
        <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
          Logout
        </Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: colors.onSurface, ...fonts.bodyMedium }}>
            This will log you out. Are you sure?
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={cancelLogout} labelStyle={{ color: colors.primary }} disabled={isLoading}>
            Cancel
          </Button>
          <Button onPress={confirmLogout} labelStyle={{ color: colors.primary }} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={colors.primary} /> : 'OK'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )

  return {
    handleLogout,
    LogoutDialog,
  }
}

export default useLogout