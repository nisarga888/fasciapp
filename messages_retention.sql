-- FasciApp: auto-delete private messages older than 12 months (pg_cron).
-- Run once in the Supabase SQL editor (requires pg_cron enabled on the project).
-- Do not run from the app.

create extension if not exists pg_cron;

select cron.schedule(
  'fasciapp-msg-retention',
  '17 3 * * *',
  $$delete from public.messages where created_at < now() - interval '12 months'$$
);
