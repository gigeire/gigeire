import { createClient } from '@supabase/supabase-js'

// IMPORTANT: This file should not be used in the browser. It is for server-side use only.
// It requires the SUPABASE_SERVICE_ROLE_KEY environment variable to be set.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing from environment variables.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}); 