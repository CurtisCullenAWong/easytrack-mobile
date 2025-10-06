import React, { useState, useCallback, useMemo } from 'react'
import { ScrollView, View, StyleSheet, Image, TouchableOpacity } from 'react-native'
import {
  Text,
  useTheme,
  Appbar,
  Avatar,
  Card,
  Divider,
  Button,
  ActivityIndicator,
  Menu,
  TextInput,
  Portal,
  Dialog,
} from 'react-native-paper'
import { supabase } from '../../../../../lib/supabase'
import { useFocusEffect } from '@react-navigation/native'
import BottomModal from '../../../../customComponents/BottomModal'
import useSnackbar from '../../../../hooks/useSnackbar'

// ----------------- Constants -----------------
const PROFILE_SECTIONS = {
  PERSONAL: 'Personal Information',
  ACCOUNT: 'Account Info',
  ACTIVITY: 'Recent Activity',
  VERIFICATION: 'Verification Status',
  VEHICLE: 'Vehicle Information',
}

// ----------------- Profile Card -----------------
const ProfileCard = React.memo(
  ({ user, colors, fonts, onUpdateStatus, onUpdateVerifyStatus, saving, statuses, verifyStatuses }) => {
    const [statusMenuVisible, setStatusMenuVisible] = useState(false)
    const [verifyStatusMenuVisible, setVerifyStatusMenuVisible] = useState(false)
    const [statusDialogVisible, setStatusDialogVisible] = useState(false)
    const [verifyStatusDialogVisible, setVerifyStatusDialogVisible] = useState(false)
    const [selectedStatus, setSelectedStatus] = useState(null)
    const [selectedVerifyStatus, setSelectedVerifyStatus] = useState(null)

    const fullName = useMemo(
      () =>
        `${user?.first_name || ''} ${user?.middle_initial || ''} ${user?.last_name || ''}`.trim(),
      [user?.first_name, user?.middle_initial, user?.last_name]
    )

    const handleStatusSelect = (status) => {
      setSelectedStatus(status)
      setStatusMenuVisible(false)
      setStatusDialogVisible(true)
    }

    const handleVerifyStatusSelect = (status) => {
      setSelectedVerifyStatus(status)
      setVerifyStatusMenuVisible(false)
      setVerifyStatusDialogVisible(true)
    }

    const confirmStatusUpdate = () => {
      onUpdateStatus(selectedStatus)
      setStatusDialogVisible(false)
    }

    const confirmVerifyStatusUpdate = () => {
      onUpdateVerifyStatus(selectedVerifyStatus)
      setVerifyStatusDialogVisible(false)
    }

    return (
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        {/* Profile Picture */}
        <View style={styles.profileContainer}>
          {user?.pfp_id ? (
            <Avatar.Image
              size={150}
              source={{ uri: user.pfp_id, cache: 'reload' }}
              style={[{ borderColor: colors.background }]}
            />
          ) : (
            <Avatar.Text
              size={100}
              label={user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
              style={[{ backgroundColor: colors.primary }]}
              labelStyle={{ color: colors.onPrimary }}
            />
          )}
        </View>

        {/* Name + Email */}
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardTextContainer}>
            <Text style={[{ color: colors.onSurface, ...fonts.titleLarge }]} selectable>
              {fullName || 'No Name Available'}
            </Text>
            <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
              {user?.email}
            </Text>
          </View>
        </Card.Content>

        {/* Menus */}
        <View style={styles.menuContainer}>
          {/* Status Menu */}
          <TouchableOpacity onPress={() => setStatusMenuVisible(((prev) => !prev))}>
            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <TextInput
                  label="Status"
                  value={user?.user_status}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  right={<TextInput.Icon icon="account-check" onPress={() => setStatusMenuVisible(((prev) => !prev))} />}
                  theme={{ colors: { primary: colors.primary } }}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {statuses.map((status) => (
                <Menu.Item
                  key={status.id}
                  onPress={() => handleStatusSelect(status.status_name)}
                  title={status.status_name}
                  titleStyle={[
                    fonts.bodyLarge,
                    { color: user?.user_status === status.status_name ? colors.primary : colors.onSurface },
                  ]}
                  leadingIcon={user?.user_status === status.status_name ? 'check' : undefined}
                />
              ))}
            </Menu>
          </TouchableOpacity>

          {/* Verification Menu */}
          <TouchableOpacity onPress={() => setVerifyStatusMenuVisible(((prev) => !prev))}>
            <Menu
              visible={verifyStatusMenuVisible}
              onDismiss={() => setVerifyStatusMenuVisible(false)}
              anchor={
                <TextInput
                  label="Verification Status"
                  value={user?.verify_status}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  right={<TextInput.Icon icon="shield-check" onPress={() => setVerifyStatusMenuVisible(((prev) => !prev))} />}
                  theme={{ colors: { primary: colors.primary } }}
                  disabled={saving}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {verifyStatuses.map((status) => (
                <Menu.Item
                  key={status.id}
                  onPress={() => handleVerifyStatusSelect(status.status_name)}
                  title={status.status_name}
                  titleStyle={[
                    fonts.bodyLarge,
                    { color: user?.verify_status === status.status_name ? colors.primary : colors.onSurface },
                  ]}
                  leadingIcon={user?.verify_status === status.status_name ? 'check' : undefined}
                />
              ))}
            </Menu>
          </TouchableOpacity>

          {/* Confirmation Dialogs */}
          <Portal>
            {/* Status Dialog */}
            <Dialog
              visible={statusDialogVisible}
              onDismiss={() => setStatusDialogVisible(false)}
              style={{ backgroundColor: colors.surface }}
            >
              <Dialog.Title>Confirm Status Update</Dialog.Title>
              <Dialog.Content>
                <Text>Are you sure you want to change the status to "{selectedStatus}"?</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setStatusDialogVisible(false)}>Cancel</Button>
                <Button onPress={confirmStatusUpdate}>Confirm</Button>
              </Dialog.Actions>
            </Dialog>

            {/* Verification Dialog */}
            <Dialog
              visible={verifyStatusDialogVisible}
              onDismiss={() => setVerifyStatusDialogVisible(false)}
              style={{ backgroundColor: colors.surface }}
            >
              <Dialog.Title>Confirm Verification Status Update</Dialog.Title>
              <Dialog.Content>
                <Text>Are you sure you want to change the verification status to "{selectedVerifyStatus}"?</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setVerifyStatusDialogVisible(false)}>Cancel</Button>
                <Button onPress={confirmVerifyStatusUpdate}>Confirm</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      </Card>
    )
  }
)

