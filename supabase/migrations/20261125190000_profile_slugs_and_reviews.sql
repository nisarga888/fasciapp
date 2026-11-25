-- Stable profile links and session reviews.
-- Apply once on project smgccthvratixddwfhmu
-- (Dashboard → SQL → New query → paste → Run). The app deploy does not run this.
-- Safe to run again: existing slugs are kept, and policies are replaced.
--
-- Slugs
-- * One stable slug per practitioner, from the name (lowercase, marks stripped, hyphens).
-- * If that slug is taken or reserved for an existing site path, the city is appended,
--   then a number (name, name-warsaw, name-warsaw-2).
-- * A later name change does not change the slug.
-- * Hidden listings (admin_hidden, which forces consent = false) are not readable
--   by the public policy, so their slug does not open a profile.
--
-- Reviews
-- * Signed-in users can insert and update only their own row. One row per user
--   per practitioner. A practitioner cannot review their own listing.
-- * Public (anon and signed-in) can read reviews that are not hidden.
-- * A report hides the review until an admin restores it.
-- * reporter_id is readable only by the admin account used for the trainee directory
--   (auth.uid() = fa_bbtrs_is_admin()).
-- * Writes are rate-limited in the triggers.
--
-- The public list does not need this table. The app calls fa_profile_reviews
-- only when a profile is opened.

-- ---------------------------------------------------------------------------
-- Slugs
-- ---------------------------------------------------------------------------

