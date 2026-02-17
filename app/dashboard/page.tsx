import Link from "next/link";
import { redirect } from "next/navigation";
import UsernameForm from "@/components/dashboard/UsernameForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Room } from "@/lib/types";

type MembershipRow = { room_id: string };

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(20);

  const roomIds = ((memberships as MembershipRow[] | null) ?? []).map((m) => m.room_id);
  let rooms: Room[] = [];

  if (roomIds.length) {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .in("id", roomIds)
      .order("created_at", { ascending: false });
    rooms = (data as Room[]) ?? [];
  }

  const initialUsername = (user.user_metadata?.username as string | undefined) ?? "";

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-600">Create a room or rejoin one of your recent rooms.</p>
        </div>
        <Link href="/create-room" className="btn btn-primary">
          Create Room
        </Link>
      </div>

      <UsernameForm initialUsername={initialUsername} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Recent Rooms</h2>
        <ul className="mt-3 grid gap-2">
          {rooms.length ? (
            rooms.map((room) => (
              <li key={room.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div className="text-sm">
                  <p className="font-medium">{room.platform.toUpperCase()} room</p>
                  <p className="text-slate-500">{room.id}</p>
                </div>
                <Link href={`/room/${room.id}`} className="btn btn-outline">
                  Open
                </Link>
              </li>
            ))
          ) : (
            <li className="text-sm text-slate-500">No rooms yet.</li>
          )}
        </ul>
      </div>
    </section>
  );
}