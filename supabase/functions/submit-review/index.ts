import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "That didn't work. Please try again." }, 405);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "That didn't work. Please try again." }, 400);
  }
  const secret = Deno.env.get("TURNSTILE_SECRET") || "";
  if (!secret) return json({ error: "Reviews aren't available right now." }, 503);
  const token = String(body.token || "");
  const ip = (req.headers.get("cf-connecting-ip")
    || (req.headers.get("x-forwarded-for") || "").split(",")[0]
    || "").trim();
  const ua = req.headers.get("user-agent") || "";
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const verdict = await check.json().catch(() => ({ success: false }));
  if (!verdict.success) return json({ error: "Please complete the security check." }, 400);
  const hash = await sha256(ip + "\n" + ua);
  const sb = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb.rpc("fa_submit_guest_review", {
    p_practitioner: body.practitioner_id,
    p_stars: body.stars,
    p_body: body.body || "",
    p_first: body.first_name || "",
    p_device: body.device_id,
    p_ip_hash: hash,
  });
  if (error) return json({ error: error.message || "That didn't work. Please try again." }, 400);
  return json({ id: data });
});
