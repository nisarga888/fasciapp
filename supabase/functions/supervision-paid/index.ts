// Stripe webhook (checkout.session.completed) for MER supervision Payment Links.
// Secrets (set in Supabase dashboard > Edge Functions > Secrets, never in code):
//   STRIPE_WEBHOOK_SECRET, BREVO_API_KEY, BREATHE_PDF_URL   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are built in)
// Deploy with "Verify JWT" OFF. Stripe endpoint: https://smgccthvratixddwfhmu.supabase.co/functions/v1/supervision-paid
import { createClient } from "npm:@supabase/supabase-js@2";
const ZOOM = "https://us06web.zoom.us/j/87453250731?pwd=fa6tOsJ1qf70WBikHoTkpunf5wjAw4.1";
const NAMES: Record<string,string> = {"2026-12-01":"Tue 1 December 2026","2026-12-29":"Tue 29 December 2026","2027-01-19":"Tue 19 January 2027","2027-03-02":"Tue 2 March 2027","2027-04-30":"Fri 30 April 2027"};
const enc = new TextEncoder();
async function verify(body: string, header: string, secret: string) {
  const p = Object.fromEntries(header.split(",").map(x => x.split("=") as [string,string]));
  if (!p.t || !p.v1 || Math.abs(Date.now()/1000 - Number(p.t)) > 300) return false;
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${p.t}.${body}`)))).map(b=>b.toString(16).padStart(2,"0")).join("");
  return header.split(",").some(x => x === `v1=${sig}`);
}
Deno.serve(async (req) => {
  const body = await req.text();
  if (!(await verify(body, req.headers.get("stripe-signature") || "", Deno.env.get("STRIPE_WEBHOOK_SECRET")!))) return new Response("bad sig", {status: 400});
  const ev = JSON.parse(body);
  if (ev.type !== "checkout.session.completed") return new Response("ignored");
  const s = ev.data.object, id = s.client_reference_id;
  if (!id || s.payment_status !== "paid") return new Response("no ref");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await db.from("supervision_signups").select("*").eq("id", id).maybeSingle();
  if (!row) return new Response("unknown signup", {status: 404});   // Stripe retries; check admin
  const paidGbp = (s.amount_total ?? 0) / 100;
  if (row.status === "paid") return new Response("already");
  const ok = s.currency === "gbp" && paidGbp >= Number(row.amount_gbp);
  await db.from("supervision_signups").update({ status: ok ? "paid" : "pending", paid_at: ok ? new Date().toISOString() : null, stripe_session_id: s.id,
    notes: ok ? row.notes : `Stripe paid ${paidGbp} ${s.currency}, expected ${row.amount_gbp} gbp` }).eq("id", id);
  if (!ok) return new Response("amount mismatch");
  const first = String(row.name).split(" ")[0].replace(/[<>&"]/g, "");
  const list = row.sessions.map((x: string) => `<li>${NAMES[x] || x}</li>`).join("");
  const pdf = Deno.env.get("BREATHE_PDF_URL");
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#02191E;max-width:560px"><p>Hi ${first},</p>
<p>Thank you, your payment is received and your place in <b>MER group supervision with Nisarga</b> is confirmed.</p><ul>${list}</ul>
<p>Every session: 6–7 pm UK time (7–8 pm CET) on Zoom.<br>💻 <a href="${ZOOM}">Join on Zoom</a> · Meeting ID: 874 5325 0731</p>
<p>Can't join live? You'll receive the recording via Dropbox after each session.</p>
${row.bundle && pdf ? `<p>🎁 Your bonus: <a href="${pdf}">download the Breathe for Stress and Sleep course (PDF)</a>.</p>` : ""}
<p>Questions? <a href="mailto:nisarga8@gmail.com">nisarga8@gmail.com</a> · <a href="https://www.nisarga8.com">nisarga8.com</a></p><p>Warmly,<br>Nisarga</p></div>`;
  await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "content-type": "application/json" },
    body: JSON.stringify({ sender: {name: "Nisarga · MER Supervision", email: "hello@fasciapp.app"}, replyTo: {email: "nisarga8@gmail.com"},
      to: [{email: row.email, name: row.name}], subject: "You're booked – MER supervision Zoom link", htmlContent: html, tags: ["mer-supervision-paid"],
      headers: {"X-Mailin-Track": "0", "X-Mailin-Track-Clicks": "0", "X-Mailin-Track-Opens": "0"} }) });
  return new Response("ok");
});
