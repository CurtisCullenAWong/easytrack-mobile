import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../../components/hooks/useSnackbar'

// Register the English locale
registerTranslation('en', en)

// Memoized Menu Item component
const MemoizedMenuItem = React.memo(({ item, selected, onPress, colors, fonts }) => (
  <Menu.Item
    onPress={onPress}
    title={item}
    titleStyle={[
      fonts.bodyLarge,
      {
        color: selected ? colors.primary : colors.onSurface,
      },
    ]}
    leadingIcon={selected ? 'check' : undefined}
  />
))

const EditAccount = ({ route, navigation }) => {
  const { userId } = route.params
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [roleMenuVisible, setRoleMenuVisible] = useState(false)
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)

  const [roleOptions, setRoleOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])

  const handleDateConfirm = useCallback(({ date }) => {
    if (date) {
      // Validate that the date is not in the future
      const today = new Date()
      if (date > today) {
        showSnackbar('Birth date cannot be in the future')
        return
      }
      handleChange('birth_date', date)
    }
    setShowDatePicker(false)
  }, [showSnackbar])

  const handleDateDismiss = useCallback(() => {
    setShowDatePicker(false)
  }, [])

  const openDatePicker = useCallback(() => {
    setShowDatePicker(true)
  }, [])

  const saveUser = async () => {
    try {
      setSaving(true)

      // First get the role_id and user_status_id based on the selected names
      const [{ data: roleData }, { data: statusData }] = await Promise.all([
        supabase
          .from('profiles_roles')
          .select('id')
          .eq('role_name', user.role)
          .single(),
        supabase
          .from('profiles_status')
          .select('id')
          .eq('status_name', user.user_status)
          .single()
      ])

      if (!roleData || !statusData) {
        showSnackbar('Error: Invalid role or status selected')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: user.first_name,
          middle_initial: user.middle_initial,
          last_name: user.last_name,
          email: user.email,
          contact_number: user.contact_number,
          birth_date: user.birth_date,
          role_id: roleData.id,
          user_status_id: statusData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        showSnackbar('Error updating user: ' + error.message)
        return
      }

      showSnackbar('User updated successfully', true)
      navigation.navigate('UserManagement')
    } catch (error) {
      showSnackbar('Error updating user')
    } finally {
      setSaving(false)
    }
  }

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
          supabase.from('profiles_status').select('status_name').in('id', [2, 4, 5]),
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

  // Memoize the role menu items
  const roleMenuItems = useMemo(() => 
    roleOptions.map(role => (
      <MemoizedMenuItem
        key={role}
        item={role}
        selected={user?.role === role}
        onPress={() => {
          handleChange('role', role)
          setRoleMenuVisible(false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [roleOptions, user?.role, colors, fonts])

  // Memoize the status menu items
  const statusMenuItems = useMemo(() => 
    statusOptions.map(status => (
      <MemoizedMenuItem
        key={status}
        item={status}
        selected={user?.user_status === status}
        onPress={() => {
          handleChange('user_status', status)
          setStatusMenuVisible(false)
        }}
        colors={colors}
        fonts={fonts}
      />
    )), [statusOptions, user?.user_status, colors, fonts])

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
              <Text variant="bodyLarge" style={[styles.avatarText, { color: colors.onSurface }]}>Profile Picture</Text>
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
              right={<TextInput.Icon icon="calendar" onPress={openDatePicker} />}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Emergency Contact Name"
              value={user.emergency_contact_name || ''}
              onChangeText={text => handleChange('emergency_contact_name', text)}
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="Emergency Contact Number"
              value={user.emergency_contact_number || ''}
              onChangeText={text => handleChange('emergency_contact_number', text)}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone" />}
            />

            <Divider style={styles.divider} />

            <Menu
              visible={roleMenuVisible}
              onDismiss={() => setRoleMenuVisible(false)}
              anchor={
                <TextInput
                  label="Role"
                  value={user?.role || ''}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="account-cog" />}
                  right={<TextInput.Icon icon="menu-down" onPress={() => setRoleMenuVisible(true)} />}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {roleMenuItems}
            </Menu>

            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <TextInput
                  label="Status"
                  value={user?.user_status || ''}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="account-check" />}
                  right={<TextInput.Icon icon="menu-down" onPress={() => setStatusMenuVisible(true)} />}
                />
              }
              contentStyle={{ backgroundColor: colors.surface }}
            >
              {statusMenuItems}
            </Menu>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showDatePicker}
          onDismiss={handleDateDismiss}
          date={user.birth_date}
          onConfirm={handleDateConfirm}
          title="Select Birth Date"
          animationType="slide"
          presentationStyle="formSheet"
          saveLabel="Select"
          label="Enter the birth date"
          startYear={1925}
          endYear={new Date().getFullYear()}
        />
      </Portal>

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
              saveUser()
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
  },
  avatarText: {
    marginTop: 8,
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
