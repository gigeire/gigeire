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

  // Create a Supabase client for the browser
  const supabase = createClientComponentClient()

  // On first render, parse the URL for access_token or error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const at = params.get('access_token')
    const errorDescription = params.get('error_description')

    if (errorDescription) {
      // Supabase gave us a link error; show it immediately
      setFeedback({ error: `Failed to validate reset link: ${errorDescription}` })
      return
    }

    if (!at) {
      // No token at all—link is invalid
      setFeedback({ error: 'Invalid or missing access token. Please request a new reset link.' })
      return
    }

    // We have a valid access_token—set it on Supabase client so updateUser works
    supabase.auth
      .setSession({ access_token: at, refresh_token: '' })
      .then(({ error }) => {
        if (error) {
          setFeedback({ error: `Failed to set session: ${error.message}` })
        } else {
          setAccessToken(at)
        }
      })
  }, [supabase])

  // Form submission: call updateUser({ password }) in the browser
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    // updateUser requires that a valid session is set (we just did setSession above)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setFeedback({ error: `Password update failed: ${error.message}` })
    } else {
      setFeedback({ success: true })
      // Immediately send them to /dashboard
      router.replace('/dashboard')
    }

    setLoading(false)
  }

  // If we've already seen an error, show the error UI
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

  // While we haven't yet set the token (or are waiting), show "Loading…"
  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  // If we have a valid accessToken (session is set), render the form
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