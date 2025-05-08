import React, { useEffect, useState } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { Avatar, Card, Title, Text, Divider, Button, useTheme, ActivityIndicator } from 'react-native-paper'
import Header from '../customComponents/Header'
import { supabase } from '../../lib/supabase'
import useLogout from '../hooks/useLogout'

const Profile = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const { handleLogout, LogoutDialog } = useLogout(navigation)

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated')
        return navigation.navigate('Login')
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_status:user_status_id (status_name),
          profile_roles:role_id (role_name)
        `)
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error in fetchProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const formatDateTime = (dateString) => {
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
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator animating color={colors.primary} />
      </View>
    )
  }

  const fullName = `${profile?.first_name || ''} ${profile?.middle_initial || ''} ${profile?.last_name || ''}`.trim()

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

      {/* User Info Card */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Image
            size={80}
            source={{
              uri: profile?.avatar_url || 'https://randomuser.me/api/portraits/men/10.jpg'
            }}
            style={[styles.avatar, { borderColor: colors.background }]}
          />
          <View style={styles.cardTextContainer}>
            <Title style={[{ color: colors.onSurface, ...fonts.titleLarge }]}>
              {fullName || 'No Name Available'}
            </Title>
            <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              {profile?.email}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Personal Information */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Title title="Personal Information" titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
        <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        <Card.Content>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Contact Number: {profile?.contact_number || 'N/A'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Birth Date: {profile?.birth_date || 'N/A'}
          </Text>
        </Card.Content>
      </Card>

      {/* Account Info */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Title title="Account Info" titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
        <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        <Card.Content>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Role: {profile?.profile_roles?.role_name || 'N/A'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Status: {profile?.profile_status?.status_name || 'N/A'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Date Created: {formatDateTime(profile?.created_at)}
          </Text>
        </Card.Content>
      </Card>

      {/* Recent Activity */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Title title="Recent Activity" titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
        <Divider style={styles.divider} />
        <Card.Content>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Last Login: {formatDateTime(profile?.last_sign_in_at)}
          </Text>
        </Card.Content>
      </Card>

      {/* Edit Profile Button */}
      <View style={styles.buttonContainer}>
        <Button
          icon="account-edit"
          mode="contained"
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          contentStyle={styles.editButtonContent}
          onPress={() => navigation.navigate('EditProfile')}
          labelStyle={[styles.editButtonLabel, { color: colors.onPrimary }]}
        >
          Edit Profile
        </Button>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <Button
          icon="logout"
          mode="contained"
          style={[styles.logoutButton, { backgroundColor: colors.error }]}
          contentStyle={styles.logoutContent}
          onPress={handleLogout}
          labelStyle={[styles.logoutLabel, { color: colors.onError }]}
        >
          Logout
        </Button>
      </View>

      {LogoutDialog}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
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
    marginHorizontal: 16,
    marginTop: 8,
  },
  editButton: {
    marginVertical: 6,
  },
  editButtonContent: {
    height: 48,
  },
  editButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoutButton: {
    marginVertical: 6,
    width: '90%',
  },
  logoutContent: {
    height: 48,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default Profile
