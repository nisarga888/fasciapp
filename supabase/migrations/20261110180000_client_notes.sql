-- Practitioner notes: one shared set per client, for the signed-in practitioner only.
-- Clients in this app are named people, not a separate clients table, so the
-- row is keyed by the same normalized client name the calendar already uses.
-- Apply once on project smgccthvratixddwfhmu. The app keeps working on this
-- device if the table is not there yet.

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null default auth.uid(),
  client_key text not null,
  client_name text not null,
  session_date date not null default ((now() at time zone 'Europe/Warsaw'))::date,
  session_label text,
  training text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_notes_body_len check (char_length(body) between 1 and 4000),
  constraint client_notes_key_len check (char_length(client_key) between 1 and 160)
);

create index if not exists client_notes_owner_client_idx
  on public.client_notes (practitioner_id, client_key, session_date desc, created_at desc);

alter table public.client_notes enable row level security;

drop policy if exists client_notes_select on public.client_notes;
drop policy if exists client_notes_insert on public.client_notes;
drop policy if exists client_notes_update on public.client_notes;
drop policy if exists client_notes_delete on public.client_notes;

create policy client_notes_select on public.client_notes
  for select to authenticated
  using (practitioner_id = auth.uid());

create policy client_notes_insert on public.client_notes
  for insert to authenticated
  with check (practitioner_id = auth.uid());

create policy client_notes_update on public.client_notes
  for update to authenticated
  using (practitioner_id = auth.uid())
  with check (practitioner_id = auth.uid());

create policy client_notes_delete on public.client_notes
  for delete to authenticated
  using (practitioner_id = auth.uid());

grant select, insert, update, delete on public.client_notes to authenticated;
