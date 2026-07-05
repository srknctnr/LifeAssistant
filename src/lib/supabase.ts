import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase yapılandırması eksik: .env.local dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı olmalı (bkz. .env.example)',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
