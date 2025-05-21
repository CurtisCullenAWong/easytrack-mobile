import React, { useState, useCallback } from 'react'
import { StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { TextInput, Button, useTheme, Appbar, Text, Portal, Dialog, Surface, Divider } from 'react-native-paper'
import { DatePickerModal, en, registerTranslation } from 'react-native-paper-dates'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../../components/hooks/useSnackbar'

registerTranslation('en', en)

const SignUpScreen = ({ navigation }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [form, setForm] = useState({
    role: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    contact_number: '',
    birth_date: null,
  })

  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  const [visibility, setVisibility] = useState({
    password: false,
    confirmPassword: false,
  })

  const roleOptions = ['Administrator', 'Airline Staff', 'Delivery Personnel']

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = (field) => setVisibility(prev => ({ ...prev, [field]: !prev[field] }))

  const handleDateConfirm = useCallback(({ date }) => {
    if (date) {
      handleChange('birth_date', date)
    }
    setShowDatePicker(false)
  }, [])

  const handleDateDismiss = useCallback(() => {
    setShowDatePicker(false)
  }, [])

  const openDatePicker = useCallback(() => {
    setShowDatePicker(true)
  }, [])

  const handleSignUp = async () => {
    try {
      setLoading(true)
      const { email, password, first_name, middle_initial, last_name, contact_number, birth_date, role } = form
  
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
  
      if (signUpError) {
        return showSnackbar(signUpError.message)
      }
  
      const user = data.user
      
      if (user) {
        try {
          // Get role_id based on role name
          const { data: roleData, error: roleError } = await supabase
            .from('profiles_roles')
            .select('id')
            .eq('role_name', role)
            .single()

          if (roleError) {
            throw new Error('Invalid role selected')
          }

          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              email: user.email,
              first_name: first_name,
              middle_initial: middle_initial,
              last_name: last_name,
              contact_number: '+63'+contact_number,
              birth_date: birth_date,
              role_id: roleData.id,
              user_status_id: 3, // Pending status
            })  
  
          if (profileError) {
            return showSnackbar('Profile creation failed: ' + profileError.message)
          }
  
          showSnackbar('Account created! Check your email to verify.', true)
          navigation.navigate('Login')
  
        } catch (error) {
          console.error("Error creating profile:", error)
          showSnackbar('Something went wrong while creating the profile.')
        }
      } else {
        showSnackbar('User creation failed.')
      }
    } catch (error) {
      showSnackbar('Error during sign up process')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('UserManagement')} />
        <Appbar.Content title="Create an Account" />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
            <TextInput
              label="First Name"
              value={form.first_name}
              onChangeText={(text) => handleChange('first_name', text)}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="account" />}
              autoCapitalize="words"
              maxLength={50}
              theme={{ colors: { primary: colors.primary } }}
            />
            <TextInput
              label="Middle Initial"
              value={form.middle_initial}
              onChangeText={(text) => handleChange('middle_initial', text)}
              mode="outlined"
              style={styles.input}
              maxLength={1}
              right={<TextInput.Icon icon="account" />}
              autoCapitalize="characters"
              theme={{ colors: { primary: colors.primary } }}
            />
            <TextInput
              label="Last Name"
              value={form.last_name}
              onChangeText={(text) => handleChange('last_name', text)}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="account" />}
              autoCapitalize="words"
              maxLength={50}
              theme={{ colors: { primary: colors.primary } }}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Contact Number"
              value={form.contact_number}
              onChangeText={(text) => handleChange('contact_number', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              left={<TextInput.Affix text="+63" />}
              maxLength={10}
              theme={{ colors: { primary: colors.primary } }}
            />

            <TextInput
              label="Birth Date"
              value={form.birth_date ? form.birth_date.toLocaleDateString() : ''}
              editable={false}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="calendar" onPress={openDatePicker} />}
              theme={{ colors: { primary: colors.primary } }}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Email"
              value={form.email}
              onChangeText={(text) => handleChange('email', text)}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              right={<TextInput.Icon icon="email" />}
              theme={{ colors: { primary: colors.primary } }}
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
                  onPress={() => toggleVisibility('password')}
                />
              }
              theme={{ colors: { primary: colors.primary } }}
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
                  onPress={() => toggleVisibility('confirmPassword')}
                />
              }
              theme={{ colors: { primary: colors.primary } }}
            />

            <TextInput
              label="Role"
              value={form.role}
              editable={false}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="account-cog" onPress={() => setShowRoleMenu(true)} />}
              theme={{ colors: { primary: colors.primary } }}
            />

            <Button
              mode="contained"
              onPress={() => setShowConfirmDialog(true)}
              style={[styles.button, { backgroundColor: colors.primary }]}
              labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
              loading={loading}
              disabled={loading}
            >
              Sign Up
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.cancelButton}
              labelStyle={{ color: colors.primary }}
              disabled={loading}
            >
              Cancel
            </Button>
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
          startYear={1935}
          endYear={new Date().getFullYear()}
          validRange={{
            startDate: new Date(1935, 0, 1),
            endDate: new Date(),
          }}
        />
      </Portal>

      <Portal>
        <Dialog
          visible={showRoleMenu}
          onDismiss={() => setShowRoleMenu(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Select Role</Dialog.Title>
          <Dialog.Content>
            {roleOptions.map((role) => (
              <Button
                key={role}
                mode="text"
                onPress={() => {
                  handleChange('role', role)
                  setShowRoleMenu(false)
                }}
                style={styles.roleButton}
                textColor={form.role === role ? colors.primary : colors.onSurface}
              >
                {role}
              </Button>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRoleMenu(false)} textColor={colors.error}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={showConfirmDialog}
          onDismiss={() => setShowConfirmDialog(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Confirm Sign Up</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to create an account with these details?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onPress={() => {
                setShowConfirmDialog(false)
                handleSignUp()
              }}
              loading={loading}
              disabled={loading}
            >
              Sign Up
            </Button>
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
    marginBottom: 16,
  },
  input: { 
    marginBottom: 16
  },
  divider: {
    marginVertical: 16,
  },
  button: { 
    marginTop: 12, 
    height: 50, 
    justifyContent: 'center', 
    borderRadius: 8 
  },
  buttonLabel: { 
    fontWeight: 'bold' 
  },
  cancelButton: { 
    marginTop: 8, 
    alignSelf: 'center' 
  },
  roleButton: {
    marginVertical: 4,
  },
})

export default SignUpScreen
