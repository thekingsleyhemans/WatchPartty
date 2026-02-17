-- Enable UUID generation
create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'netflix')),
  source text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('host', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;

create policy if not exists "read rooms"
on public.rooms for select
using (auth.role() = 'authenticated');

create policy if not exists "insert rooms"
on public.rooms for insert
with check (auth.uid() = owner_id);

create policy if not exists "update owner rooms"
on public.rooms for update
using (auth.uid() = owner_id);

create policy if not exists "read members"
on public.room_members for select
using (auth.role() = 'authenticated');

create policy if not exists "insert own membership"
on public.room_members for insert
with check (auth.uid() = user_id);

create policy if not exists "update own membership"
on public.room_members for update
using (auth.uid() = user_id);

create policy if not exists "read messages"
on public.messages for select
using (auth.role() = 'authenticated');

create policy if not exists "insert own messages"
on public.messages for insert
with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.messages;