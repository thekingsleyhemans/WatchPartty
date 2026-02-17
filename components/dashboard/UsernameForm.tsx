"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const supabase = createBrowserSupabaseClient();
  const [currentUsername, setCurrentUsername] = useState(initialUsername);
  const [draftUsername, setDraftUsername] = useState(initialUsername);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const saveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("");

    const clean = draftUsername.trim();

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        username: clean
      }
    });

    if (authError) {
      setSaving(false);
      setStatus(authError.message);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const { error: profileError } = await supabase.from("user_profiles").upsert(
        {
          user_id: user.id,
          username: clean
        },
        { onConflict: "user_id" }
      );

      if (profileError) {
        setSaving(false);
        setStatus(profileError.message);
        return;
      }
    }

    setCurrentUsername(clean);
    setStatus("Username saved.");
    setSaving(false);
    setOpen(false);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-slate-600">Current username: {currentUsername || "Not set"}</p>
      <button
        className="btn btn-outline mt-3"
        onClick={() => {
          setDraftUsername(currentUsername);
          setOpen(true);
        }}
        type="button"
      >
        Change username
      </button>

      {status ? <p className="mt-2 text-sm text-slate-600">{status}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Change username</h3>
              <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <form onSubmit={saveUsername} className="grid gap-3">
              <input
                value={draftUsername}
                onChange={(e) => setDraftUsername(e.target.value)}
                maxLength={30}
                placeholder="Your username"
                required
              />
              <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-70">
                {saving ? "Saving..." : "Save username"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}