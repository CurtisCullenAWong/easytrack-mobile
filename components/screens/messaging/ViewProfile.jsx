import React, { useState, useEffect } from 'react'
import { 
  ScrollView, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Linking 
} from 'react-native'
import { 
  Text, 
  Avatar, 
  Card, 
  Divider, 
  useTheme, 
  IconButton,
  Chip,
  Appbar 
} from 'react-native-paper'
import { supabase } from '../../../lib/supabase'

const ViewProfile = ({ navigation, route }) => {
  const { colors, fonts } = useTheme()
  const { userId } = route.params
  
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roleInfo, setRoleInfo] = useState(null)
  const [corporationInfo, setCorporationInfo] = useState(null)
  const [userStatusInfo, setUserStatusInfo] = useState(null)
  const [verifyStatusInfo, setVerifyStatusInfo] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (profile) {
      fetchRelatedData()
    }
  }, [profile])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedData = async () => {
    try {
      if (profile.role_id) {
        const { data: roleData } = await supabase
          .from('profiles_roles')
          .select('*')
          .eq('id', profile.role_id)
          .single()
        setRoleInfo(roleData)
      }

      if (profile.corporation_id) {
        const { data: corpData } = await supabase
          .from('profiles_corporation')
          .select('*')
          .eq('id', profile.corporation_id)
          .single()
        setCorporationInfo(corpData)
      }

      if (profile.user_status_id) {
        const { data: statusData } = await supabase
          .from('profiles_status')
          .select('*')
          .eq('id', profile.user_status_id)
          .single()
        setUserStatusInfo(statusData)
      }

      if (profile.verify_status_id) {
        const { data: verifyData } = await supabase
          .from('verify_status')
          .select('*')
          .eq('id', profile.verify_status_id)
          .single()
        setVerifyStatusInfo(verifyData)
      }

    } catch (error) {
      console.error('Error fetching related data:', error)
    }
  }

  const getDisplayName = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    } else if (profile.first_name) {
      return profile.first_name
    } else {
      return 'Unknown User'
    }
  }

  const getFullName = () => {
    const parts = []
    if (profile.first_name) parts.push(profile.first_name)
    if (profile.middle_initial) parts.push(profile.middle_initial)
    if (profile.last_name) parts.push(profile.last_name)
    if (profile.suffix) parts.push(profile.suffix)
    return parts.join(' ')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided'
    return new Date(dateString).toLocaleDateString()
  }

  const getAvatarSource = () => {
    if (profile.pfp_id) {
      return { uri: profile.pfp_id }
    }
    return null
  }

  const handleCall = () => {
    if (profile.contact_number) {
      Linking.openURL(`tel:${profile.contact_number}`)
    }
  }

  const handleEmergencyCall = () => {
    if (profile.emergency_contact_number) {
      Linking.openURL(`tel:${profile.emergency_contact_number}`)
    }
  }

  const startConversation = () => {
    navigation.navigate('ViewMessage', { 
      otherUserId: profile.id,
      otherUserName: getDisplayName()
    })
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.onBackground, marginTop: 16 }}>Loading profile...</Text>
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.onBackground }}>Profile not found</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Appbar.Header style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction color={colors.primary} onPress={() => navigation.goBack()} />
        <Appbar.Content title="Profile" titleStyle={{ ...fonts.titleLarge, color: colors.onBackground, fontWeight: 'bold' }} />
      </Appbar.Header>
      
      <Card style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <Card.Content style={styles.profileHeader}>
          {getAvatarSource() ? (
            <Avatar.Image 
              size={80} 
              source={getAvatarSource()} 
            />
          ) : (
            <Avatar.Text 
              size={80} 
              label={profile?.first_name ? profile.first_name[0].toUpperCase() : 'U'}
              style={{ backgroundColor: colors.primary }}
              labelStyle={{ color: colors.onPrimary }}
            />
          )}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text selectable style={[styles.profileName, { color: colors.onSurface, ...fonts.headlineSmall }]}>
                {getDisplayName()}
              </Text>
            </View>
            <View style={styles.metaRow}>
              {roleInfo && (
                <Chip 
                  mode="outlined" 
                  style={[styles.roleChip, { borderColor: colors.primary }]}
                  textStyle={{ color: colors.primary }}
                >
                  {roleInfo.role_name || 'Unknown Role'}
                </Chip>
              )}
              {corporationInfo && (
                <Text selectable style={[styles.corporationText, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]} numberOfLines={1}>
                  {corporationInfo.corporation_name}
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={startConversation}
        >
          <IconButton icon="message" size={20} iconColor={colors.onPrimary} />
          <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>Message</Text>
        </TouchableOpacity>
        
        {profile.contact_number && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleCall}
          >
            <IconButton icon="phone" size={20} iconColor={colors.onPrimary} />
            <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>Call</Text>
          </TouchableOpacity>
        )}
      </View>

      <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleMedium }]}>
            Personal Information
          </Text>
          <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              Full Name:
            </Text>
            <Text style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]} selectable>
              {getFullName() || 'Not provided'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              Email:
            </Text>
            <Text style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]} selectable>
              {profile.email || 'Not provided'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              Contact Number:
            </Text>
            <Text style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]} selectable>
              {profile.contact_number || 'Not provided'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              Birth Date:
            </Text>
            <Text style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]} selectable>
              {formatDate(profile.birth_date)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {(profile.emergency_contact_name || profile.emergency_contact_number) && (
        <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleMedium }]}>
              Emergency Contact
            </Text>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
            
            {profile.emergency_contact_name && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  Name:
                </Text>
                <Text style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]} selectable>
                  {profile.emergency_contact_name}
                </Text>
              </View>
            )}
            
            {profile.emergency_contact_number && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  Number:
                </Text>
                <TouchableOpacity onPress={handleEmergencyCall}>
                  <Text style={[styles.infoValue, { color: colors.primary, ...fonts.bodyMedium }]} selectable>
                    {profile.emergency_contact_number}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {(profile.vehicle_plate_number || profile.vehicle_info) && (
        <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleMedium }]}>
              Vehicle Information
            </Text>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
            
            {profile.vehicle_plate_number && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  Plate Number:
                </Text>
                <Text selectable style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]}>
                  {profile.vehicle_plate_number}
                </Text>
              </View>
            )}
            
            {profile.vehicle_info && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  Vehicle Details:
                </Text>
                <Text selectable style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]}>
                  {profile.vehicle_info}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleMedium }]}>
            Account Status
          </Text>
          <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
          
          {userStatusInfo && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                User Status:
              </Text>
              <Chip 
                mode="outlined" 
                style={[styles.statusChip, { borderColor: colors.secondary }]}
                textStyle={{ color: colors.primary }}
              >
                {userStatusInfo.status_name}
              </Chip>
            </View>
          )}
          
          {verifyStatusInfo && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                Verification Status:
              </Text>
              <Chip 
                mode="outlined" 
                style={[styles.statusChip, { borderColor: colors.tertiary }]}
                textStyle={{ color: colors.primary }}
              >
                {verifyStatusInfo.status_name}
              </Chip>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              Member Since:
            </Text>
            <Text selectable style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]}>
              {formatDate(profile.created_at)}
            </Text>
          </View>
          
          {profile.last_sign_in_at && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                Last Sign In:
              </Text>
              <Text selectable style={[styles.infoValue, { color: colors.onSurface, ...fonts.bodyMedium }]}>
                {formatDate(profile.last_sign_in_at)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    marginHorizontal: 10,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileName: {
    marginBottom: 4,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleChip: {
    alignSelf: 'flex-start',
  },
  corporationText: {
    marginTop: 0,
    flexShrink: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 10,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    minWidth: 150,
    justifyContent: 'center',
  },
  actionButtonText: {
    marginLeft: 4,
    fontWeight: 'bold',
  },
  infoCard: {
    marginHorizontal: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    flex: 1,
  },
  infoValue: {
    flex: 2,
    textAlign: 'right',
  },
  statusChip: {
    alignSelf: 'flex-end',
  },
})

export default ViewProfile
