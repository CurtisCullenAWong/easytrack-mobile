import { supabase } from '../../lib/supabase'
import useSnackbar from './useSnackbar'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Updates from 'expo-updates'

// Constants
const MAX_LOGIN_ATTEMPTS = 5
const BASE_COOLDOWN_MINUTES = 1
const MAX_COOLDOWN_MINUTES = 30

// Utility functions
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

const sanitizeEmail = (email) => {
  return email.trim().toLowerCase()
}

// Initialize WebBrowser for auth
WebBrowser.maybeCompleteAuthSession()

const useAuth = (navigation = null, onClose = null) => {
  const { showSnackbar, SnackbarElement } = useSnackbar()

  // ===== Session and Login State Management =====

  const createSessionFromUrl = async (url) => {
    try {
      const { params, errorCode } = QueryParams.getQueryParams(url)
      if (errorCode) throw new Error(errorCode)
      
      const { access_token, refresh_token } = params
      if (!access_token) return

      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })
      
      if (error) throw error
      return data.session
    } catch (error) {
      console.error('Error creating session from URL:', error)
      showSnackbar('Error creating session. Please try again.')
      return null
    }
  }

  // ===== User Authentication =====
  const login = async ({ email, password }) => {
    if (!email || !password) {
      return showSnackbar('Email and password are required.')
    }

    const sanitizedEmail = sanitizeEmail(email)
    if (!validateEmail(sanitizedEmail)) {
      return showSnackbar('Please enter a valid email address.')
    }

    // Check for cooldown
    const cooldownKey = `cooldown_${sanitizedEmail}`
    const cooldownData = await AsyncStorage.getItem(cooldownKey)
    if (cooldownData) {
      const { timestamp, lockoutCount } = JSON.parse(cooldownData)
      const cooldownMinutes = Math.min(BASE_COOLDOWN_MINUTES * Math.pow(2, lockoutCount - 1), MAX_COOLDOWN_MINUTES)
      const cooldownEndTime = timestamp + (cooldownMinutes * 60 * 1000)
      const now = Date.now()
      
      if (now < cooldownEndTime) {
        const remainingMinutes = Math.ceil((cooldownEndTime - now) / (60 * 1000))
        return showSnackbar(`Too many login attempts. Please try again in ${remainingMinutes} minute(s).`)
      } else {
        // Cooldown expired, reset attempts
        await AsyncStorage.removeItem(cooldownKey)
      }
    }

    // Get current login attempts
    const attemptsKey = `login_attempts_${sanitizedEmail}`
    const attemptsData = await AsyncStorage.getItem(attemptsKey)
    const attempts = attemptsData ? JSON.parse(attemptsData).attempts : 0

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      // Get current lockout count
      const currentCooldownData = await AsyncStorage.getItem(cooldownKey)
      const lockoutCount = currentCooldownData ? JSON.parse(currentCooldownData).lockoutCount + 1 : 1
      
      // Set cooldown with increased duration
      const cooldownMinutes = Math.min(BASE_COOLDOWN_MINUTES * Math.pow(2, lockoutCount - 1), MAX_COOLDOWN_MINUTES)
      await AsyncStorage.setItem(cooldownKey, JSON.stringify({
        timestamp: Date.now(),
        lockoutCount
      }))
      // Reset attempts
      await AsyncStorage.removeItem(attemptsKey)
      return showSnackbar(`Too many login attempts. Please try again in ${cooldownMinutes} minutes.`)
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ 
      email: sanitizedEmail, 
      password
    })

    if (loginError) {
      // Increment failed attempts
      const newAttempts = attempts + 1
      await AsyncStorage.setItem(attemptsKey, JSON.stringify({
        attempts: newAttempts
      }))
      
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts
      const attemptsMessage = `You have ${remainingAttempts} login attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
      
      if (loginError?.message?.toLowerCase().includes('email not confirmed')) {
        showSnackbar('Please login via email otp to confirm your email.')
        loginWithOtp(sanitizedEmail)
        return
      }
      return showSnackbar(`${loginError.message}. ${attemptsMessage}`)
    }

    // Successful login - reset attempts and cooldown
    await AsyncStorage.removeItem(attemptsKey)
    await AsyncStorage.removeItem(cooldownKey)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role_id, user_status_id')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      return showSnackbar('Logged in, but no profile found.')
    }

    if (profile.user_status_id === 3 || profile.user_status_id === 5) {
      return showSnackbar('Your account is not active. Please contact support.')
    }

    await supabase
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString(), user_status_id: 1 })
      .eq('id', data.user.id)

    const routeMap = {
      1: 'AdminDrawer',
      2: 'DeliveryDrawer',
      3: 'AirlineDrawer',
    }

    const targetRoute = routeMap[profile.role_id]
    if (!targetRoute) {
      return showSnackbar('Unauthorized role or unknown user.')
    }

    if (navigation) {
      navigation.navigate(targetRoute)
      onClose?.()
    } else {
      navigation.navigate('Login')
    }
  }

  const loginWithOtp = async (email) => {
    if (!email) {
      return showSnackbar('Email is required for OTP login.')
    }

    const sanitizedEmail = sanitizeEmail(email)
    if (!validateEmail(sanitizedEmail)) {
      return showSnackbar('Please enter a valid email address.')
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: sanitizedEmail,
        options: {
          emailRedirectTo: makeRedirectUri({
            scheme: 'easytrack',
            path: 'login'
          }),
          shouldCreateUser: false,
        },
      })
      if (error) {
        return showSnackbar(`Error: ${error.message}.`)
      }
      showSnackbar('OTP sent to your email. Please check your inbox.', true)
      
      const subscription = Linking.addEventListener('url', async ({ url }) => {
        if (url.includes('login')) {
          const session = await createSessionFromUrl(url)
          if (session?.user) {
            await handleLogin(session.user)
          }
        }
      })
      return () => subscription.remove()
    } catch (error) {
      showSnackbar('An error occurred while sending OTP. Please try again.')
    }
  }

  const resetPassword = async (email) => {
    if (!email) {
      return showSnackbar('Email is required for password reset.')
    }

    const sanitizedEmail = sanitizeEmail(email)
    if (!validateEmail(sanitizedEmail)) {
      return showSnackbar('Please enter a valid email address.')
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: makeRedirectUri({
          scheme: 'easytrack',
          path: 'reset-password'
        })
      })

      if (error) {
        return showSnackbar(`Error: ${error.message}`)
      }

      showSnackbar('Password reset email sent.', true)
      
      const subscription = Linking.addEventListener('url', async ({ url }) => {
        if (url.includes('reset-password')) {
          const session = await createSessionFromUrl(url)
          if (session?.user) {
            navigation.navigate('SetNewPassword', {
              email: sanitizedEmail,
              token: session.user.access_token
            })
            onClose?.()
          }
        }
      })
      return () => subscription.remove()
    } catch (error) {
      console.error('Error in resetPassword:', error)
      showSnackbar('An error occurred while sending the reset email. Please try again.')
    }
  }

  const handleLogin = async (user) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role_id, user_status_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        return showSnackbar('Logged in, but no profile found.')
      }

      if (profile.user_status_id === 3 || profile.user_status_id === 5) {
        return showSnackbar('Your account is not active. Please contact support.')
      }

      await supabase
        .from('profiles')
        .update({ last_sign_in_at: new Date().toISOString(), user_status_id: 1 })
        .eq('id', user.id)

      const routeMap = {
        1: 'AdminDrawer',
        2: 'DeliveryDrawer',
        3: 'AirlineDrawer',
      }

      const targetRoute = routeMap[profile.role_id]
      if (!targetRoute) {
        return showSnackbar('Unauthorized role or unknown user.')
      }

      if (navigation) {
        navigation.navigate(targetRoute)
        onClose?.()
      } else {
        navigation.navigate('Login')
      }
    } catch (error) {
      console.error('Error in handleLogin:', error)
      showSnackbar('An error occurred during login. Please try again.')
    }
  }

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session check error:', error)
        return false
      }

      if (!session) return false

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role_id, user_status_id')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError)
        return false
      }

      if (profile.user_status_id === 3 || profile.user_status_id === 5) {
        showSnackbar('Your account is not active. Please contact support.')
        return false
      }

      const routeMap = {
        1: 'AdminDrawer',
        2: 'DeliveryDrawer',
        3: 'AirlineDrawer',
      }

      const targetRoute = routeMap[profile.role_id]
      if (!targetRoute) {
        showSnackbar('Unauthorized role or unknown user.')
        return false
      }

      if (navigation) {
        navigation.navigate(targetRoute)
        onClose?.()
      }

      return true
    } catch (error) {
      console.error('Error in checkSession:', error)
      return false
    }
  }

  async function checkForUpdates() {
    if (!__DEV__ && Updates.isAvailable) {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.warn('Update check failed:', e);
      }
    }
  }

  return {
    login,
    loginWithOtp,
    resetPassword,
    checkSession,
    checkForUpdates,
    SnackbarElement,
  }
}

export default useAuth
