/* Session clocks. A wall time is converted with the device IANA zone, then stored as UTC. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_TZ = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  function partsIn(date, timeZone){
    const o = {};
    new Intl.DateTimeFormat("en-GB", {timeZone: timeZone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).formatToParts(date).forEach(function(p){ o[p.type] = p.value; });
    if (o.hour === "24") o.hour = "00";
    return o;
  }
  function zonedToUtc(dateStr, timeStr, timeZone){
    const dparts = String(dateStr || "").split("-").map(Number);
    const tparts = String(timeStr || "").split(":").map(Number);
    const y = dparts[0], m = dparts[1], d = dparts[2], h = tparts[0], mi = tparts[1] || 0;
    const want = Date.UTC(y, m - 1, d, h, mi);
    let g = want;
    for (let i = 0; i < 4; i++){
      const p = partsIn(new Date(g), timeZone);
      const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
      const next = g + (want - asUtc);
      if (next === g) break;
      g = next;
    }
    return new Date(g);
  }
  function zoneLabel(timeZone){
    const city = String(timeZone || "").split("/").pop().replace(/_/g, " ");
    if (!city || city === "UTC") return "UTC";
    return city + " time";
  }
  function hmIn(date, timeZone){
    const p = partsIn(date, timeZone);
    return p.hour + ":" + p.minute;
  }
  function clockLabel(date, sessionZone, viewerZone){
    const booked = hmIn(date, sessionZone) + " (" + zoneLabel(sessionZone) + ")";
    if (!viewerZone || viewerZone === sessionZone) return booked;
    return hmIn(date, viewerZone) + " (your time) · " + booked;
  }
  function pad(n){ return String(n).padStart(2, "0"); }
  function utcStamp(date){
    return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate()) + "T" + pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + "Z";
  }
  function icsText(s){
    return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }
  function reminderTrigger(reminder){
    if (reminder === "1h") return "-PT60M";
    if (reminder === "1d") return "-P1D";
    return "";
  }
  function icsEvent(opts){
    const start = opts.start;
    const end = new Date(start.getTime() + (opts.minutes || 60) * 60000);
    const trigger = reminderTrigger(opts.reminder);
    const alarm = trigger ? "BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Reminder\r\nTRIGGER:" + trigger + "\r\nEND:VALARM\r\n" : "";
    return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FasciApp//Calendar//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nUID:" + icsText(opts.uid || "session@fasciapp.app") + "\r\nDTSTAMP:" + utcStamp(opts.stamp || new Date()) + "\r\nDTSTART:" + utcStamp(start) + "\r\nDTEND:" + utcStamp(end) + "\r\nSUMMARY:" + icsText(opts.summary || "Session") + "\r\nDESCRIPTION:" + icsText(opts.description || "") + "\r\n" + alarm + "END:VEVENT\r\nEND:VCALENDAR\r\n";
  }
  function googleUrl(opts){
    const end = new Date(opts.start.getTime() + (opts.minutes || 60) * 60000);
    const u = new URL("https://calendar.google.com/calendar/render");
    u.searchParams.set("action", "TEMPLATE");
    u.searchParams.set("text", opts.summary || "Session");
    u.searchParams.set("dates", utcStamp(opts.start) + "/" + utcStamp(end));
    if (opts.tz) u.searchParams.set("ctz", opts.tz);
    if (opts.description) u.searchParams.set("details", opts.description);
    return u.toString();
  }
  function outlookUrl(opts){
    const end = new Date(opts.start.getTime() + (opts.minutes || 60) * 60000);
    const u = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
    u.searchParams.set("path", "/calendar/action/compose");
    u.searchParams.set("rru", "addevent");
    u.searchParams.set("startdt", opts.start.toISOString().replace(/\.\d{3}Z$/, "Z"));
    u.searchParams.set("enddt", end.toISOString().replace(/\.\d{3}Z$/, "Z"));
    u.searchParams.set("subject", opts.summary || "Session");
    if (opts.description) u.searchParams.set("body", opts.description);
    return u.toString();
  }
  return {partsIn: partsIn, zonedToUtc: zonedToUtc, zoneLabel: zoneLabel, hmIn: hmIn, clockLabel: clockLabel, utcStamp: utcStamp, reminderTrigger: reminderTrigger, icsEvent: icsEvent, googleUrl: googleUrl, outlookUrl: outlookUrl};
});
