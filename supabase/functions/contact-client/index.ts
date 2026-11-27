// Sends one Contact client email from hello@fasciapp.app.
// Display name is "<Practitioner name> via FasciApp".
// Reply-To is the practitioner's login email.
// Verify JWT stays on. Each practitioner can send 20 of these per UTC day.
import { createClient } from "npm:@supabase/supabase-js@2";

const CAP = 20;
const enc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c
));

function dayStartUtc() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const brevo = Deno.env.get("BREVO_API_KEY") || "";
  const authz = req.headers.get("Authorization") || "";
  if (!url || !anon || !key || !authz) return Response.json({ error: "unauthorized" }, { status: 401 });

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authz } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { session_id?: string; subject?: string; text?: string; template?: string } = {};
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const sessionId = String(body.session_id || "");
  const subject = String(body.subject || "A note from your practitioner").replace(/[\r\n]/g, " ").trim().slice(0, 140);
  const text = String(body.text || "").replace(/\r/g, "").trim().slice(0, 2000);
  const template = ["bring", "reminder", "aftercare", "reschedule"].includes(String(body.template)) ? String(body.template) : "reminder";
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !text) return Response.json({ error: "bad request" }, { status: 400 });

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const session = await admin.from("planned_sessions").select("id,practitioner_id,client_email,client_name").eq("id", sessionId).maybeSingle();
  const row = session.data;
  if (session.error || !row || row.practitioner_id !== user.id) return Response.json({ error: "not found" }, { status: 404 });
  const to = String(row.client_email || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return Response.json({ fallback: "mailto", error: "no email" }, { status: 400 });

  const used = await admin.from("practitioner_contact_emails").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("sent_at", dayStartUtc());
  const sentToday = used.count || 0;
  if (sentToday >= CAP) return Response.json({ error: "daily_limit", left: 0 }, { status: 429 });

  if (!brevo) return Response.json({ fallback: "mailto", left: CAP - sentToday }, { status: 503 });

  const prof = await admin.from("practitioners").select("name,practice_name").eq("user_id", user.id).maybeSingle();
  const who = String(prof.data?.practice_name || prof.data?.name || "Your practitioner").replace(/[\r\n]/g, " ").trim().slice(0, 60) || "Your practitioner";
  const display = (who + " via FasciApp").slice(0, 70);
  const reply = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(user.email || "")) ? String(user.email) : "hello@fasciapp.app";
  const html = `<!doctype html><html><body style="margin:0;background:#f6f1ea;font-family:Helvetica,Arial,sans-serif;color:#1d2a2c">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px"><tr><td style="padding:26px;font-size:16px;line-height:1.55;white-space:pre-wrap">${enc(text)}</td></tr>
<tr><td style="padding:0 26px 26px;font-size:13px;color:#5d6b6c">Sent from FasciApp. Reply goes to ${enc(reply)}.</td></tr>
</table></td></tr></table></body></html>`;

  const mail = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevo, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: display, email: "hello@fasciapp.app" },
      replyTo: { email: reply, name: who },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text + "\n\nSent from FasciApp. Reply goes to " + reply + ".",
      tags: ["contact-client"],
    }),
  });
  if (!mail.ok) return Response.json({ fallback: "mailto", left: CAP - sentToday }, { status: 502 });

  await admin.from("practitioner_contact_emails").insert({ user_id: user.id });
  await admin.from("planned_sessions").update({
    last_contacted_at: new Date().toISOString(),
    last_contacted_channel: "email",
    last_contacted_template: template,
  }).eq("id", sessionId).eq("practitioner_id", user.id);

  return Response.json({ ok: true, left: CAP - sentToday - 1 });
});
