/* 21-day Breath Journey. Price text mirrors breathe.bodyawareness.ee/assets/config.js.
   LAUNCH_ENDS stays 2099-12-31 until the Payhip price is actually raised. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_JOURNEY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const CHECKOUT_URL = "https://payhip.com/b/jCza7";
const PROGRAMME_URL = "https://breathe.bodyawareness.ee/";
const LAUNCH_ENDS = "2099-12-31T23:59:59+02:00";
const PRICE_LINE_LAUNCH = "Launch price: €24.90 (incl. VAT). From 30 November the regular price is €49.";
const PRICE_SHORT_LAUNCH = "€24.90 incl. VAT · Launch price";
const PRICE_LINE_REGULAR = "Price: €49 (incl. VAT).";
const PRICE_SHORT_REGULAR = "€49 (incl. VAT)";
const DAY1_VIDEO = "iWBourJ41kU";
const PRODUCT_KEY = "jCza7";
const DAYS = [
  [1, "Foundations", "Meeting Your Breath"],
  [2, "Foundations", "Low and Slow Through the Nose"],
  [3, "Foundations", "The Belly Wave"],
  [4, "Foundations", "The Three-Dimensional Breath"],
  [5, "Foundations", "Breathing from the Feet"],
  [6, "Foundations", "The Longer Exhale"],
  [7, "Foundations", "Rest and Review: The Fascial Body Scan"],
  [8, "Stress", "Coherent Breathing: Finding the Rhythm"],
  [9, "Stress", "Coherent Breathing: Six and Six"],
  [10, "Stress", "The Soft Sigh"],
  [11, "Stress", "Humming and the “Voo”"],
  [12, "Stress", "Orienting: Widening Your Gaze"],
  [13, "Stress", "The Walking Breath"],
  [14, "Stress", "Rest and Review: Grow Roots, Find Your Centre"],
  [15, "Sleep and Integration", "Your Sleep Rhythm Begins in the Morning"],
  [16, "Sleep and Integration", "Dimming the Day: The Brain Dump"],
  [17, "Sleep and Integration", "The Bedtime Body Scan"],
  [18, "Sleep and Integration", "Humming into Rest"],
  [19, "Sleep and Integration", "If You Wake in the Night"],
  [20, "Sleep and Integration", "Your Cave and Your Routine"],
  [21, "Sleep and Integration", "Coming Home: Your Integration Practice"]
].map(([n, week, title]) => ({
  n, week, title,
  video: n === 1 ? DAY1_VIDEO : "",
  free: n === 1
}));
function launchOver(now){
  const t = Date.parse(LAUNCH_ENDS);
  return !isNaN(t) && Number(now) > t;
}
function priceLine(now){ return launchOver(now) ? PRICE_LINE_REGULAR : PRICE_LINE_LAUNCH; }
function priceShort(now){ return launchOver(now) ? PRICE_SHORT_REGULAR : PRICE_SHORT_LAUNCH; }
function isJourneyProduct(items){
  return (items || []).some(i => String(i && i.product_key || "") === PRODUCT_KEY || /breathe for stress/i.test(String(i && i.product_name || "")));
}
function stats(done){
  const present = {};
  (done || []).forEach(n => { n = Number(n); if (n >= 1 && n <= 21) present[n] = true; });
  let latest = 0, streak = 0, on = 1;
  for (let i = 1; i <= 21; i++) if (present[i] && i > latest) latest = i;
  for (let i = latest; i >= 1 && present[i]; i--) streak++;
  for (let i = 1; i <= 21; i++) {
    if (!present[i]) { on = i; break; }
    if (i === 21) on = 21;
  }
  return { day: on, streak };
}
return {
  CHECKOUT_URL, PROGRAMME_URL, LAUNCH_ENDS, DAY1_VIDEO, PRODUCT_KEY, DAYS,
  priceLine, priceShort, launchOver, isJourneyProduct, stats
};
});
