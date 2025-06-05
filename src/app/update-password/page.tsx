'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<{ error?: string; success?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  // 1) Create a Supabase client in the browser
  const supabase = createClientComponentClient()

  // 2) On mount, read "access_token" (the numeric code) from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('access_token')

    if (!token) {
      setFeedback({ error: 'Invalid or missing access token. Please request a new reset link.' })
      return
    }

    // That numeric code is our recoveryToken
    setRecoveryToken(token)
  }, [])

  // 3) When the form is submitted, call updateUser directly with the recoveryToken
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    // Send the new password + recovery token to Supabase
    const { error } = await supabase.auth.updateUser(
      { password },
      { accessToken: recoveryToken! } as any
    )

    if (error) {
      setFeedback({ error: `Password update failed: ${error.message}` })
    } else {
      setFeedback({ success: true })
      router.replace('/dashboard')
    }

    setLoading(false)
  }

  // 4) If there's already an error (e.g. no token), show it
  if (feedback?.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-6 rounded shadow max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4 text-center">Set a new password</h1>
          <p className="text-red-600 text-sm mb-2 text-center">{feedback.error}</p>
        </div>
      </div>
    )
  }

  // 5) While we're waiting for the token to be parsed, show a loading state
  if (!recoveryToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  // 6) We have a valid recoveryToken, so show the form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow max-w-sm w-full">
        <h1 className="text-xl font-bold mb-4 text-center">Set a new password</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          required
          minLength={6}
          className="w-full border border-gray-300 rounded p-2 mb-4"
          disabled={loading}
        />
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
          disabled={loading || !password}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
        {feedback?.success && (
          <p className="text-green-600 text-sm mb-2 text-center">Password updated successfully.</p>
        )}
      </form>
    </div>
  )
} 