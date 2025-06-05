import { cookies } from 'next/headers';
import { createServerComponentClient, createServerActionClient } from '@supabase/auth-helpers-nextjs';
import UpdatePasswordClientForm from '../../components/UpdatePasswordClientForm';

// SERVER ACTION
export async function updatePasswordInDatabase(password: string): Promise<{ error?: string; success?: boolean }> {
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