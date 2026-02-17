"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/dashboard";

      if (!code) {
        setMessage("Missing auth code. Redirecting to login...");
        setTimeout(() => router.replace("/login"), 800);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMessage("Could not verify link. Please request a new one.");
        setTimeout(() => router.replace("/login"), 1200);
        return;
      }

      const safeNext = next.startsWith("/") ? next : "/dashboard";
      router.replace(safeNext);
    };

    void run();
  }, [router, searchParams, supabase.auth]);

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Auth callback</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
    </section>
  );
}