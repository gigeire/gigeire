import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ensureUserExists } from '@/app/actions/user';

export default async function AuthGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth');
  }

  // Ensure a user record exists in the public table.
  await ensureUserExists();

  return <>{children}</>;
} 