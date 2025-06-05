'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePasswordInDatabase } from '../app/update-password/actions';

export default function UpdatePasswordClientForm() {
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ error?: string; success?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    // Call our server action, which runs on the server, passing the new password
    const result = await updatePasswordInDatabase(password);
    setFeedback(result);
    setLoading(false);

    if (result.success) {
      // Immediately redirect to /dashboard on success
      router.replace('/dashboard');
    }
  }

  return (
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
      {feedback?.error && <p className="text-red-600 text-sm mb-2 text-center">{feedback.error}</p>}
      {feedback?.success && <p className="text-green-600 text-sm mb-2 text-center">Password updated successfully.</p>}
    </form>
  );
} 