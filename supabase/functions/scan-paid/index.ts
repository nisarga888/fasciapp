// FasciApp Scan: Stripe webhook -> instant scan activation in scan_access (SQL fa_scan_stripe_apply, idempotent per event AND per
// checkout session; the daily check and hand grants log into the same scan_stripe_events table, so nothing is granted twice).
// Events: checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid (renewals),
//         customer.subscription.updated, customer.subscription.deleted.
// Buyer matched by FasciApp user id (Checkout Session metadata), else subscription id, else customer email (case-insensitive).
// No account with that email yet -> stored in scan_stripe_pending and granted when that email opens the scan page.
// Secrets (never in code): STRIPE_SCAN_WEBHOOK_SECRET (signature, required), STRIPE_SCAN_KEY (restricted key, optional:
//   Subscriptions Read gives the exact first period end), BREVO_API_KEY, SCAN_EMAIL_ON=1 to send the buyer confirmation email.
// Deploy with "Verify JWT" OFF. Endpoint: https://smgccthvratixddwfhmu.supabase.co/functions/v1/scan-paid
import { createClient } from "npm:@supabase/supabase-js@2";
const PRICE_PLAN: Record<string, string> = {
  "price_1UXgGmLr0dJ1Eyed86DlTztz": "single", "price_1UUpKJLr0dJ1EyediB5AqzUJ": "practitioner", "price_1UXgGrLr0dJ1EyedB0navBRf": "yearly" };
const LINK_PLAN: Record<string, string> = {
  "plink_1UXgH7Lr0dJ1Eyedn2EWrpbq": "single", "plink_1UUpKLLr0dJ1Eyed9HXQBR9S": "practitioner", "plink_1UXgH9Lr0dJ1Eyedall6d4Sl": "yearly" };
