-- Guest session reviews and a small public rating summary.
-- Signed-in reviews stay on the existing insert path.
-- A guest review can be written only by fa_submit_guest_review, which
-- the submit-review edge function calls after it checks Turnstile.
-- Anon cannot insert into practitioner_reviews.

alter table public.practitioner_reviews
  alter column user_id drop not null;

alter table public.practitioner_reviews
  add column if not exists device_key text,
  add column if not exists ip_hash text;

alter table public.practitioner_reviews
  drop constraint if exists practitioner_reviews_device_chk;
alter table public.practitioner_reviews
  add constraint practitioner_reviews_device_chk
  check (device_key is null or device_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

alter table public.practitioner_reviews
  drop constraint if exists practitioner_reviews_ip_chk;
alter table public.practitioner_reviews
  add constraint practitioner_reviews_ip_chk
  check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$');

create unique index if not exists practitioner_reviews_device_practitioner_uidx
  on public.practitioner_reviews (practitioner_id, device_key)
  where device_key is not null;

create index if not exists practitioner_reviews_ip_created_idx
  on public.practitioner_reviews (ip_hash, created_at desc)
  where ip_hash is not null;

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
  guest boolean := coalesce(current_setting('fa.guest_review', true), '') = '1';
begin
  if tg_op = 'INSERT' then
    if uid is null and not guest then
      raise exception 'Sign in to rate';
    end if;
    new.hidden := false;
    new.hidden_at := null;
    new.created_at := now();
    if new.practitioner_id is null then
      raise exception 'This profile is not public';
    end if;
    if uid is not null and exists (
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
    if uid is null then
      new.user_id := null;
      if new.reviewer_label is null or btrim(new.reviewer_label) = '' then
        raise exception 'Please enter your first name';
      end if;
    else
      new.user_id := uid;
      new.device_key := null;
      new.ip_hash := null;
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
    end if;
  else
    new.id := old.id;
    new.user_id := old.user_id;
    new.practitioner_id := old.practitioner_id;
    new.reviewer_label := old.reviewer_label;
    new.created_at := old.created_at;
    new.device_key := old.device_key;
    new.ip_hash := old.ip_hash;
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

  if not admin and uid is not null and (tg_op = 'INSERT' or uid = new.user_id) then
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

create or replace function public.fa_submit_guest_review(
  p_practitioner uuid,
  p_stars integer,
  p_body text,
  p_first text,
  p_device text,
  p_ip_hash text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  label text;
  n int;
  rid uuid;
begin
  if p_device is null or p_device !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'That didn''t work. Please try again.';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'That didn''t work. Please try again.';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Choose a star rating from 1 to 5';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) > 200 then
    raise exception 'Please keep the note to 200 characters';
  end if;
  label := public.fa_public_name(split_part(btrim(coalesce(p_first, '')), ' ', 1));
  if label is null or label = '' or label = 'Member' then
    raise exception 'Please enter your first name';
  end if;
  if not exists (
    select 1 from public.practitioners p
    where p.id = p_practitioner
      and p.consent is true
      and coalesce(p.admin_hidden, false) = false
  ) then
    raise exception 'This profile is not public';
  end if;
  if auth.uid() is not null and exists (
    select 1 from public.practitioners p
    where p.id = p_practitioner and p.user_id = auth.uid()
  ) then
    raise exception 'You cannot rate your own profile';
  end if;
  if exists (
    select 1 from public.practitioner_reviews r
    where r.practitioner_id = p_practitioner and r.device_key = lower(p_device)
  ) then
    raise exception 'You already reviewed this practitioner';
  end if;
  if exists (
    select 1 from public.practitioner_reviews r
    where r.ip_hash = lower(p_ip_hash)
      and r.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'Please wait a little before posting another review';
  end if;
  select count(*) into n
  from public.practitioner_reviews r
  where r.ip_hash = lower(p_ip_hash)
    and r.created_at > now() - interval '1 hour';
  if n >= 8 then
    raise exception 'Please wait a little before posting another review';
  end if;
  perform set_config('fa.guest_review', '1', true);
  insert into public.practitioner_reviews
    (practitioner_id, user_id, stars, body, reviewer_label, hidden, device_key, ip_hash)
  values
    (p_practitioner, null, p_stars, btrim(coalesce(p_body, '')), label, false, lower(p_device), lower(p_ip_hash))
  returning id into rid;
  return rid;
end;
$$;

revoke all on function public.fa_submit_guest_review(uuid, integer, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.fa_submit_guest_review(uuid, integer, text, text, text, text)
  to service_role;

create or replace view public.practitioner_rating_agg
with (security_invoker = true) as
select
  practitioner_id,
  round(avg(stars)::numeric, 1) as avg_stars,
  count(*)::integer as review_count
from public.practitioner_reviews
where hidden = false
group by practitioner_id;

grant select on public.practitioner_rating_agg to anon, authenticated;

comment on view public.practitioner_rating_agg is
  'Average and count of visible session reviews. One small row per practitioner.';

notify pgrst, 'reload schema';
