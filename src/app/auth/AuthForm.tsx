"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClientComponentClient();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth`
          }
        });
        if (error) throw error;
        setMessage("Check your email for a confirmation link.");
        setResendCooldown(true);
        setTimeout(() => setResendCooldown(false), 3000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const buttonText = () => {
    if (loading) {
      return mode === "login" ? "Logging in..." : "Signing up...";
    }
    if (message && mode === "signup") {
      return "Resend Email";
    }
    return mode === "login" ? "Login" : "Sign Up";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          {mode === "login" ? "Welcome Back" : "Create an Account"}
        </h1>
        <p className="text-gray-600 mb-8">
          {mode === "login" ? "Login to manage your gigs." : "Get started with GigÉire today."}
        </p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="email"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          
          {error && <div className="text-sm text-red-600 bg-red-100 p-3 rounded-lg text-center">{error}</div>}
          {message && <div className="text-sm text-green-700 bg-green-100 p-3 rounded-lg text-center">{message}</div>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base shadow-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:outline-none disabled:opacity-50 transition-all transform hover:scale-105"
            disabled={loading || (mode === 'signup' && resendCooldown)}
          >
            {buttonText()}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-600">
          {mode === "login" ? (
            <>
              Need an account?{' '}
              <button
                className="font-semibold text-blue-600 hover:underline"
                onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
                type="button"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                className="font-semibold text-blue-600 hover:underline"
                onClick={() => { setMode("login"); setError(null); setMessage(null); }}
                type="button"
              >
                Log in
              </button>
            </>
          )}
        </div>
        <p className="text-sm text-center mt-4">
          <a href="/reset-password" className="text-gray-500 hover:text-blue-600 hover:underline">
            Forgot your password?
          </a>
        </p>
      </div>
    </div>
  );
} 