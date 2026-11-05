-- Repair script. Run after 20261105163000_bbtrs_trainees.sql.
-- Safe to run even when that file already created nullable cohort columns
-- and the user-id admin check. Also fixes a database where the first file
-- was applied from an earlier copy that declared cohort_month/cohort_year
-- NOT NULL (which made the TEST seed impossible) or matched admin by email.
-- Does nothing if the table has not been created yet.
-- Does not create accounts or passwords.

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

do $repair$
begin
  if to_regclass('public.bbtrs_trainees') is null then
    raise notice 'bbtrs_trainees is not created yet; apply 20261105163000 first';
    return;
  end if;

  alter table public.bbtrs_trainees alter column cohort_month drop not null;
  alter table public.bbtrs_trainees alter column cohort_year drop not null;

  alter table public.bbtrs_trainees drop constraint if exists bbtrs_trainees_cohort_chk;
  alter table public.bbtrs_trainees add constraint bbtrs_trainees_cohort_chk check (
    (is_test = true and cohort_month is null and cohort_year is null and cohort_label = 'TEST')
    or (is_test = false and cohort_month is not null and cohort_year is not null)
  );
end
$repair$;