create or replace function public.fa_slugify(src text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  s text := lower(btrim(coalesce(src, '')));
begin
  if s = '' then
    return '';
  end if;
  s := replace(s, 'æ', 'ae');
  s := replace(s, 'œ', 'oe');
  s := replace(s, 'ß', 'ss');
  s := replace(s, 'þ', 'th');
  s := replace(s, 'ð', 'd');
  s := translate(
    s,
    'àáâãäåāăąèéêëēĕėęìíîïīĭįòóôõöøōŏőùúûüūŭůűųýÿñńçćčśšşźžżłđı',
    'aaaaaaaaaeeeeeeeeiiiiiiiooooooooouuuuuuuuuyynncccssszzzldi'
  );
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  if char_length(s) > 60 then
    s := substring(s from 1 for 60);
    if position('-' in s) > 20 then
      s := regexp_replace(s, '-[^-]*$', '');
    end if;
    s := regexp_replace(s, '-+$', '');
  end if;
  return s;
end;
$$;

create or replace function public.fa_alloc_slug(p_name text, p_city text, p_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  base text := public.fa_slugify(p_name);
  city text := public.fa_slugify(p_city);
  stem text;
  cand text;
  n int := 2;
  reserved text[] := array[
    'app','scan','live','assets','nl','sig','privacy','terms','index','robots','sitemap',
    'favicon','manifest','cname','about','admin','api','static','public','vendor','ph',
    'lab','news','assessment','trainees','join','search','map','profile','auth','scripts',
    'tools','supabase','readme','www','mail','share','reviews','review','login','signup',
    'account','404','sw','css','js','html'
  ];
begin
  perform pg_advisory_xact_lock(hashtext('fasciapp-practitioner-slug'));
  if base is null or base = '' then
    base := 'practitioner';
  end if;
  if city is not null and city <> '' then
    stem := base || '-' || city;
  else
    stem := base;
  end if;
  cand := base;
  if cand = any (reserved) or exists (
    select 1 from public.practitioners pr
    where pr.slug = cand and pr.id is distinct from p_id
  ) then
    cand := stem;
  end if;
  while cand = any (reserved) or exists (
    select 1 from public.practitioners pr
    where pr.slug = cand and pr.id is distinct from p_id
  ) loop
    cand := stem || '-' || n;
    n := n + 1;
    if n > 500 then
      cand := stem || '-' || substr(replace(coalesce(p_id::text, gen_random_uuid()::text), '-', ''), 1, 8);
      exit;
    end if;
  end loop;
  return left(cand, 80);
end;
$$;

create or replace function public.fa_assign_practitioner_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  city text;
begin
  if tg_op = 'UPDATE' and old.slug is not null and btrim(old.slug) <> '' then
    new.slug := old.slug;
    return new;
  end if;
  city := nullif(btrim(coalesce(new.city, '')), '');
  if city is null and jsonb_typeof(new.locations) = 'array' then
    city := nullif(btrim(coalesce(new.locations->0->>'city', '')), '');
  end if;
  new.slug := public.fa_alloc_slug(coalesce(nullif(btrim(new.name), ''), nullif(btrim(new.practice_name), ''), ''), city, new.id);
  return new;
end;
$$;

alter table public.practitioners add column if not exists slug text;

drop trigger if exists fa_assign_practitioner_slug on public.practitioners;
create trigger fa_assign_practitioner_slug
  before insert or update on public.practitioners
  for each row
  execute function public.fa_assign_practitioner_slug();

do $$
declare
  r record;
begin
  for r in
    select id from public.practitioners
    where slug is null
    order by created_at nulls last, id
  loop
    update public.practitioners
      set name = name
      where id = r.id and slug is null;
  end loop;
end $$;

alter table public.practitioners alter column slug set not null;

alter table public.practitioners drop constraint if exists practitioners_slug_chk;
alter table public.practitioners
  add constraint practitioners_slug_chk
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 80);

create unique index if not exists practitioners_slug_key on public.practitioners (slug);

comment on column public.practitioners.slug is
  'Stable public path. Assigned once from the name. Not changed when the name changes.';

-- ---------------------------------------------------------------------------
-- Reviews and reports
-- ---------------------------------------------------------------------------

create or replace function public.fa_public_name(src text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  raw text := btrim(regexp_replace(coalesce(src, ''), '\s+', ' ', 'g'));
  parts text[];
  first text;
  lastw text;
begin
  if raw = '' then
    return 'Member';
  end if;
  if position('@' in raw) > 0 then
    raw := split_part(raw, '@', 1);
  end if;
  parts := regexp_split_to_array(raw, '[[:space:]._-]+');
  parts := array_remove(parts, '');
  if parts is null or cardinality(parts) = 0 then
    return 'Member';
  end if;
  first := initcap(lower(parts[1]));
  if cardinality(parts) = 1 then
    return left(first, 40);
  end if;
  lastw := parts[cardinality(parts)];
  return left(first || ' ' || upper(left(lastw, 1)) || '.', 40);
end;
$$;

create table if not exists public.practitioner_reviews (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stars smallint not null,
  body text not null default '',
  reviewer_label text not null,
  hidden boolean not null default false,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practitioner_reviews_stars_chk check (stars between 1 and 5),
  constraint practitioner_reviews_body_chk check (char_length(body) <= 200),
  constraint practitioner_reviews_label_chk check (char_length(reviewer_label) between 1 and 40)
);

create unique index if not exists practitioner_reviews_user_practitioner_uidx
  on public.practitioner_reviews (user_id, practitioner_id);
create index if not exists practitioner_reviews_practitioner_idx
  on public.practitioner_reviews (practitioner_id, created_at desc);
create index if not exists practitioner_reviews_public_idx
  on public.practitioner_reviews (practitioner_id, created_at desc)
  where hidden = false;
create index if not exists practitioner_reviews_user_updated_idx
  on public.practitioner_reviews (user_id, updated_at desc);

create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.practitioner_reviews(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists review_reports_once_uidx
  on public.review_reports (review_id, reporter_id);
create index if not exists review_reports_reporter_idx
  on public.review_reports (reporter_id, created_at desc);

create or replace function public.fa_reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nm text;
  n int;
  admin boolean := coalesce(public.fa_bbtrs_is_admin(), false);
begin
  if tg_op = 'INSERT' then
    if uid is null then
      raise exception 'Sign in to rate';
    end if;
    new.user_id := uid;
    new.hidden := false;
    new.hidden_at := null;
    new.created_at := now();
    if new.practitioner_id is null then
      raise exception 'This profile is not public';
    end if;
    if exists (
      select 1 from public.practitioners p
      where p.id = new.practitioner_id and p.user_id = uid
    ) then
      raise exception 'You cannot rate your own profile';
    end if;
    if not exists (
      select 1 from public.practitioners p
      where p.id = new.practitioner_id
        and p.consent is true
        and coalesce(p.admin_hidden, false) = false
    ) then
      raise exception 'This profile is not public';
    end if;
    select btrim(p.name) into nm
    from public.practitioners p
    where p.user_id = uid and btrim(coalesce(p.name, '')) <> ''
    order by p.created_at
    limit 1;
    if nm is null or nm = '' then
      nm := nullif(btrim(coalesce(
        auth.jwt() -> 'user_metadata' ->> 'full_name',
        auth.jwt() -> 'user_metadata' ->> 'name',
        ''
      )), '');
    end if;
    if nm is null or nm = '' then
      nm := split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1);
    end if;
    new.reviewer_label := public.fa_public_name(nm);
  else
    new.id := old.id;
    new.user_id := old.user_id;
    new.practitioner_id := old.practitioner_id;
    new.reviewer_label := old.reviewer_label;
    new.created_at := old.created_at;
    if new.hidden is distinct from old.hidden then
      if new.hidden then
        if not (admin or pg_trigger_depth() > 1) then
          raise exception 'not allowed';
        end if;
        new.hidden_at := now();
      else
        if not admin then
          raise exception 'not allowed';
        end if;
        new.hidden_at := null;
      end if;
    else
      new.hidden_at := old.hidden_at;
    end if;
  end if;

  if new.stars is null or new.stars < 1 or new.stars > 5 then
    raise exception 'Choose a star rating from 1 to 5';
  end if;
  new.body := btrim(coalesce(new.body, ''));
  if char_length(new.body) > 200 then
    raise exception 'Please keep the note to 200 characters';
  end if;
  new.updated_at := now();

  if not admin and (tg_op = 'INSERT' or uid = new.user_id) then
    if exists (
      select 1 from public.practitioner_reviews r
      where r.user_id = uid
        and r.updated_at > now() - interval '10 seconds'
        and r.id is distinct from new.id
    ) then
      raise exception 'Please wait a little before posting another review';
    end if;
    select count(*) into n
    from public.practitioner_reviews r
    where r.user_id = uid
      and r.updated_at > now() - interval '1 hour'
      and r.id is distinct from new.id;
    if n >= 12 then
      raise exception 'Please wait a little before posting another review';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists fa_reviews_guard on public.practitioner_reviews;
create trigger fa_reviews_guard
  before insert or update on public.practitioner_reviews
  for each row
  execute function public.fa_reviews_guard();

create or replace function public.fa_review_report_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner uuid;
  is_hidden boolean;
  n int;
begin
  if uid is null then
    raise exception 'Sign in to report a review';
  end if;
  new.reporter_id := uid;
  new.created_at := now();
  select r.user_id, r.hidden into owner, is_hidden
  from public.practitioner_reviews r
  where r.id = new.review_id;
  if owner is null then
    raise exception 'This review is not available';
  end if;
  if owner = uid then
    raise exception 'You cannot report your own review';
  end if;
  if exists (
    select 1 from public.review_reports rr
    where rr.reporter_id = uid and rr.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'Please wait a little before reporting again';
  end if;
  select count(*) into n
  from public.review_reports rr
  where rr.reporter_id = uid and rr.created_at > now() - interval '1 hour';
  if n >= 8 then
    raise exception 'Please wait a little before reporting again';
  end if;
  if not coalesce(is_hidden, false) then
    update public.practitioner_reviews
      set hidden = true, hidden_at = now()
      where id = new.review_id;
  end if;
  return new;
end;
$$;

drop trigger if exists fa_review_report_guard on public.review_reports;
create trigger fa_review_report_guard
  before insert on public.review_reports
  for each row
  execute function public.fa_review_report_guard();

create or replace function public.fa_profile_reviews(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  admin boolean := coalesce(public.fa_bbtrs_is_admin(), false);
  ok boolean;
  result jsonb;
begin
  select (p.consent is true and coalesce(p.admin_hidden, false) = false)
    into ok
  from public.practitioners p
  where p.id = p_id;
  if not coalesce(ok, false) then
    return jsonb_build_object('avg', null, 'count', 0, 'reviews', '[]'::jsonb, 'mine', null);
  end if;
  select jsonb_build_object(
    'avg', (
      select round(avg(r.stars)::numeric, 1)
      from public.practitioner_reviews r
      where r.practitioner_id = p_id and r.hidden = false
    ),
    'count', (
      select count(*)
      from public.practitioner_reviews r
      where r.practitioner_id = p_id and r.hidden = false
    ),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'stars', s.stars,
        'body', s.body,
        'name', s.reviewer_label,
        'created_at', s.created_at,
        'hidden', s.hidden,
        'mine', uid is not null and s.user_id = uid
      ) order by s.created_at desc)
      from (
        select r.id, r.stars, r.body, r.reviewer_label, r.created_at, r.hidden, r.user_id
        from public.practitioner_reviews r
        where r.practitioner_id = p_id
          and (
            r.hidden = false
            or (uid is not null and r.user_id = uid)
            or admin
          )
        order by r.created_at desc
        limit 30
      ) s
    ), '[]'::jsonb),
    'mine', (
      select jsonb_build_object(
        'id', r.id,
        'stars', r.stars,
        'body', r.body,
        'hidden', r.hidden
      )
      from public.practitioner_reviews r
      where uid is not null and r.practitioner_id = p_id and r.user_id = uid
      limit 1
    )
  ) into result;
  return result;
