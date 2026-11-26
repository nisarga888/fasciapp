-- Match an unmatched scan payment to one practitioner, and let the buyer
-- claim the checkout they just returned from. Prices and grant amounts stay
-- as they are. A payment is applied once per checkout session.

alter table public.scan_stripe_pending
  add column if not exists admin_flag boolean not null default false;

create or replace function public.fa_fold(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(regexp_replace(translate(btrim(coalesce(t, '')),
    'ÁÀÂÄÃÅáàâäãåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÝýÿÑñÇçŁłØøÆæŒœß',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuYyyNnCcLlOoAaOos'),
    '\s+', ' ', 'g'));
$$;

drop function if exists public.fa_scan_stripe_apply(text, text, text, uuid, text, text, text, timestamp with time zone, text, text);

create or replace function public.fa_scan_stripe_apply(
  p_event text,
  p_type text,
  p_session text,
  p_user uuid,
  p_email text,
  p_action text,
  p_plan text,
  p_expires timestamp with time zone,
  p_sub text,
  p_customer text,
  p_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u uuid;
  r public.scan_access;
  res text;
  n int := 0;
  how text := '';
begin
  if exists(select 1 from scan_stripe_events where id = p_event) then
    return jsonb_build_object('status', 'duplicate_event');
  end if;
  if p_session is not null and exists(select 1 from scan_stripe_events where session_id = p_session) then
    insert into scan_stripe_events(id, type, result) values (p_event, p_type, 'duplicate_session');
    return jsonb_build_object('status', 'duplicate_session');
  end if;
  if p_session is not null and p_user is null and exists(select 1 from scan_stripe_pending where session_id = p_session) then
    insert into scan_stripe_events(id, type, result) values (p_event, p_type, 'duplicate_pending');
    return jsonb_build_object('status', 'duplicate_pending');
  end if;
  if p_user is not null then
    select id into u from auth.users where id = p_user;
  end if;
  if u is null and p_sub is not null then
    select user_id into u from scan_access where stripe_subscription_id = p_sub limit 1;
  end if;
  if u is null and coalesce(p_email, '') <> '' then
    select id into u from auth.users where lower(email) = lower(p_email) order by created_at limit 1;
  end if;
  if u is null and coalesce(p_email, '') <> '' then
    select count(distinct pr.user_id) into n
    from public.practitioners pr
    where pr.user_id is not null
      and public.fa_fold(pr.email) <> ''
      and public.fa_fold(pr.email) = public.fa_fold(p_email);
    if n = 1 then
      select pr.user_id into u from public.practitioners pr
      where pr.user_id is not null and public.fa_fold(pr.email) = public.fa_fold(p_email)
      limit 1;
      how := 'profile email';
    elsif n > 1 then
      how := 'ambiguous profile email';
    end if;
  end if;
  if u is null and how = '' and public.fa_fold(p_name) <> '' then
    select count(distinct pr.user_id) into n
    from public.practitioners pr
    where pr.user_id is not null
      and public.fa_fold(pr.name) = public.fa_fold(p_name);
    if n = 1 then
      select pr.user_id into u from public.practitioners pr
      where pr.user_id is not null and public.fa_fold(pr.name) = public.fa_fold(p_name)
      limit 1;
      how := 'name';
    elsif n > 1 then
      how := 'ambiguous name';
    else
      how := 'no name match';
    end if;
  elsif u is null and how = '' then
    how := 'no match';
  end if;
  if u is null then
    if p_session is not null and coalesce(p_email, '') <> '' and p_action in ('single', 'subscribe') then
      insert into scan_stripe_pending(session_id, event_id, type, email, action, plan, expires_at, sub_id, customer_id, admin_flag)
        values (p_session, p_event, p_type, lower(p_email), p_action, p_plan, p_expires, p_sub, p_customer, true)
        on conflict do nothing;
      insert into scan_stripe_events(id, type, result) values (p_event, p_type, 'pending ' || how);
      return jsonb_build_object('status', 'pending', 'flag', how);
    end if;
    insert into scan_stripe_events(id, type, session_id, result) values (p_event, p_type, p_session, 'unmatched ' || how);
    return jsonb_build_object('status', 'unmatched', 'flag', how);
  end if;
  insert into scan_access(user_id, email) values (u, (select email from auth.users where id = u)) on conflict (user_id) do nothing;
  select * into r from scan_access where user_id = u for update;
  if p_action = 'single' then
    update scan_access set plan = case when plan in ('practitioner', 'pro', 'yearly') and (expires_at is null or expires_at > now()) then plan else 'single' end,
      trial_remaining = trial_remaining + 1, stripe_customer_id = coalesce(p_customer, stripe_customer_id), updated_at = now() where user_id = u;
    res := 'single +1';
  elsif p_action = 'subscribe' then
    update scan_access set plan = p_plan, expires_at = greatest(p_expires, case when r.stripe_subscription_id = p_sub then r.expires_at end),
      scans_used = case when r.plan = p_plan and r.stripe_subscription_id = p_sub then scans_used else 0 end,
      stripe_subscription_id = p_sub, stripe_customer_id = coalesce(p_customer, stripe_customer_id), updated_at = now() where user_id = u;
    res := 'subscribe ' || p_plan;
  elsif p_action = 'renew' then
    if r.stripe_subscription_id is not null and r.stripe_subscription_id <> p_sub then res := 'renew skipped (other subscription)';
    elsif r.stripe_subscription_id is null then res := 'renew skipped (subscription not linked yet)';
    else
      update scan_access set plan = p_plan,
        scans_used = case when p_plan = 'practitioner' and r.expires_at is not null and p_expires > r.expires_at + interval '1 day' then 0 else scans_used end,
        expires_at = p_expires, stripe_customer_id = coalesce(p_customer, stripe_customer_id), updated_at = now() where user_id = u;
      res := 'renew ' || p_plan;
    end if;
  elsif p_action = 'end' then
    if r.stripe_subscription_id is distinct from p_sub then res := 'end skipped (other subscription)';
    else update scan_access set expires_at = least(coalesce(expires_at, now()), now()), updated_at = now() where user_id = u; res := 'ended'; end if;
  else res := 'unknown action'; end if;
  if how <> '' then res := res || ' via ' || how; end if;
  insert into scan_stripe_events(id, type, session_id, user_id, result) values (p_event, p_type, p_session, u, res);
  return jsonb_build_object('status', 'ok', 'result', res, 'user_id', u, 'plan', (select plan from scan_access where user_id = u),
    'scans', (select trial_remaining from scan_access where user_id = u), 'expires_at', (select expires_at from scan_access where user_id = u),
    'email', (select email from auth.users where id = u));
end;
$$;

revoke all on function public.fa_scan_stripe_apply(text, text, text, uuid, text, text, text, timestamp with time zone, text, text, text) from public, anon, authenticated;
grant execute on function public.fa_scan_stripe_apply(text, text, text, uuid, text, text, text, timestamp with time zone, text, text, text) to service_role;

-- The signed-in buyer just came back from Checkout. Attach that one unclaimed
-- session to their account. A second call, or a session already applied, does
-- not add another credit.
create or replace function public.fa_scan_claim_return(p_session text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p public.scan_stripe_pending;
  applied jsonb;
begin
  if uid is null or p_session is null or p_session !~ '^cs_(test|live)_' then
    return jsonb_build_object('status', 'bad');
  end if;
  if exists (select 1 from scan_stripe_events where session_id = p_session and user_id is not null) then
    if exists (select 1 from scan_stripe_events where session_id = p_session and user_id = uid) then
      return jsonb_build_object('status', 'already');
    end if;
    return jsonb_build_object('status', 'other');
  end if;
  select * into p from scan_stripe_pending where session_id = p_session for update;
  if not found then
    return jsonb_build_object('status', 'waiting');
  end if;
  if p.claimed_at is not null then
    if p.claimed_by = uid then return jsonb_build_object('status', 'already'); end if;
    return jsonb_build_object('status', 'other');
  end if;
  applied := public.fa_scan_stripe_apply(
    'claim_' || p_session,
    coalesce(p.type, 'checkout.session.completed') || '.claimed',
    p_session, uid, p.email, p.action, p.plan,
    case when p.action = 'subscribe' then greatest(p.expires_at, now()) else p.expires_at end,
    p.sub_id, p.customer_id, null);
  if applied->>'status' = 'ok' then
    update public.scan_stripe_pending
      set claimed_by = uid, claimed_at = now(), admin_flag = false
      where session_id = p_session and claimed_at is null;
  end if;
  return applied || jsonb_build_object('claim', coalesce(applied->>'status', 'bad'));
end;
$$;

revoke all on function public.fa_scan_claim_return(text) from public, anon;
grant execute on function public.fa_scan_claim_return(text) to authenticated;
