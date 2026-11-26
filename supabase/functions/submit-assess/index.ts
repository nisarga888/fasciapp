// Public Body Scan submit for one client link. Verifies Turnstile, rate-limits,
// stores the three posture photos privately, then spends one Body Scan credit
// and saves the assessment on that client. Health answers are never logged
// and never included in the practitioner email.
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

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const TEXT = ["complaint", "goal", "started", "onset", "better", "worse", "started_life", "prev_treatment", "injuries", "structural_other", "exercise", "breath_experience", "body_experience", "energetics_notes", "health", "emotional", "touch_notes", "stop_signal", "contact", "dob", "dominant_hand", "sleep", "pain_pattern", "draping", "release_ok"];
const MULTI = ["reasons", "pain_areas", "pain_type", "tension_areas", "tension_when", "structural", "daily", "breath", "stress_response", "touch", "photo_consent", "red_flags", "energetics"];
const NUM = ["pain_intensity", "stress", "age", "height_cm", "weight_kg"];

function listOf(v: unknown) {
  const a = Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  return a.map((x) => clip(x, 80)).filter(Boolean).slice(0, 30);
}

function cleanData(raw: unknown) {
  const src = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const data: Record<string, unknown> = {};
  TEXT.forEach((k) => { const s = clip(src[k], 2000); if (s) data[k] = s; });
  MULTI.forEach((k) => { const a = listOf(src[k]); if (a.length) data[k] = a; });
  NUM.forEach((k) => {
    if (src[k] == null || src[k] === "") return;
    const n = Number(src[k]);
    if (Number.isFinite(n) && n >= 0 && n <= 500) data[k] = Math.round(n * 10) / 10;
  });
  const gifts = src.gifts && typeof src.gifts === "object" ? src.gifts as Record<string, unknown> : null;
  if (gifts && ["e", "n", "t", "a", "l"].includes(String(gifts.primary))) {
    const answers: Record<string, number> = {};
    const raw = gifts.answers && typeof gifts.answers === "object" ? gifts.answers as Record<string, unknown> : {};
    Object.entries(raw).slice(0, 40).forEach(([k, v]) => {
      const n = Number(v);
      if (/^g\d{1,2}$/.test(k) && n >= 0 && n <= 4) answers[k] = n;
    });
    const pct: Record<string, number> = {};
    const scores: Record<string, number> = {};
    ["e", "n", "t", "a", "l"].forEach((k) => {
      const p = Number((gifts.pct as Record<string, unknown> | undefined)?.[k]);
      const s = Number((gifts.scores as Record<string, unknown> | undefined)?.[k]);
      if (Number.isFinite(p)) pct[k] = Math.max(0, Math.min(100, Math.round(p)));
      if (Number.isFinite(s)) scores[k] = Math.max(0, Math.min(200, Math.round(s)));
    });
    if (Object.keys(answers).length) data.gifts = { v: 1, primary: gifts.primary, secondary: gifts.secondary, blend: gifts.blend === true, rank: listOf(gifts.rank).filter((k) => ["e", "n", "t", "a", "l"].includes(k)), pct, scores, answers };
  }
  return data;
}

