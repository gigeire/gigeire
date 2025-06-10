'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Session } from '@supabase/supabase-js'

export default function TrackLastLogin({ session }: { session: Session | null }) {
  useEffect(() => {
    if (!session?.user) return

    const supabase = createClientComponentClient()
    supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ error }) => {
        if (error) console.error('Error updating last_login:', error)
      })
  }, [session])

  return null
} 