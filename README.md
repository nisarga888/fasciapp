# FasciApp

Demo prototype – Integral Body Institute. Fascia & breath connect us all.

- Landing page: `/` (index.html)
- App (PWA): `/app/`
- Custom domain: fasciapp.app (CNAME)

## BBTRS Practitioners in Training

- Public directory: `/app/trainees/`
- Trainee registration and login (separate from practitioner map registration): `/app/trainees/join.html`
- Existing public practitioner list (in-person places and online listings, separate from the training directory): `/app/?search=1` which is `https://fasciapp.app/app/?search=1`

Apply these in the Supabase SQL editor, in order. Nothing here runs on deploy, and neither file creates sign-in accounts or passwords.

1. `supabase/migrations/20261105163000_bbtrs_trainees.sql` creates the table. Cohort month and year are nullable. Real listings must set both. TEST rows leave both empty. Admin review matches the existing admin account by user id (`auth.uid()`), not by email.
2. `supabase/migrations/20261105163100_bbtrs_trainees_test_seed.sql` stores four TEST rows named Nisarga, Giten, Aisha, and Prema.
3. `supabase/migrations/20261105164000_bbtrs_trainees_cohort_admin_fix.sql` repairs a database that already ran an earlier copy of step 1 (NOT NULL cohort columns, or admin matched by email). It is safe to run after the current step 1. It does nothing to the table if step 1 has not been applied yet.
4. `supabase/migrations/20261105180000_bbtrs_trainees_test_from_practitioners.sql` sets the four TEST rows to English and January 2026, and copies photo, bio, and an existing WhatsApp flag's phone from `public.practitioners` when a row matches. The script does not contain contact details. TEST rows stay without a login. Logged-out visitors still cannot read contact columns.

The TEST rows are placeholders for layout. They are not real people. Country, language, and cohort are the literal text TEST. Contact addresses use the reserved `example.com` domain. Photos are solid colors, not pictures of anyone. There is no WhatsApp number and no password. `user_id` is null, so they are not accounts. Until that seed is applied, the directory page shows the same four placeholders from `app/trainees/test-profiles.js` and labels them TEST. Also allow `https://fasciapp.app/app/trainees/join.html` in Authentication → URL configuration. The migration does not change assessment records.
