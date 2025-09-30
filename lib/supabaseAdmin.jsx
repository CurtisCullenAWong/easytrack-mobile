import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { resolveExtra } from './env'
const extra = resolveExtra()

const SUPABASE_URL = extra?.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
// Service role key must never be public; only read from private config
const SUPABASE_SERVICE_ROLE_KEY = extra?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('Missing Supabase url')
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase service role key')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})