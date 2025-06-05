'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<{ error?: string; success?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  // 1) Create a Supabase client in the browser
  const supabase = createClientComponentClient()

  // 2) On mount, parse “access_token” or “error_description” from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('access_token')
    const errorDescription = params.get('error_description')

    if (errorDescription) {
      // Supabase appended an error (e.g. expired link)
      setFeedback({ error: `Failed to validate reset link: ${errorDescription}` })
      return
    }

    if (!token) {
      // No token present—link was wrong or clicked manually
      setFeedback({ error: 'Invalid or missing access token. Please request a new reset link.' })
      return
    }

    // We have a full JWT—set it in Supabase so updateUser() will work
    supabase.auth
      .setSession({ access_token: token, refresh_token: '' })
      .then(({ error }) => {
        if (error) {
          setFeedback({ error: `Failed to set session: ${error.message}` })
        } else {
          setAccessToken(token)
        }
      })
  }, [supabase])

  // 3) On form submit, call updateUser({ password })
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    if (!accessToken) {
      setFeedback({ error: 'No access token set. Please try again.' })
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setFeedback({ error: `Password update failed: ${error.message}` })
    } else {
      setFeedback({ success: true })
      router.replace('/dashboard')
    }

    setLoading(false)
  }

  // 4) If an error already exists (invalid link, expired, etc.), show it
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

  // 5) While setSession() is pending (accessToken still null), show “Loading…”
  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  // 6) accessToken is set—render the password form
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