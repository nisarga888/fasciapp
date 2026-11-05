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

html = html.replace('href="app/assessment.html"', 'href="app/trainees/"');
html = html.replace(
  "<b>Body assessment</b><p>Body reading and fascial patterns to help plan each session.</p>",
  "<b>Practitioners in training</b><p>BBTRS trainees offering a free one-hour online practice session.</p>"
);

const labLink = '<p style="text-align:center;margin-top:22px"><a class="btn line" href="app/trainees/">BBTRS practitioners in training</a></p>\n ';
const openLab = '<p style="text-align:center;margin-top:22px"><a class="btn gold" href="app/?tab=learn">Open Fascia Lab →</a></p>';
const openAnchor = '<a class="btn gold" href="app/?tab=learn">Open Fascia Lab →</a>';
const labStart = html.indexOf("<!--LAB:START");
const labEnd = html.indexOf("<!--LAB:END-->");
if (labStart < 0 || labEnd < labStart) throw new Error("Fascia Lab markers not found in index.html");
let lab = html.slice(labStart, labEnd);
if (!lab.includes(openAnchor)) throw new Error("Fascia Lab footer not found in index.html");
if (!lab.includes('href="app/trainees/"')) {
  if (!lab.includes(openLab)) throw new Error("Fascia Lab footer not found in index.html");
  lab = lab.replace(openLab, labLink + openLab.replace("margin-top:22px", "margin-top:12px"));
}
html = html.slice(0, labStart) + lab + html.slice(labEnd);

if (/Body assessment|app\/assessment\.html/i.test(html)) {
  throw new Error("index.html still links to Body assessment");
}
const labBlock = html.match(/<!--LAB:START[\s\S]*?<!--LAB:END-->/);
if (!labBlock || !labBlock[0].includes('href="app/trainees/"')) {
  throw new Error("Generated Lab block is missing the trainee directory link");
}

if (html !== before) fs.writeFileSync("index.html", html);
console.log("Fascia Lab landing: " + items.length + " learn.js items; trainee link present; Body assessment absent");
