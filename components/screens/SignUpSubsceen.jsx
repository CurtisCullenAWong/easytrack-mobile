import React, { useState } from 'react'
import { StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { TextInput, Button, useTheme, Appbar } from 'react-native-paper'
import { supabase } from '../../lib/supabase'
import useSnackbar from '../hooks/useSnackbar'

const SignUpSubScreen = ({ navigation, onClose }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    contact_number: '',
    birth_date: '',
  })

  const [visibility, setVisibility] = useState({
    password: false,
    confirmPassword: false,
  })

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const toggleVisibility = (field) => setVisibility(prev => ({ ...prev, [field]: !prev[field] }))

  const handleSignUp = async () => {
    const { email, password, first_name, middle_initial, last_name, contact_number, birth_date, role } = form
  
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
  
    if (signUpError) {
      return showSnackbar(signUpError.message)
    }
  
    const user = data.user
    
    if (user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            first_name: first_name,
            middle_initial: middle_initial,
            last_name: last_name,
            contact_number: contact_number,
            birth_date: birth_date,
            role_id: role,
            user_status_id: 3,
            verify_info_id: user.id,
          })
  
        if (profileError) {
          return showSnackbar('Profile creation failed: ' + profileError.message)
        }
  
        // If everything is successful, notify the user
        showSnackbar('Account created! Check your email to verify.', true)
        setTimeout(() => {
          onClose?.()
          navigation.navigate('Login')
        }, 2500)
  
      } catch (error) {
        // Handle any other errors
        console.error("Error creating profile:", error)
        showSnackbar('Something went wrong while creating the profile.')
      }
    } else {
      showSnackbar('User creation failed.')
    }
  }
  

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Create an Account" />
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
          <TextInput
            label="Email"
            value={form.email}
            onChangeText={(text) => handleChange('email', text)}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Role (Administrator / Airline Staff / Delivery Personnel)"
            value={form.role}
            onChangeText={(text) => handleChange('role', text)}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Password"
            value={form.password}
            onChangeText={(text) => handleChange('password', text)}
            secureTextEntry={!visibility.password}
            mode="outlined"
            style={styles.input}
            right={
              <TextInput.Icon
                icon={visibility.password ? 'eye' : 'eye-off'}
                iconColor={colors.primary}
                onPress={() => toggleVisibility('password')}
              />
            }
          />
          <TextInput
            label="Confirm Password"
            value={form.confirmPassword}
            onChangeText={(text) => handleChange('confirmPassword', text)}
            secureTextEntry={!visibility.confirmPassword}
            mode="outlined"
            style={styles.input}
            right={
              <TextInput.Icon
                icon={visibility.confirmPassword ? 'eye' : 'eye-off'}
                iconColor={colors.primary}
                onPress={() => toggleVisibility('confirmPassword')}
              />
            }
          />
          <Button
            mode="contained"
            onPress={handleSignUp}
            style={[styles.button, { backgroundColor: colors.primary }]}
            labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
          >
            Sign Up
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
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
  scrollContainer: { flexGrow: 1, padding: 20, justifyContent: 'center', paddingBottom:'auto' },
  input: { marginBottom: 16 },
  button: { marginTop: 12, height: 50, justifyContent: 'center', borderRadius: 8 },
  buttonLabel: { fontWeight: 'bold' },
  cancelButton: { marginTop: 8, alignSelf: 'center' },
})

export default SignUpSubScreen
