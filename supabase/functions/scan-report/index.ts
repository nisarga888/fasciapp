// FasciApp Scan: automatic report generation. Disabled until GEMINI_API_KEY secret is set.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { KB, EXAMPLE } from "./kb.ts";
const MODEL = Deno.env.get("SCAN_MODEL") || "gemini-3.5-flash";
const SYS = `You are FasciApp Scan, writing a body-reading assessment for a bodywork practitioner using the MER & BBTRS approach.
Use ONLY this knowledge base:\n${KB}\n
Rules: the report is for the therapist, about the client: write every text field in neutral third person ("the client", the client's first name where natural, "they/their"); never address the reader as "you" or "your"; homework and home practice are suggestions for the client; only quoted client beliefs may stay first person. Never write the words "Anatomy Trains" (or Thomas Myers) anywhere in the report: the knowledge base uses it internally only; call them "myofascial lines" or "fascial lines". The disclaimer says the reflection is drawn from Myofascial Energetic Release and Biodynamic Breathwork perspectives. Not a medical diagnosis; non-medical, tentative, kind language ("may", "suggests"); never diagnose or promise cures; if intake shows red flags, set red_flag text recommending a doctor first.
The example below is a DIFFERENT client: use it only for format, depth and tone; never copy its findings, wording or plan. Base everything on this client's intake and photos.
Return ONLY JSON with exactly the same keys and shape as this example report (sections, 10-item plan with n/focus/bodywork/breathwork/home, body_map with belts 0-3 and numbered issues, summary, disclaimer, photo_note, red_flag, client, date, version):\n${EXAMPLE}`;
async function b64(sb: any, p: string | null) {
  if (!p) return null;
  const { data } = await sb.storage.from("assessment-photos").download(p);
  if (!data) return null;
  const u = new Uint8Array(await data.arrayBuffer()); let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return { inline_data: { mime_type: data.type || "image/jpeg", data: btoa(s) } };
}
Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("SCAN_HOOK_SECRET")) return new Response("no", { status: 401 });
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return new Response("disabled: no GEMINI_API_KEY", { status: 503 });
  const { id } = await req.json();
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: a } = await sb.from("assessments").select("id,client_name,red_flags,data,photo_front,photo_side,photo_back,report").eq("id", id).maybeSingle();
  if (!a || a.report) return new Response("skip");
  // Daily cap: at most DAILY_CAP automatic Gemini reports per UTC day (cost guard, ~€10/month budget).
  const DAILY_CAP = Number(Deno.env.get("SCAN_DAILY_CAP") || 50);
  const day0 = new Date(); day0.setUTCHours(0, 0, 0, 0);
  const { count } = await sb.from("assessments").select("id", { count: "exact", head: true })
    .gte("report_ready_at", day0.toISOString()).eq("report->>auto", "true");
  if ((count ?? 0) >= DAILY_CAP) return new Response("daily cap reached", { status: 429 });
  const imgs = (await Promise.all([a.photo_front, a.photo_side, a.photo_back].map((p) => b64(sb, p)))).filter(Boolean);
  const intake = { client_name: a.client_name, red_flags: a.red_flags, data: a.data, photos: "front, side, back in that order" };
  // v18 (3 Nov 2026): retry on bad or incomplete model output too, not only on missing candidates,
  // so one truncated/invalid answer no longer leaves the report stuck on "Preparing". Prompt and format unchanged.
  let r: any, j: any, used = MODEL, report: any = null, why = "";
  const t0 = Date.now();
  for (const m of [MODEL, "gemini-3.8-flash", MODEL, "gemini-3.7-flash", MODEL]) {
    const t1 = Date.now();
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_instruction: { parts: [{ text: SYS }] },
          contents: [{ role: "user", parts: [{ text: "Intake:\n" + JSON.stringify(intake) }, ...imgs] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 16000, thinkingConfig: { thinkingLevel: "low" } } }),
      });
      j = await r.json();
    } catch (e) { j = { error: { message: String(e) } }; }
    used = m;
    const txt = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("");
    let out: any = null;
    if (txt) { try { out = JSON.parse(String(txt).replace(/^```(json)?|```$/g, "").trim()); } catch { out = null; } }
    if (out && Array.isArray(out.plan) && out.body_map) { report = out; console.log(`scan-report ${id} ok ${m} ${Date.now() - t1}ms`); break; }
    why = JSON.stringify({ m, fr: j?.candidates?.[0]?.finishReason, err: j?.error?.message, u: j?.usageMetadata, t: String(txt ?? "").slice(0, 200) });
    console.log(`scan-report ${id} retry after ${Date.now() - t1}ms: ${why}`);
    await new Promise((z) => setTimeout(z, 2000));
  }
  if (!report) return new Response("bad model output: " + why, { status: 502 });
  console.log(`scan-report ${id} total ${Date.now() - t0}ms`);
  // Never name Anatomy Trains in client-facing text (Nisarga, 3 Nov 2026)
  const scrub = (v: any): any => typeof v === "string"
    ? v.replace(/,?\s*(BioDynamic|Biodynamic) Breathwork,? and Anatomy Trains/g, " and Biodynamic Breathwork").replace(/Myofascial Energetic Release\s+and Biodynamic/g, "Myofascial Energetic Release and Biodynamic").replace(/based on (your|photos and your) (photos and )?answers/g, "based on the client\u2019s photos and answers")
        .replace(/Anatomy Trains(['’]s?)?\s+(view|perspectives?|model|lines?|map)/gi, "myofascial lines $2").replace(/myofascial lines (lines?|view|perspectives?|model|map)/gi, (m, w) => /^lines?$/i.test(w) ? "myofascial lines" : "myofascial lines " + w)
        .replace(/\(?\s*Anatomy Trains\s*\)?/gi, " myofascial lines ").replace(/ {2,}/g, " ").replace(/ ([.,;:])/g, "$1").trim().replace(/^myofascial lines/, "Myofascial lines")
    : Array.isArray(v) ? v.map(scrub) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)])) : v;
  report = scrub(report);
  report.version = "auto-" + used; report.auto = true;
  await sb.from("assessments").update({ report, report_ready_at: new Date().toISOString() }).eq("id", id).is("report", null);
  return new Response(JSON.stringify({ ok: true, usage: j.usageMetadata }), { headers: { "Content-Type": "application/json" } });
});
