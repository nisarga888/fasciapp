-- A practitioner's own Lab: videos, courses and links they can show to clients.
-- The owner can read and write every row. Everyone else can read only rows
-- marked visible, and only when that practitioner's listing is published.

create table if not exists public.practitioner_lab_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  url text not null,
  title text not null,
  description text not null default '',
  thumb text,
  visible_to_clients boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practitioner_lab_kind_chk check (kind in ('youtube', 'course', 'link')),
  constraint practitioner_lab_url_chk check (url ~* '^https?://[^[:space:]]+$' and char_length(url) <= 500),
  constraint practitioner_lab_title_chk check (char_length(btrim(title)) between 1 and 140),
  constraint practitioner_lab_desc_chk check (char_length(description) <= 280),
  constraint practitioner_lab_thumb_chk check (thumb is null or (thumb ~* '^https?://[^[:space:]]+$' and char_length(thumb) <= 500))
);

create index if not exists practitioner_lab_owner_idx
  on public.practitioner_lab_resources (user_id, kind, sort_order, created_at);

create index if not exists practitioner_lab_public_idx
  on public.practitioner_lab_resources (user_id, sort_order)
  where visible_to_clients;

alter table public.practitioner_lab_resources enable row level security;

drop policy if exists practitioner_lab_owner on public.practitioner_lab_resources;
create policy practitioner_lab_owner on public.practitioner_lab_resources
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists practitioner_lab_public_read on public.practitioner_lab_resources;
create policy practitioner_lab_public_read on public.practitioner_lab_resources
  for select to anon, authenticated
  using (
    visible_to_clients = true
    and exists (
      select 1 from public.practitioners p
      where p.user_id = practitioner_lab_resources.user_id
        and p.consent is true
        and coalesce(p.admin_hidden, false) = false
    )
  );

revoke all on table public.practitioner_lab_resources from public, anon, authenticated;
grant select on table public.practitioner_lab_resources to anon, authenticated;
grant insert, update, delete on table public.practitioner_lab_resources to authenticated;
