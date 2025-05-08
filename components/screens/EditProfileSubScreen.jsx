import React, { useState, useEffect, useCallback } from 'react'
import { 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  View, 
  ActivityIndicator 
} from 'react-native'
import { TextInput, Button, useTheme, Appbar, Text, Portal, Dialog, Avatar, Surface, Divider } from 'react-native-paper'
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../lib/supabase'
import useSnackbar from '../hooks/useSnackbar'

// Register the English locale
registerTranslation('en', en)

const EditProfileSubScreen = ({ navigation, onClose }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [form, setForm] = useState({
    first_name: '',
    middle_initial: '',
    last_name: '',
    contact_number: '',
    birth_date: null,
    emergency_contact_name: '',
    emergency_contact_number: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

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
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_number: form.emergency_contact_number,
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
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_number: data.emergency_contact_number || '',
      })
    } catch (error) {
      showSnackbar('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

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
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={styles.avatarContainer}>
              {form.avatar_url ? (
                <Avatar.Image size={80} source={{ uri: form.avatar_url }} />
              ) : (
                <Avatar.Text size={80} label={(form.first_name || 'N')[0].toUpperCase()} />
              )}
              <Text variant="bodyLarge" style={[styles.avatarText, { color: colors.onSurface }]}>Profile Picture</Text>
            </View>

            <Divider style={styles.divider} />

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

            <Divider style={styles.divider} />

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
              value={form.birth_date ? form.birth_date.toLocaleDateString() : ''}
              editable={false}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="calendar" />}
              right={<TextInput.Icon icon="calendar" onPress={openDatePicker} />}
              theme={{ colors: { primary: colors.primary } }}
              disabled={saving}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Emergency Contact Name"
              value={form.emergency_contact_name}
              onChangeText={(text) => handleChange('emergency_contact_name', text)}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
              theme={{ colors: { primary: colors.primary } }}
              disabled={saving}
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
              disabled={saving}
            />
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showDatePicker}
          onDismiss={handleDateDismiss}
          date={form.birth_date}
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
              saveProfile()
            }} loading={saving} disabled={saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {SnackbarElement}
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
    marginBottom: 16 
  },
  divider: {
    marginVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default EditProfileSubScreen 