function photoBytes(v: unknown): Uint8Array | null {
  const s = String(v || "");
  const m = s.match(/^data:image\/webp;base64,([A-Za-z0-9+/=\s]+)$/);
  if (!m) return null;
  const raw = m[1].replace(/\s/g, "");
  if (raw.length < 32 || raw.length > 1_800_000) return null;
  const bin = atob(raw);
  if (bin.length > 1_400_000) return null;
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "That didn't work. Please try again." }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "That didn't work. Please try again." }, 400); }

  const secret = Deno.env.get("TURNSTILE_SECRET") || "";
  if (!secret) return json({ error: "This form isn't available right now." }, 503);
  const ip = (req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim();
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", clip(body.token, 2048));
  if (ip) form.set("remoteip", ip);
  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const verdict = await check.json().catch(() => ({ success: false }));
  if (!verdict.success) return json({ error: "Please complete the security check." }, 400);
  if (body.consent !== true) return json({ error: "Please agree to share your answers with your practitioner." }, 400);

  const linkToken = String(body.link || "").trim().toLowerCase();
  if (!/^[a-f0-9]{36}$/.test(linkToken)) return json({ error: "That link isn't valid." }, 400);
  const photos = body.photos && typeof body.photos === "object" ? body.photos as Record<string, unknown> : {};
  const front = photoBytes(photos.front);
  const side = photoBytes(photos.side);
  const back = photoBytes(photos.back);
  if (!front || !side || !back) return json({ error: "Please add all three photos." }, 400);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return json({ error: "This form isn't available right now." }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const hash = await sha256("assess\n" + ip + "\n" + (req.headers.get("user-agent") || ""));
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await admin.from("intake_rate").select("id", { count: "exact", head: true }).eq("ip_hash", hash).gt("created_at", since);
  if ((recent.count || 0) >= 8) return json({ error: "Please wait a little while before sending another form." }, 429);
  await admin.from("intake_rate").insert({ ip_hash: hash });

  const found = await admin.from("client_assess_links").select("practitioner_id").eq("token", linkToken).maybeSingle();
  const owner = found.data?.practitioner_id;
  if (!owner) return json({ error: "That link isn't valid." }, 404);
  const id = crypto.randomUUID();
  const paths = {
    front: owner + "/" + id + "/front.webp",
    side: owner + "/" + id + "/side.webp",
    back: owner + "/" + id + "/back.webp",
  };
  const uploaded: string[] = [];
  for (const [view, bytes] of [["front", front], ["side", side], ["back", back]] as const) {
    const up = await admin.storage.from("assessment-photos").upload(paths[view], bytes, { contentType: "image/webp", upsert: false });
    if (up.error) {
      if (uploaded.length) await admin.storage.from("assessment-photos").remove(uploaded);
      return json({ error: "That didn't work. Please try again." }, 400);
    }
    uploaded.push(paths[view]);
  }

  const data = cleanData(body.data);
  const flags = listOf(data.red_flags);
  delete data.red_flags;
  const saved = await admin.rpc("fa_assess_save", {
    p_id: id,
    p_token: linkToken,
    p_data: data,
    p_flags: flags,
    p_front: paths.front,
    p_side: paths.side,
    p_back: paths.back,
  });
  if (saved.error || !saved.data || saved.data.ok !== true) {
    await admin.storage.from("assessment-photos").remove(uploaded);
    if (saved.data && saved.data.code === "no_credit") {
      return json({ error: "This practitioner's form isn't available right now." }, 403);
    }
    return json({ error: "That didn't work. Please try again." }, 400);
  }

  const brevo = Deno.env.get("BREVO_API_KEY") || "";
  if (brevo && saved.data.user_id) {
    const user = await admin.auth.admin.getUserById(saved.data.user_id);
    const to = user.data?.user?.email || "";
    const first = String(saved.data.name || "").split(/\s+/)[0] || "A client";
    const safe = first.replace(/[&<>"]/g, "");
    const go = "https://fasciapp.app/app/?go=" + encodeURIComponent("client:" + String(saved.data.key || ""));
    if (to) {
      const html = `<!doctype html><html><body style="margin:0;background:#02191E;font-family:Helvetica,Arial,sans-serif;color:#F3EDE4">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#02191E"><tr><td align="center" style="padding:28px 14px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a2a30;border:1px solid #C99E6755;border-radius:14px">
<tr><td style="padding:26px 26px 8px;text-align:center;color:#C99E67;font-size:22px">FasciApp</td></tr>
<tr><td style="padding:8px 26px 6px;font-size:18px;text-align:center"><b>New assessment</b></td></tr>
<tr><td style="padding:12px 26px 8px;font-size:15px;line-height:1.5;text-align:center">${safe} sent an assessment. It is saved on their profile.</td></tr>
<tr><td align="center" style="padding:12px 26px 26px"><a href="${go}" style="display:inline-block;background:#C99E67;color:#02191E;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:24px">Open in FasciApp</a></td></tr>
</table></td></tr></table></body></html>`;
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevo, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: "FasciApp", email: "hello@fasciapp.app" },
          to: [{ email: to }],
          subject: "New assessment from " + safe,
          htmlContent: html,
          tags: ["assessment"],
        }),
      });
    }
  }
  return json({ ok: true });
});
