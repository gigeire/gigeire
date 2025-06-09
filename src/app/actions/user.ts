'use server'

import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

async function reportToMonitoring(event: string, details: object) {
  const monitoringUrl = process.env.NEXT_PUBLIC_MONITORING_URL;
  if (!monitoringUrl) return;

  try {
    await fetch(monitoringUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...details })
    });
  } catch (e) {
    console.error('Failed to report to monitoring service:', e);
  }
}

export async function ensureUserExists() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('ensureUserExists called without an authenticated user.', authError)
    await reportToMonitoring('ensureUserExists_auth_error', { error: authError?.message })
    return { error: { message: 'Not authenticated' } }
  }

  const { data: existingUser, error: checkError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  // 'PGRST116' means no rows found, which is not an error in this case.
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking if user exists:', checkError)
    await reportToMonitoring('ensureUserExists_check_error', { userId: user.id, error: checkError.message })
    return { error: checkError }
  }

  if (!existingUser) {
    console.log(`User ${user.id} (${user.email}) not found in public.users. Creating entry...`)
    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: user.id,
      email: user.email,
    })
    if (insertError) {
      console.error(`Failed to insert user row for user ${user.id} (${user.email}):`, insertError)
      await reportToMonitoring('ensureUserExists_insert_error', { userId: user.id, email: user.email, error: insertError.message })
      return { error: insertError }
    } else {
      console.log(`User ${user.id} created successfully.`)
      await reportToMonitoring('ensureUserExists_user_created', { userId: user.id, email: user.email })
    }
  }

  return { data: { id: user.id } }
} 