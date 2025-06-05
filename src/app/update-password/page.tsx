'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [code, setCode] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<{ error?: string; success?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [needsEmail, setNeedsEmail] = useState(false)

  // Create Supabase client in browser
  const supabase = createClientComponentClient()

  // On mount, parse "code" from URL or show early error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code')
    const errorDescription = params.get('error_description')
    
    // Check if email is passed in URL params (optional enhancement)
    const emailParam = params.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }

    if (errorDescription) {
      setFeedback({ error: `Failed to validate reset link: ${errorDescription}` })
      return
    }

    if (!codeParam) {
      setFeedback({ error: 'Invalid or missing code. Please request a new reset link.' })
      return
    }

    setCode(codeParam)
    
    // If no email was provided in URL, we'll need to ask for it
    if (!emailParam) {
      setNeedsEmail(true)
    }
  }, [])

  // Handle email verification step
  async function onVerifyEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setFeedback({ error: 'Please enter your email address.' })
      return
    }
    setNeedsEmail(false)
    setFeedback(null)
  }

  // Handle password update
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    if (!code) {
      setFeedback({ error: 'No code available. Please request a new reset link.' })
      setLoading(false)
      return
    }

    if (!email.trim()) {
      setFeedback({ error: 'Email address is required.' })
      setLoading(false)
      return
    }

    try {
      // The key fix: include email with type: 'recovery'
      const { data, error } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token: code,
        email: email.trim(),
        options: {
          password: password
        }
      })

      if (error) {
        setFeedback({ error: `Password update failed: ${error.message}` })
      } else {
        setFeedback({ success: true })
        // Small delay to show success message before redirect
        setTimeout(() => {
          router.replace('/dashboard')
        }, 1500)
      }
    } catch (err) {
      setFeedback({ error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }

    setLoading(false)
  }

  // Early error UI
  if (feedback?.error && !code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-6 rounded shadow max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4 text-center">Set a new password</h1>
          <p className="text-red-600 text-sm mb-4 text-center">{feedback.error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  // Email verification step (if email wasn't in URL)
  if (needsEmail && code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <form onSubmit={onVerifyEmail} className="bg-white p-6 rounded shadow max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4 text-center">Verify Your Email</h1>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Please enter the email address associated with your account to proceed with password reset.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full border border-gray-300 rounded p-2 mb-4"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition"
          >
            Continue
          </button>
          {feedback?.error && (
            <p className="text-red-600 text-sm mt-2 text-center">{feedback.error}</p>
          )}
        </form>
      </div>
    )
  }

  // Password reset form (main form)
  if (code && !needsEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4 text-center">Set a new password</h1>
          
          {/* Show email being used */}
          <p className="text-sm text-gray-600 mb-4 text-center">
            Resetting password for: <strong>{email}</strong>
          </p>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            minLength={6}
            className="w-full border border-gray-300 rounded p-2 mb-4"
            disabled={loading}
            autoFocus
          />
          
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
            disabled={loading || !password}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
          
          {feedback?.error && (
            <p className="text-red-600 text-sm mt-2 text-center">{feedback.error}</p>
          )}
          
          {feedback?.success && (
            <p className="text-green-600 text-sm mt-2 text-center">
              Password updated successfully! Redirecting...
            </p>
          )}
          
          <button
            type="button"
            onClick={() => setNeedsEmail(true)}
            className="w-full mt-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            Wrong email? Click to change
          </button>
        </form>
      </div>
    )
  }

  // Initial loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
        <p>Loading…</p>
      </div>
    </div>
  )
}