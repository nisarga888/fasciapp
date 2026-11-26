-- The photo paths are chosen before insert, so the assessment id has to be
-- the one the edge function already uploaded.

drop function if exists public.fa_assess_save(text, jsonb, text[], text, text, text);

create or replace function public.fa_assess_save(
  p_id uuid,
  p_token text,
  p_data jsonb,
  p_flags text[],
  p_front text,
  p_side text,
  p_back text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.client_assess_links;
  r public.scan_access;
  em text;
  admin boolean;
  act boolean;
  prefix text;
begin
  if p_id is null or p_token is null or p_front is null or p_side is null or p_back is null then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  select * into link from public.client_assess_links where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  prefix := link.practitioner_id::text || '/' || p_id::text || '/';
  if p_front is distinct from prefix || 'front.webp'
     or p_side is distinct from prefix || 'side.webp'
     or p_back is distinct from prefix || 'back.webp' then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  insert into public.scan_access(user_id, email)
  values (link.practitioner_id, (select email from auth.users where id = link.practitioner_id))
  on conflict (user_id) do nothing;
  select * into r from public.scan_access where user_id = link.practitioner_id for update;
  select lower(email) into em from auth.users where id = link.practitioner_id;
  admin := link.practitioner_id = 'fea03ec6-5408-494d-8848-228c34f357de'::uuid
    or em = 'nisarga8@gmail.com';
  act := r.plan in ('practitioner', 'pro', 'yearly')
    and (r.expires_at is null or r.expires_at > now());
  if admin or act then
    null;
  elsif r.trial_remaining > 0 then
    update public.scan_access
      set trial_remaining = trial_remaining - 1, updated_at = now()
      where user_id = link.practitioner_id;
  else
    return jsonb_build_object('ok', false, 'code', 'no_credit');
  end if;
  insert into public.assessments (
    id, owner_id, client_name, data, red_flags, photo_front, photo_side, photo_back, via
  ) values (
    p_id, link.practitioner_id, link.client_name,
    coalesce(p_data, '{}'::jsonb), coalesce(p_flags, '{}'::text[]),
    p_front, p_side, p_back, 'client'
  );
  return jsonb_build_object('ok', true, 'id', p_id, 'name', link.client_name, 'key', link.client_key, 'user_id', link.practitioner_id);
end;
$$;

revoke all on function public.fa_assess_save(uuid, text, jsonb, text[], text, text, text) from public, anon, authenticated;
grant execute on function public.fa_assess_save(uuid, text, jsonb, text[], text, text, text) to service_role;
