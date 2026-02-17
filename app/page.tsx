import Link from "next/link";
import { getServerUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getServerUser();

  return (
    <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-8">
      <p className="text-sm uppercase tracking-widest text-slate-500">Watch together</p>
      <h1 className="text-4xl font-semibold tracking-tight">WATCH PARRRTYYY</h1>
      <p className="max-w-2xl text-slate-600">
        I created this small so we can have watch parties with no stress..hopefully
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={user ? "/create-room" : "/signup"} className="btn btn-primary">
          Create Room
        </Link>
        <Link href="/connect-extension" className="btn btn-outline">
          Connect Extension
        </Link>
      </div>
    </section>
  );
}