// ----------------- Info Card -----------------
const InfoCard = React.memo(({ title, data, colors, fonts }) => (
  <Card style={[styles.card, { backgroundColor: colors.surface }]}>
    <Card.Title title={title} titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
    <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
    <Card.Content>
      {Object.entries(data).map(([key, value]) => (
        <Text
          key={key}
          style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}
        >
          {key}: {value || 'N/A'}
        </Text>
      ))}
    </Card.Content>
  </Card>
))

// ----------------- Verification Card -----------------
const VerificationCard = React.memo(({ user, colors, fonts }) => {
  const renderProof = (label, uri, placeholder) => (
    <View style={styles.imageContainer}>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>{label}:</Text>
      {uri ? (
        <Image
          source={{ uri, cache: 'reload' }}
          style={[styles.verificationImage, { aspectRatio: 16 / 9 }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.placeholderImage, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.placeholderText, { color: colors.onSurfaceVariant }]}>{placeholder}</Text>
        </View>
      )}
    </View>
  )

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Title
        title={PROFILE_SECTIONS.VERIFICATION}
        titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]}
      />
      <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
      <Card.Content>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          Status: {user.verify_status || 'N/A'}
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          ID Type: {user.gov_id?.id_type_name || 'N/A'}
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          ID Number: {user.gov_id_number || 'N/A'}
        </Text>

        {renderProof('ID Proof (Front)', user.gov_id_proof, 'No ID Proof Uploaded')}
        {renderProof('ID Proof (Back)', user.gov_id_proof_back, 'No ID Proof Uploaded')}
      </Card.Content>
    </Card>
  )
})

