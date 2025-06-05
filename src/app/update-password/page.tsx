import { cookies } from 'next/headers';
import { createServerComponentClient, createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation'; // For potential future server-side redirects

// React specific imports, to be used by the Client Component
import React, { useState, useEffect } from 'react'; 
// useRouter for client-side navigation, useSearchParams for client component if needed (not primary here)
import { useRouter } from 'next/navigation'; 

// SERVER ACTION
async function updatePasswordInDatabase(password: string): Promise<{ error?: string; success?: boolean }> {
  'use server';

  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  console.log('Server Action: Attempting to update password.');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error('Server Action: Session missing or error before password update.', { sessionError, userId: session?.user?.id });
    return { error: 'Your session expired or is invalid. Please try resetting your password again.' };
  }

  if (!password || password.length < 6) { // Basic validation
      console.warn('Server Action: Password validation failed (length < 6).');
      return { error: 'Password must be at least 6 characters long.' };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    console.error('Server Action: Password update failed:', updateError.message);
    return { error: `Password update failed: ${updateError.message}` };
  }

  console.log('Server Action: Password updated successfully for user:', session.user.id);
  return { success: true };
}

// CLIENT COMPONENT FOR THE FORM
// This component will be rendered by the Server Component if the session is established.
function UpdatePasswordClientForm() {
  'use client';

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

// SERVER COMPONENT (MAIN PAGE)
export default async function UpdatePasswordPage({ searchParams }: { searchParams: { code?: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { code } = searchParams;

  let pageError: string | null = null;
  let showForm = false;

  console.log('Server Page: Received request for /update-password.', { codeExists: !!code });

  if (!code) {
    pageError = 'Invalid or missing password reset code. Please use the link from your email.';
    console.warn('Server Page: Code is missing from searchParams.');
  } else {
    console.log(`Server Page: Attempting to exchange code: ${code}`);
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error(`Server Page: Code exchange failed for code ${code}:`, exchangeError.message);
      pageError = `Failed to validate your reset link. It might be expired or invalid. Please try requesting a new one. (Details: ${exchangeError.message})`;
    } else {
      console.log(`Server Page: Code exchange successful for ${code}. Verifying session...`);
      const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

      if (getSessionError) {
        console.error(`Server Page: getSession failed after exchange for ${code}:`, getSessionError.message);
        pageError = `Could not retrieve session information after validating the link. Please try again. (Details: ${getSessionError.message})`;
      } else if (!session) {
        console.warn(`Server Page: Session is null after successful code exchange for ${code}. This usually means the code was already used or expired.`);
        pageError = 'Your session could not be established. The link might have been used or has expired. Please try resetting your password again.';
      } else {
        console.log(`Server Page: Session successfully established for user ${session.user.id}. Ready to show form.`);
        showForm = true;
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {showForm ? (
        <UpdatePasswordClientForm />
      ) : (
        <div className="bg-white p-6 rounded shadow max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4 text-center">Set a new password</h1>
          <p className="text-red-600 text-sm mb-2 text-center">
            {pageError || 'An unexpected error occurred. Please try resetting your password again.'}
          </p>
        </div>
      )}
    </div>
  );
} 