import React, { useState, useCallback } from 'react'
import { ScrollView, View, StyleSheet, Image } from 'react-native'
import { Avatar, Card, Text, Divider, Button, useTheme, ActivityIndicator } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
import useLogout from '../../hooks/useLogout'
import { useFocusEffect } from '@react-navigation/native'

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
          profile_roles:role_id (role_name),
          gov_id:gov_id_type (id_type_name),
          verify_status:verify_status_id (status_name)
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

  useFocusEffect(
    useCallback(() => {
      fetchProfile()
    }, [])
  )

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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          {profile?.pfp_id ? (
            <Avatar.Image
              size={60}
              source={{ 
                uri: profile.pfp_id,
                cache: 'reload'
              }}
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
      {/* Personal Information */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Title 
          title="Personal Information" 
          titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} 
        />
        <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        <Card.Content>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Contact Number: {profile?.contact_number || 'N/A'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Birth Date: {profile?.birth_date || 'N/A'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Emergency Contact Name: {profile?.emergency_contact_name || 'N/A'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Emergency Contact Number: {profile?.emergency_contact_number || 'N/A'}
          </Text>
        </Card.Content>
      </Card>

      {/* Account Info */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Title 
          title="Account Info" 
          titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} 
        />
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
        <Card.Title 
          title="Recent Activity" 
          titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]}
        />
        <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        <Card.Content>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Last Login: {formatDateTime(profile?.last_sign_in_at)}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            Last Updated: {formatDateTime(profile?.updated_at)}
          </Text>
        </Card.Content>
      </Card>
      {/* CHECK FOR DELIVERY PERSONNEL AND AIRLINE ROLE */}
      {profile?.role_id === 2 || profile?.role_id === 3 ? (
      <>
      {/* Verification Status */}
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
          
          {profile?.verify_status_id === 1 ? (
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
                    ID Proof:
                  </Text>
                  <Image
                    source={{ uri: profile.gov_id_proof }}
                    style={[styles.verificationImage, { aspectRatio: 16/9 }]}
                    resizeMode="contain"
                  />
                </View>
              )}
              {profile?.role_id === 3 ? (<></>):(<>
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
              </>)}
              <Button
                    icon="check-circle"
                    mode="contained"
                    style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
                    onPress={() => navigation.navigate('Verification')}
                    labelStyle={[{ color: colors.onPrimary, ...fonts.labelLarge }]}
                  >
                    Reverify Account
              </Button>
            </>
          ) : (
            <>
            {profile?.verify_status_id === 2 || profile?.verify_status_id === 4 ? (
            <Button
              icon="check-circle"
              mode="contained"
              style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={() => navigation.navigate('Verification')}
              labelStyle={[{ color: colors.onPrimary, ...fonts.labelLarge }]}
            >
              Verify Account
            </Button>
            ):(
            <></>
            )}
            </> 
          )}
        </Card.Content>
      </Card>
      </>
      ) : (
        <></>
      )}
      {/* Logout Button */}
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
    flexDirection:'row',
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