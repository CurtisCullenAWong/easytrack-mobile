import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native'
import {
  TextInput,
  Button,
  Text,
  useTheme,
  HelperText,
  Appbar,
  Menu,
} from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'

const EditAccount = ({ route, navigation }) => {
  const { userId } = route.params
  const { colors, fonts } = useTheme()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [roleMenuVisible, setRoleMenuVisible] = useState(false)
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)

  const [roleOptions, setRoleOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [{ data: userData, error: userError }, { data: roles }, { data: statuses }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('profiles_roles').select('role_name'),
        supabase.from('profiles_status').select('status_name'),
      ])

      if (userError) {
        setError(userError.message)
      } else {
        setUser(userData)
      }

      if (roles) setRoleOptions(roles.map(r => r.role_name))
      if (statuses) setStatusOptions(statuses.map(s => s.status_name))

      setLoading(false)
    }

    fetchData()
  }, [userId])

  const handleChange = (field, value) => {
    setUser(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: user.full_name,
        role: user.role,
        user_status: user.user_status,
      })
      .eq('id', user.id)

    setSaving(false)
    if (error) setError(error.message)
    else navigation.goBack()
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[fonts.bodyLarge, { color: colors.onSurface }]}>Loading user...</Text>
      </SafeAreaView>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[fonts.bodyLarge, { color: colors.error }]}>User not found.</Text>
        {error && <HelperText type="error">{error}</HelperText>}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={navigation.goBack} />
        <Appbar.Content title="Edit User Account" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TextInput
            label="Full Name"
            value={user.full_name || ''}
            onChangeText={text => handleChange('full_name', text)}
            style={[styles.input, { backgroundColor: colors.surface }]}
            mode="outlined"
          />

          {/* Role Menu */}
          <View style={styles.menuWrapper}>
            <Menu
              visible={roleMenuVisible}
              onDismiss={() => setRoleMenuVisible(false)}
              anchor={
                <TouchableOpacity onPress={() => setRoleMenuVisible(true)}>
                  <TextInput
                    label="Role"
                    value={user.role || ''}
                    editable={false}
                    mode="outlined"
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="menu-down" />}
                  />
                </TouchableOpacity>
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
          </View>


          {/* Status Menu */}
          <View style={styles.menuWrapper}>
            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <TouchableOpacity onPress={() => setStatusMenuVisible(true)}>
                  <TextInput
                    label="Status"
                    value={user.user_status || ''}
                    editable={false}
                    mode="outlined"
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="menu-down" />}
                  />
                </TouchableOpacity>
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
          </View>


          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            labelStyle={fonts.titleMedium}
          >
            Save Changes
          </Button>

          {error && <HelperText type="error">{error}</HelperText>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 16,
    height: 50,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuWrapper: {
    marginBottom: 16,
  },
})

export default EditAccount
