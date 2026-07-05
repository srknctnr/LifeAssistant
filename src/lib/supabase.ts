import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase yapılandırması eksik: .env.local dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı olmalı (bkz. .env.example)',
  )
}

// TODO: şema onaylanıp migration'lar uygulandıktan sonra
// `supabase gen types typescript` çıktısıyla createClient<Database> olarak tiple
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
