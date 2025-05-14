import React, { useState, useEffect } from 'react'
import { ScrollView, View, StyleSheet, Image } from 'react-native'
import {
  Text,
  useTheme,
  Appbar,
  Avatar,
  Card,
  Divider,
  ActivityIndicator,
} from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'

// Constants
const PROFILE_SECTIONS = {
  PERSONAL: 'Personal Information',
  ACCOUNT: 'Account Info',
  ACTIVITY: 'Recent Activity',
  VERIFICATION: 'Verification Status',
}

const ViewProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params
  const { colors, fonts } = useTheme()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_status:user_status_id (status_name),
          profile_roles:role_id (role_name),
          verify_status:verify_status_id (status_name),
          gov_id:gov_id_type (id_type_name)
        `)
        .eq('id', userId)
        .single()

      if (error) throw error

      setUser({
        ...data,
        role: data.profile_roles?.role_name,
        user_status: data.profile_status?.status_name,
        verify_status: data.verify_status?.status_name,
        birth_date: data.birth_date || null,
        created_at: data.created_at ? new Date(data.created_at) : null,
        last_sign_in_at: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null,
        updated_at: data.updated_at ? new Date(data.updated_at) : null,
      })
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccount()
  }, [userId])

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const [year, month, day] = dateString.split('-')
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderProfileHeader = () => (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Content style={styles.cardContent}>
        {user.pfp_id ? (
          <Avatar.Image
            size={60}
            source={{ uri: user.pfp_id }}
            style={[styles.profile, { borderColor: colors.background }]}
          />
        ) : (
          <Avatar.Text
            size={60}
            label={user.first_name ? user.first_name[0].toUpperCase() : 'U'}
            style={[styles.profile, { backgroundColor: colors.primary }]}
            labelStyle={{ color: colors.onPrimary }}
          />
        )}
        <View style={styles.cardTextContainer}>
          <Text style={[{ color: colors.onSurface, ...fonts.titleLarge }]}>
            {`${user.first_name || ''} ${user.middle_initial || ''} ${user.last_name || ''}`.trim() || 'No Name Available'}
          </Text>
          <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
            {user.email}
          </Text>
        </View>
      </Card.Content>
    </Card>
  )

  const renderSection = (title, content) => (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Title 
        title={title} 
        titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} 
      />
      <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
      <Card.Content>
        {content}
      </Card.Content>
    </Card>
  )

  const renderPersonalInfo = () => (
    <>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Contact Number: {user.contact_number || 'N/A'}
      </Text>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Birth Date: {formatDate(user.birth_date)}
      </Text>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Emergency Contact Name: {user.emergency_contact_name || 'N/A'}
      </Text>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Emergency Contact Number: {user.emergency_contact_number || 'N/A'}
      </Text>
    </>
  )

  const renderAccountInfo = () => (
    <>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Role: {user.role || 'N/A'}
      </Text>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Status: {user.user_status || 'N/A'}
      </Text>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Date Created: {formatDateTime(user.created_at)}
      </Text>
    </>
  )

  const renderActivityInfo = () => (
    <>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Last Login: {formatDateTime(user.last_sign_in_at)}
      </Text>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
        Last Updated: {formatDateTime(user.updated_at)}
      </Text>
    </>
  )

  const renderVerificationInfo = () => {
    return (
      <>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          Status: {user.verify_status || 'N/A'}
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          ID Type: {user.gov_id?.id_type_name || 'N/A'}
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          ID Number: {user.gov_id_number || 'N/A'}
        </Text>
        {user.gov_id_proof ? (
          <View style={styles.imageContainer}>
            <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              ID Proof:
            </Text>
            <Image
              source={{ uri: user.gov_id_proof }}
              style={[styles.verificationImage, { aspectRatio: 16/9 }]}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              ID Proof:
            </Text>
            <View style={[styles.placeholderImage, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.placeholderText, { color: colors.onSurfaceVariant }]}>No ID Proof Uploaded</Text>
            </View>
          </View>
        )}
        {user.role_id === 3 ? null : (
          <>
            <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              Vehicle Description: {user.vehicle_info || 'N/A'}
            </Text>
            <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              Plate Number: {user.vehicle_plate_number || 'N/A'}
            </Text>
            {user.vehicle_or_cr ? (
              <View style={styles.imageContainer}>
                <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  OR/CR Document:
                </Text>
                <Image
                  source={{ uri: user.vehicle_or_cr }}
                  style={[styles.verificationImage, { aspectRatio: 16/9 }]}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.imageContainer}>
                <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  OR/CR Document:
                </Text>
                <View style={[styles.placeholderImage, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.placeholderText, { color: colors.onSurfaceVariant }]}>No OR/CR Uploaded</Text>
                </View>
              </View>
            )}
          </>
        )}
      </>
    )
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text variant="bodyLarge" style={{ color: colors.onSurface }}>Loading user...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
          <Appbar.Content title="View Profile" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>User not found</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
        <Appbar.Content title="View Profile" />
        <Appbar.Action 
          icon="refresh" 
          onPress={fetchAccount}
        />
        <Appbar.Action 
          icon="account-edit" 
          onPress={() => navigation.navigate('EditAccount', { userId: user.id })} 
        />
      </Appbar.Header>

      {renderProfileHeader()}
      {renderSection(PROFILE_SECTIONS.PERSONAL, renderPersonalInfo())}
      {renderSection(PROFILE_SECTIONS.ACCOUNT, renderAccountInfo())}
      {renderSection(PROFILE_SECTIONS.ACTIVITY, renderActivityInfo())}
      {(user.role_id === 2 || user.role_id === 3) && 
        renderSection(PROFILE_SECTIONS.VERIFICATION, renderVerificationInfo())}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
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
  placeholderImage: {
    marginTop: 8,
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
})

export default ViewProfileScreen 