import React, { useState, useCallback, useMemo } from 'react'
import { ScrollView, View, StyleSheet, Image } from 'react-native'
import { Avatar, Card, Text, Divider, Button, useTheme, ActivityIndicator, Portal, Dialog } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
import useLogout from '../../hooks/useLogout'
import { useFocusEffect } from '@react-navigation/native'

// Profile Card Component
const ProfileCard = React.memo(({ profile, colors, fonts }) => {
  const fullName = useMemo(() => 
    `${profile?.first_name || ''} ${profile?.middle_initial || ''} ${profile?.last_name || ''}`.trim(),
    [profile?.first_name, profile?.middle_initial, profile?.last_name]
  )

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Content style={styles.cardContent}>
        {profile?.pfp_id ? (
          <Avatar.Image
            size={60}
            source={{ uri: profile.pfp_id, cache: 'reload' }}
            style={[styles.profile, { borderColor: colors.background }]}
          />
        ) : (
          <Avatar.Text
            size={60}
            label={profile?.first_name ? profile.first_name[0].toUpperCase() : 'U'}
            style={[styles.profile, { backgroundColor: colors.primary }]}
            labelStyle={{ color: colors.onPrimary }}
          />
        )}
        <View style={styles.cardTextContainer}>
          <Text style={[{ color: colors.onSurface, ...fonts.titleLarge }]}>
            {fullName || 'No Name Available'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            {profile?.email}
          </Text>
        </View>
      </Card.Content>
    </Card>
  )
})

// Info Card Component
const InfoCard = React.memo(({ title, data, colors, fonts }) => (
  <Card style={[styles.card, { backgroundColor: colors.surface }]}>
    <Card.Title 
      title={title} 
      titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} 
    />
    <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
    <Card.Content>
      {Object.entries(data).map(([key, value]) => (
        <Text key={key} style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          {key}: {value || 'N/A'}
        </Text>
      ))}
    </Card.Content>
  </Card>
))

// Verification Card Component
const VerificationCard = React.memo(({ profile, colors, fonts, navigation }) => {
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)

  const handleReverify = () => {
    setShowVerificationDialog(false)
    navigation.navigate('Verification')
  }

  const renderVerificationContent = () => {
    if (profile.verify_status_id === 1) {
      return (
        <>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            ID Type: {profile?.gov_id?.id_type_name || 'N/A'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            ID Number: {profile?.gov_id_number || 'N/A'}
          </Text>
          {profile?.gov_id_proof && (
            <View style={styles.imageContainer}>
              <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                ID Proof (Front):
              </Text>
              <Image
                source={{ uri: profile.gov_id_proof }}
                style={[styles.verificationImage, { aspectRatio: 16/9 }]}
                resizeMode="contain"
              />
            </View>
          )}
          {profile?.gov_id_proof_back && (
            <View style={styles.imageContainer}>
              <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                ID Proof (Back):
              </Text>
              <Image
                source={{ uri: profile.gov_id_proof_back }}
                style={[styles.verificationImage, { aspectRatio: 16/9 }]}
                resizeMode="contain"
              />
            </View>
          )}
          {profile.role_id === 2 && (
            <>
              <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                Vehicle Description: {profile?.vehicle_info || 'N/A'}
              </Text>
              <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                Plate Number: {profile?.vehicle_plate_number || 'N/A'}
              </Text>
              {profile?.vehicle_or_cr && (
                <View style={styles.imageContainer}>
                  <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                    OR/CR Document:
                  </Text>
                  <Image
                    source={{ uri: profile.vehicle_or_cr }}
                    style={[styles.verificationImage, { aspectRatio: 16/9 }]}
                    resizeMode="contain"
                  />
                </View>
              )}
            </>
          )}
          <Button
            icon="check-circle"
            mode="contained"
            style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
            onPress={() => setShowVerificationDialog(true)}
            labelStyle={[{ color: colors.onPrimary, ...fonts.labelLarge }]}
          >
            Reverify Account
          </Button>

          <Portal>
            <Dialog style={{ backgroundColor: colors.surface }} visible={showVerificationDialog} onDismiss={() => setShowVerificationDialog(false)}>
              <Dialog.Title style={[{ color: colors.onSurface, ...fonts.titleMedium }]}>
                Confirm Reverification
              </Dialog.Title>
              <Dialog.Content>
                <Text style={[{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  Are you sure you want to reverify your account? This will require you to submit your verification documents again.
                </Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setShowVerificationDialog(false)} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button onPress={handleReverify}>
                  Confirm
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </>
      )
    }

    if (profile.verify_status_id === 2 || profile.verify_status_id === 4) {
      return (
        <Button
          icon="check-circle"
          mode="contained"
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
          onPress={() => navigation.navigate('Verification')}
          labelStyle={[{ color: colors.onPrimary, ...fonts.labelLarge }]}
        >
          Verify Account
        </Button>
      )
    }

    return null
  }

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Title 
        title="Verification Status" 
        titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]}
      />
      <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
      <Card.Content>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          Status: {profile?.verify_status?.status_name || 'N/A'}
        </Text>
        {renderVerificationContent(colors, fonts)}
      </Card.Content>
    </Card>
  )
})

