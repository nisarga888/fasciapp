-- Per-client assessment links and the saved Body Scan they produce.
-- Clients submit through the submit-assess edge function. The link token is
-- unguessable. Health answers stay on the assessment row, which only the
-- owning practitioner can read.

create table if not exists public.client_assess_links (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null,
  client_key text not null,
  client_name text not null,
  token text not null,
  created_at timestamptz not null default now(),
  constraint client_assess_links_owner_key unique (practitioner_id, client_key),
  constraint client_assess_links_token_key unique (token)
);

create index if not exists client_assess_links_token_idx
  on public.client_assess_links (token);

alter table public.client_assess_links enable row level security;

drop policy if exists client_assess_links_owner on public.client_assess_links;
create policy client_assess_links_owner on public.client_assess_links
  for all to authenticated
  using (practitioner_id = (select auth.uid()))
  with check (practitioner_id = (select auth.uid()));

revoke all on table public.client_assess_links from public, anon, authenticated;
grant select, insert, update on table public.client_assess_links to authenticated;

alter table public.assessments
  add column if not exists via text,
  add column if not exists opened_at timestamptz;

create index if not exists assessments_client_new_idx
  on public.assessments (owner_id)
  where via = 'client' and opened_at is null;

alter table public.sessions
  add column if not exists session_time text;

-- Stable personal link for one client. The token is created once.
create or replace function public.fa_client_link(p_name text, p_key text)
returns text
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  tok text;
begin
  if uid is null then
    raise exception 'not allowed';
  end if;
  p_name := btrim(coalesce(p_name, ''));
  p_key := btrim(coalesce(p_key, ''));
  if p_name = '' or p_key = '' or length(p_name) > 80 or length(p_key) > 160 then
    raise exception 'not allowed';
  end if;
  insert into public.client_assess_links (practitioner_id, client_key, client_name, token)
  values (uid, p_key, p_name, encode(gen_random_bytes(18), 'hex'))
  on conflict (practitioner_id, client_key)
  do update set client_name = excluded.client_name
  returning token into tok;
  return tok;
end;
$$;

revoke all on function public.fa_client_link(text, text) from public, anon;
grant execute on function public.fa_client_link(text, text) to authenticated;

-- Spend one Body Scan credit and store the assessment in the same transaction.
-- The assessments insert trigger sees a null auth.uid() for this service-role
-- call, so it only increments scans_used and does not check the balance.
-- This function refuses a zero balance before inserting, and decrements a
-- trial or single credit itself. It does not increment scans_used, so the
-- trigger's increment is the only one. Active plans and the admin account
-- stay unlimited, the same as an in-person scan.
create or replace function public.fa_assess_save(
  p_token text,
  p_data jsonb,
  p_flags text[],
  p_front text,
  p_side text,
  p_back text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.client_assess_links;
  r public.scan_access;
  em text;
  admin boolean;
  act boolean;
  new_id uuid := gen_random_uuid();
  prefix text;
begin
  if p_token is null or p_front is null or p_side is null or p_back is null then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  select * into link from public.client_assess_links where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  prefix := link.practitioner_id::text || '/' || new_id::text || '/';
  if p_front <> prefix || 'front.webp'
     or p_side <> prefix || 'side.webp'
     or p_back <> prefix || 'back.webp' then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  insert into public.scan_access(user_id, email)
  values (link.practitioner_id, (select email from auth.users where id = link.practitioner_id))
  on conflict (user_id) do nothing;
  select * into r from public.scan_access where user_id = link.practitioner_id for update;
  select lower(email) into em from auth.users where id = link.practitioner_id;
  admin := link.practitioner_id = 'fea03ec6-5408-494d-8848-228c34f357de'::uuid
    or em = 'nisarga8@gmail.com';
  act := r.plan in ('practitioner', 'pro', 'yearly')
    and (r.expires_at is null or r.expires_at > now());
  if admin or act then
    null;
  elsif r.trial_remaining > 0 then
    update public.scan_access
      set trial_remaining = trial_remaining - 1, updated_at = now()
      where user_id = link.practitioner_id;
  else
    return jsonb_build_object('ok', false, 'code', 'no_credit');
  end if;
  insert into public.assessments (
    id, owner_id, client_name, data, red_flags, photo_front, photo_side, photo_back, via
  ) values (
    new_id, link.practitioner_id, link.client_name,
    coalesce(p_data, '{}'::jsonb), coalesce(p_flags, '{}'::text[]),
    p_front, p_side, p_back, 'client'
  );
  return jsonb_build_object('ok', true, 'id', new_id, 'name', link.client_name, 'key', link.client_key, 'user_id', link.practitioner_id);
end;
$$;

revoke all on function public.fa_assess_save(text, jsonb, text[], text, text, text) from public, anon, authenticated;
grant execute on function public.fa_assess_save(text, jsonb, text[], text, text, text) to service_role;
