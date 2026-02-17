import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await context.params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, owner_id")
    .eq("id", roomId)
    .single();

  if (!room) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isOwner = room.owner_id === user.id;

  const { data: membership } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isHost = membership?.role === "host";

  if (!isOwner && !isHost) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  await supabase.from("rooms").delete().eq("id", roomId);

  return NextResponse.redirect(new URL("/dashboard", request.url));
}