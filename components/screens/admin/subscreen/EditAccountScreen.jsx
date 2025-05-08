import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import {
  TextInput,
  Button,
  Text,
  useTheme,
  Appbar,
  Menu,
  Avatar,
  Surface,
  Divider,
  Portal,
  Dialog,
} from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../../components/hooks/useSnackbar'

const EditAccount = ({ route, navigation }) => {
  const { userId } = route.params
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const [roleMenuVisible, setRoleMenuVisible] = useState(false)
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)

  const [roleOptions, setRoleOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [{ data: userData, error: userError }, { data: roles }, { data: statuses }] = await Promise.all([
          supabase
            .from('profiles')
            .select(`
              *,
              profile_status:user_status_id (status_name),
              profile_roles:role_id (role_name)
            `)
            .eq('id', userId)
            .single(),
          supabase.from('profiles_roles').select('role_name'),
          supabase.from('profiles_status').select('status_name'),
        ])

        if (userError) {
          showSnackbar('Error loading user data: ' + userError.message)
          return
        }

        setUser({
          ...userData,
          role: userData.profile_roles?.role_name,
          user_status: userData.profile_status?.status_name,
          birth_date: userData.birth_date ? new Date(userData.birth_date) : null,
        })

        if (roles) setRoleOptions(roles.map(r => r.role_name))
        if (statuses) setStatusOptions(statuses.map(s => s.status_name))
      } catch (error) {
        showSnackbar('Error loading user data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleChange = (field, value) => {
    setUser(prev => ({ ...prev, [field]: value }))
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text variant="bodyLarge" style={{ color: colors.error }}>User not found.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
        <Appbar.Content title="Edit User Account" />
        <Appbar.Action icon="content-save" onPress={() => setShowConfirmDialog(true)} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={styles.avatarContainer}>
              {user.avatar_url ? (
                <Avatar.Image size={80} source={{ uri: user.avatar_url }} />
              ) : (
                <Avatar.Text size={80} label={(user.first_name || 'N')[0].toUpperCase()} />
              )}
            </View>

            <Divider style={styles.divider} />

            <TextInput
              label="First Name"
              value={user.first_name || ''}
              onChangeText={text => handleChange('first_name', text)}
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="Middle Initial"
              value={user.middle_initial || ''}
              onChangeText={text => handleChange('middle_initial', text)}
              style={styles.input}
              mode="outlined"
              maxLength={1}
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="Last Name"
              value={user.last_name || ''}
              onChangeText={text => handleChange('last_name', text)}
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="account" />}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Email"
              value={user.email || ''}
              onChangeText={text => handleChange('email', text)}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" />}
            />

            <TextInput
              label="Contact Number"
              value={user.contact_number || ''}
              onChangeText={text => handleChange('contact_number', text)}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone" />}
            />

            <TextInput
              label="Birth Date"
              value={user.birth_date ? user.birth_date.toLocaleDateString() : ''}
              editable={false}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="calendar" />}
              right={<TextInput.Icon icon="calendar" />}
            />

            <Divider style={styles.divider} />

            <Menu
              visible={roleMenuVisible}
              onDismiss={() => setRoleMenuVisible(false)}
              anchor={
                <TextInput
                  label="Role"
                  value={user.role || ''}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="account-cog" />}
                  right={<TextInput.Icon icon="menu-down" onPress={() => setRoleMenuVisible(true)} />}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {roleOptions.map(role => (
                <Menu.Item
                  key={role}
                  onPress={() => {
                    handleChange('role', role)
                    setRoleMenuVisible(false)
                  }}
                  title={role}
                  titleStyle={[
                    fonts.bodyLarge,
                    {
                      color: user.role === role ? colors.primary : colors.onSurface,
                    },
                  ]}
                  leadingIcon={user.role === role ? 'check' : undefined}
                />
              ))}
            </Menu>

            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <TextInput
                  label="Status"
                  value={user.user_status || ''}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="account-check" />}
                  right={<TextInput.Icon icon="menu-down" onPress={() => setStatusMenuVisible(true)} />}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {statusOptions.map(status => (
                <Menu.Item
                  key={status}
                  onPress={() => {
                    handleChange('user_status', status)
                    setStatusMenuVisible(false)
                  }}
                  title={status}
                  titleStyle={[
                    fonts.bodyLarge,
                    {
                      color: user.user_status === status ? colors.primary : colors.onSurface,
                    },
                  ]}
                  leadingIcon={user.user_status === status ? 'check' : undefined}
                />
              ))}
            </Menu>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog visible={showConfirmDialog} onDismiss={() => setShowConfirmDialog(false)} style={{ backgroundColor: colors.surface }}>
          <Dialog.Title>Save Changes</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to save these changes?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)} disabled={saving}>Cancel</Button>
            <Button onPress={() => {
              setShowConfirmDialog(false)
            }} loading={saving} disabled={saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {SnackbarElement}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  surface: {
    padding: 16,
    borderRadius: 8,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
})

export default EditAccount
