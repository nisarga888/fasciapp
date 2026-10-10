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
  created_at timestamptz not null default now()
);

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
