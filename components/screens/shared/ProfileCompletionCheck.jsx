import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  ActivityIndicator,
} from 'react-native'
import {
  Button,
  useTheme,
  Appbar,
  Text,
  Surface,
  Card,
  IconButton,
} from 'react-native-paper'
import { supabase } from '../../../lib/supabase'
import useSnackbar from '../../hooks/useSnackbar'

const ProfileCompletionCheck = ({ navigation, route }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [state, setState] = useState({
    loading: true,
    profile: null,
    missingFields: [],
    isComplete: false,
  })

  const requiredFields = [
    'first_name',
    'last_name', 
    'contact_number',
    'birth_date',
    'emergency_contact_name',
    'emergency_contact_number',
    'role_id'
  ]

  const fieldLabels = {
    first_name: 'First Name',
    last_name: 'Last Name',
    contact_number: 'Contact Number',
    birth_date: 'Birth Date',
    emergency_contact_name: 'Emergency Contact Name',
    emergency_contact_number: 'Emergency Contact Number',
    role_id: 'User Role'
  }

  const checkProfileCompletion = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showSnackbar('User not authenticated')
        navigation.navigate('Login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        showSnackbar('Error loading profile: ' + error.message)
        navigation.navigate('Login')
        return
      }

      // Check which required fields are missing
      const missingFields = requiredFields.filter(field => {
        const value = profile[field]
        if (field === 'role_id') {
          return !value || value === null || value === undefined
        }
        return !value || (typeof value === 'string' && value.trim() === '')
      })

      const isComplete = missingFields.length === 0

      setState({
        loading: false,
        profile,
        missingFields,
        isComplete
      })

      // If profile is complete, navigate to target route
      if (isComplete) {
        const routeMap = {
          1: 'AdminDrawer',
          2: 'DeliveryDrawer',
          3: 'AirlineDrawer',
        }
        const targetRoute = routeMap[profile.role_id]
        if (targetRoute) {
          // Use replace to prevent going back to this screen
          navigation.replace(targetRoute)
        } else {
          showSnackbar('Invalid user role. Please contact support.')
          handleLogout()
        }
      }

    } catch (error) {
      console.error('Error checking profile completion:', error)
      showSnackbar('Error checking profile completion')
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  useFocusEffect(
    useCallback(() => {
      checkProfileCompletion()
    }, [])
  )

  const handleUpdateProfile = () => {
    navigation.navigate('UpdateProfile', { missingFields: state.missingFields })
  }

  const handleLogout = async () => {
    try {
  // Only sign out this local session to avoid logging out other devices
  const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        showSnackbar('Error logging out: ' + error.message)
      } else {
        navigation.replace('Login')
      }
    } catch (error) {
      showSnackbar('Error logging out')
    }
  }

  const handleRefresh = () => {
    checkProfileCompletion()
  }

  if (state.loading) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.Content title='Profile Check' titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Checking profile completion...
          </Text>
        </View>
      </ScrollView>
    )
  }

  return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Appbar.Header>
        <Appbar.Content title='Profile Check' titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
        <Appbar.Action 
          icon='refresh' 
          onPress={handleRefresh}
          color={colors.primary}
        />
      </Appbar.Header>

        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          {state.isComplete ? (
            <View style={styles.completeContainer}>
              <IconButton
                icon="check-circle"
                size={64}
                iconColor={colors.primary}
                style={styles.successIcon}
              />
              <Text style={[styles.title, { color: colors.onSurface, ...fonts.headlineSmall }]}>
                Profile Complete!
              </Text>
              <Text style={[styles.subtitle, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                Your profile information is complete. Redirecting to your dashboard...
              </Text>
            </View>
          ) : (
            <View style={styles.incompleteContainer}>
              <IconButton
                icon="alert-circle"
                size={64}
                iconColor={colors.error}
                style={styles.warningIcon}
              />
              <Text style={[styles.title, { color: colors.onSurface, ...fonts.headlineSmall }]}>
                Profile Incomplete
              </Text>
              <Text style={[styles.subtitle, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                Please complete your profile information to continue.
              </Text>

              <Card style={[styles.missingFieldsCard, { backgroundColor: colors.surfaceVariant }]}>
                <Card.Content>
                  <Text style={[styles.cardTitle, { color: colors.onSurface, ...fonts.titleMedium }]}>
                    Missing Information:
                  </Text>
                  {state.missingFields.map((field, index) => (
                    <View key={index} style={styles.missingFieldItem}>
                      <IconButton
                        icon="close-circle"
                        size={16}
                        iconColor={colors.error}
                      />
                      <Text style={[styles.missingFieldText, { color: colors.onSurface, ...fonts.bodyMedium }]}>
                        {fieldLabels[field]}
                      </Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>

              <View style={styles.buttonContainer}>
                <Button
                  mode='contained'
                  onPress={handleUpdateProfile}
                  style={[styles.button, styles.primaryButton]}
                  buttonColor={colors.primary}
                  textColor={colors.onPrimary}
                  icon='account-edit'
                >
                  Update Profile
                </Button>
                
                <Button
                  mode='outlined'
                  onPress={handleLogout}
                  style={[styles.button, styles.secondaryButton]}
                  textColor={colors.error}
                  icon='logout'
                >
                  Back to Login
                </Button>
              </View>
            </View>
          )}
        </Surface>
      {SnackbarElement}
      </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    marginTop: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  completeContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  incompleteContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIcon: {
    marginBottom: 16,
  },
  warningIcon: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  missingFieldsCard: {
    width: '100%',
    marginBottom: 24,
  },
  cardTitle: {
    marginBottom: 12,
  },
  missingFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  missingFieldText: {
    marginLeft: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    marginVertical: 4,
  },
  primaryButton: {
    marginBottom: 8,
  },
  secondaryButton: {
    borderColor: '#f44336',
  },
})

export default ProfileCompletionCheck
