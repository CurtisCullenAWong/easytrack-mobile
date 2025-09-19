import { Platform } from "react-native"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { supabase } from "../lib/supabase"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function sendNotificationToUser(userId, title, body, data = {}) {
  const { data: tokens, error } = await supabase
    .from("expo_push_tokens")
    .select("token")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching tokens:", error)
    return
  }

  if (!tokens || tokens.length === 0) {
    console.log("No push tokens found for user:", userId)
    return
  }

  for (let t of tokens) {
    await sendPushNotification(t.token, title, body, data)
  }
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    })
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== "granted") {
      throw new Error("Permission not granted for push notifications")
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId
    if (!projectId) throw new Error("Project ID not found")

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    return token
  } else {
    throw new Error("Must use physical device for push notifications")
  }
}

export async function registerPushToken(userId, token) {
  const { error } = await supabase.from("expo_push_tokens").upsert({
    user_id: userId,
    device_id: Device.osBuildId ?? "unknown-device",
    token,
  })

  if (error) console.error("Error saving token:", error)
}