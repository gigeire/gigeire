'use server'

import { createClient } from '@/utils/supabase/server'

export async function ensureUserExists() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('ensureUserExists called without an authenticated user.', authError)
    return { error: { message: 'Not authenticated' } }
  }

  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  // 'PGRST116' means no rows found, which is not an error in this case.
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking if user exists:', checkError)
    return { error: checkError }
  }

  if (!existingUser) {
    console.log(`User ${user.id} (${user.email}) not found in public.users. Creating entry...`)
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      created_at: new Date().toISOString(),
    })
    if (insertError) {
      console.error('Failed to insert user row:', insertError)
      return { error: insertError }
    } else {
      console.log(`User ${user.id} created successfully.`)
    }
  }

  return { data: { id: user.id } }
} 