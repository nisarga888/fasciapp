-- FasciApp: practitioners table + Row Level Security
create table if not exists public.practitioners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  mods text[] not null default '{}',
  address text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  phone text,
  email text,
  website text,
  bio text,
  photo text,            -- data URL (~256px JPEG) or a Storage URL
  consent boolean not null default false,
  whatsapp boolean not null default false,
  created_at timestamptz not null default now()
);

-- for databases created before v0.5:
alter table public.practitioners add column if not exists whatsapp boolean not null default false;

-- v0.8: up to 3 work locations [{label,address,city,country,lat,lng}, ...]
alter table public.practitioners add column if not exists locations jsonb;


-- v0.7: open modality tags are stored in mods text[]

alter table public.practitioners enable row level security;

-- Anyone (even not logged in) can see listings that opted in
create policy "public can read consented listings"
  on public.practitioners for select
  using (consent = true);

-- Practitioners can always see their own row (even when not public)
create policy "owner can read own listing"
  on public.practitioners for select
  to authenticated using (auth.uid() = user_id);

create policy "owner can insert own listing"
  on public.practitioners for insert
  to authenticated with check (auth.uid() = user_id);

create policy "owner can update own listing"
  on public.practitioners for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner can delete own listing"
  on public.practitioners for delete
  to authenticated using (auth.uid() = user_id);

-- ===== Session log (each practitioner sees only their own sessions) =====
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  initials text not null check (char_length(initials) between 1 and 4),
  date date not null,
  duration integer not null check (duration > 0),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions(user_id, date);
alter table public.sessions enable row level security;
create policy "owner can read own sessions"   on public.sessions for select to authenticated using (auth.uid() = user_id);
create policy "owner can insert own sessions" on public.sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "owner can update own sessions" on public.sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner can delete own sessions" on public.sessions for delete to authenticated using (auth.uid() = user_id);

-- ===== FasciApp in-app messages (v0.9) =====
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_recipient_idx on public.messages(recipient, created_at);
create index if not exists messages_sender_idx on public.messages(sender, created_at);
alter table public.messages enable row level security;
drop policy if exists "send as self" on public.messages;
create policy "send as self" on public.messages for insert to authenticated
  with check (sender = auth.uid() and recipient <> auth.uid());
drop policy if exists "read own conversations" on public.messages;
create policy "read own conversations" on public.messages for select to authenticated
  using (sender = auth.uid() or recipient = auth.uid());
drop policy if exists "recipient marks read" on public.messages;
create policy "recipient marks read" on public.messages for update to authenticated
  using (recipient = auth.uid()) with check (recipient = auth.uid());
-- only read_at may change
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;
grant select, insert on public.messages to authenticated;
