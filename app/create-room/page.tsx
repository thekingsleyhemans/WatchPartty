"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { extractYouTubeVideoId } from "@/lib/sync/youtube";

export default function CreateRoomPage() {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();
  const [platform, setPlatform] = useState<"youtube" | "netflix">("youtube");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const normalizedSource = platform === "youtube" ? extractYouTubeVideoId(source) || source.trim() : source.trim();

    if (!normalizedSource) {
      setError("Please provide a valid source.");
      setLoading(false);
      return;
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ owner_id: user.id, platform, source: normalizedSource })
      .select("*")
      .single();

    if (roomError || !room) {
      setError(roomError?.message ?? "Failed to create room");
      setLoading(false);
      return;
    }

    await supabase.from("room_members").upsert({ room_id: room.id, user_id: user.id, role: "host" });

    router.push(`/room/${room.id}`);
  };

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Create Room</h1>
      <form className="mt-4 grid gap-4" onSubmit={onCreate}>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Platform</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as "youtube" | "netflix") }>
            <option value="youtube">YouTube</option>
            <option value="netflix">Netflix</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium">{platform === "youtube" ? "YouTube URL or Video ID" : "Netflix title URL"}</span>
          <input
            placeholder={platform === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://www.netflix.com/watch/..."}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button className="bg-slate-900 text-white disabled:opacity-70" disabled={loading} type="submit">
          {loading ? "Creating..." : "Create and Join"}
        </button>
      </form>
    </section>
  );
}