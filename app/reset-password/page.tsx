"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 transition-all duration-200">
        <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 transition-all duration-200">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M4 4 20 20" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      setSessionReady(Boolean(session));
    };

    void init();
  }, [supabase.auth]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setStatus("Password updated. Redirecting to login...");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Reset password</h1>

      {!sessionReady ? (
        <p className="mt-3 text-sm text-slate-600">
          Open this page from your reset email link. If needed, request another link from{" "}
          <Link className="text-accent" href="/forgot-password">Forgot password</Link>.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-12"
              required
            />
            <button
              type="button"
              className="btn btn-ghost absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-slate-600 hover:text-slate-900"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span className="block transition-transform duration-200 ease-out active:scale-95">
                <EyeIcon open={showPassword} />
              </span>
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pr-12"
              required
            />
            <button
              type="button"
              className="btn btn-ghost absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-slate-600 hover:text-slate-900"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              <span className="block transition-transform duration-200 ease-out active:scale-95">
                <EyeIcon open={showConfirmPassword} />
              </span>
            </button>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
          <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-70">
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      )}
    </section>
  );
}