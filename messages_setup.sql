-- ===== FasciApp in-app messages (v0.9) =====
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_recipient_idx on public.messages(recipient, created_at);
create index if not exists messages_sender_idx on public.messages(sender, created_at);
alter table public.messages enable row level security;
drop policy if exists "send as self" on public.messages;
create policy "send as self" on public.messages for insert to authenticated
  with check (sender = auth.uid() and recipient <> auth.uid());
drop policy if exists "read own conversations" on public.messages;
create policy "read own conversations" on public.messages for select to authenticated
  using (sender = auth.uid() or recipient = auth.uid());
drop policy if exists "recipient marks read" on public.messages;
create policy "recipient marks read" on public.messages for update to authenticated
  using (recipient = auth.uid()) with check (recipient = auth.uid());
-- only read_at may change
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;
grant select, insert on public.messages to authenticated;
