import React, { useState } from 'react'
import { StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { TextInput, Button, useTheme, Appbar } from 'react-native-paper'
import { supabase } from '../lib/supabase'
import useSnackbar from './hooks/useSnackbar'

const SignUpSubScreen = ({ navigation, onClose }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: '',
  })

  const [visibility, setVisibility] = useState({
    password: false,
    confirmPassword: false,
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = (field) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSignUp = async () => {
    const { email, password, confirmPassword, full_name, role } = form

    if (!email || !password || !confirmPassword || !full_name || !role) {
      return showSnackbar('All fields are required.')
    }

    if (password !== confirmPassword) {
      return showSnackbar('Passwords do not match.')
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      return showSnackbar(signUpError.message)
    }

    const user = data.user
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          username: email.split('@')[0],
          full_name,
          role,
          user_status: 'Pending',
        })

      if (profileError) {
        return showSnackbar('Profile creation failed.')
      }
    }

    showSnackbar('Account created! Check your email to verify.', true)
    setTimeout(() => {
      onClose?.()
      navigation.navigate('Login')
    }, 2500)
  }

  const _goBack = () => navigation.goBack()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>      
      <Appbar.Header>
        <Appbar.BackAction onPress={_goBack} />
        <Appbar.Content title="Create an Account" />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            label="Full Name"
            value={form.full_name}
            onChangeText={text => handleChange('full_name', text)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Email"
            value={form.email}
            onChangeText={text => handleChange('email', text)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Role (Administrator / Airline Staff / Delivery Personnel)"
            value={form.role}
            onChangeText={text => handleChange('role', text)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={form.password}
            onChangeText={text => handleChange('password', text)}
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
            onChangeText={text => handleChange('confirmPassword', text)}
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
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 12,
    height: 50,
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonLabel: {
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
})

export default SignUpSubScreen