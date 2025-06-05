'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [code, setCode] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<{ error?: string; success?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  // 1) Create the Supabase client for the browser
  const supabase = createClientComponentClient()

  // 2) On mount, read “code” from the URL and verify it via verifyOtp
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code') // numeric OTP
    const errorDescription = params.get('error_description')

    if (errorDescription) {
      // Supabase sent an error in the URL (e.g. expired link)
      setFeedback({ error: `Failed to validate reset link: ${errorDescription}` })
      return
    }

    if (!codeParam) {
      // No “code” param at all
      setFeedback({ error: 'Invalid or missing code. Please request a new reset link.' })
      return
    }

    // 2a) We have a numeric OTP—use verifyOtp to redeem it for a session
    supabase.auth
      .verifyOtp({ type: 'recovery', token: codeParam })
      .then(({ data, error }) => {
        if (error || !data.session) {
          setFeedback({ error: `Failed to verify code: ${error?.message}` })
        } else {
          // Session is now set in-memory; we can show the form
          setCode(codeParam)
          setSessionReady(true)
        }
      })
  }, [supabase])

  // 3) On form submit, call updateUser({ password })
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setFeedback({ error: `Password update failed: ${error.message}` })
    } else {
      setFeedback({ success: true })
      router.replace('/dashboard')
    }

    setLoading(false)
  }

  // 4) If there’s already an error (either missing code or verifyOtp failed), show it
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

  // 5) While verifyOtp is in flight (sessionReady is false), show a “Loading…” state
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  // 6) We have a valid session; render the password reset form
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