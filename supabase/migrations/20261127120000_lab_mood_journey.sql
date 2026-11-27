-- Private mood notes, 21-day journey access, and breath-buddy day/streak.
-- The Payhip webhook (service role) writes journey_access. Buyers read only
-- their own email. Buddies see a day number and a streak, nothing else.

create table if not exists public.mood_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint mood_notes_mood_chk check (mood in ('anxious','tired','pain','sleep','tense','overwhelmed','evening')),
  constraint mood_notes_body_chk check (char_length(btrim(body)) between 1 and 500)
);

create index if not exists mood_notes_user_created_idx
  on public.mood_notes (user_id, created_at desc);

alter table public.mood_notes enable row level security;

drop policy if exists mood_notes_owner on public.mood_notes;
create policy mood_notes_owner on public.mood_notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.mood_notes from public, anon, authenticated;
grant select, insert, delete on table public.mood_notes to authenticated;

create table if not exists public.journey_access (
  email text primary key,
  order_id text,
  product_key text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint journey_access_email_chk check (email = lower(email) and position('@' in email) > 1)
);

alter table public.journey_access enable row level security;

drop policy if exists journey_access_self on public.journey_access;
create policy journey_access_self on public.journey_access
  for select to authenticated
  using (
    revoked_at is null
    and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

revoke all on table public.journey_access from public, anon, authenticated;
grant select on table public.journey_access to authenticated;

create table if not exists public.journey_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  done smallint[] not null default '{}',
  reminder boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint journey_progress_done_chk check (
    done <@ array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]::smallint[]
  )
);

alter table public.journey_progress enable row level security;

drop policy if exists journey_progress_owner on public.journey_progress;
create policy journey_progress_owner on public.journey_progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.journey_progress from public, anon, authenticated;
grant select, insert, update on table public.journey_progress to authenticated;

create or replace function public.fa_journey_progress_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text;
  ok boolean;
begin
  if (select auth.uid()) is distinct from new.user_id then
    raise exception 'not allowed';
  end if;
  select lower(u.email) into em from auth.users u where u.id = new.user_id;
  select exists (
    select 1 from public.journey_access ja
    where ja.email = em and ja.revoked_at is null
  ) into ok;
  if not ok then
    if exists (select 1 from unnest(new.done) d where d <> 1) then
      raise exception 'day locked';
    end if;
    new.reminder := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists journey_progress_guard on public.journey_progress;
create trigger journey_progress_guard
  before insert or update on public.journey_progress
  for each row execute function public.fa_journey_progress_guard();

revoke all on function public.fa_journey_progress_guard() from public, anon, authenticated;

create table if not exists public.journey_invites (
  code text primary key,
  inviter uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_by uuid references auth.users (id),
  accepted_at timestamptz,
  constraint journey_invites_code_chk check (code ~ '^[a-z0-9]{8,24}$')
);

alter table public.journey_invites enable row level security;

drop policy if exists journey_invites_read on public.journey_invites;
create policy journey_invites_read on public.journey_invites
  for select to authenticated
  using ((select auth.uid()) = inviter or (select auth.uid()) = accepted_by);

drop policy if exists journey_invites_create on public.journey_invites;
create policy journey_invites_create on public.journey_invites
  for insert to authenticated
  with check ((select auth.uid()) = inviter and accepted_by is null);

revoke all on table public.journey_invites from public, anon, authenticated;
grant select, insert on table public.journey_invites to authenticated;

create table if not exists public.journey_buddies (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint journey_buddies_order_chk check (a < b),
  constraint journey_buddies_pair unique (a, b)
);

create index if not exists journey_buddies_a_idx on public.journey_buddies (a);
create index if not exists journey_buddies_b_idx on public.journey_buddies (b);

alter table public.journey_buddies enable row level security;

revoke all on table public.journey_buddies from public, anon, authenticated;

create or replace function public.fa_journey_has_access(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.journey_access ja on ja.email = lower(u.email)
    where u.id = p_user and ja.revoked_at is null
  );
$$;

revoke all on function public.fa_journey_has_access(uuid) from public, anon, authenticated;

create or replace function public.fa_journey_stats(days smallint[])
returns table (day int, streak int)
language plpgsql
immutable
set search_path = ''
as $$
declare
  present boolean[];
  i int;
  s int := 0;
  latest int := 0;
  on_day int := 1;
begin
  present := array_fill(false, array[22]);
  if days is not null then
    foreach i in array days loop
      if i between 1 and 21 then
        present[i] := true;
        if i > latest then latest := i; end if;
      end if;
    end loop;
  end if;
  if latest > 0 then
    i := latest;
    while i >= 1 and present[i] loop
      s := s + 1;
      i := i - 1;
    end loop;
  end if;
  for i in 1..21 loop
    if not present[i] then
      on_day := i;
      exit;
    end if;
    if i = 21 then on_day := 21; end if;
  end loop;
  return query select on_day, s;
end;
$$;

revoke all on function public.fa_journey_stats(smallint[]) from public, anon, authenticated;

create or replace function public.fa_journey_buddy()
returns table (day int, streak int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  friend uuid;
  days smallint[];
begin
  if me is null then return; end if;
  select case when b.a = me then b.b else b.a end into friend
  from public.journey_buddies b
  where b.ended_at is null and (b.a = me or b.b = me)
  order by b.created_at desc
  limit 1;
  if friend is null then return; end if;
  if not public.fa_journey_has_access(friend) then return; end if;
  select jp.done into days from public.journey_progress jp where jp.user_id = friend;
  return query select st.day, st.streak from public.fa_journey_stats(days) st;
end;
$$;

revoke all on function public.fa_journey_buddy() from public, anon, authenticated;
grant execute on function public.fa_journey_buddy() to authenticated;

create or replace function public.fa_journey_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  code text;
begin
  if me is null then raise exception 'sign in'; end if;
  if not public.fa_journey_has_access(me) then raise exception 'journey locked'; end if;
  code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into public.journey_invites (code, inviter) values (code, me);
  return code;
end;
$$;

revoke all on function public.fa_journey_invite() from public, anon, authenticated;
grant execute on function public.fa_journey_invite() to authenticated;

create or replace function public.fa_journey_accept(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  host uuid;
  lo uuid;
  hi uuid;
begin
  if me is null then return 'sign in'; end if;
  if not public.fa_journey_has_access(me) then return 'need access'; end if;
  select inviter into host from public.journey_invites where code = p_code and accepted_by is null;
  if host is null then return 'invite missing'; end if;
  if host = me then return 'own invite'; end if;
  if not public.fa_journey_has_access(host) then return 'need access'; end if;
  if exists (
    select 1 from public.journey_buddies
    where ended_at is null and (a = me or b = me or a = host or b = host)
  ) then return 'already linked'; end if;
  lo := least(me, host);
  hi := greatest(me, host);
  insert into public.journey_buddies (a, b) values (lo, hi);
  update public.journey_invites set accepted_by = me, accepted_at = now() where code = p_code;
  return 'ok';
end;
$$;

revoke all on function public.fa_journey_accept(text) from public, anon, authenticated;
grant execute on function public.fa_journey_accept(text) to authenticated;

create or replace function public.fa_journey_end()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then return; end if;
  update public.journey_buddies
  set ended_at = now()
  where ended_at is null and (a = me or b = me);
end;
$$;

revoke all on function public.fa_journey_end() from public, anon, authenticated;
grant execute on function public.fa_journey_end() to authenticated;
