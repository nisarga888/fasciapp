// Public lookup for a per-client assessment link. Returns the greeting
// and whether the practitioner can receive a form. No health data.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}

const ADMIN = "fea03ec6-5408-494d-8848-228c34f357de";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "That didn't work. Please try again." }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const token = String(body.token || "").trim().toLowerCase();
  if (!/^[a-f0-9]{36}$/.test(token)) return json({ error: "That link isn't valid." }, 404);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return json({ error: "This form isn't available right now." }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const link = await admin.from("client_assess_links").select("practitioner_id,client_name").eq("token", token).maybeSingle();
  const row = link.data;
  if (!row) return json({ error: "That link isn't valid." }, 404);
  const prac = await admin.from("practitioners").select("name,photo,city,consent,admin_hidden").eq("user_id", row.practitioner_id).maybeSingle();
  const p = prac.data;
  if (!p || p.consent === false || p.admin_hidden) return json({ error: "This practitioner isn't available." }, 404);
  const access = await admin.from("scan_access").select("plan,trial_remaining,expires_at").eq("user_id", row.practitioner_id).maybeSingle();
  const user = await admin.auth.admin.getUserById(row.practitioner_id);
  const email = (user.data?.user?.email || "").toLowerCase();
  const isAdmin = row.practitioner_id === ADMIN || email === "nisarga8@gmail.com";
  const a = access.data;
  const exp = a?.expires_at ? new Date(a.expires_at).getTime() : null;
  const active = !!a && ["practitioner", "pro", "yearly"].includes(a.plan) && (exp === null || exp > Date.now());
  const allowed = isAdmin || active || (a?.trial_remaining || 0) > 0;
  const name = String(row.client_name || "").trim();
  const first = name.split(/\s+/)[0] || "there";
  return json({
    ok: true,
    name,
    first,
    allowed,
    practitioner: { name: p.name || "Your practitioner", photo: p.photo || "", city: p.city || "" },
  });
});
