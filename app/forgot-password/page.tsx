"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("If an account exists for this email, a reset link has been sent.");
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <p className="mt-1 text-sm text-slate-600">Enter your email and we will send a password reset link.</p>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-70">
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {status ? <p className="mt-3 text-sm text-slate-600">{status}</p> : null}

      <p className="mt-4 text-sm text-slate-600">
        Back to <Link className="text-accent" href="/login">Log in</Link>
      </p>
    </section>
  );
}