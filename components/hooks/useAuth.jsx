import { supabase } from '../../lib/supabase'
import useSnackbar from './useSnackbar'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { Platform } from 'react-native'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Constants
const MAX_LOGIN_ATTEMPTS = 5
const COOLDOWN_MINUTES = 2

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

const useAuth = (navigation, onClose) => {
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

  const checkCooldown = async (email) => {
    try {
      const cooldownKey = `cooldown_${email}`
      const cooldownData = await AsyncStorage.getItem(cooldownKey)
      
      if (!cooldownData) {
        return { inCooldown: false }
      }

      const { timestamp } = JSON.parse(cooldownData)
      const currentTime = Date.now()
      const cooldownEndTime = timestamp + (COOLDOWN_MINUTES * 60 * 1000)
      
      if (currentTime < cooldownEndTime) {
        const remainingMilliseconds = cooldownEndTime - currentTime
        const remainingMinutes = Math.ceil(remainingMilliseconds / (60 * 1000))
        return { 
          inCooldown: true, 
          remainingMinutes,
          cooldownEndTime: new Date(cooldownEndTime).toISOString()
        }
      }

      // Clear expired cooldown
      await AsyncStorage.removeItem(cooldownKey)
      return { inCooldown: false }
    } catch (error) {
      console.error('Error checking cooldown:', error)
      // In case of error, don't block the user
      return { inCooldown: false }
    }
  }

  const updateLoginAttempts = async (email, isSuccessful) => {
    const attemptsKey = `login_attempts_${email}`
    
    if (isSuccessful) {
      await AsyncStorage.removeItem(attemptsKey)
      return
    }

    const attemptsData = await AsyncStorage.getItem(attemptsKey)
    const attempts = attemptsData ? JSON.parse(attemptsData).attempts + 1 : 1
    
    await AsyncStorage.setItem(attemptsKey, JSON.stringify({ attempts }))
    
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const cooldownKey = `cooldown_${email}`
      await AsyncStorage.setItem(cooldownKey, JSON.stringify({
        timestamp: new Date().getTime()
      }))
    }
    
    return attempts
  }

  // ===== User Authentication =====
  const handleLogin = async (user) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role_id, user_status_id')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
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
  }

  const login = async ({ email, password }) => {
    if (!email || !password) {
      return showSnackbar('Email and password are required.')
    }

    const sanitizedEmail = sanitizeEmail(email)
    if (!validateEmail(sanitizedEmail)) {
      return showSnackbar('Please enter a valid email address.')
    }

    const { inCooldown, remainingMinutes } = await checkCooldown(sanitizedEmail)
    if (inCooldown) {
      return showSnackbar(`Too many failed attempts. Please try again in ${remainingMinutes} minute/s.`)
    }

    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: sanitizedEmail, 
      password
    })

    if (error) {
      const attempts = await updateLoginAttempts(sanitizedEmail, false)
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts
      
      if (remainingAttempts > 0) {
        return showSnackbar(`Login error: ${error.message}. ${remainingAttempts} attempts remaining.`)
      } else {
        return showSnackbar(`Too many failed attempts. Please try again in ${COOLDOWN_MINUTES} minute/s.`)
      }
    }

    await updateLoginAttempts(sanitizedEmail, true)
    handleLogin(data.user)
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

      showSnackbar('OTP sent to your email. Please check your inbox.', 'success')
      
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

    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      emailRedirectTo: getRedirectUrl(),
    })

    if (error) {
      return showSnackbar(`Error: ${error.message}`)
    }

    showSnackbar('Password reset email sent.', true)
  }

  const checkSession = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 5000)
      })

      const sessionPromise = supabase.auth.getSession()
      const { data } = await Promise.race([sessionPromise, timeoutPromise])
      const session = data?.session

      if (!session) return false
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