const enc = new TextEncoder();
async function verify(body: string, header: string, secret: string) {
  const parts = header.split(",").map(x => x.trim());
  const t = parts.find(x => x.startsWith("t="))?.slice(2);
  if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${t}.${body}`)))).map(b => b.toString(16).padStart(2, "0")).join("");
  return parts.some(x => x === `v1=${sig}`);
}
const stripe = async (path: string) => {
  const key = Deno.env.get("STRIPE_SCAN_KEY"); if (!key) return null;
  try { const r = await fetch("https://api.stripe.com/v1/" + path, {headers: {authorization: `Bearer ${key}`}}); return r.ok ? await r.json() : null; } catch { return null; }
};
const iso = (t?: number) => t ? new Date(t * 1000).toISOString() : null;
const periodEnd = (sub: any) => iso(sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end);
const subPlan = (sub: any) => { for (const it of sub?.items?.data || []) if (PRICE_PLAN[it.price?.id] && PRICE_PLAN[it.price.id] !== "single") return PRICE_PLAN[it.price.id]; return null; };
const linePrice = (l: any) => l?.price?.id || l?.pricing?.price_details?.price || l?.plan?.id || null;
const idOf = (x: any) => typeof x === "string" ? x : x?.id || null;

const PLAN_NAME: Record<string, string> = {single: "Single scan", practitioner: "Practitioner (monthly)", yearly: "Yearly"};
function emailHtml(plan: string, scans: number, expires: string | null) {
  const end = expires ? new Date(expires).toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw"}) : "";
  const what = plan === "single" ? `You have <b>${scans} scan${scans === 1 ? "" : "s"}</b> ready to use.`
    : plan === "practitioner" ? `Your plan includes up to <b>30 scans a month</b> and renews automatically${end ? ` (current period until <b>${end}</b>)` : ""}.`
    : `You have <b>unlimited scans</b>${end ? ` until <b>${end}</b>` : ""}, renewing automatically.`;
  return `<!doctype html><html><body style="margin:0;background:#02191E;font-family:Helvetica,Arial,sans-serif;color:#F3EDE4">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#02191E"><tr><td align="center" style="padding:28px 14px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a2a30;border:1px solid #C99E6755;border-radius:14px">
<tr><td style="padding:26px 26px 8px;text-align:center;color:#C99E67;font-size:22px;letter-spacing:.5px">FasciApp</td></tr>
<tr><td style="padding:6px 26px 4px;font-size:18px;color:#F3EDE4;text-align:center"><b>Your scan access is active</b></td></tr>
<tr><td style="padding:14px 26px;font-size:15px;line-height:1.55;color:#F3EDE4">Thank you for your purchase.<br>Plan: <b>${PLAN_NAME[plan] || plan}</b><br>${what}</td></tr>
<tr><td align="center" style="padding:8px 26px 22px"><a href="https://fasciapp.app/app/?scan=hub" style="display:inline-block;background:#C99E67;color:#02191E;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:24px">Start a scan</a></td></tr>
<tr><td style="padding:0 26px 24px;font-size:13px;color:#9fb3b5;text-align:center">Need help? Write to <a href="mailto:hello@fasciapp.app" style="color:#C99E67">hello@fasciapp.app</a></td></tr>
</table></td></tr></table></body></html>`;
}
async function sendConfirmation(to: string, plan: string, scans: number, expires: string | null) {
  if (Deno.env.get("SCAN_EMAIL_ON") !== "1" || !to || !Deno.env.get("BREVO_API_KEY")) return "email off";
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {method: "POST", headers: {"api-key": Deno.env.get("BREVO_API_KEY")!, "content-type": "application/json", accept: "application/json"},
    body: JSON.stringify({sender: {name: "FasciApp", email: "hello@fasciapp.app"}, replyTo: {email: "hello@fasciapp.app"}, to: [{email: to}],
      subject: "Your FasciApp scan access is active", htmlContent: emailHtml(plan, scans, expires), tags: ["scan-activated"]})});
  if (!r.ok) console.error("brevo", r.status, (await r.text()).slice(0, 200));
  return r.ok ? "email sent" : "email failed";
}

Deno.serve(async (req) => {
  const body = await req.text();
  const whsec = Deno.env.get("STRIPE_SCAN_WEBHOOK_SECRET");
  if (!whsec) return new Response("not configured", {status: 503});
  if (!(await verify(body, req.headers.get("stripe-signature") || "", whsec))) return new Response("bad sig", {status: 400});
  const ev = JSON.parse(body);
  const t0 = Date.now();
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apply = async (a: Record<string, unknown>, notify = false) => {
    const { data, error } = await db.rpc("fa_scan_stripe_apply", {p_event: ev.id, p_type: ev.type, p_session: null, p_user: null, p_email: null,
      p_plan: null, p_expires: null, p_sub: null, p_customer: null, ...a});
    if (error) { console.error("apply", ev.id, error.message); return new Response("db error", {status: 500}); }
    let mail = "";
    if (notify && data?.status === "ok" && /^(single|subscribe)/.test(data.result || ""))
      mail = await sendConfirmation(data.email, data.plan, data.scans ?? 0, data.expires_at);
    console.log("scan-paid", ev.type, ev.id, data?.status, data?.result || "", mail, `${Date.now() - t0}ms`);
    return new Response(JSON.stringify({...data, email: undefined, mail}));
  };
  const o = ev.data?.object || {};
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    if (!["paid", "no_payment_required"].includes(o.payment_status)) return new Response("not paid yet");
    const mine = o.metadata?.source === "fasciapp-scan";
    const plan = mine ? (o.metadata.plan === "monthly" ? "practitioner" : o.metadata.plan) : LINK_PLAN[o.payment_link];
    if (!plan || !PLAN_NAME[plan]) return new Response("ignored (not a scan checkout)");
    const user = mine && /^[0-9a-f-]{36}$/.test(o.metadata.user_id || "") ? o.metadata.user_id : null;
    const email = o.customer_details?.email || o.customer_email || null;
    const customer = idOf(o.customer);
    if (plan === "single") return apply({p_session: o.id, p_user: user, p_email: email, p_action: "single", p_customer: customer}, true);
    const subId = idOf(o.subscription);
    const sub = subId ? await stripe("subscriptions/" + subId) : null;
    const exp = periodEnd(sub) || new Date(Date.now() + (plan === "yearly" ? 366 : 31) * 864e5).toISOString();
    return apply({p_session: o.id, p_user: user, p_email: email, p_action: "subscribe", p_plan: subPlan(sub) || plan, p_expires: exp, p_sub: subId, p_customer: customer}, true);
  }
  if (ev.type === "invoice.paid") {
    const subId = idOf(o.subscription) || idOf(o.parent?.subscription_details?.subscription);
    const line = (o.lines?.data || []).find((l: any) => PRICE_PLAN[linePrice(l)] && PRICE_PLAN[linePrice(l)] !== "single");
    if (!subId || !line) return new Response("ignored (not a scan subscription invoice)");
    return apply({p_action: "renew", p_plan: PRICE_PLAN[linePrice(line)], p_expires: iso(line.period?.end), p_sub: subId, p_customer: idOf(o.customer)});
  }
  if (ev.type === "customer.subscription.updated" || ev.type === "customer.subscription.deleted") {
    const plan = subPlan(o);
    if (!plan) return new Response("ignored (not a scan subscription)");
    const user = /^[0-9a-f-]{36}$/.test(o.metadata?.user_id || "") ? o.metadata.user_id : null;
    const ended = ev.type === "customer.subscription.deleted" || ["canceled", "unpaid", "incomplete_expired"].includes(o.status);
    if (ended) return apply({p_user: user, p_action: "end", p_sub: o.id, p_customer: idOf(o.customer)});
    if (!["active", "trialing", "past_due"].includes(o.status)) return new Response("ignored status " + o.status);
    return apply({p_user: user, p_action: "renew", p_plan: plan, p_expires: periodEnd(o), p_sub: o.id, p_customer: idOf(o.customer)});
  }
  return new Response("ignored");
});
