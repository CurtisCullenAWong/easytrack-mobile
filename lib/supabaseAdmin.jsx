import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@env'

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,{
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})