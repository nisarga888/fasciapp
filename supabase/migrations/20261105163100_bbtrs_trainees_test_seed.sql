-- TEST seed for the BBTRS Practitioners in Training directory.
-- Apply in the Supabase SQL editor AFTER 20261105163000_bbtrs_trainees.sql.
-- Do not run this from the app deploy. It is not applied by this branch.
--
-- These four rows are layout samples only:
--   Nisarga, Giten, Aisha, Prema
-- They are not real profiles. Nothing here is a biography, credential,
-- spoken language, country, cohort date, or WhatsApp number.
-- Contact addresses use the reserved example.com domain and cannot receive mail.
-- Photos are solid colors, not pictures of people.
-- user_id is null on purpose: this script does not create auth users,
-- passwords, or sign-in accounts.
-- Re-running it updates the same four ids and does not add duplicates.

insert into public.bbtrs_trainees (
  id, user_id, is_test, name, bio, photo, website, country, languages,
  cohort_month, cohort_year, cohort_label, email, whatsapp, published
) values
  (
    '11111111-1111-4111-8111-111111111101',
    null,
    true,
    'Nisarga',
    'TEST profile. Placeholder text only. Not a real biography or credential.',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAT0lEQVR42u3PQQkAAAgEsGtkIouY3gi+hcEKLNXzWgQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELgunAmDxqz5UIwAAAABJRU5ErkJggg==',
    'https://example.com',
    'TEST',
    array['TEST'],
    null,
    null,
    'TEST',
    'nisarga.test@example.com',
    null,
    true
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    null,
    true,
    'Giten',
    'TEST profile. Placeholder text only. Not a real biography or credential.',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAUElEQVR42u3PQQkAAAgEsEthPd/2L2AE38JgBZaafi0CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApcFPiXgxO/vtJwAAAAASUVORK5CYII=',
    'https://example.com',
    'TEST',
    array['TEST'],
    null,
    null,
    'TEST',
    'giten.test@example.com',
    null,
    true
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    null,
    true,
    'Aisha',
    'TEST profile. Placeholder text only. Not a real biography or credential.',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAT0lEQVR42u3PQQkAAAgEsAtmCOMY3wi+hcEKLNP1WgQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELgvqPkDxBANEKQAAAABJRU5ErkJggg==',
    'https://example.com',
    'TEST',
    array['TEST'],
    null,
    null,
    'TEST',
    'aisha.test@example.com',
    null,
    true
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    null,
    true,
    'Prema',
    'TEST profile. Placeholder text only. Not a real biography or credential.',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAUElEQVR42u3PQQkAAAgEsGvm3xD2j2EE38JgBZaueS0CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApcFWe9w01uHf3MAAAAASUVORK5CYII=',
    'https://example.com',
    'TEST',
    array['TEST'],
    null,
    null,
    'TEST',
    'prema.test@example.com',
    null,
    true
  )
on conflict (id) do update set
  user_id = excluded.user_id,
  is_test = excluded.is_test,
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
  published = excluded.published;
