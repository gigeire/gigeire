import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs/server';
import UpdatePasswordClientForm from '@/components/UpdatePasswordClientForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    code?: string
  }
}

export default async function UpdatePasswordPage({ searchParams }: PageProps) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { code } = searchParams;

  let pageError: string | null = null;
  let showForm = false;

  if (!code) {
    pageError = 'Invalid or missing password reset code. Please use the link from your email.';
  } else {
    // Exchange the reset code for a session + cookies
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      pageError = `Failed to validate reset link: ${exchangeError.message}`;
    } else {
      // Verify that Supabase actually set the session cookie
      const {
        data: { session },
        error: getSessionError,
      } = await supabase.auth.getSession();

      if (getSessionError || !session) {
        pageError = 'Session could not be established. Please request a new reset link.';
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