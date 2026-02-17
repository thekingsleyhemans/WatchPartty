"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Room, RoomMember, RoomMessage, SyncEvent } from "@/lib/types";
import { extractYouTubeVideoId } from "@/lib/sync/youtube";
import YouTubeSyncPlayer from "@/components/youtube/YouTubeSyncPlayer";

type PresenceState = Record<string, Array<{ user_id: string }>>;

export default function RoomClient({ initialRoom, currentUserId }: { initialRoom: Room; currentUserId: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [myRole, setMyRole] = useState<"host" | "viewer">("viewer");
  const [presenceUsers, setPresenceUsers] = useState<string[]>([]);
  const [latestEvent, setLatestEvent] = useState<SyncEvent | null>(null);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [inviteStatus, setInviteStatus] = useState("");
  const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const roomUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${initialRoom.id}` : "";

  const fetchData = useCallback(async () => {
    const [{ data: memberRows }, { data: messageRows }] = await Promise.all([
      supabase.from("room_members").select("*").eq("room_id", initialRoom.id).order("joined_at", { ascending: true }),
      supabase.from("messages").select("*").eq("room_id", initialRoom.id).order("created_at", { ascending: true }).limit(100)
    ]);

    const list = (memberRows as RoomMember[]) ?? [];
    setMembers(list);
    setMessages((messageRows as RoomMessage[]) ?? []);

    const me = list.find((m) => m.user_id === currentUserId);
    setMyRole(me?.role ?? "viewer");
  }, [currentUserId, initialRoom.id, supabase]);

  useEffect(() => {
    const connectFlag = localStorage.getItem("watchparrty_extension_connected");
    setExtensionConnected(connectFlag === "true");
  }, []);

  useEffect(() => {
    const join = async () => {
      await supabase.from("room_members").upsert({ room_id: initialRoom.id, user_id: currentUserId, role: "viewer" });
      const { data: roomMembers } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", initialRoom.id)
        .eq("role", "host")
        .limit(1);

      if (!roomMembers?.length) {
        await supabase
          .from("room_members")
          .update({ role: "host" })
          .eq("room_id", initialRoom.id)
          .eq("user_id", currentUserId);
      }

      await fetchData();
    };

    void join();
  }, [currentUserId, fetchData, initialRoom.id, supabase]);

  useEffect(() => {
    const channel = supabase.channel(`room-${initialRoom.id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId }
      }
    });

    syncChannelRef.current = channel;

    channel
      .on("broadcast", { event: "sync" }, ({ payload }) => {
        setLatestEvent(payload as SyncEvent);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as PresenceState;
        setPresenceUsers(Object.keys(state));
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${initialRoom.id}` },
        ({ new: newMessage }) => {
          setMessages((prev) => [...prev, newMessage as RoomMessage]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${initialRoom.id}` },
        () => {
          void fetchData();
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: currentUserId });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchData, initialRoom.id, supabase]);

  useEffect(() => {
    if (myRole !== "host") return;

    const interval = setInterval(() => {
      void syncChannelRef.current?.send({
        type: "broadcast",
        event: "sync",
        payload: {
          type: "PING",
          senderId: currentUserId,
          payload: {
            roomId: initialRoom.id,
            platform: initialRoom.platform,
            ts: Date.now()
          }
        } satisfies SyncEvent
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUserId, initialRoom.id, initialRoom.platform, myRole]);

  const sendSyncEvent = useCallback(
    async (event: SyncEvent) => {
      await syncChannelRef.current?.send({ type: "broadcast", event: "sync", payload: event });
    },
    []
  );

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content) return;
    await supabase.from("messages").insert({ room_id: initialRoom.id, user_id: currentUserId, content });
    setChatInput("");
  };

  const transferHost = async (userId: string) => {
    if (myRole !== "host") return;
    await supabase.from("room_members").update({ role: "viewer" }).eq("room_id", initialRoom.id).eq("role", "host");
    await supabase.from("room_members").update({ role: "host" }).eq("room_id", initialRoom.id).eq("user_id", userId);
    await fetchData();
  };

  const shareInvite = async () => {
    if (!roomUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "WatchParrty Invite",
          text: "Join my WatchParrty room",
          url: roomUrl
        });
        setInviteStatus("Invite shared.");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    await navigator.clipboard.writeText(`Join my WatchParrty room: ${roomUrl}`);
    setInviteStatus("Invite link copied.");
  };

  const openNetflixWithExtension = () => {
    const chromeApi = (window as typeof window & { chrome?: any }).chrome;
    if (!chromeApi?.runtime) {
      window.open(initialRoom.source, "_blank");
      return;
    }

    const extensionId = localStorage.getItem("watchparrty_extension_id") || "";
    if (extensionId) {
      chromeApi.runtime.sendMessage(extensionId, {
        type: "WATCHPARRTY_SET_ACTIVE_ROOM",
        payload: {
          roomId: initialRoom.id,
          platform: "netflix",
          sourceUrl: initialRoom.source
        }
      });
    }

    window.open(initialRoom.source, "_blank");
  };

  const hostId = members.find((m) => m.role === "host")?.user_id;
  const youtubeVideoId = initialRoom.platform === "youtube" ? extractYouTubeVideoId(initialRoom.source) || initialRoom.source : "";

  return (
    <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Room {initialRoom.id}</h1>
            <p className="text-sm text-slate-500">Platform: {initialRoom.platform.toUpperCase()}</p>
          </div>
          <div className="flex gap-2">
            <button className="border border-slate-300 bg-white" onClick={shareInvite}>
              Share Invite Link
            </button>
          </div>
        </div>
        {inviteStatus ? <p className="mb-2 text-xs text-slate-500">{inviteStatus}</p> : null}

        {initialRoom.platform === "youtube" ? (
          <YouTubeSyncPlayer
            roomId={initialRoom.id}
            videoId={youtubeVideoId}
            isHost={myRole === "host"}
            currentUserId={currentUserId}
            latestEvent={latestEvent}
            sendSyncEvent={sendSyncEvent}
          />
        ) : (
          <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p>
              Netflix sync runs through the WatchParrty Chrome extension. Keep netflix.com open in another tab with the extension installed.
            </p>
            <p>Extension status: {extensionConnected ? "Connected" : "Not connected"}</p>
            <button className="w-fit bg-slate-900 text-white" onClick={openNetflixWithExtension}>
              Open in Netflix
            </button>
          </div>
        )}
      </div>

      <aside className="grid gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Participants ({presenceUsers.length || members.length})</h2>
            {myRole !== "host" ? <button className="border border-slate-300 bg-white text-sm">Request host</button> : null}
          </div>
          <ul className="grid gap-2 text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1.5">
                <span>
                  {m.user_id.slice(0, 8)}
                  {m.user_id === currentUserId ? " (you)" : ""}
                  {presenceUsers.includes(m.user_id) ? " - online" : ""}
                </span>
                <div className="flex items-center gap-2">
                  {m.role === "host" ? <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white">Host</span> : null}
                  {myRole === "host" && m.user_id !== currentUserId ? (
                    <button className="border border-slate-300 bg-white px-2 py-1 text-xs" onClick={() => transferHost(m.user_id)}>
                      Make host
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {hostId ? <p className="mt-2 text-xs text-slate-500">Current host: {hostId.slice(0, 8)}</p> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Chat</h2>
          <div className="max-h-64 space-y-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
            {messages.map((message) => (
              <p key={`${message.id}-${message.created_at}`}>
                <span className="font-medium">{message.user_id.slice(0, 6)}:</span> {message.content}
              </p>
            ))}
            {!messages.length ? <p className="text-slate-500">No messages yet.</p> : null}
          </div>
          <form onSubmit={sendMessage} className="mt-2 flex gap-2">
            <input
              className="w-full"
              placeholder="Write a message"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button className="bg-slate-900 text-white" type="submit">
              Send
            </button>
          </form>
        </section>
      </aside>
    </section>
  );
}