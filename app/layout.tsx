import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getServerUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "WatchParrty",
  description: "Lightweight YouTube + Netflix watch parties"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseReady = hasSupabaseEnv();
  const user = await getServerUser();

  return (
    <html lang="en">
      <body>
        {!supabaseReady ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Supabase env missing. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
          </div>
        ) : null}
        <header className="border-b border-slate-200 bg-white/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              WatchParrty
            </Link>
            <nav className="flex items-center gap-4 px-1 text-sm">
              {user ? (
                <>
                  <Link href="/dashboard" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
                    Dashboard
                  </Link>
                  <Link href="/connect-extension" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
                    Connect Extension
                  </Link>
                  <form action="/logout" method="post">
                    <button type="submit" className="bg-slate-900 text-white">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-md border border-slate-200 px-4 py-2 hover:bg-slate-100">
                    Log in
                  </Link>
                  <Link href="/signup" className="rounded-md bg-slate-900 px-4 py-2 text-white">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}