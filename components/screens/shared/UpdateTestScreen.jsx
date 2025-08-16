import React, { useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Button, Card, Text, Divider, useTheme } from 'react-native-paper'
import useAppUpdate from '../../hooks/useAppUpdate'
import * as Updates from 'expo-updates'

const UpdateTestScreen = () => {
  const theme = useTheme()
  const [updateInfo, setUpdateInfo] = useState(null)
  const { 
    isUpdating, 
    updateStatus, 
    handleAppUpdate, 
    checkForUpdates,
    getUpdateInfo,
    UpdateModal 
  } = useAppUpdate()

  const handleCheckUpdates = async () => {
    const hasUpdate = await checkForUpdates()
    const info = getUpdateInfo()
    setUpdateInfo({ hasUpdate, ...info })
  }

  const handleManualUpdate = async () => {
    await handleAppUpdate(true)
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background
    },
    card: {
      marginBottom: 16
    },
    section: {
      marginBottom: 8
    },
    button: {
      marginVertical: 8
    }
  })

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Update Test Screen" />
        <Card.Content>
          <Text variant="bodyMedium">
            This screen helps you test and debug the Expo Updates functionality.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Update Actions" />
        <Card.Content>
          <Button 
            mode="contained" 
            onPress={handleCheckUpdates}
            style={styles.button}
            disabled={isUpdating}
          >
            Check for Updates
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={handleManualUpdate}
            style={styles.button}
            disabled={isUpdating}
          >
            Manual Update Check
          </Button>
        </Card.Content>
      </Card>

      {updateInfo && (
        <Card style={styles.card}>
          <Card.Title title="Update Information" />
          <Card.Content>
            <View style={styles.section}>
              <Text variant="labelLarge">Update Available:</Text>
              <Text variant="bodyMedium">
                {updateInfo.hasUpdate ? 'Yes' : 'No'}
              </Text>
            </View>
            
            <Divider style={{ marginVertical: 8 }} />
            
            <View style={styles.section}>
              <Text variant="labelLarge">Updates Enabled:</Text>
              <Text variant="bodyMedium">
                {updateInfo.isEnabled ? 'Yes' : 'No'}
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text variant="labelLarge">Update ID:</Text>
              <Text variant="bodyMedium">
                {updateInfo.updateId || 'None'}
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text variant="labelLarge">Channel:</Text>
              <Text variant="bodyMedium">
                {updateInfo.channel || 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text variant="labelLarge">Runtime Version:</Text>
              <Text variant="bodyMedium">
                {updateInfo.runtimeVersion || 'Unknown'}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {isUpdating && (
        <Card style={styles.card}>
          <Card.Title title="Update Status" />
          <Card.Content>
            <Text variant="bodyMedium">{updateStatus}</Text>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Title title="Environment Info" />
        <Card.Content>
          <View style={styles.section}>
            <Text variant="labelLarge">Development Mode:</Text>
            <Text variant="bodyMedium">
              {__DEV__ ? 'Yes' : 'No'}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text variant="labelLarge">Platform:</Text>
            <Text variant="bodyMedium">
              {Updates.platform || 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text variant="labelLarge">Native App Version:</Text>
            <Text variant="bodyMedium">
              {Updates.nativeAppVersion || 'Unknown'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <UpdateModal visible={isUpdating} status={updateStatus} />
    </ScrollView>
  )
}

export default UpdateTestScreen
