-- In-person Body Scan drafts. Owner-only. A draft is not a finished
-- assessment: it does not spend a credit and it does not start a report.
-- Finishing the scan inserts one assessment, which is the existing credit
-- and report path. Resuming the same draft does not insert again.

create table if not exists public.assessment_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  client_name text not null,
  client_key text not null,
  step integer not null default 1,
  step_count integer not null default 7,
  data jsonb not null default '{}'::jsonb,
  photo_front text,
  photo_side text,
  photo_back text,
  assessment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_drafts_step_chk check (step >= 1 and step <= 7)
);

create index if not exists assessment_drafts_owner_idx
  on public.assessment_drafts (owner_id, client_key, updated_at desc);

alter table public.assessment_drafts enable row level security;

drop policy if exists assessment_drafts_owner on public.assessment_drafts;
create policy assessment_drafts_owner on public.assessment_drafts
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on table public.assessment_drafts from public, anon, authenticated;
grant select, insert, update, delete on table public.assessment_drafts to authenticated;
