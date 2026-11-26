// Public intake submit. Verifies Turnstile, rate-limits, then inserts with the
// service role. Health answers are never written to logs or to the email.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}

function clip(v: unknown, n: number) {
  const s = String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  return s.length > n ? s.slice(0, n) : s;
}

function fold(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l").trim().replace(/\s+/g, " ").toLowerCase();
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "That didn't work. Please try again." }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "That didn't work. Please try again." }, 400); }

  const secret = Deno.env.get("TURNSTILE_SECRET") || "";
  if (!secret) return json({ error: "Intake forms aren't available right now." }, 503);
  const token = clip(body.token, 2048);
  const ip = (req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim();
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const verdict = await check.json().catch(() => ({ success: false }));
  if (!verdict.success) return json({ error: "Please complete the security check." }, 400);

  const name = clip(body.name, 80);
  const contact = clip(body.contact, 120);
  if (!name || !contact) return json({ error: "Please add your name and an email or phone." }, 400);
  if (body.consent !== true) return json({ error: "Please agree to share your answers with your practitioner." }, 400);
  const slug = clip(body.slug, 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return json({ error: "That link isn't valid." }, 400);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return json({ error: "Intake forms aren't available right now." }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const hash = await sha256("intake\n" + ip + "\n" + (req.headers.get("user-agent") || ""));
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await admin.from("intake_rate").select("id", { count: "exact", head: true }).eq("ip_hash", hash).gt("created_at", since);
  if ((recent.count || 0) >= 8) return json({ error: "Please wait a little while before sending another form." }, 429);
  await admin.from("intake_rate").insert({ ip_hash: hash });

  const prac = await admin.from("practitioners").select("user_id,name,consent,admin_hidden").eq("slug", slug).maybeSingle();
  const p = prac.data;
  if (!p || p.consent === false || p.admin_hidden || !p.user_id) return json({ error: "This practitioner isn't available." }, 404);

  let matched: string | null = null;
  const email = contact.includes("@") ? contact.toLowerCase() : "";
  if (email) {
    const hit = await admin.from("planned_sessions").select("client_name").eq("practitioner_id", p.user_id).ilike("client_email", email).limit(1);
    if (hit.data && hit.data[0]) matched = fold(hit.data[0].client_name || "");
  }
  if (!matched) {
    const hit = await admin.from("planned_sessions").select("client_name").eq("practitioner_id", p.user_id).ilike("client_name", name).limit(1);
    if (hit.data && hit.data[0]) matched = fold(hit.data[0].client_name || "");
  }

  const saved = await admin.rpc("fa_intake_save", {
    p_user: p.user_id,
    p_name: name,
    p_contact: contact,
    p_dob: clip(body.dob, 40),
    p_concern: clip(body.concern, 2000),
    p_conditions: clip(body.conditions, 2000),
    p_injuries: clip(body.injuries, 2000),
    p_pregnant: body.pregnant === true,
    p_hope: clip(body.hope, 2000),
    p_matched: matched || "",
  });
  if (saved.error || !saved.data || saved.data.ok !== true) {
    if (saved.data && saved.data.code === "no_credit") {
      return json({ error: "This practitioner's form isn't available right now." }, 403);
    }
    return json({ error: "That didn't work. Please try again." }, 400);
  }

  const brevo = Deno.env.get("BREVO_API_KEY") || "";
  if (brevo) {
    const user = await admin.auth.admin.getUserById(p.user_id);
    const to = user.data?.user?.email || "";
    const first = name.split(/\s+/)[0] || "a client";
    if (to) {
      const html = `<!doctype html><html><body style="margin:0;background:#02191E;font-family:Helvetica,Arial,sans-serif;color:#F3EDE4">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#02191E"><tr><td align="center" style="padding:28px 14px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a2a30;border:1px solid #C99E6755;border-radius:14px">
<tr><td style="padding:26px 26px 8px;text-align:center;color:#C99E67;font-size:22px">FasciApp</td></tr>
<tr><td style="padding:8px 26px 6px;font-size:18px;text-align:center"><b>New intake form</b></td></tr>
<tr><td style="padding:12px 26px 8px;font-size:15px;line-height:1.5;text-align:center">${first.replace(/[&<>]/g, "")} sent you an intake form.</td></tr>
<tr><td align="center" style="padding:12px 26px 26px"><a href="https://fasciapp.app/app/?forms=1" style="display:inline-block;background:#C99E67;color:#02191E;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:24px">Open in FasciApp</a></td></tr>
</table></td></tr></table></body></html>`;
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevo, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: "FasciApp", email: "hello@fasciapp.app" },
          to: [{ email: to }],
          subject: "New intake form from " + first,
          htmlContent: html,
          tags: ["intake"],
        }),
      });
    }
  }
  return json({ ok: true });
});
