// FasciApp Scan: creates a Stripe Checkout Session (EUR only, no Adaptive Pricing) for the signed-in user.
// POST {plan: "single"|"monthly"|"yearly"} with Authorization: Bearer <user access token>  ->  {url}
// Secrets (Supabase dashboard > Edge Functions > Secrets, never in code): STRIPE_SECRET_KEY (a restricted key is fine:
//   Checkout Sessions write, Customers read). SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are built in.
// Deploy with "Verify JWT" OFF (the function checks the user token itself).
import { createClient } from "npm:@supabase/supabase-js@2";
const PLANS: Record<string, {price: string, mode: "payment"|"subscription"}> = {
  single:  {price: "price_1UXgGmLr0dJ1Eyed86DlTztz", mode: "payment"},       // €3 one-time
  monthly: {price: "price_1UUpKJLr0dJ1EyediB5AqzUJ", mode: "subscription"},  // €25/month, up to 30 scans
  yearly:  {price: "price_1UXgGrLr0dJ1EyedB0navBRf", mode: "subscription"},  // €150/year, unlimited
};
const ORIGINS = ["https://fasciapp.app", "https://www.fasciapp.app", "https://nisarga888.github.io"];
function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {"access-control-allow-origin": ORIGINS.includes(o) ? o : ORIGINS[0], "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS", "vary": "origin"};
}
const j = (req: Request, b: unknown, status = 200) => new Response(JSON.stringify(b), {status, headers: {...cors(req), "content-type": "application/json"}});
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: cors(req)});
  if (req.method !== "POST") return j(req, {error: "method"}, 405);
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return j(req, {error: "not_configured"}, 503);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } = { user: null }, error } = await db.auth.getUser(token);
  if (error || !user) return j(req, {error: "sign_in"}, 401);
  let plan = "";
  try { plan = String((await req.json()).plan || ""); } catch { /* empty */ }
  if (plan === "practitioner") plan = "monthly";
  const P = PLANS[plan];
  if (!P) return j(req, {error: "plan"}, 400);
  const { data: row } = await db.from("scan_access").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  const f = new URLSearchParams();
  f.set("mode", P.mode);
  f.set("line_items[0][price]", P.price); f.set("line_items[0][quantity]", "1");
  f.set("currency", "eur");
  f.set("adaptive_pricing[enabled]", "false");
  f.set("allow_promotion_codes", "true");
  // client_reference_id is deliberately NOT used: the account's MER supervision webhook treats it as a supervision sign-up id.
  if (row?.stripe_customer_id) f.set("customer", row.stripe_customer_id); else if (user.email) f.set("customer_email", user.email);
  f.set("success_url", "https://fasciapp.app/scan/?paid=1&plan=" + plan);
  f.set("cancel_url", "https://fasciapp.app/scan/?cancel=1#pricing");
  for (const [k, v] of [["source", "fasciapp-scan"], ["user_id", user.id], ["plan", plan]]) {
    f.set(`metadata[${k}]`, v);
    if (P.mode === "subscription") f.set(`subscription_data[metadata][${k}]`, v);
  }
  if (P.mode === "subscription") f.set("payment_method_collection", "if_required");
  else if (!row?.stripe_customer_id) f.set("customer_creation", "always");
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {method: "POST", body: f,
    headers: {authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded"}});
  const s = await r.json();
  if (!r.ok) { console.error("stripe", r.status, s?.error?.code, s?.error?.message); return j(req, {error: "stripe", code: s?.error?.code || r.status}, 502); }
  return j(req, {url: s.url});
});
