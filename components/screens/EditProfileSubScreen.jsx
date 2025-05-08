import React, { useState, useEffect } from 'react'
import { 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  View, 
  ActivityIndicator 
} from 'react-native'
import { TextInput, Button, useTheme, Appbar, Text, Portal, Dialog } from 'react-native-paper'
import { supabase } from '../../lib/supabase'
import useSnackbar from '../hooks/useSnackbar'

const EditProfileSubScreen = ({ navigation, onClose }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [form, setForm] = useState({
    first_name: '',
    middle_initial: '',
    last_name: '',
    contact_number: '',
    birth_date: null,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const saveProfile = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        showSnackbar('User not authenticated')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name,
          middle_initial: form.middle_initial,
          last_name: form.last_name,
          contact_number: form.contact_number,
          birth_date: form.birth_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        showSnackbar('Error updating profile: ' + error.message)
        return
      }

      showSnackbar('Profile updated successfully', true)
      navigation.navigate('Profile')
    } catch (error) {
      showSnackbar('Error updating profile')
    } finally {
      setSaving(false)
    }
  }

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        showSnackbar('User not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        showSnackbar('Error fetching profile: ' + error.message)
        return
      }

      setForm({
        first_name: data.first_name || '',
        middle_initial: data.middle_initial || '',
        last_name: data.last_name || '',
        contact_number: data.contact_number || '',
        birth_date: data.birth_date ? new Date(data.birth_date) : null,
      })
    } catch (error) {
      showSnackbar('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.navigate('Profile')} />
          <Appbar.Content title="Edit Profile" titleStyle={[{ color: colors.onSurface, ...fonts.titleMedium }]} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('Profile')} />
        <Appbar.Content title="Edit Profile" />
        <Appbar.Action icon="content-save" onPress={() => setShowConfirmDialog(true)} />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <TextInput
            label="First Name"
            value={form.first_name}
            onChangeText={(text) => handleChange('first_name', text)}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
          />

          <TextInput
            label="Middle Initial"
            value={form.middle_initial}
            onChangeText={(text) => handleChange('middle_initial', text)}
            mode="outlined"
            style={styles.input}
            maxLength={1}
            left={<TextInput.Icon icon="account" />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
          />

          <TextInput
            label="Last Name"
            value={form.last_name}
            onChangeText={(text) => handleChange('last_name', text)}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
          />

          <TextInput
            label="Contact Number"
            value={form.contact_number}
            onChangeText={(text) => handleChange('contact_number', text)}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone" />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
          />

          <TextInput
            label="Birth Date"
            value={form.birth_date}
            onChangeText={(text) => handleChange('birth_date', text)}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="calendar" />}
            theme={{ colors: { primary: colors.primary } }}
            disabled={saving}
          />

          <TextInput
            label="Emergency Contact Name"
            value={form.emergency_contact_name}
            onChangeText={(text) => handleChange('emergency_contact_name', text)}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
            theme={{ colors: { primary: colors.primary } }}
          />

          <TextInput
            label="Emergency Contact Number"
            value={form.emergency_contact_number}
            onChangeText={(text) => handleChange('emergency_contact_number', text)}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone" />}
            theme={{ colors: { primary: colors.primary } }}
          />

          <Button
            icon="content-save"
            mode="contained"
            onPress={() => setShowConfirmDialog(true)}
            style={[styles.button, { backgroundColor: colors.primary }]}
            labelStyle={[{ color: colors.onPrimary, ...fonts.labelLarge }]}
            loading={saving}
            disabled={saving}
          >
            Update Profile
          </Button>
          <Button
            icon="close"
            mode="outlined"
            onPress={() => navigation.navigate('Profile')}
            style={[styles.cancelButton, { borderColor: colors.primary }]}
            labelStyle={[{ color: colors.primary, ...fonts.labelLarge }]}
            disabled={saving}
          >
            Cancel
          </Button>
          {SnackbarElement}
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
              saveProfile()
            }} loading={saving} disabled={saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scrollContainer: { 
    flexGrow: 1, 
    padding: 16
  },
  input: { 
    marginBottom: 16 
  },
  button: {
    marginTop: 12,
    width: '100%',
  },
  cancelButton: {
    marginTop: 8,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default EditProfileSubScreen 