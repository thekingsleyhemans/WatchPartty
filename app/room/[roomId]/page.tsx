import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import RoomClient from "@/components/room/RoomClient";
import { Room } from "@/lib/types";

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).single();
  if (!room) redirect("/dashboard");

  return <RoomClient initialRoom={room as Room} currentUserId={user.id} />;
}