// Landing page Lab block. Card rows stay as curated in index.html.
// This script reads app/learn.js (the Lab source) and updates index.html:
// it removes the Body assessment tile and keeps the BBTRS trainee directory
// link inside the generated Lab section.
// Usage: node gen-landing-lab.mjs
import fs from "fs";

const window = {};
new Function("window", fs.readFileSync("app/learn.js", "utf8"))(window);
const items = (window.FASCIAPP_LEARN || []).filter(x => x && x.title);
if (!items.length) throw new Error("app/learn.js did not load FASCIAPP_LEARN");

let html = fs.readFileSync("index.html", "utf8");
const before = html;

html = html.replace(/<a class="f fl" href="app\/assessment\.html">[\s\S]*?<\/a>\n/, "");
html = html.replace('<p style="text-align:center;margin-top:22px"><a class="btn line" href="app/trainees/">BBTRS practitioners in training</a></p>\n ', "");
const banner = '<a class="labBanner" href="app/?trainees=1"><span class="labNew">NEW</span><b>BBTRS practitioners in training</b><span>Book a free one-hour online session with our practitioners in training.</span></a>\n ';
if (!html.includes("Book a free one-hour online session with our practitioners in training.")) {
  const heading = '<h2 id="labH">Fascia Lab</h2>';
  if (!html.includes(heading)) throw new Error("Fascia Lab heading not found");
  html = html.replace(heading, banner + heading);
}

if (/Body assessment|app\/assessment\.html/i.test(html)) {
  throw new Error("index.html still links to Body assessment");
}
const labBlock = html.match(/<!--LAB:START[\s\S]*?<!--LAB:END-->/);
if (!labBlock || !labBlock[0].includes('href="app/?trainees=1"')) {
  throw new Error("Generated Lab block is missing the trainee directory link");
}

if (html !== before) fs.writeFileSync("index.html", html);
console.log("Fascia Lab landing: " + items.length + " learn.js items; trainee link present; Body assessment absent");
