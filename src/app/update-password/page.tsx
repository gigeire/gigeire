import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import UpdatePasswordClientForm from '../../components/UpdatePasswordClientForm';

export const dynamic = 'force-dynamic';

// Server Action (must be exported for client import)
export async function updatePasswordInDatabase(password: string): Promise<{ error?: string; success?: boolean }> {
  'use server';
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Confirm session is present
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return { error: 'Your session expired or is invalid. Please try resetting your password again.' };
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: `Password update failed: ${updateError.message}` };
  }

  return { success: true };
}

// Server Component
export default async function UpdatePasswordPage({ searchParams }: { searchParams: { code?: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { code } = searchParams;

  let pageError: string | null = null;
  let showForm = false;

  if (!code) {
    pageError = 'Invalid or missing password reset code. Please use the link from your email.';
  } else {
    // Exchange code for session and set cookies
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      pageError = `Failed to validate reset link: ${exchangeError.message}`;
    } else {
      // Confirm session is present after exchange
      const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
      if (getSessionError || !session) {
        pageError = 'Your session could not be established or has expired. Please request a new reset link.';
      } else {
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
            {pageError || 'An unexpected error occurred.'}
          </p>
        </div>
      )}
    </div>
  );
} 