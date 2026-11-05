-- Update the four TEST listings from public.practitioners.
-- Run after 20261105163000_bbtrs_trainees.sql and 20261105163100_bbtrs_trainees_test_seed.sql.
-- Safe to run again.
--
-- Copies photo and bio only, matched by first name (Nisarga, Giten, Aisha, Prema).
-- Copies the practitioner phone into whatsapp only when that practitioner is already
-- marked available on WhatsApp. No address is written in this file.
-- Sets spoken language to English and cohort to January 2026.
-- Rows stay is_test = true with user_id null. They are not sign-in accounts.
-- A name with no practitioners row is not given an invented photo, bio, or WhatsApp number.
-- Logged-out visitors still cannot select the whatsapp or email columns.

alter table public.bbtrs_trainees drop constraint if exists bbtrs_trainees_bio_chk;
alter table public.bbtrs_trainees add constraint bbtrs_trainees_bio_chk check (char_length(btrim(bio)) between 1 and 2000);

alter table public.bbtrs_trainees drop constraint if exists bbtrs_trainees_cohort_chk;
alter table public.bbtrs_trainees add constraint bbtrs_trainees_cohort_chk check (
  (is_test = true and (
      (cohort_month is null and cohort_year is null)
      or (cohort_month is not null and cohort_year is not null)
    ))
  or (is_test = false and cohort_month is not null and cohort_year is not null)
);

alter table public.bbtrs_trainees drop constraint if exists bbtrs_trainees_contact_chk;
alter table public.bbtrs_trainees add constraint bbtrs_trainees_contact_chk check (
  is_test
  or (email is not null and btrim(email) <> '')
  or (whatsapp is not null and btrim(whatsapp) <> '')
);

insert into public.bbtrs_trainees (
  id, user_id, is_test, name, bio, photo, website, country, languages,
  cohort_month, cohort_year, cohort_label, email, whatsapp, published
) values
  ('11111111-1111-4111-8111-111111111101', null, true, 'Nisarga', 'TEST', null, null, 'TEST', array['English'], 1, 2026, 'January 2026', null, null, true),
  ('11111111-1111-4111-8111-111111111102', null, true, 'Giten', 'TEST', null, null, 'TEST', array['English'], 1, 2026, 'January 2026', null, null, true),
  ('11111111-1111-4111-8111-111111111103', null, true, 'Aisha', 'TEST', null, null, 'TEST', array['English'], 1, 2026, 'January 2026', null, null, true),
  ('11111111-1111-4111-8111-111111111104', null, true, 'Prema', 'TEST', null, null, 'TEST', array['English'], 1, 2026, 'January 2026', null, null, true)
on conflict (id) do update set
  is_test = true,
  user_id = null,
  languages = excluded.languages,
  cohort_month = excluded.cohort_month,
  cohort_year = excluded.cohort_year,
  cohort_label = excluded.cohort_label,
  published = true;

update public.bbtrs_trainees t
set
  bio = case when src.bio is not null and btrim(src.bio) <> '' then btrim(src.bio) else t.bio end,
  photo = case when src.photo is not null and btrim(src.photo) <> '' then src.photo else t.photo end,
  whatsapp = case when src.wa and src.phone is not null and btrim(src.phone) <> '' then btrim(src.phone) else null end
from (
  select distinct on (key)
    key, bio, photo, phone, wa
  from (
    select
      case
        when name ilike 'nisarga%' then 'nisarga'
        when name ilike 'giten%' then 'giten'
        when name ilike 'aisha%' then 'aisha'
        when name ilike 'prema%' then 'prema'
      end as key,
      bio,
      photo,
      phone,
      coalesce(whatsapp, false) as wa,
      (photo is not null and btrim(photo) <> '') as has_photo,
      char_length(coalesce(bio, '')) as bio_len
    from public.practitioners
    where name ilike 'nisarga%'
       or name ilike 'giten%'
       or name ilike 'aisha%'
       or name ilike 'prema%'
  ) matched
  where key is not null
  order by key, has_photo desc, bio_len desc
) src
where t.is_test
  and lower(t.name) = src.key;
