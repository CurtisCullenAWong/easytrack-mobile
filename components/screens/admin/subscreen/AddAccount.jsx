import React, { useState } from 'react'
import { StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { TextInput, Button, useTheme, Appbar, Text, Portal, Dialog, Surface, Divider } from 'react-native-paper'
import useSnackbar from '../../../../components/hooks/useSnackbar'
import { supabase } from '../../../../lib/supabaseAdmin'
const AddAccount = ({ navigation }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [form, setForm] = useState({
    email: '',
    role: '',
  })

  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)


  const roleOptions = ['Administrator', 'Airline Staff', 'Delivery Personnel']

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateAccount = async () => {
    try {
      setLoading(true);
      const { email, role } = form;
    
      const { data, error: signUpError } = await supabase.auth.admin.inviteUserByEmail(email);
    
      if (signUpError) {
        return showSnackbar(signUpError.message);
      }
    
      const user = data?.user;
    
      if (!user) {
        return showSnackbar('User creation failed.');
      }
    
      // Get role_id based on role name
      const { data: roleData, error: roleError } = await supabase
        .from('profiles_roles')
        .select('id')
        .eq('role_name', role)
        .single();
    
      if (roleError || !roleData) {
        return showSnackbar('Invalid role selected.');
      }
    
      // Insert profile with role_id and pending status
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role_id: roleData.id,
          user_status_id: 3, // Assuming 3 is "Pending"
        });
    
      if (profileError) {
        return showSnackbar('Profile creation failed: ' + profileError.message);
      }
    
      showSnackbar('Account created! Check your email to verify.', true);
    
    } catch (error) {
      console.error("Error during account creation process:", error);
      showSnackbar('Something went wrong while creating the account.');
    } finally {
      setLoading(false);
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
              label="Role"
              value={form.role}
              editable={false}
              mode="outlined"
              style={styles.input}
              right={<TextInput.Icon icon="account-cog" onPress={() => setShowRoleMenu(true)} />}
              theme={{ colors: { primary: colors.primary } }}
            />

            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={() => setShowConfirmDialog(true)}
              style={[styles.button, { backgroundColor: colors.primary }]}
              labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
              loading={loading}
              disabled={loading}
            >
              Create Account
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('UserManagement')}
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
          <Dialog.Title>Confirm Account Creation</Dialog.Title>
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
                handleCreateAccount()
              }}
              loading={loading}
              disabled={loading}
            >
              Create Account
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

export default AddAccount
