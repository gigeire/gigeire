"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.gigeire.com/update-password',
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-auto p-6 bg-white shadow rounded">
        <h1 className="text-2xl font-bold mb-6 text-center">Reset your password</h1>
        {success ? (
          <div className="text-green-600 text-center font-medium">✅ Check your inbox for a password reset link.</div>
        ) : (
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
            {error && <div className="text-sm text-red-600 text-center">{error}</div>}
            <button
              type="submit"
              className="w-full bg-black text-white rounded-full py-2 font-semibold text-sm shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none disabled:opacity-60 mt-2"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 