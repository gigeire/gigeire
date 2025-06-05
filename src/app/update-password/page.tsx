"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function UpdatePasswordPage() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch((err) => {
        console.error('Error exchanging code:', err);
        setError('Invalid or expired link.');
      });
    } else {
      setError('Invalid or missing code.');
    }
  }, [searchParams, supabase]);

  const handleUpdatePassword = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      router.replace('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-xl font-semibold text-center mb-4">Set a new password</h1>
        <input
          type="password"
          placeholder="New password"
          className="w-full border rounded px-3 py-2 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <button
          onClick={handleUpdatePassword}
          disabled={loading || !password}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </div>
    </div>
  );
} 