"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      // Optionally redirect after a short delay
      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-auto p-6 bg-white shadow rounded">
        <h1 className="text-2xl font-bold mb-6 text-center">Set a new password</h1>
        {success ? (
          <div className="text-green-600 text-center font-medium">✅ Password updated successfully.</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">New password</label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-black"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            {error && <div className="text-sm text-red-600 text-center">{error}</div>}
            <button
              type="submit"
              className="w-full bg-black text-white rounded-full py-2 font-semibold text-sm shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none disabled:opacity-60 mt-2"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 