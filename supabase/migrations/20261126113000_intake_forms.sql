-- Private client intake forms. Clients submit through the submit-intake
-- edge function. Only the owning practitioner can read or delete a form.

create table if not exists public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null,
  client_name text not null,
  contact text not null,
  dob text,
  concern text,
  conditions text,
  injuries text,
  pregnant boolean not null default false,
  hope text,
  matched_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists intake_forms_owner_idx
  on public.intake_forms (practitioner_id, created_at desc);

create index if not exists intake_forms_unread_idx
  on public.intake_forms (practitioner_id)
  where read_at is null;

alter table public.intake_forms enable row level security;

drop policy if exists intake_forms_owner_read on public.intake_forms;
create policy intake_forms_owner_read on public.intake_forms
  for select to authenticated
  using (practitioner_id = auth.uid());

drop policy if exists intake_forms_owner_update on public.intake_forms;
create policy intake_forms_owner_update on public.intake_forms
  for update to authenticated
  using (practitioner_id = auth.uid())
  with check (practitioner_id = auth.uid());

drop policy if exists intake_forms_owner_delete on public.intake_forms;
create policy intake_forms_owner_delete on public.intake_forms
  for delete to authenticated
  using (practitioner_id = auth.uid());

revoke all on table public.intake_forms from public, anon, authenticated;
grant select, update, delete on table public.intake_forms to authenticated;

-- Rate-limit rows only. No health answers.
create table if not exists public.intake_rate (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists intake_rate_ip_idx
  on public.intake_rate (ip_hash, created_at desc);

alter table public.intake_rate enable row level security;
revoke all on table public.intake_rate from public, anon, authenticated;

-- Spend one Body Scan credit and store the form in the same transaction.
-- Active plans and the admin account are unlimited, same as a body scan.
-- A single credit or a remaining trial is used up. Zero credits inserts nothing.
create or replace function public.fa_intake_save(
  p_user uuid,
  p_name text,
  p_contact text,
  p_dob text,
  p_concern text,
  p_conditions text,
  p_injuries text,
  p_pregnant boolean,
  p_hope text,
  p_matched text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.scan_access;
  em text;
  admin boolean;
  act boolean;
  new_id uuid;
begin
  if p_user is null or p_name is null or btrim(p_name) = '' or p_contact is null or btrim(p_contact) = '' then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  insert into public.scan_access(user_id, email)
  values (p_user, (select email from auth.users where id = p_user))
  on conflict (user_id) do nothing;
  select * into r from public.scan_access where user_id = p_user for update;
  select lower(email) into em from auth.users where id = p_user;
  admin := p_user = 'fea03ec6-5408-494d-8848-228c34f357de'::uuid or em = 'nisarga8@gmail.com';
  act := r.plan in ('practitioner','pro','yearly') and (r.expires_at is null or r.expires_at > now());
  if admin or act then
    update public.scan_access set scans_used = scans_used + 1, updated_at = now() where user_id = p_user;
  elsif r.trial_remaining > 0 then
    update public.scan_access
      set scans_used = scans_used + 1, trial_remaining = trial_remaining - 1, updated_at = now()
      where user_id = p_user;
  else
    return jsonb_build_object('ok', false, 'code', 'no_credit');
  end if;
  insert into public.intake_forms (
    practitioner_id, client_name, contact, dob, concern, conditions, injuries, pregnant, hope, matched_key
  ) values (
    p_user, p_name, p_contact, nullif(p_dob, ''), nullif(p_concern, ''), nullif(p_conditions, ''),
    nullif(p_injuries, ''), coalesce(p_pregnant, false), nullif(p_hope, ''), nullif(p_matched, '')
  ) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

revoke all on function public.fa_intake_save(uuid, text, text, text, text, text, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.fa_intake_save(uuid, text, text, text, text, text, text, boolean, text, text) to service_role;
