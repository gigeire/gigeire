import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AuthCallback({ searchParams }: { searchParams: { redirectTo?: string } }) {
  const supabase = createClient()
  await supabase.auth.getSession()

  const target = searchParams.redirectTo || '/dashboard'
  redirect(target)
} 