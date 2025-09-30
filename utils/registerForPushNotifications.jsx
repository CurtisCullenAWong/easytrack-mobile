import { Platform } from "react-native"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { supabase } from "../lib/supabase"

let _notificationsEnabled = true

export function setNotificationsEnabled(enabled) {
  _notificationsEnabled = !!enabled
}

export function getNotificationsEnabled() {
  return _notificationsEnabled
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: _notificationsEnabled,
    shouldSetBadge: _notificationsEnabled,
    shouldShowBanner: _notificationsEnabled,
    shouldShowList: _notificationsEnabled,
  }),
})

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
    console.warn("Running on an emulator. Push notifications are disabled.")
    return null
  }
}

export async function sendNotificationAdmin(title, body, data = {}) {
  const { data: users, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role_id", 1)

  if (userError) {
    console.error("Error fetching users:", userError)
    return
  }

  if (!users || users.length === 0) {
    return
  }

  for (let user of users) {
    const { data: tokens, error: tokenError } = await supabase
      .from("expo_push_tokens")
      .select("token")
      .eq("user_id", user.id)

    if (tokenError) {
      console.error("Error fetching tokens for user", user.id, tokenError)
      continue
    }

    if (!tokens || tokens.length === 0) {
      continue
    }

    // 3. Send 1 notification per token
    for (let t of tokens) {
      try {
        await sendPushNotification(t.token, title, body, data)
      } catch (e) {
        console.error("Failed to send notification to", t.token, e)
      }
    }
  }
}

export async function sendNotificationToUsers(userIds, title, body, data = {}) {
  // Accept a single id or an array. Normalize and dedupe.
  if (!userIds) return
  const ids = Array.isArray(userIds) ? userIds.slice() : [userIds]
  // remove falsy
  const cleaned = ids.filter((v) => v !== null && v !== undefined)
  if (cleaned.length === 0) return

  // dedupe preserving only string values
  const deduped = Array.from(new Set(cleaned.map((v) => String(v))))

  // Validate UUID format to avoid passing invalid values to Postgres (22P02)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const validIds = deduped.filter((id) => uuidRegex.test(id))

  if (validIds.length === 0) {
    console.warn('sendNotificationToUsers: no valid UUID user ids provided, skipping')
    return
  }

  try {
    // Fetch tokens for all user_ids in one query
    const { data: tokensRows, error } = await supabase
      .from('expo_push_tokens')
      .select('token, user_id')
      .in('user_id', validIds)

    if (error) {
      console.error('Error fetching tokens in bulk:', error)
      return
    }

    if (!tokensRows || tokensRows.length === 0) return

    // Group tokens by user_id
    const tokensByUser = tokensRows.reduce((acc, row) => {
      const key = String(row.user_id)
      if (!acc[key]) acc[key] = []
      if (row.token) acc[key].push(row.token)
      return acc
    }, {})

    // Send only one notification per user (use the first token)
    for (let userId of validIds) {
      const userTokens = tokensByUser[String(userId)] || []
      if (userTokens.length === 0) continue
      const tokenToSend = userTokens[0]
      try {
        await sendPushNotification(tokenToSend, title, body, data)
      } catch (e) {
        console.error('Failed to send notification to user', userId, e)
      }
    }
  } catch (e) {
    console.error('sendNotificationToUsers failed:', e)
  }
}

export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  }

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
}

export async function registerPushToken(userId, token) {
  const deviceId = Device.osBuildId ?? "unknown-device"
  
  const { error } = await supabase
    .from("expo_push_tokens")
    .upsert(
      {
        user_id: userId,
        device_id: deviceId,
        token,
      },
      {
        onConflict: "user_id,device_id"
      }
    )

  if (error) {
    console.error("Error saving token:", error)
  } else {
    console.log("Push token registered successfully for user:", userId)
  }
}

export async function unregisterPushToken(userId) {
  try {
    const deviceId = Device.osBuildId ?? "unknown-device"
    const { error } = await supabase
      .from('expo_push_tokens')
      .delete()
      .match({ user_id: userId, device_id: deviceId })

    if (error) {
      console.error('Error deleting push token:', error)
    } else {
      console.log('Push token unregistered for user:', userId)
    }
  } catch (e) {
    console.error('unregisterPushToken failed:', e)
  }
}
