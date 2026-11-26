// Sends one email per due calendar reminder. Called by pg_cron every 5 minutes.
// Verify JWT off. Callers must send the x-cron-key stored in fa_private.
// Secrets: BREVO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injected).
import { createClient } from "npm:@supabase/supabase-js@2";

const enc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c
));

function zoneLabel(tz: string) {
  const city = String(tz || "UTC").split("/").pop()?.replace(/_/g, " ") || "UTC";
  return city === "UTC" ? "UTC" : city + " time";
}

function when(iso: string, tz: string, fallback = false): { date: string; time: string; zone: string } {
  const zone = tz || "UTC";
  const d = new Date(iso);
  const opt = { timeZone: zone } as const;
  try {
    const date = new Intl.DateTimeFormat("en-GB", { ...opt, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
    const time = new Intl.DateTimeFormat("en-GB", { ...opt, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
    return { date, time, zone: zoneLabel(zone) };
  } catch {
    if (fallback) return { date: iso, time: "", zone: "UTC" };
    return when(iso, "UTC", true);
  }
}

function clientEmailHtml(who: string, date: string, time: string, zone: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f1ea;font-family:Helvetica,Arial,sans-serif;color:#1d2a2c">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ea"><tr><td align="center" style="padding:28px 14px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px">
<tr><td style="padding:26px 26px 8px;font-size:18px;color:#1d2a2c"><b>A reminder of your session</b></td></tr>
<tr><td style="padding:8px 26px 8px;font-size:16px;line-height:1.55">Your session with <b>${enc(who)}</b> is coming up.<br>${enc(date)} at <b>${enc(time)}</b> <span style="color:#5d6b6c">(${enc(zone)})</span></td></tr>
<tr><td style="padding:8px 26px 26px;font-size:14px;line-height:1.5;color:#5d6b6c">Reply to this email if you need to change the time.</td></tr>
</table></td></tr></table></body></html>`;
}

function emailHtml(client: string, date: string, time: string, zone: string, title: string) {
  const what = title ? `<tr><td style="padding:0 26px 8px;font-size:15px;line-height:1.5;color:#F3EDE4">${enc(title)}</td></tr>` : "";
  return `<!doctype html><html><body style="margin:0;background:#02191E;font-family:Helvetica,Arial,sans-serif;color:#F3EDE4">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#02191E"><tr><td align="center" style="padding:28px 14px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a2a30;border:1px solid #C99E6755;border-radius:14px">
<tr><td style="padding:26px 26px 8px;text-align:center;color:#C99E67;font-size:22px;letter-spacing:.5px">FasciApp</td></tr>
<tr><td style="padding:6px 26px 4px;font-size:18px;color:#F3EDE4;text-align:center"><b>Session reminder</b></td></tr>
<tr><td style="padding:14px 26px 8px;font-size:15px;line-height:1.55;color:#F3EDE4">Session with <b>${enc(client)}</b><br>${enc(date)} at <b>${enc(time)}</b><br><span style="color:#9fb3b5">${enc(zone)}</span></td></tr>
${what}
<tr><td align="center" style="padding:12px 26px 22px"><a href="https://fasciapp.app/app/" style="display:inline-block;background:#C99E67;color:#02191E;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:24px">Open calendar</a></td></tr>
<tr><td style="padding:0 26px 24px;font-size:13px;color:#9fb3b5;text-align:center">This reminder follows the time saved on the session. It is sent to your login email.</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const brevo = Deno.env.get("BREVO_API_KEY");
  if (!url || !key || !brevo) return new Response("not configured", { status: 503 });
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const gate = await admin.from("fa_private").select("value").eq("key", "reminder_cron").maybeSingle();
  const want = gate.data?.value || "";
  if (!want || req.headers.get("x-cron-key") !== want) return new Response("unauthorized", { status: 401 });

  const now = new Date();
  const from = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const due = await admin.from("planned_sessions")
    .select("id,practitioner_id,client_name,starts_at,modality,tz")
    .is("reminder_sent_at", null)
    .neq("reminder", "none")
    .not("reminder_at", "is", null)
    .lte("reminder_at", now.toISOString())
    .gt("reminder_at", from)
    .gt("starts_at", now.toISOString())
    .order("reminder_at", { ascending: true })
    .limit(20);
  if (due.error) return Response.json({ error: due.error.message }, { status: 500 });

  let sent = 0, failed = 0;
  const previews: { subject: string; html: string }[] = [];
  for (const row of due.data || []) {
    const claim = await admin.from("planned_sessions").update({ reminder_sent_at: now.toISOString() })
      .eq("id", row.id).is("reminder_sent_at", null).select("id");
    if (claim.error || !claim.data?.length) continue;
    const user = await admin.auth.admin.getUserById(row.practitioner_id);
    const to = user.data?.user?.email || "";
    const label = String(row.client_name || "your client").replace(/[\r\n]/g, " ").trim().slice(0, 80) || "your client";
    const first = label.split(/\s+/)[0] || "your client";
    const w = when(row.starts_at, row.tz || "UTC");
    const title = String(row.modality || "").replace(/[\r\n]/g, " ").trim().slice(0, 80);
    const subject = `Reminder: session with ${first} at ${w.time}`;
    const html = emailHtml(label, w.date, w.time, w.zone, title);
    const text = `Session reminder\n\nSession with ${label}\n${w.date} at ${w.time} (${w.zone})\n\nThis was sent to your login email, ${to}.`;
    if (!to) { failed++; await admin.from("planned_sessions").update({ reminder_sent_at: null }).eq("id", row.id); continue; }
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevo, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "FasciApp", email: "hello@fasciapp.app" },
        replyTo: { email: "hello@fasciapp.app" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        tags: ["session-reminder"],
      }),
    });
    if (!r.ok) {
      failed++;
      await admin.from("planned_sessions").update({ reminder_sent_at: null }).eq("id", row.id);
      continue;
    }
    sent++;
    if (previews.length < 3) previews.push({ subject, html });
  }

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const used = await admin.from("planned_sessions").select("id", { count: "exact", head: true }).gte("client_reminder_sent_at", since);
  const room = Math.max(0, 50 - (used.count || 0));
  const clientDue = room ? await admin.from("planned_sessions")
    .select("id,practitioner_id,client_email,starts_at,tz")
    .eq("client_remind", true)
    .is("client_reminder_sent_at", null)
    .neq("reminder", "none")
    .not("client_email", "is", null)
    .not("reminder_at", "is", null)
    .lte("reminder_at", now.toISOString())
    .gt("reminder_at", from)
    .gt("starts_at", now.toISOString())
    .order("reminder_at", { ascending: true })
    .limit(Math.min(20, room)) : { data: [], error: null };
  let clientSent = 0, clientFailed = 0;
  if (!clientDue.error) {
    const ids = [...new Set((clientDue.data || []).map((r) => r.practitioner_id).filter(Boolean))];
    const profs = ids.length ? await admin.from("practitioners").select("user_id,name,practice_name,email").in("user_id", ids) : { data: [] };
    const byId = new Map((profs.data || []).map((p) => [p.user_id, p]));
    for (const row of clientDue.data || []) {
      const addr = String(row.client_email || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) continue;
      const claim = await admin.from("planned_sessions").update({ client_reminder_sent_at: now.toISOString() })
        .eq("id", row.id).is("client_reminder_sent_at", null).select("id");
      if (claim.error || !claim.data?.length) continue;
      const prof = (byId.get(row.practitioner_id) || {}) as { name?: string; practice_name?: string; email?: string };
      const who = String(prof.practice_name || prof.name || "your practitioner").replace(/[\r\n]/g, " ").trim().slice(0, 80) || "your practitioner";
      const reply = String(prof.email || "").trim();
      const replyOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reply) ? reply : "hello@fasciapp.app";
      const w = when(row.starts_at, row.tz || "UTC");
      const html = clientEmailHtml(who, w.date, w.time, w.zone);
      const text = `A reminder of your session\n\nYour session with ${who} is coming up.\n${w.date} at ${w.time} (${w.zone})\n\nReply to this email if you need to change the time.`;
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevo, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: who.slice(0, 70), email: "hello@fasciapp.app" },
          replyTo: { email: replyOk, name: who.slice(0, 70) },
          to: [{ email: addr }],
          subject: `Reminder: your session with ${who} at ${w.time}`,
          htmlContent: html,
          textContent: text,
          tags: ["client-session-reminder"],
        }),
      });
      if (!r.ok) {
        clientFailed++;
        await admin.from("planned_sessions").update({ client_reminder_sent_at: null }).eq("id", row.id);
        continue;
      }
      clientSent++;
    }
  }
  return Response.json({ checked: (due.data || []).length, sent, failed, previews, client_sent: clientSent, client_failed: clientFailed, client_room: room });
});