end;
$$;

alter table public.practitioner_reviews enable row level security;
alter table public.review_reports enable row level security;

drop policy if exists practitioner_reviews_select on public.practitioner_reviews;
drop policy if exists practitioner_reviews_insert on public.practitioner_reviews;
drop policy if exists practitioner_reviews_update_own on public.practitioner_reviews;
drop policy if exists practitioner_reviews_update_admin on public.practitioner_reviews;
drop policy if exists review_reports_insert on public.review_reports;
drop policy if exists review_reports_admin_select on public.review_reports;

create policy practitioner_reviews_select on public.practitioner_reviews
  for select
  to anon, authenticated
  using (
    hidden = false
    or user_id = (select auth.uid())
    or (select public.fa_bbtrs_is_admin())
  );

create policy practitioner_reviews_insert on public.practitioner_reviews
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy practitioner_reviews_update_own on public.practitioner_reviews
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy practitioner_reviews_update_admin on public.practitioner_reviews
  for update
  to authenticated
  using ((select public.fa_bbtrs_is_admin()))
  with check ((select public.fa_bbtrs_is_admin()));

create policy review_reports_insert on public.review_reports
  for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

create policy review_reports_admin_select on public.review_reports
  for select
  to authenticated
  using ((select public.fa_bbtrs_is_admin()));

