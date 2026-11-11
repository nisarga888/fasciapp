-- Which MER session belts a practitioner has marked complete for one client.
-- Clients are named people, not a separate table, so the row is keyed by the
-- same normalized name the notes and calendar already use.
-- Apply once on project smgccthvratixddwfhmu. The app keeps the marks on this
-- device if the table is not there yet.

create table if not exists public.client_mer_sessions (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null default auth.uid(),
  client_key text not null,
  client_name text not null,
  belt text not null,
  session_index integer,
  completed_at timestamptz not null default now(),
  constraint client_mer_sessions_key_len check (char_length(client_key) between 1 and 160),
  constraint client_mer_sessions_belt_len check (char_length(belt) between 1 and 40),
  constraint client_mer_sessions_owner_client_belt unique (practitioner_id, client_key, belt)
);

create index if not exists client_mer_sessions_owner_client_idx
  on public.client_mer_sessions (practitioner_id, client_key);

alter table public.client_mer_sessions enable row level security;

drop policy if exists client_mer_sessions_select on public.client_mer_sessions;
drop policy if exists client_mer_sessions_insert on public.client_mer_sessions;
drop policy if exists client_mer_sessions_update on public.client_mer_sessions;
drop policy if exists client_mer_sessions_delete on public.client_mer_sessions;

create policy client_mer_sessions_select on public.client_mer_sessions
  for select to authenticated
  using (practitioner_id = auth.uid());

create policy client_mer_sessions_insert on public.client_mer_sessions
  for insert to authenticated
  with check (practitioner_id = auth.uid());

create policy client_mer_sessions_update on public.client_mer_sessions
  for update to authenticated
  using (practitioner_id = auth.uid())
  with check (practitioner_id = auth.uid());

create policy client_mer_sessions_delete on public.client_mer_sessions
  for delete to authenticated
  using (practitioner_id = auth.uid());

grant select, insert, update, delete on public.client_mer_sessions to authenticated;
