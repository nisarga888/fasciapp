-- When a signed-in person confirms a new login email, keep the public
-- contact email in step if it was the same address, and the scan account
-- email if it still holds the previous login. A different public contact
-- email is left as it is.

create or replace function public.fa_sync_login_email(p_previous text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  now_email text := nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), '');
  prev text := nullif(lower(btrim(coalesce(p_previous, ''))), '');
begin
  if uid is null or now_email is null or prev is null or prev = now_email then
    return;
  end if;
  update public.practitioners
  set email = now_email
  where user_id = uid
    and (email is null or btrim(email) = '' or lower(btrim(email)) = prev);
  update public.scan_access
  set email = now_email
  where user_id = uid
    and lower(btrim(coalesce(email, ''))) = prev;
end;
$$;

revoke all on function public.fa_sync_login_email(text) from public, anon;
grant execute on function public.fa_sync_login_email(text) to authenticated;
