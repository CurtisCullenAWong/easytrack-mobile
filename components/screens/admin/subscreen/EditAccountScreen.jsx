import React, { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native'
import { TextInput, Button, Text, useTheme, HelperText, Appbar } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'

const EditAccount = ({ route, navigation }) => {
  const { userId } = route.params
  const { colors, fonts } = useTheme()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchUser = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      setError(error.message)
    } else {
      setUser(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUser()
  }, [userId])

  const handleChange = (field, value) => {
    setUser(prev => ({ ...prev, [field]: value }))
  }
  const _goBack = () => navigation.goBack()

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

    if (error) {
      setError(error.message)
    } else {
      navigation.goBack()
    }
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
        <Appbar.BackAction onPress={_goBack} />
        <Appbar.Content title="Edit User Account" />
      </Appbar.Header>
      <KeyboardAvoidingView
        style={{flex:1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TextInput
            label="Full Name"
            value={user.full_name || ''}
            onChangeText={(text) => handleChange('full_name', text)}
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label="Role"
            value={user.role || ''}
            onChangeText={(text) => handleChange('role', text)}
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label="Status"
            value={user.user_status || ''}
            onChangeText={(text) => handleChange('user_status', text)}
            style={styles.input}
            mode="outlined"
          />

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
})

export default EditAccount
