import React, { useState, useEffect } from 'react'
import { StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View, ActivityIndicator } from 'react-native'
import { TextInput, Button, useTheme, Appbar } from 'react-native-paper'
import { supabase } from '../lib/supabase'
import useSnackbar from './hooks/useSnackbar'

const EditProfileSubScreen = ({ navigation, onClose }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [form, setForm] = useState({
    first_name: '',
    middle_initial: '',
    last_name: '',
    contact_number: '',
    birth_date: '',
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
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
        birth_date: data.birth_date || '',
      })
    } catch (error) {
      showSnackbar('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleUpdate = async () => {
    try {
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
        })
        .eq('id', user.id)

      if (error) {
        showSnackbar('Error updating profile: ' + error.message)
        return
      }

      showSnackbar('Profile updated successfully!', true)
      setTimeout(() => {
        onClose?.()
        navigation.goBack()
      }, 1500)
    } catch (error) {
      showSnackbar('Error updating profile')
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Edit Profile" />
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
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Edit Profile" />
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
          />
          <TextInput
            label="Middle Initial"
            value={form.middle_initial}
            onChangeText={(text) => handleChange('middle_initial', text)}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Last Name"
            value={form.last_name}
            onChangeText={(text) => handleChange('last_name', text)}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Contact Number (Philippines)"
            value={form.contact_number}
            onChangeText={(text) => handleChange('contact_number', text)}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
          />
          <TextInput
            label="Birth Date (YYYY-MM-DD)"
            value={form.birth_date}
            onChangeText={(text) => handleChange('birth_date', text)}
            mode="outlined"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleUpdate}
            style={[styles.button, { backgroundColor: colors.primary }]}
            labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
          >
            Update Profile
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            labelStyle={{ color: colors.primary }}
          >
            Cancel
          </Button>
          {SnackbarElement}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 20, justifyContent: 'center', paddingBottom: 'auto' },
  input: { marginBottom: 16 },
  button: { marginTop: 12, height: 50, justifyContent: 'center', borderRadius: 8 },
  buttonLabel: { fontWeight: 'bold' },
  cancelButton: { marginTop: 8, alignSelf: 'center' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default EditProfileSubScreen 