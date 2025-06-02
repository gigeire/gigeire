import { createServiceClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Get the current user from the session cookie
    const cookieStore = cookies()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      console.error('Error getting session:', sessionError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the user's subscription plan using service role
    const { data, error } = await supabase
      .from('users')
      .select('subscription_plan')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('Error fetching subscription plan:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Subscription plan data:', data)
    return NextResponse.json({ subscriptionPlan: data.subscription_plan })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 