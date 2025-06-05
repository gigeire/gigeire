import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export async function updatePasswordInDatabase(
  password: string
): Promise<{ error?: string; success?: boolean }> {
  'use server'

  // 1) Grab the request-scoped cookies object
  const cookieStore = cookies()
  // 2) Create a Supabase client that will read/write cookies on the server
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // 3) Verify there is an active session (otherwise reset flow failed)
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return { error: 'Session is missing or expired. Please start the password reset flow again.' }
  }

  // 4) Validate the new password length
  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  // 5) Attempt to update the user's password
  const { error: updateError } = await supabase.auth.updateUser({ password })
  if (updateError) {
    return { error: `Password update failed: ${updateError.message}` }
  }

  // 6) Success
  return { success: true }
} 