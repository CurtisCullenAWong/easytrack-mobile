import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://szmquzyhjxjzvlzazyuz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bXF1enloanhqenZsemF6eXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNjI2NzMsImV4cCI6MjA2MTczODY3M30.1ou1FAO_ndGBU5Mrp_zTxr81OyR17Zb5YYI0JpK_7dg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey,{
    auth:{
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})