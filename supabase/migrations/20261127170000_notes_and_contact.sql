-- Journal saves need UPDATE. Contact client records the last touch and
-- caps FasciApp emails at 20 per practitioner per UTC day.

grant update on table public.mood_notes to authenticated;

alter table public.planned_sessions
  add column if not exists last_contacted_at timestamptz,
  add column if not exists last_contacted_channel text,
  add column if not exists last_contacted_template text;

alter table public.planned_sessions drop constraint if exists planned_sessions_contact_channel_chk;
alter table public.planned_sessions
  add constraint planned_sessions_contact_channel_chk
  check (last_contacted_channel is null or last_contacted_channel in ('email', 'whatsapp', 'message'));

alter table public.planned_sessions drop constraint if exists planned_sessions_contact_template_chk;
alter table public.planned_sessions
  add constraint planned_sessions_contact_template_chk
  check (last_contacted_template is null or last_contacted_template in ('bring', 'reminder', 'aftercare', 'reschedule'));

grant select (last_contacted_at, last_contacted_channel, last_contacted_template)
  on table public.planned_sessions to authenticated;
grant insert (last_contacted_at, last_contacted_channel, last_contacted_template)
  on table public.planned_sessions to authenticated;
grant update (last_contacted_at, last_contacted_channel, last_contacted_template)
  on table public.planned_sessions to authenticated;

create table if not exists public.practitioner_contact_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now()
);

create index if not exists practitioner_contact_emails_day_idx
  on public.practitioner_contact_emails (user_id, sent_at desc);

alter table public.practitioner_contact_emails enable row level security;

revoke all on table public.practitioner_contact_emails from public, anon, authenticated;

create or replace function public.fa_contact_emails_left()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, 20 - count(*)::integer)
  from public.practitioner_contact_emails
  where user_id = (select auth.uid())
    and sent_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

revoke all on function public.fa_contact_emails_left() from public;
grant execute on function public.fa_contact_emails_left() to authenticated;

create or replace function public.fa_client_has_account(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null
    and position('@' in coalesce(p_email, '')) > 1
    and exists (
      select 1 from public.planned_sessions s
      where s.practitioner_id = (select auth.uid())
        and lower(s.client_email) = lower(btrim(p_email))
    )
    and exists (
      select 1 from auth.users u
      where lower(u.email) = lower(btrim(p_email))
    );
$$;

revoke all on function public.fa_client_has_account(text) from public;
grant execute on function public.fa_client_has_account(text) to authenticated;

create or replace function public.fa_message_client(p_email text, p_body text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  dest uuid;
  note text := left(btrim(coalesce(p_body, '')), 2000);
begin
  if who is null or note = '' or position('@' in coalesce(p_email, '')) < 2 then
    return false;
  end if;
  if not exists (
    select 1 from public.planned_sessions s
    where s.practitioner_id = who
      and lower(s.client_email) = lower(btrim(p_email))
  ) then
    return false;
  end if;
  select u.id into dest
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
    and u.id is distinct from who
  limit 1;
  if dest is null then
    return false;
  end if;
  insert into public.messages (sender, recipient, body)
  values (who, dest, note);
  return true;
end;
$$;

revoke all on function public.fa_message_client(text, text) from public;
grant execute on function public.fa_message_client(text, text) to authenticated;
