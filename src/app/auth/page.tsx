"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let result;
      if (mode === "signup") {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
      // Check session and redirect
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user = data.session.user;
        // Check if user exists in users table
        const { data: userRows, error: userCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id);
        if (!userCheckError && (!userRows || userRows.length === 0)) {
          // Insert user if not exists
          const { error: insertError } = await supabase.from('users').insert([
            {
              id: user.id,
              plan: 'free',
              created_at: new Date(),
              invoice_sender_info: {}
            }
          ]);
          if (insertError) {
            // Log error but do not block navigation
            console.error('Failed to insert user into users table:', insertError.message);
          }
        }
        router.replace("/dashboard");
      } else {
        setError("Check your email for a confirmation link.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-start justify-start bg-gray-50 pt-16 sm:pt-20">
      <div className="w-full max-w-xs mx-auto flex flex-col">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center" style={{ fontSize: '20px' }}>{mode === "login" ? "Login to GigÉire" : "Sign Up for GigÉire"}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-black"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-black"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {error && <div className="text-sm text-red-600 text-center">{error}</div>}
          <button
            type="submit"
            className="w-full bg-black text-white rounded-full py-2 font-semibold text-sm shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none disabled:opacity-60 mt-2"
            disabled={loading}
          >
            {loading ? (mode === "login" ? "Logging in..." : "Signing up...") : (mode === "login" ? "Login" : "Sign Up")}
          </button>
        </form>
        <div className="mt-8 text-center text-xs text-gray-500">
          {mode === "login" ? (
            <>
              Need an account?{' '}
              <button
                className="text-blue-600 underline hover:opacity-80"
                onClick={() => setMode("signup")}
                type="button"
              >
                Sign up here.
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                className="text-blue-600 underline hover:opacity-80"
                onClick={() => setMode("login")}
                type="button"
              >
                Log in here.
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}