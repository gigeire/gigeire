"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpdatePasswordInner />
    </Suspense>
  );
}

function UpdatePasswordInner() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    async function restoreSession() {
      if (!code) {
        setError('Invalid or missing code.');
        setSessionStatus('error');
        console.error('No code param found in URL.');
        return;
      }
      setSessionStatus('loading');
      try {
        await supabase.auth.exchangeCodeForSession(code);
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) {
          setError('Could not restore session. Please try resetting your password again.');
          setSessionStatus('error');
          console.error('Session not established after code exchange:', { sessionError, data });
        } else {
          setSessionStatus('ready');
          console.log('Session established:', data.session);
        }
      } catch (err) {
        setError('Invalid or expired code.');
        setSessionStatus('error');
        console.error('Code exchange failed:', err);
      }
    }
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError(null);
    try {
      // Confirm session is still present before updating password
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        setError('Could not restore session. Please try resetting your password again.');
        setSessionStatus('error');
        console.error('Session missing at submit:', { sessionError, data });
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        console.error('Password update failed:', updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.replace('/dashboard'), 1000);
      }
    } catch (err) {
      setError('Unexpected error. Please try again.');
      setSessionStatus('error');
      console.error('Unexpected error during password update:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 rounded shadow max-w-sm w-full">
        <h1 className="text-xl font-bold mb-4 text-center">Set a new password</h1>
        {sessionStatus === 'loading' && (
          <div className="text-center text-gray-500">Validating your link...</div>
        )}
        {sessionStatus === 'error' && (
          <p className="text-red-600 text-sm mb-2 text-center">{error || 'Could not validate your reset link.'}</p>
        )}
        {sessionStatus === 'ready' && !success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded p-2"
            />
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition"
            >
              Update password
            </button>
          </form>
        )}
        {success && (
          <p className="text-green-600 text-sm mb-2 text-center">Password updated! Redirecting...</p>
        )}
      </div>
    </div>
  );
} 