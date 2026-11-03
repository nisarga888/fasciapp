// FasciApp Scan: Stripe webhook -> automatic plan activation in scan_access (via SQL fa_scan_stripe_apply, idempotent per event and session).
// Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted.
// Authenticity: Stripe signature with STRIPE_SCAN_WEBHOOK_SECRET if set; otherwise the event is re-fetched from the Stripe API with
// STRIPE_SECRET_KEY (only events that really exist in Stripe are processed). Deploy with "Verify JWT" OFF.
// Endpoint: https://smgccthvratixddwfhmu.supabase.co/functions/v1/scan-paid
import { createClient } from "npm:@supabase/supabase-js@2";
const PRICE_PLAN: Record<string, string> = {
  "price_1UXgGmLr0dJ1Eyed86DlTztz": "single", "price_1UUpKJLr0dJ1EyediB5AqzUJ": "practitioner", "price_1UXgGrLr0dJ1EyedB0navBRf": "yearly" };
const LINK_PLAN: Record<string, string> = {   // fallback Payment Links (no user id, matched by email)
  "plink_1UXgH7Lr0dJ1Eyedn2EWrpbq": "single", "plink_1UUpKLLr0dJ1Eyed9HXQBR9S": "practitioner", "plink_1UXgH9Lr0dJ1Eyedall6d4Sl": "yearly" };
const enc = new TextEncoder();
async function verify(body: string, header: string, secret: string) {
  const p = Object.fromEntries(header.split(",").map(x => x.split("=") as [string, string]));
  if (!p.t || !p.v1 || Math.abs(Date.now() / 1000 - Number(p.t)) > 300) return false;
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${p.t}.${body}`)))).map(b => b.toString(16).padStart(2, "0")).join("");
  return header.split(",").some(x => x === `v1=${sig}`);
}
const stripe = async (path: string) => {
  const r = await fetch("https://api.stripe.com/v1/" + path, {headers: {authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`}});
  return r.ok ? await r.json() : null;
};
const periodEnd = (sub: any) => { const t = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end; return t ? new Date(t * 1000).toISOString() : null; };
const subPlan = (sub: any) => { for (const it of sub?.items?.data || []) if (PRICE_PLAN[it.price?.id] && PRICE_PLAN[it.price.id] !== "single") return PRICE_PLAN[it.price.id]; return null; };
Deno.serve(async (req) => {
  const body = await req.text();
  const whsec = Deno.env.get("STRIPE_SCAN_WEBHOOK_SECRET");
  let ev: any;
  if (whsec) {
    if (!(await verify(body, req.headers.get("stripe-signature") || "", whsec))) return new Response("bad sig", {status: 400});
    ev = JSON.parse(body);
  } else if (Deno.env.get("STRIPE_SECRET_KEY")) {
    let id = ""; try { id = String(JSON.parse(body).id || ""); } catch { /* empty */ }
    if (!/^evt_[A-Za-z0-9]+$/.test(id)) return new Response("bad event", {status: 400});
    ev = await stripe("events/" + id);
    if (!ev) return new Response("unknown event", {status: 400});
  } else return new Response("not configured", {status: 503});
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apply = async (a: Record<string, unknown>) => {
    const { data, error } = await db.rpc("fa_scan_stripe_apply", {p_event: ev.id, p_type: ev.type, p_session: null, p_user: null, p_email: null,
      p_plan: null, p_expires: null, p_sub: null, p_customer: null, ...a});
    if (error) { console.error("apply", error.message); return new Response("db error", {status: 500}); }
    return new Response(JSON.stringify(data));
  };
  const o = ev.data?.object || {};
  if (ev.type === "checkout.session.completed") {
    if (!["paid", "no_payment_required"].includes(o.payment_status)) return new Response("not paid");
    const mine = o.metadata?.source === "fasciapp-scan";
    let plan = mine ? (o.metadata.plan === "monthly" ? "practitioner" : o.metadata.plan) : LINK_PLAN[o.payment_link];
    if (!plan) return new Response("ignored (not a scan checkout)");
    const user = mine && /^[0-9a-f-]{36}$/.test(o.metadata.user_id || "") ? o.metadata.user_id : null;
    const email = o.customer_details?.email || o.customer_email || null;
    const customer = typeof o.customer === "string" ? o.customer : o.customer?.id || null;
    if (plan === "single") return apply({p_session: o.id, p_user: user, p_email: email, p_action: "single", p_customer: customer});
    const subId = typeof o.subscription === "string" ? o.subscription : o.subscription?.id;
    const sub = subId ? await stripe("subscriptions/" + subId) : null;
    const exp = periodEnd(sub) || new Date(Date.now() + (plan === "yearly" ? 366 : 31) * 864e5).toISOString();
    return apply({p_session: o.id, p_user: user, p_email: email, p_action: "subscribe", p_plan: subPlan(sub) || plan, p_expires: exp, p_sub: subId, p_customer: customer});
  }
  if (ev.type === "customer.subscription.updated" || ev.type === "customer.subscription.deleted") {
    const plan = subPlan(o);
    if (!plan) return new Response("ignored (not a scan subscription)");
    const user = /^[0-9a-f-]{36}$/.test(o.metadata?.user_id || "") ? o.metadata.user_id : null;
    const customer = typeof o.customer === "string" ? o.customer : null;
    const ended = ev.type === "customer.subscription.deleted" || ["canceled", "unpaid", "incomplete_expired"].includes(o.status);
    if (ended) return apply({p_user: user, p_action: "end", p_sub: o.id, p_customer: customer});
    if (!["active", "trialing", "past_due"].includes(o.status)) return new Response("ignored status " + o.status);
    return apply({p_user: user, p_action: "renew", p_plan: plan, p_expires: periodEnd(o), p_sub: o.id, p_customer: customer});
  }
  return new Response("ignored");
});