// ----------------- Vehicle Card -----------------
const VehicleCard = React.memo(({ user, colors, fonts }) => {
  if (!user || user.role_id !== 2) return null

  const renderDocument = (label, uri, placeholder) => (
    <View style={styles.imageContainer}>
      <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>{label}:</Text>
      {uri ? (
        <Image
          source={{ uri, cache: 'reload' }}
          style={[styles.verificationImage, { aspectRatio: 16 / 9 }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.placeholderImage, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.placeholderText, { color: colors.onSurfaceVariant }]}>{placeholder}</Text>
        </View>
      )}
    </View>
  )

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Title
        title={PROFILE_SECTIONS.VEHICLE}
        titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]}
      />
      <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
      <Card.Content>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          Vehicle Description: {user.vehicle_info || 'N/A'}
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
          Plate Number: {user.vehicle_plate_number || 'N/A'}
        </Text>
        {renderDocument('OR/CR Document', user.vehicle_or_cr, 'No OR/CR Uploaded')}
      </Card.Content>
    </Card>
  )
})

// ----------------- Main Screen -----------------
const ViewProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params
  const { colors, fonts } = useTheme()

  // State
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [statuses, setStatuses] = useState([])
  const [verifyStatuses, setVerifyStatuses] = useState([])

  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [email, setEmail] = useState('')

  const [showChangePw, setShowChangePw] = useState(false)
  const [pwVisibility, setPwVisibility] = useState({ pw: false, confirm: false })
  const [passwords, setPasswords] = useState({ pw: '', confirm: '' })

  // ----------------- Fetching -----------------
  const fetchStatuses = async () => {
    try {
      const [{ data: profileStatuses }, { data: verificationStatuses }] = await Promise.all([
        supabase.from('profiles_status').select('id, status_name').in('id', [4, 5]),
        supabase.from('verify_status').select('id, status_name').in('id', [1, 2]),
      ])

      if (profileStatuses) setStatuses(profileStatuses)
      if (verificationStatuses) setVerifyStatuses(verificationStatuses)
    } catch (error) {
      console.error('Error fetching statuses:', error)
    }
  }

  const fetchAccount = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_status:user_status_id (status_name),
          profile_roles:role_id (role_name),
          verify_status:verify_status_id (status_name),
          gov_id:gov_id_type (id_type_name),
          corporation:corporation_id (corporation_name)
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
        corporation_name: data.corporation?.corporation_name,
        created_at: data.created_at ? new Date(data.created_at) : null,
        last_sign_in_at: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null,
        updated_at: data.updated_at ? new Date(data.updated_at) : null,
      })
    } catch (err) {
      console.error('Error fetching user data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      fetchAccount()
      fetchStatuses()
    }, [fetchAccount])
  )

  // ----------------- Update Status -----------------
  const updateUserStatus = async (newStatus) => {
    try {
      setSaving(true)
      const statusData = statuses.find((s) => s.status_name === newStatus)
      if (!statusData) throw new Error('Invalid status selected')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ user_status_id: statusData.id, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (updateError) throw updateError

      setUser((prev) => ({ ...prev, user_status: newStatus }))
    } catch (err) {
      console.error('Error updating user status:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateVerifyStatus = async (newStatus) => {
    try {
      setSaving(true)
      const statusData = verifyStatuses.find((s) => s.status_name === newStatus)
      if (!statusData) throw new Error('Invalid verification status selected')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ verify_status_id: statusData.id, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (updateError) throw updateError

      setUser((prev) => ({ ...prev, verify_status: newStatus }))
    } catch (err) {
      console.error('Error updating verification status:', err)
    } finally {
      setSaving(false)
    }
  }

  // ----------------- Helpers -----------------
  const formatDateTime = useCallback((date) => {
    if (!date) return 'N/A'
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }, [])

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A'
    const [year, month, day] = dateString.split('-')
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  const personalInfo = useMemo(
    () => ({
      'Contact Number': user?.contact_number,
      'Birth Date': formatDate(user?.birth_date),
      'Emergency Contact Name': user?.emergency_contact_name,
      'Emergency Contact Number': user?.emergency_contact_number,
    }),
    [user?.contact_number, user?.birth_date, user?.emergency_contact_name, user?.emergency_contact_number, formatDate]
  )

  const accountInfo = useMemo(
    () => ({
      Role: user?.role,
      Status: user?.user_status,
      Corporation: user?.corporation_name || 'N/A',
      'Date Created': formatDateTime(user?.created_at),
    }),
    [user?.role, user?.user_status, user?.created_at, formatDateTime]
  )

  const recentActivity = useMemo(
    () => ({
      'Last Login': formatDateTime(user?.last_sign_in_at),
      'Last Updated': formatDateTime(user?.updated_at),
    }),
    [user?.last_sign_in_at, user?.updated_at, formatDateTime]
  )

  // ----------------- Admin Actions -----------------
  const validatePassword = (password) => {
    if (!password || password.length < 8) return 'Password must be at least 8 characters long'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    return null
  }
  
  const adminChangeEmail = async () => {
    try {
      if (!email) return showSnackbar('Please enter a new email')

      const newEmail = email.trim().toLowerCase()
      const { data: { session } } = await supabase.auth.getSession()

      const { data, error } = await supabase.functions.invoke('admin-change-email', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { userId, newEmail },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      showSnackbar('Email updated successfully', true)
      setShowChangeEmail(false)
      setEmail('')
    } catch (err) {
      console.error('Admin email change error:', err)
      showSnackbar(err.message || 'Failed to update email')
    } finally {
      setSaving(false)
    }
  }


  const adminChangePassword = async () => {
    try {
      if (!passwords.pw || !passwords.confirm) return showSnackbar('Please fill in all fields')
      if (passwords.pw !== passwords.confirm) return showSnackbar('Passwords do not match')

      const pwError = validatePassword(passwords.pw)
      if (pwError) return showSnackbar(pwError)

      const { data: { session } } = await supabase.auth.getSession()

      const { data, error } = await supabase.functions.invoke('admin-change-password', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { userId, password: passwords.pw },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      showSnackbar('Password updated successfully', true)
      setShowChangePw(false)
      setPasswords({ pw: '', confirm: '' })
    } catch (err) {
      console.error('Admin password change error:', err)
      showSnackbar(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  // ----------------- Loading / Error States -----------------
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
          <Appbar.Content title="View Account" />
        </Appbar.Header>

        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <Button
            mode="contained"
            onPress={fetchAccount}
            style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
          >
            Retry
          </Button>
        </View>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
          <Appbar.Content title="View Account" />
        </Appbar.Header>

        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>User not found</Text>
        </View>
      </View>
    )
  }

  // ----------------- Main UI -----------------
  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      {SnackbarElement}
      {/* Header */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
        <Appbar.Content title="View Account" />
        <Appbar.Action icon="refresh" onPress={fetchAccount} />
      </Appbar.Header>

      {/* Profile */}
      <ProfileCard
        user={user}
        colors={colors}
        fonts={fonts}
        onUpdateStatus={updateUserStatus}
        onUpdateVerifyStatus={updateVerifyStatus}
        saving={saving}
        statuses={statuses}
        verifyStatuses={verifyStatuses}
      />

      {/* Admin Actions */}
      <View style={{ marginHorizontal: 16 }}>
        <Button
          mode="contained-tonal"
          onPress={() => setShowChangeEmail(true)}
          icon="email-edit"
          style={{ marginBottom: 8 }}
        >
          Change Email
        </Button>
        <Button
          mode="contained-tonal"
          onPress={() => setShowChangePw(true)}
          icon="lock-reset"
          style={{ marginBottom: 8 }}
        >
          Change Password
        </Button>
      </View>

      {/* Info Sections */}
      <InfoCard title={PROFILE_SECTIONS.PERSONAL} data={personalInfo} colors={colors} fonts={fonts} />
      <InfoCard title={PROFILE_SECTIONS.ACCOUNT} data={accountInfo} colors={colors} fonts={fonts} />
      <InfoCard title={PROFILE_SECTIONS.ACTIVITY} data={recentActivity} colors={colors} fonts={fonts} />
      <VerificationCard user={user} colors={colors} fonts={fonts} />
      <VehicleCard user={user} colors={colors} fonts={fonts} />
      {/* Change Email Modal */}
      <BottomModal visible={showChangeEmail} onDismiss={() => setShowChangeEmail(false)}>
        <View style={{ paddingTop: 8 }}>
          <Text style={[fonts.titleLarge, { color: colors.primary, textAlign: 'center', marginBottom: 12 }]}>
            Change Email
          </Text>
          <TextInput
            label="New Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button onPress={() => setShowChangeEmail(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button mode="contained" onPress={adminChangeEmail} loading={saving} disabled={saving}>
              Update
            </Button>
          </View>
        </View>
      </BottomModal>
      {/* Change Password Modal */}
      <BottomModal visible={showChangePw} onDismiss={() => setShowChangePw(false)}>
        <View style={{ paddingTop: 8 }}>
          <Text style={[fonts.titleLarge, { color: colors.primary, textAlign: 'center', marginBottom: 12 }]}>
            Change Password
          </Text>
          <TextInput
            label="New Password"
            value={passwords.pw}
            onChangeText={(v) => setPasswords((prev) => ({ ...prev, pw: v }))}
            secureTextEntry={!pwVisibility.pw}
            right={
              <TextInput.Icon
                icon={pwVisibility.pw ? 'eye-off' : 'eye'}
                onPress={() => setPwVisibility((prev) => ({ ...prev, pw: !prev.pw }))}
              />
            }
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Confirm Password"
            value={passwords.confirm}
            onChangeText={(v) => setPasswords((prev) => ({ ...prev, confirm: v }))}
            secureTextEntry={!pwVisibility.confirm}
            right={
              <TextInput.Icon
                icon={pwVisibility.confirm ? 'eye-off' : 'eye'}
                onPress={() => setPwVisibility((prev) => ({ ...prev, confirm: !prev.confirm }))}
              />
            }
            mode="outlined"
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button onPress={() => setShowChangePw(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button mode="contained" onPress={adminChangePassword} loading={saving} disabled={saving}>
              Update
            </Button>
          </View>
        </View>
      </BottomModal>
    </ScrollView>
  )
}

export default ViewProfileScreen
// ----------------- Styles -----------------
// ----------------- Styles -----------------
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  // Cards
  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  cardTextContainer: {
    flex: 1,
  },

  // Profile
  profileContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  // Menus & Inputs
  menuContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    marginTop: 8,
    marginBottom: 8,
  },

  // Text
  text: {
    marginBottom: 6,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },

  // Divider
  divider: {
    marginVertical: 8,
    height: StyleSheet.hairlineWidth,
  },

  // Images (Verification & Vehicle)
  imageContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  verificationImage: {
    width: '100%',
    height: undefined,
    borderRadius: 8,
    marginTop: 6,
  },
  placeholderImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Buttons
  button: {
    marginVertical: 4,
  },
})
