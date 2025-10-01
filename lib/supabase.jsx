import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { resolveExtra } from './env'
const extra = resolveExtra()

const SUPABASE_URL = extra?.SUPABASE_URL
const SUPABASE_ANON_KEY = extra?.SUPABASE_ANON_KEY

if (!SUPABASE_URL) {
  throw new Error('Missing Supabase url')
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase anon key')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})