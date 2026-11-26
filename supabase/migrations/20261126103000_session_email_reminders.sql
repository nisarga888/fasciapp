-- Email the practitioner when a calendar reminder comes due.
-- The row stays owner-only (ps_own). The mailer reads due rows with the
-- service role. Client notes are not copied into the email.

alter table public.planned_sessions
  add column if not exists reminder_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists tz text;

comment on column public.planned_sessions.reminder_at is 'When the reminder email should go out. Null when the session has no reminder.';
comment on column public.planned_sessions.reminder_sent_at is 'Set once the reminder email has been accepted. Cleared if the session time or reminder changes.';
comment on column public.planned_sessions.tz is 'IANA timezone captured from the practitioner browser, used to write the email.';

create index if not exists planned_sessions_reminder_due_idx
  on public.planned_sessions (reminder_at)
  where reminder_sent_at is null and reminder <> 'none';

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
    new.tz := 'Europe/Warsaw';
  else
    new.tz := left(btrim(new.tz), 80);
  end if;
  if tg_op = 'INSERT' or new.reminder_at is distinct from old.reminder_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists planned_sessions_reminder on public.planned_sessions;
create trigger planned_sessions_reminder
  before insert or update on public.planned_sessions
  for each row execute function public.fa_planned_reminder();

revoke all on function public.fa_planned_reminder() from public, anon, authenticated;

-- Fill upcoming reminders. Ones already due are marked sent so a deploy
-- does not email the whole history.
update public.planned_sessions
set tz = coalesce(nullif(btrim(tz), ''), 'Europe/Warsaw');

update public.planned_sessions
set reminder_sent_at = now()
where reminder_sent_at is null
  and reminder_at is not null
  and reminder_at <= now();

-- Cron key lives only in the database. No policy and no grants for the app.
create table if not exists public.fa_private (
  key text primary key,
  value text not null
);
alter table public.fa_private enable row level security;
revoke all on table public.fa_private from public, anon, authenticated;

insert into public.fa_private (key, value)
values ('reminder_cron', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'fa-session-reminders') then
    perform cron.unschedule('fa-session-reminders');
  end if;
end $$;

select cron.schedule(
  'fa-session-reminders',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://smgccthvratixddwfhmu.supabase.co/functions/v1/session-reminders',
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (select value from public.fa_private where key = 'reminder_cron')
    ),
    timeout_milliseconds := 15000
  );
  $cron$
);
