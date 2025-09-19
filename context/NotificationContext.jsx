import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react"
import * as Notifications from "expo-notifications"
import { supabase } from "../lib/supabase"
import {
  registerForPushNotificationsAsync,
  registerPushToken,
} from "../utils/registerForPushNotifications"

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

  const notificationListener = useRef()
  const responseListener = useRef()

  useEffect(() => {
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
        if (user && token) {
          await registerPushToken(user.id, token)
        }

        // listen for notifications
        notificationListener.current =
          Notifications.addNotificationReceivedListener((notification) => {
            console.log("Notification Received:", notification)
            setNotification(notification)
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
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
