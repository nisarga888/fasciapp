-- BBTRS Practitioners in Training directory
-- Apply this once in the Supabase SQL editor for project smgccthvratixddwfhmu
-- (Dashboard → SQL → New query → paste → Run). It is not applied by the app deploy.
--
-- What this does
-- 1. Creates public.bbtrs_trainees (one row per auth user).
--    Test placeholder rows may have a null user_id. They are not accounts.
-- 2. New rows are published immediately (published defaults to true, and INSERT forces true).
--    There is no approval queue. Admin can hide a row later and set reviewed_at.
-- 3. Anyone can browse published profiles.
-- 4. Email and WhatsApp are revoked from the anon role. Logged-out visitors only receive
--    has_email / has_whatsapp. Signed-in users can read the contact columns.
-- 5. Does not alter assessments, practitioners, sessions, or scan tables.
--
-- After it succeeds, confirm:
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'bbtrs_trainees'
--   order by ordinal_position;
--
-- Auth redirect allow-list (Authentication → URL configuration) must include:
--   https://fasciapp.app/app/trainees/join.html
--   https://fasciapp.app/app/trainees/join.html?reset=1
-- so trainee confirmation and password-reset emails return to the trainee page.

-- Same admin account the app already uses. Matched by auth user id, not email:
-- sign-up does not require a confirmed email, so a JWT email is not a stable check.
create or replace function public.fa_bbtrs_is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select auth.uid() = 'fea03ec6-5408-494d-8848-228c34f357de'::uuid
$$;

revoke all on function public.fa_bbtrs_is_admin() from public;
grant execute on function public.fa_bbtrs_is_admin() to authenticated;

create table if not exists public.bbtrs_trainees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  is_test boolean not null default false,
  name text not null,
  bio text not null,
  photo text,
  website text,
  country text not null,
  languages text[] not null default '{}',
  cohort_month smallint,
  cohort_year smallint,
  cohort_label text not null,
  email text,
  whatsapp text,
  has_email boolean generated always as (email is not null and btrim(email) <> '') stored,
  has_whatsapp boolean generated always as (whatsapp is not null and btrim(whatsapp) <> '') stored,
  published boolean not null default true,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bbtrs_trainees_name_chk check (char_length(btrim(name)) between 2 and 80),
  constraint bbtrs_trainees_bio_chk check (char_length(btrim(bio)) between 1 and 600),
  constraint bbtrs_trainees_country_chk check (char_length(btrim(country)) between 2 and 80),
  constraint bbtrs_trainees_month_chk check (cohort_month is null or cohort_month between 1 and 12),
  constraint bbtrs_trainees_year_chk check (cohort_year is null or cohort_year between 1990 and 2100),
  constraint bbtrs_trainees_cohort_chk check (
    (is_test = true and cohort_month is null and cohort_year is null and cohort_label = 'TEST')
    or (is_test = false and cohort_month is not null and cohort_year is not null)
  ),
  constraint bbtrs_trainees_test_owner_chk check (
    (is_test = true and user_id is null) or (is_test = false and user_id is not null)
  ),
  constraint bbtrs_trainees_langs_chk check (cardinality(languages) between 1 and 12),
  constraint bbtrs_trainees_photo_chk check (photo is null or char_length(photo) <= 500000),
  constraint bbtrs_trainees_website_chk check (website is null or char_length(website) <= 300),
  constraint bbtrs_trainees_email_chk check (
    email is null or (char_length(email) <= 120 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  constraint bbtrs_trainees_whatsapp_chk check (whatsapp is null or char_length(whatsapp) between 8 and 40),
  constraint bbtrs_trainees_contact_chk check (
    (email is not null and btrim(email) <> '')
    or (whatsapp is not null and btrim(whatsapp) <> '')
  )
);

create index if not exists bbtrs_trainees_published_name_idx
  on public.bbtrs_trainees (published, lower(name));
create index if not exists bbtrs_trainees_country_idx
  on public.bbtrs_trainees (country);
create index if not exists bbtrs_trainees_cohort_idx
  on public.bbtrs_trainees (cohort_year, cohort_month);
create index if not exists bbtrs_trainees_languages_idx
  on public.bbtrs_trainees using gin (languages);

create or replace function public.bbtrs_trainees_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.reviewed_at := null;
    new.created_at := now();
    if not public.fa_bbtrs_is_admin() then
      new.published := true;
    elsif new.published is null then
      new.published := true;
    end if;
  else
    new.id := old.id;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    if not public.fa_bbtrs_is_admin() then
      new.reviewed_at := old.reviewed_at;
    end if;
  end if;
  new.updated_at := now();
  new.name := btrim(new.name);
  new.bio := btrim(new.bio);
  new.country := btrim(new.country);
  new.cohort_label := btrim(new.cohort_label);
  if new.email is not null then
    new.email := nullif(btrim(new.email), '');
  end if;
  if new.whatsapp is not null then
    new.whatsapp := nullif(btrim(new.whatsapp), '');
  end if;
  if new.website is not null then
    new.website := nullif(btrim(new.website), '');
  end if;
  return new;
end;
$$;

drop trigger if exists bbtrs_trainees_guard on public.bbtrs_trainees;
create trigger bbtrs_trainees_guard
  before insert or update on public.bbtrs_trainees
  for each row execute function public.bbtrs_trainees_guard();

alter table public.bbtrs_trainees enable row level security;

drop policy if exists "bbtrs trainees public read" on public.bbtrs_trainees;
create policy "bbtrs trainees public read"
  on public.bbtrs_trainees for select
  to anon
  using (published = true);

drop policy if exists "bbtrs trainees member read" on public.bbtrs_trainees;
create policy "bbtrs trainees member read"
  on public.bbtrs_trainees for select
  to authenticated
  using (published = true or user_id = auth.uid() or public.fa_bbtrs_is_admin());

drop policy if exists "bbtrs trainees insert own" on public.bbtrs_trainees;
create policy "bbtrs trainees insert own"
  on public.bbtrs_trainees for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "bbtrs trainees update own or admin" on public.bbtrs_trainees;
create policy "bbtrs trainees update own or admin"
  on public.bbtrs_trainees for update
  to authenticated
  using (user_id = auth.uid() or public.fa_bbtrs_is_admin())
  with check (user_id = auth.uid() or public.fa_bbtrs_is_admin());

drop policy if exists "bbtrs trainees delete own or admin" on public.bbtrs_trainees;
create policy "bbtrs trainees delete own or admin"
  on public.bbtrs_trainees for delete
  to authenticated
  using (user_id = auth.uid() or public.fa_bbtrs_is_admin());

revoke all on table public.bbtrs_trainees from anon, authenticated;

grant select (
  id, user_id, is_test, name, bio, photo, website, country, languages,
  cohort_month, cohort_year, cohort_label, published, created_at,
  has_email, has_whatsapp
) on table public.bbtrs_trainees to anon;

grant select, insert, update, delete on table public.bbtrs_trainees to authenticated;

comment on table public.bbtrs_trainees is
  'BBTRS practitioners in training. Published on insert. Email and WhatsApp are hidden from anon.';
