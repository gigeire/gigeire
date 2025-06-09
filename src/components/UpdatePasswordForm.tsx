'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UpdatePasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const token = searchParams.get('token');
    const email = searchParams.get('email'); // Email is required for recovery verification

    if (!token || !email) {
      setError("Invalid password reset link. It might have expired.");
      setLoading(false);
      return;
    }
    
    const supabase = createClientComponentClient();

    // Step 1: Verify the OTP (the token from the email link)
    const { error: otpError } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token,
      email,
    });

    if (otpError) {
      setError(`Error verifying reset token: ${otpError.message}`);
      setLoading(false);
      return;
    }

    // Step 2: Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(`Failed to update password: ${updateError.message}`);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        {!success ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Set a New Password</h1>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
              )}
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-blue-400"
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-green-600">Password Updated!</h1>
            <p className="text-gray-700 mb-6">Your password has been changed successfully.</p>
            <button 
              onClick={() => router.replace('/auth')}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 