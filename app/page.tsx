import Link from "next/link";
import { getServerUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getServerUser();

  return (
    <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-8">
      <p className="text-sm uppercase tracking-widest text-slate-500">Watch together</p>
      <h1 className="text-4xl font-semibold tracking-tight">YouTube + Netflix watch rooms that stay in sync.</h1>
      <p className="max-w-2xl text-slate-600">
        Create a room, invite friends, chat live, and keep playback aligned. YouTube works in-app. Netflix sync works through the WatchParrty Chrome extension.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={user ? "/create-room" : "/signup"} className="bg-slate-900 text-white">
          Create Room
        </Link>
        <Link href="/connect-extension" className="border border-slate-300 bg-white">
          Connect Extension
        </Link>
      </div>
    </section>
  );
}