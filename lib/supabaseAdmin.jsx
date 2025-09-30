import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from "expo-constants";
const { EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Constants.expoConfig.extra

export const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})