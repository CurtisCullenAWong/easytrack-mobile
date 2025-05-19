import React, { useState } from 'react'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { Portal, Dialog, Button, Text, useTheme } from 'react-native-paper'
import { supabase } from '../../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage' // Add this import

const useLogout = () => {
  const navigation = useNavigation()
  const [isDialogVisible, setIsDialogVisible] = useState(false)
  const { colors, fonts } = useTheme()

  const handleLogout = () => setIsDialogVisible(true)

  const confirmLogout = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Update user status to offline
      await supabase
        .from('profiles')
        .update({ user_status_id: 2 })
        .eq('id', user.id)
    }

    // Disable autologin by clearing rememberMe
    await AsyncStorage.setItem('rememberMe', 'false') // <-- Add this line

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error.message)
      return
    }

    setIsDialogVisible(false)
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    )
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
          <Button onPress={cancelLogout} labelStyle={{ color: colors.primary }}>
            Cancel
          </Button>
          <Button onPress={confirmLogout} labelStyle={{ color: colors.primary }}>
            OK
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