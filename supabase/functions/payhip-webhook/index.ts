// Supabase Edge Function: payhip-webhook. Payhip "paid"/"refunded" -> PostHog EU events "purchase"/"refund" + "paid" -> breathe_events sale row.
// A paid Breathe for Stress and Sleep order (product jCza7) also writes journey_access for that email. No buyer email is sent, and no email or name is forwarded to PostHog.
// Auth: ?token=PAYHIP_WEBHOOK_TOKEN, plus signature check when PAYHIP_API_KEY secret is set.
const PH = "https://eu.i.posthog.com/i/v0/e/", KEY = "phc_trWEUz8z2gqsJJtZ3KmyDkXqxqNbLZmfp6cgt7ZRaotG";
const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
const JOURNEY_KEY = "jCza7";
function journeyItem(items: any[]) {
  return (items || []).find((i: any) => String(i?.product_key || "") === JOURNEY_KEY || /breathe for stress/i.test(String(i?.product_name || "")));
}
function buyerEmail(b: any) {
  const email = String(b?.email || "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : "";
}
async function journeyAccess(email: string, orderId: string, productKey: string, revoke: boolean) {
  const U = Deno.env.get("SUPABASE_URL")!, SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const headers = { apikey: SK, Authorization: "Bearer " + SK, "content-type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" };
  if (revoke) {
    await fetch(U + "/rest/v1/journey_access?email=eq." + encodeURIComponent(email), { method: "PATCH", headers, body: JSON.stringify({ revoked_at: new Date().toISOString() }) }).catch(() => {});
    return;
  }
  await fetch(U + "/rest/v1/journey_access?on_conflict=email", { method: "POST", headers, body: JSON.stringify({ email, order_id: orderId.slice(0, 80), product_key: productKey.slice(0, 40), revoked_at: null }) }).catch(() => {});
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  if (new URL(req.url).searchParams.get("token") !== Deno.env.get("PAYHIP_WEBHOOK_TOKEN")) return new Response("forbidden", { status: 403 });
  let b: any; try { b = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const api = Deno.env.get("PAYHIP_API_KEY"); if (api && b.signature !== await sha256(api)) return new Response("bad signature", { status: 401 });
  const ev = b.type === "paid" ? "purchase" : b.type === "refunded" ? "refund" : null;
  if (!ev) return new Response("ignored");
  const items = Array.isArray(b.items) ? b.items : [];
  const amount = (ev === "refund" ? (b.amount_refunded ?? b.price) : b.price) / 100;
  const props: Record<string, unknown> = {
    $process_person_profile: false, $ip: null, $lib: "payhip-webhook",
    product: items.map((i: any) => i.product_name).join(" + ") || "unknown",
    product_key: items.map((i: any) => i.product_key).join(","),
    price: amount, revenue: ev === "refund" ? -amount : amount, currency: b.currency,
    used_coupon: items.some((i: any) => i.used_coupon === true || i.used_coupon === "true"),
    on_sale: items.some((i: any) => i.on_sale === true), payment_type: b.payment_type,
    full_refund: ev === "refund" ? b.amount_refunded === b.price : undefined, test: !!b.test,
  };
  const ts = new Date(((ev === "refund" ? b.date_refunded : b.date) || Date.now() / 1000) * 1000).toISOString();
  if (ev === "purchase" && !b.test_breathe_skip) {
    const U = Deno.env.get("SUPABASE_URL")!, SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await fetch(U + "/rest/v1/breathe_events", { method: "POST", headers: { apikey: SK, Authorization: "Bearer " + SK, "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ event: "sale", page: "payhip", amount, currency: String(b.currency ?? "").slice(0, 3) || null, target: String(items.map((i: any) => i.product_key).join(",")).slice(0, 40) || null }) }).catch(() => {});
  }
  const item = journeyItem(items);
  const email = buyerEmail(b);
  if (item && email) await journeyAccess(email, String(b.id || ""), String(item.product_key || JOURNEY_KEY), ev === "refund");
  const r = await fetch(PH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: KEY, event: ev, distinct_id: "payhip_" + (b.id || crypto.randomUUID()), properties: props, timestamp: ts }) });
  return Response.json({ ok: r.ok, posthog: r.status, event: ev });
});
