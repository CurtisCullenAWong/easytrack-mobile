import { supabase } from '../../lib/supabase'
import useSnackbar from './useSnackbar'

const useAuth = (navigation, onClose) => {
  const { showSnackbar, SnackbarElement } = useSnackbar()

  // Verify user login
  const handleLogin = async (user) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role_id, user_status_id')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return showSnackbar('Logged in, but no profile found.')
    }

    // Check for account status if pending or deactivated
    if (profile.user_status_id === 3 || profile.user_status_id === 5) {
      return showSnackbar('Your account is not active. Please contact support.')
    }

    // Update last sign-in time
    await supabase
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString(), user_status_id: 1 })
      .eq('id', user.id)

    // Role-based route mapping
    const routeMap = {
      1: 'AdminDrawer',
      2: 'DeliveryDrawer',
      3: 'AirlineDrawer',
    }

    const targetRoute = routeMap[profile.role_id]
    if (!targetRoute) {
      return showSnackbar('Unauthorized role or unknown user.')
    }
    navigation.navigate(targetRoute)
    onClose?.()
  }

  // Login user
  const login = async ({ email, password }) => {
    if (!email || !password) {
      return showSnackbar('Email and password are required.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return showSnackbar(`Login error: ${error.message}`)
    }

    handleLogin(data.user)
  }
// Send password reset email
  const resetPassword = async (email) => {
    if (!email) {
      return showSnackbar('Email is required for password reset.')
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'myapp://reset-password',
    })

    if (error) {
      return showSnackbar(`Error: ${error.message}`)
    }

    showSnackbar('Password reset email sent.', 'success')
    onClose?.()
  }

  // Check if user is logged in
  const checkSession = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 5000); // 5 second timeout
      });

      const sessionPromise = supabase.auth.getSession();
      const { data } = await Promise.race([sessionPromise, timeoutPromise]);
      
      const session = data?.session;
      if (!session) {
        return false;
      }

      if (session.user) {
        await handleLogin(session.user);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Session check failed:', error.message);
      // Force sign out on timeout or error
      await supabase.auth.signOut();
      return false;
    }
  }

  return {
    login,
    resetPassword,
    checkSession,
    SnackbarElement,
  }
}

export default useAuth
