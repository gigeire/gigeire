// src/app/update-password/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [code, setCode] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<{ error?: string; success?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  // 1) Create Supabase client in the browser
  const supabase = createClientComponentClient()

  // 2) On mount, extract "code" from URL (or show an early error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code')      // Supabase sends ?code=<GUID>
    const errorDescription = params.get('error_description')

    if (errorDescription) {
      // Supabase redirected back with an error (e.g. expired or invalid link)
      setFeedback({ error: `Failed to validate reset link: ${errorDescription}` })
      return
    }

    if (!codeParam) {
      // No "code" at all ⇒ show “Invalid or missing code.”
      setFeedback({ error: 'Invalid or missing code. Please request a new reset link.' })
      return
    }

    // We got a valid GUID from the URL
    setCode(codeParam)
  }, [])

  // 3) When the user submits, call verifyOtp({ type: 'recovery', token: code, newPassword: password })
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    if (!code) {
      setFeedback({ error: 'No code available. Please request a new reset link.' })
      setLoading(false)
      return
    }

    // This single call both verifies the recovery code and sets the new password
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token: code,
      newPassword: password,
    })

    if (error) {
      setFeedback({ error: `Password update failed: ${error.message}` })
    } else {
      // On success, Supabase logs the user in (session is set) automatically
      setFeedback({ success: true })
      router.replace('/dashboard')
    }

    setLoading(false)
  }

  // 4) If we already know an early error (missing code, expired, etc.), show it
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

  // 5) If code is present (valid GUID), render the password form
  if (code) {
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
            <p className="text-green-600 text-sm mb-2 text-center">
              Password updated successfully.
            </p>
          )}
        </form>
      </div>
    )
  }

  // 6) If code is still null (waiting for useEffect), show a loading screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
        <p>Loading…</p>
      </div>
    </div>
  )
}