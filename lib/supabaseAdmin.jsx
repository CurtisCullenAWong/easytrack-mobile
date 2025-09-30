import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from "expo-constants";
const { EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Constants.expoConfig.extra

if (!EXPO_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars. Check EAS secrets and app.config.js")
}

export const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})