revoke all on public.practitioner_reviews from public, anon, authenticated;
grant select (id, practitioner_id, stars, body, reviewer_label, created_at, updated_at, hidden, hidden_at)
  on public.practitioner_reviews to anon, authenticated;
grant insert (practitioner_id, user_id, stars, body, reviewer_label, hidden)
  on public.practitioner_reviews to authenticated;
grant update (stars, body, hidden) on public.practitioner_reviews to authenticated;

revoke all on public.review_reports from public, anon, authenticated;
grant insert (review_id, reporter_id) on public.review_reports to authenticated;
grant select (id, review_id, reporter_id, created_at) on public.review_reports to authenticated;

-- Anon reads practitioners by column, so a new column is hidden until it is granted.
-- admin_hidden is only a boolean flag. Hidden rows are already excluded by consent.
grant select (slug, admin_hidden) on public.practitioners to anon;

revoke all on function public.fa_slugify(text) from public, anon, authenticated;
revoke all on function public.fa_alloc_slug(text, text, uuid) from public, anon, authenticated;
revoke all on function public.fa_assign_practitioner_slug() from public, anon;
revoke all on function public.fa_public_name(text) from public, anon, authenticated;
revoke all on function public.fa_reviews_guard() from public, anon;
revoke all on function public.fa_review_report_guard() from public, anon;
revoke all on function public.fa_profile_reviews(uuid) from public;

grant execute on function public.fa_assign_practitioner_slug() to authenticated;
grant execute on function public.fa_reviews_guard() to authenticated;
grant execute on function public.fa_review_report_guard() to authenticated;
grant execute on function public.fa_profile_reviews(uuid) to anon, authenticated;

comment on table public.practitioner_reviews is
  'One session review per signed-in user per practitioner. Hidden reviews stay out of the public read.';
comment on table public.review_reports is
  'Who reported a review. Readable only by the admin account. A report hides the review.';

notify pgrst, 'reload schema';
