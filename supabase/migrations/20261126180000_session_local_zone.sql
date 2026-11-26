-- Session clocks keep the practitioner's IANA zone. starts_at stays an
-- absolute UTC instant. Existing rows are not rewritten: rows saved before
-- this change used a Warsaw wall clock even when tz names another country.

alter table public.planned_sessions
  add column if not exists time_basis text;

comment on column public.planned_sessions.tz is
  'IANA time zone captured from the practitioner device. Empty means the zone was not known.';
comment on column public.planned_sessions.time_basis is
  'zone: starts_at is the UTC instant of the wall clock in tz. Null: the wall clock was read as Europe/Warsaw.';

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
  if tg_op = 'INSERT' or new.reminder_at is distinct from old.reminder_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.fa_planned_reminder() from public, anon, authenticated;
