-- Optional reminder to the client, at the same time as the practitioner's.
-- Existing rows stay off (default false). Nothing here sends mail.

alter table public.planned_sessions
  add column if not exists client_remind boolean not null default false,
  add column if not exists client_reminder_sent_at timestamptz;

comment on column public.planned_sessions.client_remind is
  'When true, and a client email and a reminder time exist, the client is emailed at reminder_at. Existing rows stay false.';
comment on column public.planned_sessions.client_reminder_sent_at is
  'Set once the client reminder email has been accepted. Cleared if the session time, reminder, client email, or switch changes.';

create index if not exists planned_sessions_client_reminder_due_idx
  on public.planned_sessions (reminder_at)
  where client_reminder_sent_at is null and client_remind and reminder <> 'none';

create or replace function public.fa_planned_reminder()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.reminder = '1h' then
    new.reminder_at := new.starts_at - interval '1 hour';
  elsif new.reminder = '1d' then
    new.reminder_at := new.starts_at - interval '1 day';
  else
    new.reminder_at := null;
  end if;
  if new.tz is null or btrim(new.tz) = '' then
    new.tz := null;
  else
    new.tz := left(btrim(new.tz), 80);
    begin
      perform now() at time zone new.tz;
    exception when others then
      new.tz := null;
    end;
  end if;
  if new.time_basis is not null then
    new.time_basis := left(btrim(new.time_basis), 20);
  end if;
  if new.client_remind is null then
    new.client_remind := false;
  end if;
  if tg_op = 'INSERT' or new.reminder_at is distinct from old.reminder_at then
    new.reminder_sent_at := null;
    new.client_reminder_sent_at := null;
  elsif tg_op = 'UPDATE' and (
    new.client_remind is distinct from old.client_remind
    or lower(btrim(coalesce(new.client_email, ''))) is distinct from lower(btrim(coalesce(old.client_email, '')))
  ) then
    new.client_reminder_sent_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.fa_planned_reminder() from public, anon, authenticated;
