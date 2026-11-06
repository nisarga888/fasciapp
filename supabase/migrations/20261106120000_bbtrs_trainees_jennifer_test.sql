-- Replace two placeholder TEST rows and add Jennifer McKeever from her practitioner record.
-- Safe to run again.
--
-- Deletes only the Nisarga TEST row and the Prema TEST row (fixed ids, is_test, no account).
-- Does not delete a real listing, an auth user, or any practitioners row.
-- Jennifer is a TEST row: user_id stays null, so it is not a sign-in account.
-- Photo, bio excerpt, country, website, and email are copied from public.practitioners.
-- WhatsApp is copied only when that practitioner already has a phone and the WhatsApp flag.
-- No address or phone number is written in this file.
-- Spoken language is English. Cohort is January 2026. The listing is published.

delete from public.bbtrs_trainees
where is_test = true
  and user_id is null
  and id in (
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111104'
  );

insert into public.bbtrs_trainees (
  id, user_id, is_test, name, bio, photo, website, country, languages,
  cohort_month, cohort_year, cohort_label, email, whatsapp, published
)
select
  '11111111-1111-4111-8111-111111111105',
  null,
  true,
  btrim(p.name),
  case
    when char_length(btrim(p.bio)) <= 420 then btrim(p.bio)
    else left(btrim(p.bio), 380) || '…'
  end,
  p.photo,
  nullif(btrim(p.website), ''),
  btrim(p.country),
  array['English']::text[],
  1,
  2026,
  'January 2026',
  nullif(btrim(p.email), ''),
  case
    when coalesce(p.whatsapp, false)
     and p.phone is not null
     and btrim(p.phone) <> ''
    then btrim(p.phone)
    else null
  end,
  true
from public.practitioners p
where p.id = '83cfd085-c177-4117-9c70-71eefde14d1a'
  and char_length(btrim(p.name)) between 2 and 80
  and char_length(btrim(coalesce(p.bio, ''))) >= 1
  and char_length(btrim(coalesce(p.country, ''))) between 2 and 80
on conflict (id) do update set
  user_id = null,
  is_test = true,
  name = excluded.name,
  bio = excluded.bio,
  photo = excluded.photo,
  website = excluded.website,
  country = excluded.country,
  languages = excluded.languages,
  cohort_month = excluded.cohort_month,
  cohort_year = excluded.cohort_year,
  cohort_label = excluded.cohort_label,
  email = excluded.email,
  whatsapp = excluded.whatsapp,
  published = true;

-- The earlier practitioner-copy left country and website as placeholders on Aisha and Giten.
update public.bbtrs_trainees t
set
  country = btrim(src.country),
  website = nullif(btrim(src.website), '')
from (
  select distinct on (key)
    key, country, website
  from (
    select
      case
        when name ilike 'aisha%' then 'aisha'
        when name ilike 'giten%' then 'giten'
      end as key,
      country,
      website,
      (photo is not null and btrim(photo) <> '') as has_photo
    from public.practitioners
    where name ilike 'aisha%' or name ilike 'giten%'
  ) matched
  where key is not null
    and char_length(btrim(coalesce(country, ''))) between 2 and 80
  order by key, has_photo desc
) src
where t.is_test
  and t.user_id is null
  and lower(t.name) = src.key
  and t.country = 'TEST';

-- Owner can still update, hide, or delete only their own trainee row.
-- Deleting that row does not delete auth.users or public.practitioners.
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
