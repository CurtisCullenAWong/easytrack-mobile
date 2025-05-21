import { supabase } from '../../lib/supabase'
import useSnackbar from './useSnackbar'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { Platform } from 'react-native'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Initialize WebBrowser for auth
WebBrowser.maybeCompleteAuthSession()

const MAX_LOGIN_ATTEMPTS = 5
const COOLDOWN_MINUTES = 2

const useAuth = (navigation, onClose) => {
  const { showSnackbar, SnackbarElement } = useSnackbar()

  // Get the redirect URL for the current platform
  const getRedirectUrl = () => {
    if (Platform.OS === 'web') {
      return window.location.origin
    }
    return makeRedirectUri({
      scheme: 'easytrack',
      path: 'login'
    })
  }

  // Create session from URL
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

    // Only navigate if navigation is available
    if (navigation) {
      navigation.navigate(targetRoute)
      onClose?.()
    }
    else{
      navigation.navigate('Login')
    }
  }

    // Check if user is in cooldown period
  const checkCooldown = async (email) => {
    const cooldownKey = `cooldown_${email}`
    const cooldownData = await AsyncStorage.getItem(cooldownKey)
    
    if (cooldownData) {
      const { timestamp } = JSON.parse(cooldownData)
      const now = new Date().getTime()
      const cooldownEnd = timestamp + (COOLDOWN_MINUTES * 60 * 1000)
      
      if (now < cooldownEnd) {
        const remainingMinutes = Math.ceil((cooldownEnd - now) / (60 * 1000))
        return {
          inCooldown: true,
          remainingMinutes
        }
      }
      // Clear cooldown if it has expired
      await AsyncStorage.removeItem(cooldownKey)
    }
    return { inCooldown: false }
  }

  // Update login attempts
  const updateLoginAttempts = async (email, isSuccessful) => {
    const attemptsKey = `login_attempts_${email}`
    
    if (isSuccessful) {
      // Reset attempts on successful login
      await AsyncStorage.removeItem(attemptsKey)
      return
    }

    // Get current attempts
    const attemptsData = await AsyncStorage.getItem(attemptsKey)
    const attempts = attemptsData ? JSON.parse(attemptsData).attempts + 1 : 1
    
    // Store updated attempts
    await AsyncStorage.setItem(attemptsKey, JSON.stringify({ attempts }))
    
    // If max attempts reached, set cooldown
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const cooldownKey = `cooldown_${email}`
      await AsyncStorage.setItem(cooldownKey, JSON.stringify({
        timestamp: new Date().getTime()
      }))
    }
    
    return attempts
  }
  
  // Login user
  const login = async ({ email, password }) => {
    if (!email || !password) {
      return showSnackbar('Email and password are required.')
    }

    // Check cooldown period
    const { inCooldown, remainingMinutes } = await checkCooldown(email)
    if (inCooldown) {
      return showSnackbar(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`)
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const attempts = await updateLoginAttempts(email, false)
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts
      
      if (remainingAttempts > 0) {
        return showSnackbar(`Login error: ${error.message}. ${remainingAttempts} attempts remaining.`)
      } else {
        return showSnackbar(`Too many failed attempts. Please try again in ${COOLDOWN_MINUTES} minutes.`)
      }
    }

    // Reset attempts on successful login
    await updateLoginAttempts(email, true)
    handleLogin(data.user)
  }

  // Login with email OTP
  const loginWithOtp = async (email) => {
    if (!email) {
      return showSnackbar('Email is required for OTP login.')
    }
    try {
      const redirectUrl = getRedirectUrl()
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: false, // Only allow existing users to login
        },
      })

      if (error) {
        return showSnackbar(`Error: ${error.message}.`)
      }
      showSnackbar('OTP sent to your email. Please check your inbox.', 'success')
      // Set up URL event listener for OTP response
      const subscription = Linking.addEventListener('url', async ({ url }) => {
        if (url.includes('login')) {
          const session = await createSessionFromUrl(url)
          if (session?.user) {
            await handleLogin(session.user)
          }
        }
      })

      // Cleanup subscription
      return () => {
        subscription.remove()
      }
    } catch (error) {
      showSnackbar('An error occurred while sending OTP. Please try again.')
    }
  }

  // Send password reset email
  const resetPassword = async (email) => {
    if (!email) {
      return showSnackbar('Email is required for password reset.')
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl(),
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
        setTimeout(() => reject(new Error('Session check timeout')), 5000) // 5 second timeout
      })

      const sessionPromise = supabase.auth.getSession()
      const { data } = await Promise.race([sessionPromise, timeoutPromise])
      const session = data?.session
      if (!session) {
        return false
      }

      if (session.user) {
        await handleLogin(session.user)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  return {
    login,
    resetPassword,
    checkSession,
    loginWithOtp,
    SnackbarElement,
  }
}

export default useAuth
