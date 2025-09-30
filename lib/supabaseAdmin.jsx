import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from "expo-constants";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Constants.expoConfig.extra
if (!SUPABASE_URL) {
  throw new Error("Missing Supabase url");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase anon key");
}
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})