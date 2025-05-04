import React, { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { TextInput, Button, Text, useTheme, HelperText } from 'react-native-paper'
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

  const handleSave = async () => {
    if (!user) return;
  
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: user.full_name,
        role: user.role,
        user_status: user.user_status,
      })
      .eq('id', user.id);
  
    setSaving(false);
  
    if (error) {
      setError(error.message);
    } else {
      navigation.goBack();
    }
  };
  
  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={[fonts.bodyLarge, { color: colors.onSurface }]}>Loading user...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={[fonts.bodyLarge, { color: colors.error }]}>User not found.</Text>
        {error && <HelperText type="error">{error}</HelperText>}
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, {backgroundColor:colors.background}]}>
      <Text style={[fonts.headlineSmall, styles.header, { color: colors.primary }]}>
        Edit User Account
      </Text>
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
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex:1
  },
  header: {
    marginBottom: 24,
    textAlign: 'center',
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
