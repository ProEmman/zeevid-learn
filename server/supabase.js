import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}