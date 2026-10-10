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
