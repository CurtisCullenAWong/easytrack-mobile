import { supabase } from '../../lib/supabase'
import useSnackbar from './useSnackbar'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import AsyncStorage from '@react-native-async-storage/async-storage'

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
  const checkEmailExists = async (email) => {
    const sanitizedEmail = sanitizeEmail(email)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_status_id')
        .eq('email', sanitizedEmail)
        .maybeSingle()

      if (error) {
        // Fail closed to avoid leaking existence; surface a general error
        showSnackbar('Email existence check failed:', error)
        return { exists: false, userStatusId: null }
      }
      return { exists: Boolean(data?.id), userStatusId: data?.user_status_id ?? null }
    } catch (e) {
      showSnackbar('Email existence check exception:', e)
      return { exists: false, userStatusId: null }
    }
  }

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

    // Early check: ensure email exists to avoid long timeouts
    const { exists: emailExists, userStatusId } = await checkEmailExists(sanitizedEmail)
    if (!emailExists) {
      return showSnackbar('User does not exist. Please check your email or reach out to the administrators for an account.')
    }
    // Optional: block inactive/suspended users early
    if (userStatusId === 3 || userStatusId === 5) {
      return showSnackbar('Your account is not active. Please contact support.')
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
        showSnackbar('Account Activated, Please login directly or via email otp to confirm your email.', true)
        loginWithOtp(sanitizedEmail)
        return
      }

      if (loginError?.message?.toLowerCase().includes('invalid login credentials')) {
        // We already verified email exists above; this is an incorrect password case
        showSnackbar(`Incorrect password. ${attemptsMessage}`)
        
        // If this was the last attempt, trigger cooldown
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          const currentCooldownData = await AsyncStorage.getItem(cooldownKey)
          const lockoutCount = currentCooldownData ? JSON.parse(currentCooldownData).lockoutCount + 1 : 1
          const cooldownMinutes = Math.min(BASE_COOLDOWN_MINUTES * Math.pow(2, lockoutCount - 1), MAX_COOLDOWN_MINUTES)
          
          await AsyncStorage.setItem(cooldownKey, JSON.stringify({
            timestamp: Date.now(),
            lockoutCount
          }))
          
          showSnackbar(`Too many failed attempts. Please try again in ${cooldownMinutes} minutes.`)
        }
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

    if (navigation) {
      // Navigate to profile completion check instead of directly to target route
      navigation.navigate('ProfileCompletionCheck')
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

    // Early check: ensure email exists to avoid sending OTP to non-existent account
    const { exists: emailExists, userStatusId } = await checkEmailExists(sanitizedEmail)
    if (!emailExists) {
      return showSnackbar('No account found for this email. Please reach out to the administrators for an account.')
    }
    if (userStatusId === 3 || userStatusId === 5) {
      return showSnackbar('Your account is not active. Please contact support.')
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

    // Early check: ensure email exists before sending reset
    const { exists: emailExists } = await checkEmailExists(sanitizedEmail)
    if (!emailExists) {
      return showSnackbar('No account found for this email. Please check the address or reach out to the administrators for an account.')
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

      if (navigation) {
        // Navigate to profile completion check instead of directly to target route
        navigation.navigate('ProfileCompletionCheck')
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

      if (navigation) {
        // Navigate to profile completion check instead of directly to target route
        navigation.navigate('ProfileCompletionCheck')
        onClose?.()
      }

      return true
    } catch (error) {
      console.error('Error in checkSession:', error)
      return false
    }
  }

  return {
    login,
    loginWithOtp,
    resetPassword,
    checkSession,
    SnackbarElement,
  }
}

export default useAuth
