import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react"
import { AppState, Platform } from 'react-native'
import * as Notifications from "expo-notifications"
import { supabase } from "../lib/supabase"
import {
  registerForPushNotificationsAsync,
  registerPushToken,
} from "../utils/registerForPushNotifications"
import { setNotificationsEnabled } from "../utils/registerForPushNotifications"

const NotificationContext = createContext(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState(null)
  const [notification, setNotification] = useState(null)
  const [error, setError] = useState(null)
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false)

  const notificationListener = useRef()
  const responseListener = useRef()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        setIsUserLoggedIn(!!session?.user)
      }
    )

    // Check initial auth state
    const checkInitialAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsUserLoggedIn(!!user)
    }
    checkInitialAuth()

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isUserLoggedIn) {
      console.log('User not logged in, skipping notification setup')
      return
    }

    let isMounted = true

    const setup = async () => {
      try {
        const token = await registerForPushNotificationsAsync()
        if (!isMounted) return
        setExpoPushToken(token)

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        let tokenExists = false
        if (user && token) {
          await registerPushToken(user.id, token)

          // verify token exists in expo_push_tokens table before listening
          const { data: tokens, error: tokenErr } = await supabase
            .from("expo_push_tokens")
            .select("token")
            .eq("token", token)
            .limit(1)

          if (tokenErr) {
            throw tokenErr
          }

          tokenExists = Array.isArray(tokens) && tokens.length > 0
        }

        if (tokenExists) {
          // enable showing/handling notifications
          try {
            setNotificationsEnabled(true)
          } catch (e) {
            console.warn('Failed to enable notifications', e)
          }

          // listen for notifications
          notificationListener.current =
            Notifications.addNotificationReceivedListener(async (notification) => {
              setNotification(notification)
              // clear delivered notifications and badge when app is open
              try {
                await Notifications.dismissAllNotificationsAsync()
                if (Platform.OS !== 'android') {
                  // setBadgeCountAsync is a no-op on Android, but safe to call elsewhere
                  await Notifications.setBadgeCountAsync(0)
                }
              } catch (e) {
                console.warn('Failed to clear notifications on receive', e)
              }
            })

          responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
              console.log(
                "Notification Response:",
                JSON.stringify(response, null, 2),
                JSON.stringify(
                  response.notification.request.content.data,
                  null,
                  2
                )
              )
            })

          // clear notifications when app becomes active
          let appState = AppState.currentState
          const handleAppStateChange = async (nextAppState) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
              try {
                await Notifications.dismissAllNotificationsAsync()
                if (Platform.OS !== 'android') {
                  await Notifications.setBadgeCountAsync(0)
                }
              } catch (e) {
                console.warn('Failed to clear notifications on app active', e)
              }
            }
            appState = nextAppState
          }
          AppState.addEventListener('change', handleAppStateChange)
        } else {
          console.log(
            "Push token not found in expo_push_tokens table; skipping notification listeners"
          )
          // ensure notifications are disabled
          try {
            setNotificationsEnabled(false)
          } catch (e) {
            console.warn('Failed to disable notifications', e)
          }
        }
      } catch (err) {
        console.error("Notification setup failed:", err)
        if (isMounted) setError(err)
      }
    }

    setup()

    return () => {
      isMounted = false
      if (notificationListener.current) {
        notificationListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
      // disable notifications when provider unmounts
      try {
        setNotificationsEnabled(false)
      } catch (e) {
        console.warn('Failed to disable notifications on cleanup', e)
      }
    }
  }, [isUserLoggedIn])

  // No explicit unregister function. When the user is not logged in we simply skip setting up listeners.
  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  )
}