const Profile = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { handleLogout, LogoutDialog } = useLogout(navigation)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('User not authenticated')
        return navigation.navigate('Login')
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_status:user_status_id (status_name),
          profile_roles:role_id (role_name),
          gov_id:gov_id_type (id_type_name),
          verify_status:verify_status_id (status_name)
        `)
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error in fetchProfile:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [navigation])

  useFocusEffect(
    useCallback(() => {
      fetchProfile()
    }, [fetchProfile])
  )

  const formatDateTime = useCallback((dateString) => {
    if (!dateString) return 'N/A'
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
    return new Date(dateString).toLocaleString(undefined, options)
  }, [])

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.error, ...fonts.titleMedium }]}>{error}</Text>
        <Button
          mode="contained"
          onPress={fetchProfile}
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
        >
          Retry
        </Button>
      </View>
    )
  }

  const personalInfo = {
    'Contact Number': profile?.contact_number,
    'Birth Date': profile?.birth_date,
    'Emergency Contact Name': profile?.emergency_contact_name,
    'Emergency Contact Number': profile?.emergency_contact_number,
  }

  const accountInfo = {
    'Role': profile?.profile_roles?.role_name,
    'Status': profile?.profile_status?.status_name,
    'Date Created': formatDateTime(profile?.created_at),
  }

  const recentActivity = {
    'Last Login': formatDateTime(profile?.last_sign_in_at),
    'Last Updated': formatDateTime(profile?.updated_at),
  }

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Header 
        navigation={navigation} 
        title="Profile"
        rightAction={{
          icon: 'refresh',
          onPress: fetchProfile
        }}
      />
      
      <ProfileCard profile={profile} colors={colors} fonts={fonts} />
      
      <View style={styles.buttonContainer}>
        <Button
          icon="refresh"
          mode="contained"
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={fetchProfile}
          labelStyle={[{ color: colors.onPrimary, ...fonts.labelLarge }]}
        >
          Refresh
        </Button>
        <Button
          icon="account-edit"
          mode="contained"
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('EditProfile')}
          labelStyle={[{ color: colors.onPrimary, ...fonts.labelLarge }]}
        >
          Edit Profile
        </Button>
      </View>

      <InfoCard title="Personal Information" data={personalInfo} colors={colors} fonts={fonts} />
      <InfoCard title="Account Info" data={accountInfo} colors={colors} fonts={fonts} />
      <InfoCard title="Recent Activity" data={recentActivity} colors={colors} fonts={fonts} />
      
      <VerificationCard 
        profile={profile} 
        colors={colors} 
        fonts={fonts} 
        navigation={navigation} 
      />

      <View style={styles.logoutContainer}>
        <Button
          icon="logout"
          mode="contained"
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={handleLogout}
          labelStyle={[{ color: colors.onError, ...fonts.labelLarge }]}
        >
          Logout
        </Button>
      </View>

      {LogoutDialog}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: { 
    flex: 1 
  },
  card: {
    margin: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  profile: {
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  text: {
    marginVertical: 6,
  },
  divider: {
    height: 1.5,
    marginHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 16,
  },
  logoutContainer: {
    margin: 16,
    gap: 16,
    marginBottom: 32
  },
  button: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  verificationImage: {
    marginTop: 8,
    width: '100%',
    height: undefined,
    borderRadius: 8,
  },
})

export default Profile