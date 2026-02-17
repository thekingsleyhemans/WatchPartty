"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const supabase = createBrowserSupabaseClient();
  const [username, setUsername] = useState(initialUsername);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const saveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("");

    const clean = username.trim();
    const { error } = await supabase.auth.updateUser({
      data: {
        username: clean
      }
    });

    setSaving(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Username saved.");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-slate-600">Set a username others can recognize in rooms.</p>
      <form onSubmit={saveUsername} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className="min-w-64"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={30}
          placeholder="Your username"
        />
        <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-70">
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
      {status ? <p className="mt-2 text-sm text-slate-600">{status}</p> : null}
    </section>
  );
}