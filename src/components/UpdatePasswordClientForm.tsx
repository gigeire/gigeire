'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePasswordInDatabase } from '../app/update-password/page'; // Adjust path as needed based on actual file structure

export default function UpdatePasswordClientForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!password) {
      setError('Password cannot be empty.');
      setLoading(false);
      return;
    }

    console.log('Client Form: Submitting password for update.');
    const result = await updatePasswordInDatabase(password);

    if (result.error) {
      console.error('Client Form: Received error from server action:', result.error);
      setError(result.error);
    } else if (result.success) {
      console.log('Client Form: Password update successful. Redirecting...');
      setSuccessMessage('Password updated successfully! Redirecting to dashboard...');
      setTimeout(() => {
        router.replace('/dashboard');
      }, 2000); // Delay for user to see success message
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow max-w-sm w-full">
      <h1 className="text-xl font-bold mb-4 text-center">Set a new password</h1>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className="w-full border border-gray-300 rounded p-2 mb-4"
        disabled={loading}
      />
      {error && <p className="text-red-600 text-sm mb-2 text-center">{error}</p>}
      {successMessage && <p className="text-green-600 text-sm mb-2 text-center">{successMessage}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
} 