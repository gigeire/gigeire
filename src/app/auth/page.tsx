"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpStatus, setSignUpStatus] = useState<'idle' | 'sent' | 'resending'>('idle');
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  // 3. Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      }
    };
    checkSession();
  }, [router, supabase.auth]);

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setSignUpStatus('resending');
    
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://www.gigeire.com/auth'
      }
    });

    setLoading(false);
    toast({ title: "Success", description: "Confirmation email resent." });
    setSignUpStatus('sent');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://www.gigeire.com/auth' // 1. Add redirect
          }
        });
        if (signUpError) throw signUpError;
        setSignUpStatus('sent'); // 2. Update UX state
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };
  
  // If email has been sent, show the confirmation/resend view.
  if (mode === 'signup' && signUpStatus === 'sent') {
    return (
      <div className="min-h-screen flex flex-col items-start justify-start bg-gray-50 pt-16 sm:pt-20">
        <div className="w-full max-w-xs mx-auto flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center" style={{ fontSize: '20px' }}>Confirm Your Email</h1>
          <p className="text-green-600 text-sm mt-2 text-center">
            ✅ Check your inbox to confirm your account.
          </p>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Used the email: <span className="font-semibold">{email}</span>
          </p>
          <button
            onClick={handleResend}
            className="w-full bg-black text-white rounded-full py-2 font-semibold text-sm shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none disabled:opacity-60 mt-8"
            disabled={loading}
          >
            {loading ? "Resending..." : "Resend Email"}
          </button>
          <button
            className="text-blue-600 underline hover:opacity-80 text-xs mt-4"
            onClick={() => {
              setSignUpStatus('idle');
              setMode('login');
              setError(null);
            }}
            type="button"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

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
                onClick={() => { setMode("signup"); setError(null); }}
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
                onClick={() => { setMode("login"); setError(null); }}
                type="button"
              >
                Log in here.
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-center mt-2">
          <a href="/reset-password" className="text-blue-500 hover:underline">
            Forgot your password?
          </a>
        </p>
      </div>
    </div>
  );
}