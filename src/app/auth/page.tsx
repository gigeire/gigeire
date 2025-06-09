import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AuthForm from './AuthForm'

export default async function AuthPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return <AuthForm />
}